/* ═══════════════════════════════════════════════════════════════
   Color Utilities — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import { isBeforeTarget } from './dateUtils.js';

/**
 * Return the CSS class name for a task row based on its status.
 *  - 'row-late'      → if the task is past its target finish and not done
 *  - 'row-due-soon'  → if the task is due within 3 days and not done
 *  - 'row-completed' → if the task is finished
 *  - 'row-default'   → otherwise
 */
export function getRowClass(task) {
  if (!task) return 'row-default';

  if (task.status === 'Completed' || task.percentComplete === 100 || task.dateFinished) {
    return 'row-completed';
  }

  // Calculate days remaining
  let daysRemaining = null;
  if (task.targetDateFinish) {
    const target = new Date(task.targetDateFinish);
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    daysRemaining = (target.getTime() - todayUTC) / 86400000;
  }

  const isOverdue = daysRemaining !== null && daysRemaining < 0;
  const inProgress = task.status === 'In Progress' || task.percentComplete > 0;

  // RED MEANS LATE whether started or not
  if (isOverdue) {
    return 'row-border-red';
  }

  // YELLOW MEANS IN PROGRESS WITHIN 1 day of finish target OR NOT STARTED and within 2 days of target completion
  if (daysRemaining !== null) {
    if ((inProgress && daysRemaining <= 1) || (!inProgress && daysRemaining <= 2)) {
      return 'row-border-yellow';
    }
  }

  // GREEN side bar MEANS IN PROGRESS NOT LATE
  if (inProgress) {
    return 'row-border-green';
  }

  return 'row-default';
}

/**
 * Return a cell highlight class for date comparison.
 *  - 'cell-green' → actual date is before target
 *  - 'cell-red'   → actual date is on or after target
 *  - ''           → if either date is missing
 */
export function getDateCellClass(actualDate, targetDate) {
  if (!actualDate || !targetDate) return '';
  if (isBeforeTarget(actualDate, targetDate)) {
    return 'cell-green';
  }
  return 'cell-red';
}

/**
 * Return a CSS background gradient string for percent complete.
 * The fill is proportional to the percent value.
 * Color ramps from red (0%) → amber (50%) → green (100%).
 */
export function getPercentGradient(percent) {
  const p = Math.max(0, Math.min(100, percent || 0));

  let r, g, b;

  if (p <= 50) {
    // Red (#ef4444) → Amber (#f59e0b)
    const t = p / 50;
    r = Math.round(239 + (245 - 239) * t);
    g = Math.round(68 + (158 - 68) * t);
    b = Math.round(68 + (11 - 68) * t);
  } else {
    // Amber (#f59e0b) → Green (#10b981)
    const t = (p - 50) / 50;
    r = Math.round(245 + (16 - 245) * t);
    g = Math.round(158 + (185 - 158) * t);
    b = Math.round(11 + (129 - 11) * t);
  }

  const color = `rgb(${r}, ${g}, ${b})`;
  const bgColor = `rgba(${r}, ${g}, ${b}, 0.2)`;

  // A linear gradient that fills `p%` with the accent color, then transparent
  return `linear-gradient(90deg, ${color} 0%, ${color} ${p}%, ${bgColor} ${p}%, ${bgColor} 100%)`;
}
