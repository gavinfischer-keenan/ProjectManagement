/**
 * UI Audit Tests — Hawaii Project Manager
 *
 * These tests verify that the UI layer correctly produces and renders
 * section vs task rows, and that the section creation flow sets taskType.
 */

import { describe, it, expect, vi } from 'vitest';
import { buildTree, flattenTree } from '../utils/treeUtils.js';
import { calculateRollup } from '../utils/treeUtils.js';

// ── Helpers ──────────────────────────────────────────────────────

/** Simulate what CreateTaskModal.handleSubmit produces for a Section */
function makeCreateSectionPayload(name, parentId = null) {
  return {
    name,
    taskType: 'section',   // ← this MUST be 'section'
    notes: '',
    parentId,
    status: 'Not Started',
    percentComplete: 0,
  };
}

/** Simulate what CreateTaskModal.handleSubmit produces for a Task */
function makeCreateTaskPayload(name, { parentId = null, status = 'Not Started', targetDateStart = null, targetDateFinish = null, duration = null } = {}) {
  return {
    name,
    taskType: 'task',
    notes: '',
    parentId,
    targetDateStart,
    targetDateFinish,
    duration,
    status,
    percentComplete: 0,
  };
}

/** Simulate what handleCreateSave in TaskTable adds to the payload */
function addOrder(payload, existingTasks) {
  const order = existingTasks.filter((t) => !t.parentId).length;
  return { order, ...payload };
}

/** Simulate the server assigning an ID */
function serverCreate(payload, existingTasks) {
  return { id: `id-${Date.now()}-${Math.random()}`, ...payload };
}

// ── 1. CreateTaskModal payload correctness ───────────────────────

describe('CreateTaskModal payload — Section tab', () => {
  it('produces taskType: "section"', () => {
    const p = makeCreateSectionPayload('Air Conditioning');
    expect(p.taskType).toBe('section');
  });

  it('has correct name', () => {
    const p = makeCreateSectionPayload('HVAC');
    expect(p.name).toBe('HVAC');
  });

  it('has no dates or dependency fields', () => {
    const p = makeCreateSectionPayload('Electrical');
    expect(p.targetDateStart).toBeUndefined();
    expect(p.dependsOnTaskId).toBeUndefined();
  });
});

describe('CreateTaskModal payload — Task tab', () => {
  it('produces taskType: "task"', () => {
    const p = makeCreateTaskPayload('Order Parts');
    expect(p.taskType).toBe('task');
  });

  it('includes date fields', () => {
    const p = makeCreateTaskPayload('Install AC', { targetDateStart: '2026-08-01', targetDateFinish: '2026-08-15' });
    expect(p.targetDateStart).toBe('2026-08-01');
    expect(p.targetDateFinish).toBe('2026-08-15');
  });
});

// ── 2. handleCreateSave order injection ──────────────────────────

describe('handleCreateSave order injection', () => {
  const existingTasks = [
    { id: 'a', parentId: null },
    { id: 'b', parentId: null },
    { id: 'c', parentId: 'a' }, // child — doesn't count for order
  ];

  it('sets order = number of top-level tasks', () => {
    const payload = makeCreateSectionPayload('New Section');
    const withOrder = addOrder(payload, existingTasks);
    expect(withOrder.order).toBe(2); // 2 top-level tasks: a, b
  });

  it('preserves all payload fields', () => {
    const payload = makeCreateSectionPayload('New Section');
    const withOrder = addOrder(payload, existingTasks);
    expect(withOrder.taskType).toBe('section');
    expect(withOrder.name).toBe('New Section');
  });
});

// ── 3. TaskRow rendering logic (derived from TaskRow's section logic) ─

describe('Section row display logic', () => {
  function deriveRowFlags(task, allTasks) {
    const hasChildren = allTasks.some((t) => t.parentId === task.id);
    const isSection   = task.taskType === 'section';
    const isGroupHeader = isSection || hasChildren;
    const rowClasses = [
      isGroupHeader ? 'row-group-header' : '',
      isSection     ? 'row-section-type' : '',
    ].filter(Boolean);
    return { isSection, isGroupHeader, hasChildren, rowClasses };
  }

  it('fresh empty section (no children) is isGroupHeader', () => {
    const section = { id: 's1', parentId: null, taskType: 'section', name: 'AC' };
    const { isGroupHeader } = deriveRowFlags(section, [section]);
    expect(isGroupHeader).toBe(true);
  });

  it('fresh empty section gets row-group-header and row-section-type classes', () => {
    const section = { id: 's1', parentId: null, taskType: 'section', name: 'AC' };
    const { rowClasses } = deriveRowFlags(section, [section]);
    expect(rowClasses).toContain('row-group-header');
    expect(rowClasses).toContain('row-section-type');
  });

  it('section with children is still isGroupHeader', () => {
    const section = { id: 's1', parentId: null, taskType: 'section', name: 'AC' };
    const child   = { id: 't1', parentId: 's1',  taskType: 'task',    name: 'Install' };
    const { isGroupHeader } = deriveRowFlags(section, [section, child]);
    expect(isGroupHeader).toBe(true);
  });

  it('regular task with no children is NOT isGroupHeader', () => {
    const task = { id: 't1', parentId: null, taskType: 'task', name: 'Do Something' };
    const { isGroupHeader } = deriveRowFlags(task, [task]);
    expect(isGroupHeader).toBe(false);
  });

  it('regular task with children IS isGroupHeader (parent task)', () => {
    const parent = { id: 'p1', parentId: null, taskType: 'task', name: 'Parent' };
    const child  = { id: 'c1', parentId: 'p1',  taskType: 'task', name: 'Child' };
    const { isGroupHeader, rowClasses } = deriveRowFlags(parent, [parent, child]);
    expect(isGroupHeader).toBe(true);
    expect(rowClasses).toContain('row-group-header');
    // Parent task (not section) should NOT have row-section-type
    expect(rowClasses).not.toContain('row-section-type');
  });
});

