/* ═══════════════════════════════════════════════════════════════
   Tree Utilities — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

/**
 * Build a nested tree from a flat array of tasks.
 * Each task should have `id` and `parentId` (null for top-level).
 * Tasks get a `children` array. Sorted by `order` within each level.
 */
export function buildTree(flatTasks) {
  if (!flatTasks || flatTasks.length === 0) return [];

  const taskMap = new Map();
  const roots = [];

  // Index all tasks by id
  for (const task of flatTasks) {
    taskMap.set(task.id, { ...task, children: [] });
  }

  // Build parent-child relationships
  for (const task of flatTasks) {
    const node = taskMap.get(task.id);
    if (task.parentId && taskMap.has(task.parentId)) {
      taskMap.get(task.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children at every level by `order`
  const sortChildren = (nodes) => {
    nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    }
  };

  sortChildren(roots);
  return roots;
}

/**
 * Flatten a tree back to a flat array (depth-first).
 * Each task gets a `depth` property (0 for root).
 */
export function flattenTree(tree, depth = 0) {
  const result = [];
  for (const node of tree) {
    result.push({ ...node, depth, hasChildren: node.children && node.children.length > 0 });
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

/**
 * Calculate dependency depth for a flattened array of tasks.
 * If A->B->C, A is depDepth 0, B is 1, C is 2.
 * Uses memoization so each chain is traversed at most once (O(n) total).
 */
export function applyDependencyDepths(flatTasks) {
  const taskMap = new Map();
  flatTasks.forEach(t => taskMap.set(t.id, t));
  const cache = new Map();

  const getDepDepth = (taskId, visited = new Set()) => {
    if (!taskId) return 0;
    if (cache.has(taskId)) return cache.get(taskId);
    if (visited.has(taskId)) return 0; // circular dependency protection
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task || !task.dependsOnTaskId) {
      cache.set(taskId, 0);
      return 0;
    }

    const depth = 1 + getDepDepth(task.dependsOnTaskId, visited);
    cache.set(taskId, depth);
    return depth;
  };

  return flatTasks.map(task => ({
    ...task,
    depDepth: getDepDepth(task.id)
  }));
}

/**
 * Get all descendant IDs for a given task ID.
 */
export function getDescendantIds(taskId, flatTasks) {
  const descendants = [];
  const directChildren = flatTasks.filter((t) => t.parentId === taskId);

  for (const child of directChildren) {
    descendants.push(child.id);
    descendants.push(...getDescendantIds(child.id, flatTasks));
  }

  return descendants;
}

/**
 * Collect all leaf descendants (tasks with no children) under a given parentId.
 */
function getAllLeafDescendants(parentId, allTasks) {
  const directChildren = allTasks.filter((t) => t.parentId === parentId);
  if (directChildren.length === 0) return [];
  let leaves = [];
  for (const child of directChildren) {
    const grandchildren = allTasks.filter((t) => t.parentId === child.id);
    if (grandchildren.length === 0) {
      leaves.push(child); // It's a leaf
    } else {
      leaves = leaves.concat(getAllLeafDescendants(child.id, allTasks));
    }
  }
  return leaves;
}

/**
 * Calculate rollup stats for a parent/section from ALL descendant leaf tasks.
 * Returns { percentComplete, status, totalChildren, completedChildren, lateChildren }.
 */
export function calculateRollup(parentTask, allTasks) {
  const directChildren = allTasks.filter((t) => t.parentId === parentTask.id);
  if (directChildren.length === 0) {
    return {
      percentComplete: parentTask.percentComplete || 0,
      status: parentTask.status || 'Not Started',
      totalChildren: 0,
      completedChildren: 0,
      lateChildren: 0,
    };
  }

  // For display in the badge (X/Y done), use direct children count
  const totalChildren = directChildren.length;
  const completedChildren = directChildren.filter(
    (c) => c.status === 'Completed' || c.percentComplete === 100
  ).length;

  // For percentComplete, use all leaf descendants for accurate rollup
  const leaves = getAllLeafDescendants(parentTask.id, allTasks);
  const totalLeaves = leaves.length || 1; // avoid div by zero

  const lateChildren = leaves.filter((c) => {
    if (c.dateFinished) return false;
    if (!c.targetDateFinish) return false;
    return new Date(c.targetDateFinish) < new Date();
  }).length;

  const percentComplete = Math.round(
    leaves.reduce((sum, c) => sum + (c.percentComplete || 0), 0) / totalLeaves
  );

  let status;
  if (completedChildren === totalChildren && totalChildren > 0) {
    status = 'Completed';
  } else if (directChildren.some((c) => c.status === 'In Progress' || (c.percentComplete || 0) > 0)) {
    status = 'In Progress';
  } else {
    status = 'Not Started';
  }

  return { percentComplete, status, totalChildren, completedChildren, lateChildren };
}


/**
 * Check if a task can start (its dependency predecessor is completed).
 * Returns { canStart: boolean, blockedBy: string|null }.
 */
export function canStartTask(task, allTasks) {
  if (!task.dependsOnTaskId) {
    return { canStart: true, blockedBy: null };
  }

  const predecessor = allTasks.find((t) => t.id === task.dependsOnTaskId);
  if (!predecessor) {
    // Predecessor not found — allow start
    return { canStart: true, blockedBy: null };
  }

  if (predecessor.status === 'Completed' || predecessor.percentComplete === 100) {
    return { canStart: true, blockedBy: null };
  }

  return {
    canStart: false,
    blockedBy: predecessor.name || predecessor.id,
  };
}

/**
 * Re-number the `order` field of all siblings under a given parentId
 * to be sequential (0, 1, 2, ...).
 * Returns a new array with updated order values.
 */
export function reorderSiblings(tasks, parentId) {
  const siblings = tasks
    .filter((t) => t.parentId === (parentId || null))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const updates = [];
  siblings.forEach((task, idx) => {
    if (task.order !== idx) {
      updates.push({ ...task, order: idx });
    }
  });

  if (updates.length === 0) return tasks;

  const updateMap = new Map(updates.map((u) => [u.id, u]));
  return tasks.map((t) => (updateMap.has(t.id) ? updateMap.get(t.id) : t));
}
