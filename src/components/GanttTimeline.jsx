/* GanttTimeline — Scrollable Gantt Chart — Hawaii Project Manager */
import React, { useMemo, useRef } from 'react';
import { buildTree, flattenTree } from '../utils/treeUtils.js';
import { isoToDate } from '../utils/dateUtils.js';

const ROW_HEIGHT = 28;
const LABEL_WIDTH = 200;
const DAY_WIDTH = 18;

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export default function GanttTimeline({ tasks, onClose, fullPage = false }) {
  const containerRef = useRef(null);

  const flatList = useMemo(() => {
    const tree = buildTree(tasks);
    return flattenTree(tree);
  }, [tasks]);

  const plottable = useMemo(
    () => flatList.filter((t) => t.targetDateStart || t.targetDateFinish),
    [flatList]
  );

  const { minDate, totalDays } = useMemo(() => {
    if (plottable.length === 0) return { minDate: null, totalDays: 0 };
    let min = null;
    let max = null;
    for (const t of plottable) {
      if (t.targetDateStart) {
        const d = isoToDate(t.targetDateStart);
        if (!min || d < min) min = d;
      }
      if (t.targetDateFinish) {
        const d = isoToDate(t.targetDateFinish);
        if (!max || d > max) max = d;
      }
    }
    min = addDays(min, -7);
    max = addDays(max, 14);
    return { minDate: min, totalDays: Math.round((max - min) / 86400000) };
  }, [plottable]);

  if (plottable.length === 0 || !minDate) {
    return (
      <div className="gantt-timeline-panel">
        <div className="gantt-timeline-header">
          <span className="gantt-timeline-title">Gantt Timeline</span>
          {onClose && (
            <button className="gantt-close-btn" onClick={onClose} title="Hide">✕</button>
          )}
        </div>
        <div className="gantt-timeline-empty">No tasks with dates to display.</div>
      </div>
    );
  }

  const chartWidth = totalDays * DAY_WIDTH;
  const chartHeight = plottable.length * ROW_HEIGHT;

  // Build month markers
  const months = [];
  let cursor = new Date(minDate);
  cursor.setUTCDate(1);
  while (cursor.getTime() <= minDate.getTime() + totalDays * 86400000) {
    const x = Math.round((cursor - minDate) / 86400000) * DAY_WIDTH;
    months.push({
      label: cursor.toLocaleString('default', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      x,
    });
    cursor = new Date(cursor);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const now = new Date();
  const todayX = Math.round(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - minDate.getTime()) / 86400000
  ) * DAY_WIDTH;

  return (
    <div className="gantt-timeline-panel">
      <div className="gantt-timeline-header">
        <span className="gantt-timeline-title">📅 Gantt Timeline</span>
        {onClose && (
          <button className="gantt-close-btn" onClick={onClose} title="Hide Timeline">✕</button>
        )}
      </div>
      <div className="gantt-timeline-body" ref={containerRef}>
        {/* Sticky label column */}
        <div className="gantt-labels" style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}>
          <div className="gantt-label-header" style={{ height: ROW_HEIGHT }} />
          {plottable.map((t) => (
            <div
              key={t.id}
              className="gantt-label-row"
              style={{ height: ROW_HEIGHT, paddingLeft: 8 + (t.depth || 0) * 12 }}
            >
              <span
                className={
                  'gantt-label-text' +
                  (t.status === 'Completed' ? ' gantt-label-completed' : '')
                }
                title={t.name}
              >
                {t.name}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable SVG chart */}
        <div className="gantt-chart-scroll">
          <svg
            width={chartWidth}
            height={chartHeight + ROW_HEIGHT}
            style={{ display: 'block' }}
          >
            {/* Month grid + labels */}
            {months.map((m, i) => (
              <g key={i}>
                <line
                  x1={m.x} y1={0} x2={m.x} y2={chartHeight + ROW_HEIGHT}
                  stroke="rgba(255,255,255,0.08)" strokeWidth={1}
                />
                <text
                  x={m.x + 4} y={ROW_HEIGHT - 6}
                  fill="rgba(255,255,255,0.45)" fontSize={10} fontFamily="Inter,sans-serif"
                >
                  {m.label}
                </text>
              </g>
            ))}

            {/* Today line */}
            {todayX >= 0 && todayX <= chartWidth && (
              <g>
                <line
                  x1={todayX} y1={0} x2={todayX} y2={chartHeight + ROW_HEIGHT}
                  stroke="rgba(245,158,11,0.7)" strokeWidth={1.5} strokeDasharray="4 3"
                />
                <text
                  x={todayX + 3} y={ROW_HEIGHT - 6}
                  fill="rgba(245,158,11,0.9)" fontSize={9} fontFamily="Inter,sans-serif"
                >
                  Today
                </text>
              </g>
            )}

            {/* Task bars */}
            {plottable.map((t, i) => {
              const y = ROW_HEIGHT + i * ROW_HEIGHT;
              const startDate = t.targetDateStart ? isoToDate(t.targetDateStart) : null;
              const finishDate = t.targetDateFinish ? isoToDate(t.targetDateFinish) : null;

              let barX = 0;
              let barWidth = 0;
              if (startDate && finishDate) {
                barX = Math.round((startDate - minDate) / 86400000) * DAY_WIDTH;
                barWidth = Math.max(4, Math.round((finishDate - startDate) / 86400000) * DAY_WIDTH);
              } else if (startDate) {
                barX = Math.round((startDate - minDate) / 86400000) * DAY_WIDTH;
                barWidth = DAY_WIDTH * 3;
              } else if (finishDate) {
                barX = Math.round((finishDate - minDate) / 86400000) * DAY_WIDTH - DAY_WIDTH * 3;
                barWidth = DAY_WIDTH * 3;
              }

              const pct = Math.max(0, Math.min(100, t.percentComplete || 0));
              const progressWidth = Math.round(barWidth * pct / 100);
              const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
              const isLate = finishDate && finishDate.getTime() < todayUTC && !t.dateFinished;

              let barColor = 'rgba(100,116,139,0.55)';
              if (t.status === 'Completed') barColor = 'rgba(16,185,129,0.85)';
              else if (isLate) barColor = 'rgba(239,68,68,0.75)';
              else if (t.status === 'In Progress') barColor = 'rgba(59,130,246,0.75)';

              return (
                <g key={t.id}>
                  {i % 2 === 1 && (
                    <rect x={0} y={y} width={chartWidth} height={ROW_HEIGHT} fill="rgba(255,255,255,0.02)" />
                  )}
                  {barWidth > 0 && (
                    <>
                      <rect x={barX} y={y + 5} width={barWidth} height={ROW_HEIGHT - 10} rx={3} fill="rgba(255,255,255,0.06)" />
                      <rect x={barX} y={y + 5} width={barWidth} height={ROW_HEIGHT - 10} rx={3} fill={barColor} />
                      {pct > 0 && pct < 100 && (
                        <rect x={barX} y={y + 5} width={progressWidth} height={ROW_HEIGHT - 10} rx={3} fill="rgba(16,185,129,0.9)" />
                      )}
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}