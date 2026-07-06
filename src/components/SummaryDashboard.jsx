import React, { useMemo } from 'react';
import { isLate, formatDate } from '../utils/dateUtils.js';

export default function SummaryDashboard({ tasks = [], maintenanceEntries = [], onFocusSection, onFocusTask }) {

  /* ── Leaf tasks (no children) ────────────────────────── */
  const leafTasks = useMemo(
    () => tasks.filter((t) => !tasks.some((c) => c.parentId === t.id)),
    [tasks]
  );

  /* ── Overall stats ───────────────────────────────────── */
  const stats = useMemo(() => {
    const total      = leafTasks.length;
    const completed  = leafTasks.filter((t) => t.dateFinished || t.status === 'Completed').length;
    const late       = leafTasks.filter((t) => isLate(t.targetDateFinish, t.dateFinished)).length;
    const inProgress = leafTasks.filter((t) => t.status === 'In Progress' && !t.dateFinished).length;
    const notStarted = total - completed - inProgress;
    return {
      total, completed, late, inProgress,
      notStarted: Math.max(0, notStarted),
      pctCompleted:  total ? Math.round((completed  / total) * 100) : 0,
      pctLate:       total ? Math.round((late       / total) * 100) : 0,
      pctInProgress: total ? Math.round((inProgress / total) * 100) : 0,
    };
  }, [leafTasks]);

  /* ── Section (top-level parents) rollups ─────────────── */
  const sections = useMemo(() => {
    const topParents = tasks.filter((t) => t.taskType === 'section');

    function getLeaves(parentId) {
      const direct = tasks.filter((t) => t.parentId === parentId);
      let leaves = [];
      for (const child of direct) {
        if (tasks.some((t) => t.parentId === child.id)) {
          leaves = leaves.concat(getLeaves(child.id));
        } else {
          leaves.push(child);
        }
      }
      return leaves;
    }

    return topParents
      .map((p) => {
        const leaves    = getLeaves(p.id);
        const total     = leaves.length;
        const completedLeaves = leaves.filter((c) => c.dateFinished || c.status === 'Completed');
        const inProgLeaves    = leaves.filter((c) => c.status === 'In Progress' && !c.dateFinished);
        const lateLeaves      = leaves.filter((c) => isLate(c.targetDateFinish, c.dateFinished));
        const notStart  = Math.max(0, total - completedLeaves.length - inProgLeaves.length);
        const pct       = total ? Math.round((completedLeaves.length / total) * 100) : 0;
        // derive earliest start / latest finish from children
        const starts  = leaves.map(l => l.targetDateStart).filter(Boolean).sort();
        const finishes = leaves.map(l => l.targetDateFinish).filter(Boolean).sort();
        return {
          id: p.id, name: p.name, taskType: p.taskType,
          total, notStart, pct,
          completed: completedLeaves.length,
          completedId: completedLeaves.length === 1 ? completedLeaves[0].id : null,
          inProg: inProgLeaves.length,
          inProgId: inProgLeaves.length === 1 ? inProgLeaves[0].id : null,
          lateCount: lateLeaves.length,
          lateId: lateLeaves.length === 1 ? lateLeaves[0].id : null,
          start:  starts[0]  || null,
          finish: finishes[finishes.length - 1] || null,
          order: p.order ?? 0,
        };
      })
      .sort((a, b) => a.order - b.order);
  }, [tasks]);

  /* ── Recent completed ────────────────────────────────── */
  const recentCompleted = useMemo(() =>
    leafTasks
      .filter((t) => t.dateFinished)
      .sort((a, b) => (b.dateFinished || '').localeCompare(a.dateFinished || ''))
      .slice(0, 8),
    [leafTasks]
  );

  if (leafTasks.length === 0) {
    return (
      <div className="empty-state glass-panel fade-in-up">
        <div className="empty-state__icon">📊</div>
        <div className="empty-state__text">No tasks yet</div>
        <div className="empty-state__subtext">Import a project plan to see your dashboard.</div>
      </div>
    );
  }

  const overallBar = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="dashboard-layout">

      {/* ══ TOP: Compact summary strip ══════════════════════════ */}
      <div className="dash-summary-strip glass-panel">
        {/* Big overall progress */}
        <div className="dash-overall">
          <div className="dash-overall-ring">
            <svg viewBox="0 0 44 44" className="dash-ring-svg">
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
              <circle
                cx="22" cy="22" r="18" fill="none"
                stroke={overallBar === 100 ? '#10b981' : overallBar > 50 ? '#3b82f6' : '#f59e0b'}
                strokeWidth="5"
                strokeDasharray={`${(overallBar / 100) * 113.1} 113.1`}
                strokeLinecap="round"
                transform="rotate(-90 22 22)"
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
            </svg>
            <span className="dash-ring-pct">{overallBar}%</span>
          </div>
          <div className="dash-overall-labels">
            <span className="dash-overall-title">Overall Progress</span>
            <span className="dash-overall-sub">{stats.completed} of {stats.total} tasks done</span>
          </div>
        </div>

        {/* Divider */}
        <div className="dash-strip-divider" />

        {/* Mini stat pills */}
        <div className="dash-mini-stats">
          <div className="dash-mini-pill">
            <span className="dash-mini-num" style={{ color: '#10b981' }}>{stats.completed}</span>
            <span className="dash-mini-lbl">Completed</span>
          </div>
          <div className="dash-mini-pill">
            <span className="dash-mini-num" style={{ color: '#3b82f6' }}>{stats.inProgress}</span>
            <span className="dash-mini-lbl">In Progress</span>
          </div>
          <div className="dash-mini-pill">
            <span className="dash-mini-num" style={{ color: '#94a3b8' }}>{stats.notStarted}</span>
            <span className="dash-mini-lbl">Not Started</span>
          </div>
          <div className="dash-mini-pill">
            <span className="dash-mini-num" style={{ color: '#ef4444' }}>{stats.late}</span>
            <span className="dash-mini-lbl">Late</span>
          </div>
          <div className="dash-mini-pill">
            <span className="dash-mini-num" style={{ color: '#f59e0b' }}>{maintenanceEntries.length}</span>
            <span className="dash-mini-lbl">Maint. Logs</span>
          </div>
        </div>
      </div>

      {/* ══ SECTIONS TABLE ══════════════════════════════════════ */}
      {sections.length > 0 && (
        <div className="dash-sections-wrap glass-panel">
          <div className="dash-sections-header">
            <h3 className="dash-sections-title">📁 Section Status</h3>
            <span className="dash-sections-hint">{sections.length} sections</span>
          </div>
          <table className="dash-sections-table">
            <thead>
              <tr>
                <th>Section</th>
                <th style={{ width: 90 }}>Progress</th>
                <th style={{ width: 60 }}>Done</th>
                <th style={{ width: 70 }}>In Prog.</th>
                <th style={{ width: 60 }}>Late</th>
                <th style={{ width: 70 }}>Not Start.</th>
                <th style={{ width: 90 }}>Start</th>
                <th style={{ width: 90 }}>Target End</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => {
                const barColor =
                  s.pct === 100 ? '#10b981' :
                  s.lateCount > 0 ? '#ef4444' :
                  s.pct > 0 ? '#3b82f6' : '#475569';
                return (
                  <tr 
                    key={s.id} 
                    className={`dash-section-row ${s.pct === 100 ? 'dash-section-done' : ''}`}
                    onClick={() => onFocusSection && onFocusSection(s.id)}
                    style={{ cursor: onFocusSection ? 'pointer' : 'default' }}
                  >
                    <td className="dash-section-name">{s.name}</td>
                    <td>
                      <div className="dash-prog-track">
                        <div
                          className="dash-prog-fill"
                          style={{ width: `${s.pct}%`, background: barColor }}
                        />
                        <span className="dash-prog-label">{s.pct}%</span>
                      </div>
                    </td>
                    <td 
                      className="dash-cell-num" 
                      style={{ color: '#10b981', cursor: s.completedId && onFocusTask ? 'pointer' : 'inherit', textDecoration: s.completedId && onFocusTask ? 'underline' : 'none' }}
                      onClick={(e) => {
                        if (s.completedId && onFocusTask) {
                          e.stopPropagation();
                          onFocusTask(s.completedId);
                        }
                      }}
                    >
                      {s.completed}
                    </td>
                    <td 
                      className="dash-cell-num" 
                      style={{ color: '#3b82f6', cursor: s.inProgId && onFocusTask ? 'pointer' : 'inherit', textDecoration: s.inProgId && onFocusTask ? 'underline' : 'none' }}
                      onClick={(e) => {
                        if (s.inProgId && onFocusTask) {
                          e.stopPropagation();
                          onFocusTask(s.inProgId);
                        }
                      }}
                    >
                      {s.inProg}
                    </td>
                    <td 
                      className="dash-cell-num" 
                      style={{ color: s.lateCount > 0 ? '#ef4444' : '#64748b', cursor: s.lateId && onFocusTask ? 'pointer' : 'inherit', textDecoration: s.lateId && onFocusTask ? 'underline' : 'none' }}
                      onClick={(e) => {
                        if (s.lateId && onFocusTask) {
                          e.stopPropagation();
                          onFocusTask(s.lateId);
                        }
                      }}
                    >
                      {s.lateCount > 0 ? `⚠ ${s.lateCount}` : '—'}
                    </td>
                    <td className="dash-cell-num" style={{ color: '#94a3b8' }}>{s.notStart}</td>
                    <td className="dash-cell-date">{s.start ? formatDate(s.start) : '—'}</td>
                    <td className="dash-cell-date">{s.finish ? formatDate(s.finish) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ RECENT ACTIVITY ═════════════════════════════════════ */}
      {recentCompleted.length > 0 && (
        <div className="dash-recent glass-panel">
          <h3 className="dash-sections-title">🕐 Recently Completed</h3>
          <div className="dash-recent-list">
            {recentCompleted.map((t) => (
              <div key={t.id} className="dash-recent-item">
                <span className="dash-recent-dot" />
                <span className="dash-recent-name">{t.name}</span>
                <span className="dash-recent-date">{formatDate(t.dateFinished)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
