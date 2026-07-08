import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '..', 'data', 'tasks.json');

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readTasks() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return data.tasks || [];
  } catch {
    return [];
  }
}

function writeTasks(tasks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks }, null, 2), 'utf-8');
}

/**
 * Recursively collect IDs of a task and all its descendants.
 */
function collectDescendantIds(taskId, tasks) {
  const ids = [taskId];
  const children = tasks.filter((t) => t.parentId === taskId);
  for (const child of children) {
    ids.push(...collectDescendantIds(child.id, tasks));
  }
  return ids;
}

function getDeltaDays(oldIso, newIso) {
  if (!oldIso || !newIso) return 0;
  const [y1, m1, d1] = oldIso.split('-').map(Number);
  const [y2, m2, d2] = newIso.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / 86400000);
}

function addDaysToISO(isoStr, days) {
  if (!isoStr || days === 0) return isoStr;
  const [y, m, d] = isoStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yOut = date.getUTCFullYear();
  const mOut = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dOut = String(date.getUTCDate()).padStart(2, '0');
  return `${yOut}-${mOut}-${dOut}`;
}

function cascadeDates(taskId, deltaDays, tasks) {
  if (deltaDays === 0) return;
  const successors = tasks.filter(t => t.dependsOnTaskId === taskId);
  for (const succ of successors) {
    if (succ.targetDateStart) {
      succ.targetDateStart = addDaysToISO(succ.targetDateStart, deltaDays);
    }
    if (succ.targetDateFinish) {
      succ.targetDateFinish = addDaysToISO(succ.targetDateFinish, deltaDays);
    }
    // Recursively cascade
    cascadeDates(succ.id, deltaDays, tasks);
  }
}

// ---------------------------------------------------------------------------
// PATCH /reorder  (must be registered BEFORE /:id routes)
// ---------------------------------------------------------------------------
router.patch('/reorder', (req, res) => {
  try {
    const { orderings } = req.body;

    if (!Array.isArray(orderings)) {
      return res.status(400).json({ error: 'orderings must be an array' });
    }

    const tasks = readTasks();

    for (const { id, parentId, order } of orderings) {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        task.parentId = parentId ?? task.parentId;
        task.order = order ?? task.order;
      }
    }

    writeTasks(tasks);
    return res.json({ success: true, tasks });
  } catch (err) {
    console.error('PATCH /reorder error:', err);
    return res.status(500).json({ error: 'Failed to reorder tasks' });
  }
});

// ---------------------------------------------------------------------------
// GET /  — list all tasks
// ---------------------------------------------------------------------------
router.get('/', (_req, res) => {
  try {
    const tasks = readTasks();
    return res.json(tasks);
  } catch (err) {
    console.error('GET /tasks error:', err);
    return res.status(500).json({ error: 'Failed to read tasks' });
  }
});

// ---------------------------------------------------------------------------
// POST /  — create a new task
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }

    const tasks = readTasks();

    const newTask = {
      id: uuidv4(),
      parentId: req.body.parentId ?? null,
      order: req.body.order ?? tasks.length,
      name: name.trim(),
      taskType: req.body.taskType ?? 'task',
      dependency: req.body.dependency ?? '',
      dependsOnTaskId: req.body.dependsOnTaskId ?? null,
      notes: req.body.notes ?? '',
      targetDateStart: req.body.targetDateStart ?? null,
      targetDateFinish: req.body.targetDateFinish ?? null,
      dateStarted: req.body.dateStarted ?? null,
      dateFinished: req.body.dateFinished ?? null,
      duration: req.body.duration ?? null,
      status: req.body.status ?? 'Not Started',
      delayed: req.body.delayed ?? false,
      percentComplete: req.body.percentComplete ?? 0,
      isMilestone: req.body.isMilestone ?? false,
      milestoneText: req.body.milestoneText ?? '',
      isHardware: req.body.isHardware ?? false,
      hardwareText: req.body.hardwareText ?? '',
      createdAt: new Date().toISOString(),
    };

    tasks.push(newTask);
    writeTasks(tasks);

    return res.status(201).json(newTask);
  } catch (err) {
    console.error('POST /tasks error:', err);
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id  — update a task (partial updates allowed)
// ---------------------------------------------------------------------------
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const tasks = readTasks();
    const index = tasks.findIndex((t) => t.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const oldEffectiveFinish = tasks[index].dateFinished || tasks[index].targetDateFinish;

    // Merge only supplied fields
    const updatable = [
      'parentId', 'order', 'name', 'taskType', 'dependency', 'dependsOnTaskId',
      'notes', 'targetDateStart', 'targetDateFinish', 'dateStarted',
      'dateFinished', 'duration', 'status', 'delayed', 'percentComplete',
      'isMilestone', 'milestoneText', 'isHardware', 'hardwareText', 'vendorId',
      'supplies'
    ];

    for (const field of updatable) {
      if (field in req.body) {
        tasks[index][field] = req.body[field];
      }
    }

    // Force lock-step: if a dependency is set, inherit its effective finish date as our start date
    if (tasks[index].dependsOnTaskId) {
      const predecessor = tasks.find((t) => t.id === tasks[index].dependsOnTaskId);
      if (predecessor) {
        const forcedStart = predecessor.dateFinished || predecessor.targetDateFinish;
        if (forcedStart && tasks[index].targetDateStart !== forcedStart) {
          const oldStartForThisTask = tasks[index].targetDateStart;
          tasks[index].targetDateStart = forcedStart;
          // If we had an old start, shift finish date by the same delta to preserve duration
          if (oldStartForThisTask && tasks[index].targetDateFinish) {
            const delta = getDeltaDays(oldStartForThisTask, forcedStart);
            tasks[index].targetDateFinish = addDaysToISO(tasks[index].targetDateFinish, delta);
          }
        }
      }
    }

    const newEffectiveFinish = tasks[index].dateFinished || tasks[index].targetDateFinish;
    if (oldEffectiveFinish && newEffectiveFinish && oldEffectiveFinish !== newEffectiveFinish) {
      const delta = getDeltaDays(oldEffectiveFinish, newEffectiveFinish);
      if (delta !== 0) {
        cascadeDates(tasks[index].id, delta, tasks);
      }
    }

    writeTasks(tasks);
    return res.json(tasks[index]);
  } catch (err) {
    console.error('PUT /tasks/:id error:', err);
    return res.status(500).json({ error: 'Failed to update task' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id  — delete a task and all its descendants
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const tasks = readTasks();

    if (!tasks.find((t) => t.id === id)) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const idsToDelete = collectDescendantIds(id, tasks);
    const remaining = tasks.filter((t) => !idsToDelete.includes(t.id));

    writeTasks(remaining);
    return res.json({ deleted: idsToDelete });
  } catch (err) {
    console.error('DELETE /tasks/:id error:', err);
    return res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