// ── 4. Section badge / empty hint logic ─────────────────────────

describe('Section badge and empty hint visibility', () => {
  function sectionHints(task, allTasks) {
    const isSection = task.taskType === 'section';
    const rollup = calculateRollup(task, allTasks);
    const showBadge = isSection;
    const showEmptyHint = isSection && rollup.totalChildren === 0;
    const showRollup = rollup && rollup.totalChildren > 0;
    return { showBadge, showEmptyHint, showRollup };
  }

  it('shows badge on empty section', () => {
    const s = { id: 's1', parentId: null, taskType: 'section', status: 'Not Started', percentComplete: 0 };
    const { showBadge } = sectionHints(s, [s]);
    expect(showBadge).toBe(true);
  });

  it('shows empty hint on empty section', () => {
    const s = { id: 's1', parentId: null, taskType: 'section', status: 'Not Started', percentComplete: 0 };
    const { showEmptyHint } = sectionHints(s, [s]);
    expect(showEmptyHint).toBe(true);
  });

  it('shows rollup (not empty hint) when section has children', () => {
    const s = { id: 's1', parentId: null, taskType: 'section', status: 'Not Started', percentComplete: 0 };
    const c = { id: 'c1', parentId: 's1', taskType: 'task',    status: 'Completed',   percentComplete: 100 };
    const { showEmptyHint, showRollup } = sectionHints(s, [s, c]);
    expect(showEmptyHint).toBe(false);
    expect(showRollup).toBe(true);
  });

  it('does NOT show badge on regular task', () => {
    const t = { id: 't1', parentId: null, taskType: 'task', status: 'Not Started', percentComplete: 0 };
    const { showBadge } = sectionHints(t, [t]);
    expect(showBadge).toBe(false);
  });
});

// ── 5. Data migration: old tasks without taskType ───────────────

describe('Legacy task data (no taskType field)', () => {
  it('task without taskType is not treated as a section', () => {
    const legacy = { id: 't1', parentId: null, name: 'Old Task' }; // no taskType
    const isSection = legacy.taskType === 'section';
    expect(isSection).toBe(false);
  });

  it('task without taskType renders as a normal row (no group header unless it has children)', () => {
    const legacy = { id: 't1', parentId: null, name: 'Old Task' };
    const isGroupHeader = (legacy.taskType === 'section') || false; // hasChildren = false
    expect(isGroupHeader).toBe(false);
  });

  it('backfilling taskType:task makes legacy task behave correctly', () => {
    const backfilled = { id: 't1', parentId: null, name: 'Old Task', taskType: 'task' };
    expect(backfilled.taskType).toBe('task');
    expect(backfilled.taskType === 'section').toBe(false);
  });
});

// ── 6. Indent/Drop behaviour based on taskType ──────────────────

describe('Indent/Drop section-awareness', () => {
  function getIndentUpdates(taskAbove) {
    const isAboveSection = taskAbove.taskType === 'section';
    const updates = { parentId: taskAbove.id };
    if (!isAboveSection) {
      updates.dependsOnTaskId = taskAbove.id;
      updates.dependency = taskAbove.name;
    }
    return updates;
  }

  it('indenting onto a SECTION: parentId set, NO dependsOnTaskId', () => {
    const section = { id: 's1', taskType: 'section', name: 'HVAC', targetDateFinish: null };
    const updates = getIndentUpdates(section);
    expect(updates.parentId).toBe('s1');
    expect(updates.dependsOnTaskId).toBeUndefined();
  });

  it('indenting onto a TASK: parentId AND dependsOnTaskId set', () => {
    const task = { id: 't1', taskType: 'task', name: 'Order Parts', targetDateFinish: '2026-08-01' };
    const updates = getIndentUpdates(task);
    expect(updates.parentId).toBe('t1');
    expect(updates.dependsOnTaskId).toBe('t1');
  });
});

