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

    // Merge only supplied fields
    const updatable = [
      'parentId', 'order', 'name', 'taskType', 'dependency', 'dependsOnTaskId',
      'notes', 'targetDateStart', 'targetDateFinish', 'dateStarted',
      'dateFinished', 'duration', 'status', 'delayed', 'percentComplete',
    ];

    for (const field of updatable) {
      if (field in req.body) {
        tasks[index][field] = req.body[field];
      }
    }

    // Auto-wire: if a dependency was set, inherit its finish date as our start date
    // (only if targetDateStart was NOT explicitly provided in this request)
    if ('dependsOnTaskId' in req.body && req.body.dependsOnTaskId && !('targetDateStart' in req.body)) {
      const predecessor = tasks.find((t) => t.id === req.body.dependsOnTaskId);
      if (predecessor && predecessor.targetDateFinish) {
        tasks[index].targetDateStart = predecessor.targetDateFinish;
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
