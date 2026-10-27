/**
 * Date Cascader — shifts dependent tasks recursively when a prerequisite changes.
 * Mirrors the logic in server/routes/tasks.js
 */

export function getDeltaDays(oldIso, newIso) {
  if (!oldIso || !newIso) return 0;
  const [y1, m1, d1] = oldIso.split('-').map(Number);
  const [y2, m2, d2] = newIso.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / 86400000);
}

export function addDaysToISO(isoStr, days) {
  if (!isoStr || days === 0) return isoStr;
  const [y, m, d] = isoStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yOut = date.getUTCFullYear();
  const mOut = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dOut = String(date.getUTCDate()).padStart(2, '0');
  return `${yOut}-${mOut}-${dOut}`;
}

export function cascadeTaskDates(tasksMap, changedTaskId, deltaDays) {
  if (deltaDays === 0) return;

  // Find all tasks that depend on changedTaskId
  for (const task of Object.values(tasksMap)) {
    if (task.dependsOnTaskId === changedTaskId) {
      if (task.targetDateStart) {
        task.targetDateStart = addDaysToISO(task.targetDateStart, deltaDays);
      }
      if (task.targetDateFinish) {
        task.targetDateFinish = addDaysToISO(task.targetDateFinish, deltaDays);
      }
      // Cascade to any tasks that depend on this successor
      cascadeTaskDates(tasksMap, task.id, deltaDays);
    }
  }
}
