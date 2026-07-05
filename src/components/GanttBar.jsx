/* ═══════════════════════════════════════════════════════════════
   GanttBar — Inline Timeline Bar — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React from 'react';
import { isLate } from '../utils/dateUtils.js';

export default function GanttBar({ task }) {
  const percent = Math.max(0, Math.min(100, task.percentComplete || 0));
  const late = isLate(task.targetDateFinish, task.dateFinished);

  // Calculate segment widths
  let completedWidth = percent;
  let inProgressWidth = 0;
  let notStartedWidth = 100 - percent;
  let lateWidth = 0;

  if (late) {
    // If late, show the un-done portion as red
    lateWidth = notStartedWidth;
    notStartedWidth = 0;
  } else if (percent > 0 && percent < 100) {
    // Show a small in-progress segment (10% of remaining or at least 5%)
    inProgressWidth = Math.min(notStartedWidth, Math.max(5, notStartedWidth * 0.2));
    notStartedWidth = notStartedWidth - inProgressWidth;
  }

  return (
    <div className="gantt-bar" title={`${percent}% complete`}>
      {completedWidth > 0 && (
        <div
          className="gantt-segment gantt-completed"
          style={{ width: `${completedWidth}%` }}
        />
      )}
      {inProgressWidth > 0 && (
        <div
          className="gantt-segment gantt-in-progress"
          style={{ width: `${inProgressWidth}%` }}
        />
      )}
      {notStartedWidth > 0 && (
        <div
          className="gantt-segment gantt-not-started"
          style={{ width: `${notStartedWidth}%` }}
        />
      )}
      {lateWidth > 0 && (
        <div
          className="gantt-segment gantt-late"
          style={{ width: `${lateWidth}%` }}
        />
      )}
    </div>
  );
}
