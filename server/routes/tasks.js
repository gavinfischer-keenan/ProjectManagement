import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';

const router = express.Router();

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

async function cascadeDates(taskId, deltaDays, client) {
  if (deltaDays === 0) return;
  const successorsRes = await client.query('SELECT id, target_date_start, target_date_finish FROM tasks WHERE depends_on_task_id = $1', [taskId]);
  for (const succ of successorsRes.rows) {
    let newStart = succ.target_date_start ? addDaysToISO(succ.target_date_start.toISOString().split('T')[0], deltaDays) : null;
    let newFinish = succ.target_date_finish ? addDaysToISO(succ.target_date_finish.toISOString().split('T')[0], deltaDays) : null;
    await client.query('UPDATE tasks SET target_date_start = $1, target_date_finish = $2 WHERE id = $3', [newStart, newFinish, succ.id]);
    await cascadeDates(succ.id, deltaDays, client);
  }
}

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY sort_order ASC');
    const tasks = result.rows.map(row => ({
      id: row.id,
      parentId: row.parent_id,
      order: row.sort_order,
      name: row.name,
      taskType: row.task_type,
      dependency: row.dependency,
      dependsOnTaskId: row.depends_on_task_id,
      notes: row.notes,
      targetDateStart: row.target_date_start ? row.target_date_start.toISOString().split('T')[0] : null,
      targetDateFinish: row.target_date_finish ? row.target_date_finish.toISOString().split('T')[0] : null,
      dateStarted: row.date_started ? row.date_started.toISOString().split('T')[0] : null,
      dateFinished: row.date_finished ? row.date_finished.toISOString().split('T')[0] : null,
      duration: row.duration_days,
      status: row.status,
      delayed: row.delayed,
      percentComplete: row.percent_complete,
      isMilestone: row.is_milestone,
      milestoneText: row.milestone_text,
      isHardware: row.is_hardware,
      hardwareText: row.hardware_text,
      vendorId: row.vendor_id,
      ownerId: row.owner_id,
      haEntityId: row.ha_entity_id,
      createdAt: row.created_at
    }));
    
    // Also fetch supplies and append
    const supRes = await pool.query('SELECT * FROM task_supplies');
    const suppliesByTask = {};
    supRes.rows.forEach(s => {
      if(!suppliesByTask[s.task_id]) suppliesByTask[s.task_id] = [];
      suppliesByTask[s.task_id].push({
        id: s.id, name: s.name, qty: s.qty, cost: parseFloat(s.cost), checkedOff: s.checked_off
      });
    });
    tasks.forEach(t => t.supplies = suppliesByTask[t.id] || []);
    
    return res.json({ tasks });
  } catch (err) {
    console.error('GET /tasks error:', err);
    return res.status(500).json({ error: 'Failed to read tasks' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name is required' });
    }

    const id = uuidv4();
    const newTask = {
      id,
      parentId: req.body.parentId ?? null,
      order: req.body.order ?? 0,
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
      vendorId: req.body.vendorId ?? null,
      ownerId: req.body.ownerId ?? '3fbda0f6-bca4-407b-a647-fda9e6ce777d',
      createdAt: new Date().toISOString(),
    };

    await pool.query(
      `INSERT INTO tasks (id, parent_id, sort_order, name, task_type, dependency, depends_on_task_id, notes,
       target_date_start, target_date_finish, date_started, date_finished, duration_days, status, delayed,
       percent_complete, is_milestone, milestone_text, is_hardware, hardware_text, vendor_id, owner_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
      [
        newTask.id, newTask.parentId, newTask.order, newTask.name, newTask.taskType, newTask.dependency, newTask.dependsOnTaskId,
        newTask.notes, newTask.targetDateStart, newTask.targetDateFinish, newTask.dateStarted, newTask.dateFinished,
        newTask.duration, newTask.status, newTask.delayed, newTask.percentComplete, newTask.isMilestone, newTask.milestoneText,
        newTask.isHardware, newTask.hardwareText, newTask.vendorId, newTask.ownerId, newTask.createdAt
      ]
    );

    return res.status(201).json(newTask);
  } catch (err) {
    console.error('POST /tasks error:', err);
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const taskRes = await client.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskRes.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const task = taskRes.rows[0];

    const oldEffectiveFinish = task.date_finished || task.target_date_finish;
    const oldEffectiveFinishIso = oldEffectiveFinish ? oldEffectiveFinish.toISOString().split('T')[0] : null;

    // Build update
    const updatable = [
      ['parentId', 'parent_id'], ['order', 'sort_order'], ['name', 'name'], ['taskType', 'task_type'],
      ['dependency', 'dependency'], ['dependsOnTaskId', 'depends_on_task_id'], ['notes', 'notes'],
      ['targetDateStart', 'target_date_start'], ['targetDateFinish', 'target_date_finish'],
      ['dateStarted', 'date_started'], ['dateFinished', 'date_finished'], ['duration', 'duration_days'],
      ['status', 'status'], ['delayed', 'delayed'], ['percentComplete', 'percent_complete'],
      ['isMilestone', 'is_milestone'], ['milestoneText', 'milestone_text'], ['isHardware', 'is_hardware'],
      ['hardwareText', 'hardware_text'], ['vendorId', 'vendor_id'], ['ownerId', 'owner_id']
    ];

    let currentFields = { ...task };
    for (const [jsField, dbField] of updatable) {
      if (jsField in req.body) {
        currentFields[dbField] = req.body[jsField];
      }
    }

    if (currentFields.depends_on_task_id) {
      const predRes = await client.query('SELECT date_finished, target_date_finish FROM tasks WHERE id = $1', [currentFields.depends_on_task_id]);
      if (predRes.rows.length > 0) {
        const pred = predRes.rows[0];
        const forcedStart = pred.date_finished || pred.target_date_finish;
        if (forcedStart && (!currentFields.target_date_start || currentFields.target_date_start.toISOString() !== forcedStart.toISOString())) {
          const forcedStartIso = forcedStart.toISOString().split('T')[0];
          const oldStartIso = currentFields.target_date_start ? currentFields.target_date_start.toISOString().split('T')[0] : null;
          currentFields.target_date_start = forcedStartIso;
          if (oldStartIso && currentFields.target_date_finish) {
             const oldFinIso = typeof currentFields.target_date_finish === 'string' ? currentFields.target_date_finish : currentFields.target_date_finish.toISOString().split('T')[0];
             const delta = getDeltaDays(oldStartIso, forcedStartIso);
             currentFields.target_date_finish = addDaysToISO(oldFinIso, delta);
          }
        }
      }
    }

    // Save task updates
    await client.query(
      `UPDATE tasks SET parent_id=$1, sort_order=$2, name=$3, task_type=$4, dependency=$5, depends_on_task_id=$6, notes=$7, target_date_start=$8, target_date_finish=$9, date_started=$10, date_finished=$11, duration_days=$12, status=$13, delayed=$14, percent_complete=$15, is_milestone=$16, milestone_text=$17, is_hardware=$18, hardware_text=$19, vendor_id=$20, owner_id=$21 WHERE id=$22`,
      [
        currentFields.parent_id, currentFields.sort_order, currentFields.name, currentFields.task_type, currentFields.dependency, currentFields.depends_on_task_id, currentFields.notes, currentFields.target_date_start, currentFields.target_date_finish, currentFields.date_started, currentFields.date_finished, currentFields.duration_days, currentFields.status, currentFields.delayed, currentFields.percent_complete, currentFields.is_milestone, currentFields.milestone_text, currentFields.is_hardware, currentFields.hardware_text, currentFields.vendor_id, currentFields.owner_id, id
      ]
    );

    // Update supplies
    if (req.body.supplies) {
      await client.query('DELETE FROM task_supplies WHERE task_id = $1', [id]);
      for(const s of req.body.supplies) {
        await client.query('INSERT INTO task_supplies (id, task_id, name, qty, cost, checked_off) VALUES ($1, $2, $3, $4, $5, $6)',
          [s.id || uuidv4(), id, s.name, s.qty, s.cost, s.checkedOff]);
      }
    }

    const newEffectiveFinish = currentFields.date_finished || currentFields.target_date_finish;
    const newEffectiveFinishIso = newEffectiveFinish ? (typeof newEffectiveFinish === 'string' ? newEffectiveFinish : newEffectiveFinish.toISOString().split('T')[0]) : null;
    
    if (oldEffectiveFinishIso && newEffectiveFinishIso && oldEffectiveFinishIso !== newEffectiveFinishIso) {
      const delta = getDeltaDays(oldEffectiveFinishIso, newEffectiveFinishIso);
      if (delta !== 0) {
        await cascadeDates(id, delta, client);
      }
    }

    await client.query('COMMIT');
    res.json({ id, ...req.body }); // Return approx body.
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /tasks/:id error:', err);
    return res.status(500).json({ error: 'Failed to update task' });
  } finally {
    client.release();
  }
});

router.patch('/reorder', async (req, res) => {
  const { orderings } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const { id, parentId, order } of orderings) {
      await client.query('UPDATE tasks SET parent_id = COALESCE($1, parent_id), sort_order = COALESCE($2, sort_order) WHERE id = $3', [parentId, order, id]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch(e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed' });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ deleted: [req.params.id] }); // DB CASCADE handles descendants
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
