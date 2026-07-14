import { describe, it, expect } from 'vitest';
import {
  buildTree,
  flattenTree,
  getDescendantIds,
  calculateRollup,
  canStartTask,
} from '../utils/treeUtils.js';

// ── Fixtures ────────────────────────────────────────────────────
const makeTasks = () => [
  { id: 'root1', parentId: null, order: 0, name: 'Section A', taskType: 'section', status: 'Not Started', percentComplete: 0 },
  { id: 'task1', parentId: 'root1', order: 0, name: 'Task 1', taskType: 'task', status: 'Completed', percentComplete: 100 },
  { id: 'task2', parentId: 'root1', order: 1, name: 'Task 2', taskType: 'task', status: 'In Progress', percentComplete: 50 },
  { id: 'root2', parentId: null, order: 1, name: 'Root Task', taskType: 'task', status: 'Not Started', percentComplete: 0 },
];

// ── buildTree ───────────────────────────────────────────────────
describe('buildTree', () => {
  it('creates top-level roots', () => {
    const tree = buildTree(makeTasks());
    expect(tree.length).toBe(2);
    expect(tree[0].id).toBe('root1');
    expect(tree[1].id).toBe('root2');
  });

  it('nests children under correct parent', () => {
    const tree = buildTree(makeTasks());
    const section = tree[0];
    expect(section.children.length).toBe(2);
    expect(section.children[0].id).toBe('task1');
  });

  it('returns empty array for empty input', () => {
    expect(buildTree([])).toEqual([]);
  });

  it('sorts children by order', () => {
    const tasks = [
      { id: 'p', parentId: null, order: 0, name: 'Parent', taskType: 'section' },
      { id: 'c2', parentId: 'p', order: 1, name: 'Second' },
      { id: 'c1', parentId: 'p', order: 0, name: 'First' },
    ];
    const tree = buildTree(tasks);
    expect(tree[0].children[0].id).toBe('c1');
    expect(tree[0].children[1].id).toBe('c2');
  });
});

// ── flattenTree ─────────────────────────────────────────────────
describe('flattenTree', () => {
  it('produces flat list with correct depths', () => {
    const tree = buildTree(makeTasks());
    const flat = flattenTree(tree);
    const section = flat.find((t) => t.id === 'root1');
    const child = flat.find((t) => t.id === 'task1');
    expect(section.depth).toBe(0);
    expect(child.depth).toBe(1);
  });

  it('marks hasChildren correctly', () => {
    const tree = buildTree(makeTasks());
    const flat = flattenTree(tree);
    const section = flat.find((t) => t.id === 'root1');
    const child = flat.find((t) => t.id === 'task1');
    expect(section.hasChildren).toBe(true);
    expect(child.hasChildren).toBe(false);
  });
});

// ── getDescendantIds ────────────────────────────────────────────
describe('getDescendantIds', () => {
  it('returns all descendant ids', () => {
    const tasks = makeTasks();
    const ids = getDescendantIds('root1', tasks);
    expect(ids).toContain('task1');
    expect(ids).toContain('task2');
    expect(ids).not.toContain('root2');
  });

  it('returns empty array for leaf task', () => {
    expect(getDescendantIds('task1', makeTasks())).toEqual([]);
  });
});

// ── calculateRollup ─────────────────────────────────────────────
describe('calculateRollup', () => {
  it('calculates percent from leaf descendants', () => {
    const tasks = makeTasks(); // task1=100%, task2=50%
    const parent = tasks[0]; // root1 (section)
    const rollup = calculateRollup(parent, tasks);
    // Average of 100 and 50 = 75
    expect(rollup.percentComplete).toBe(75);
  });

  it('reports correct totalChildren and completedChildren', () => {
    const tasks = makeTasks();
    const rollup = calculateRollup(tasks[0], tasks);
    expect(rollup.totalChildren).toBe(2);
    expect(rollup.completedChildren).toBe(1);
  });

  it('returns Completed when all children done', () => {
    const tasks = [
      { id: 'p', parentId: null, order: 0, name: 'P', taskType: 'section', status: 'Not Started', percentComplete: 0 },
      { id: 'c1', parentId: 'p', order: 0, name: 'C1', taskType: 'task', status: 'Completed', percentComplete: 100 },
      { id: 'c2', parentId: 'p', order: 1, name: 'C2', taskType: 'task', status: 'Completed', percentComplete: 100 },
    ];
    const rollup = calculateRollup(tasks[0], tasks);
    expect(rollup.status).toBe('Completed');
  });

  it('handles no children gracefully', () => {
    const task = { id: 'lone', parentId: null, status: 'Not Started', percentComplete: 30 };
    const rollup = calculateRollup(task, [task]);
    expect(rollup.percentComplete).toBe(30);
    expect(rollup.totalChildren).toBe(0);
  });
});

// ── canStartTask ────────────────────────────────────────────────
describe('canStartTask', () => {
  it('returns canStart true when no dependency', () => {
    const task = { id: 't1', dependsOnTaskId: null };
    expect(canStartTask(task, [task]).canStart).toBe(true);
  });

  it('returns canStart false when predecessor not completed', () => {
    const pred = { id: 'pred', status: 'In Progress', percentComplete: 50, dateFinished: null };
    const task = { id: 't1', dependsOnTaskId: 'pred' };
    const result = canStartTask(task, [pred, task]);
    expect(result.canStart).toBe(false);
    expect(result.blockedBy).toBe('pred');
  });

  it('returns canStart true when predecessor is completed', () => {
    const pred = { id: 'pred', status: 'Completed', percentComplete: 100, dateFinished: '2026-01-01' };
    const task = { id: 't1', dependsOnTaskId: 'pred' };
    expect(canStartTask(task, [pred, task]).canStart).toBe(true);
  });
});

