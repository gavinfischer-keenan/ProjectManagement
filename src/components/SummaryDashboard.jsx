import React, { useMemo } from 'react';
import { isLate, formatDate } from '../utils/dateUtils.js';

export default function SummaryDashboard({ tasks = [], owners = [], maintenanceEntries = [], onFocusSection, onFocusTask }) {

  /* ── Leaf tasks (no children) ────────────────────────── */
  const leafTasks = useMemo(
    () => tasks.filter((t) => !tasks.some((c) => c.parentId === t.id)),
    [tasks]
  );

  /* ── Overall stats ───────────────────────────────────── */
  const stats = useMemo(() => {
    const total      = leafTasks.length;
    const completed  = leafTasks.filter((t) => t.dateFinished || t.status === 'Completed').length;
    const late       = leafTasks.filter((t) => isLate(t.targetDateFinish, t.dateFinished) && t.status !== 'Completed').length;
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
        const lateLeaves      = leaves.filter((c) => isLate(c.targetDateFinish, c.dateFinished) && c.status !== 'Completed');
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
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
  }, [tasks]);

  /* ── Last 7 days Milestones ──────────────────────────── */
  const recentCompleted = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const limitDate = sevenDaysAgo.toISOString().split('T')[0];

    return leafTasks
      .filter((t) => (t.status === 'Completed' || t.dateFinished) && t.isMilestone)
      .filter((t) => {
         const d = t.dateFinished || t.targetDateFinish;
         return d && d >= limitDate;
      })
      .sort((a, b) => {
         const dateA = a.dateFinished || a.targetDateFinish || '';
         const dateB = b.dateFinished || b.targetDateFinish || '';
         return dateB.localeCompare(dateA);
      });
  }, [leafTasks]);

  /* ── Currently Late ──────────────────────────────────── */
  const currentlyLate = useMemo(() => {
    return leafTasks
      .filter((t) => isLate(t.targetDateFinish, t.dateFinished) && t.status !== 'Completed')
      .sort((a, b) => (a.targetDateFinish || '').localeCompare(b.targetDateFinish || ''));
  }, [leafTasks]);

  /* ── Owners stats ────────────────────────────────────── */
  const ownerStats = useMemo(() => {
    if (!owners) return [];
    
    // Ordered predefined list
    const predefinedOrder = ['Gavin', 'Trish', 'Chris', 'Jamie'];
    
    const statsList = owners.map(o => {
      const oTasks = leafTasks.filter(t => t.ownerId === o.id);
      const total = oTasks.length;
      const completed = oTasks.filter((t) => t.dateFinished || t.status === 'Completed').length;
      return {
        ...o,
        total,
        completed,
        pctCompleted: total ? Math.round((completed / total) * 100) : 0,
      };
    });

    // Sort by predefined order, then by total tasks descending
    statsList.sort((a, b) => {
      const idxA = predefinedOrder.indexOf(a.name);
      const idxB = predefinedOrder.indexOf(b.name);
      
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return b.total - a.total;
    });
    
    return statsList.filter(o => o.total > 0 || predefinedOrder.includes(o.name));
  }, [leafTasks, owners]);

  /* ── Repairs and Installations ─────────────────────────── */
  const repairsAndInstalls = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const limitDate = sevenDaysAgo.toISOString().split('T')[0];

    const manual = maintenanceEntries.map(e => ({
      id: e.id,
      name: e.description,
      date: e.dateOfRepair || '',
      status: 'Completed',
    }));

    const derived = tasks
      .filter(t => t.status === 'Completed' && t.isHardware)
      .map(t => ({
        id: `derived-hardware-${t.id}`,
        name: t.hardwareText || `Hardware installed for ${t.name}`,
        date: t.dateFinished || t.targetDateFinish || '',
        status: 'Completed',
      }));

    const all = [...manual, ...derived].filter(e => e.date && e.date >= limitDate);
    all.sort((a, b) => b.date.localeCompare(a.date));
    return all;
  }, [maintenanceEntries, tasks]);

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
        </div>
      </div>

      {/* ══ DUAL COLUMN LAYOUT ═════════════════════════════════ */}
      <div className="dash-two-column" style={{ marginTop: '1.5rem' }}>
        
        {/* LEFT COLUMN: Owners */}
        <div className="dash-col-left">
          {ownerStats.map(o => {
            const bar = o.pctCompleted;
            return (
              <div key={o.id} className="dash-summary-strip glass-panel" style={{ padding: '0.75rem 1.25rem', minHeight: 'auto', marginBottom: 0 }}>
                <div className="dash-overall" style={{ flex: '1', minWidth: '160px' }}>
                  <div className="dash-overall-ring" style={{ width: 44, height: 44 }}>
                    <svg viewBox="0 0 44 44" className="dash-ring-svg">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                      <circle
                        cx="22" cy="22" r="18" fill="none"
                        stroke={bar === 100 ? '#10b981' : bar > 50 ? '#3b82f6' : '#f59e0b'}
                        strokeWidth="5"
                        strokeDasharray={`${(bar / 100) * 113.1} 113.1`}
                        strokeLinecap="round"
                        transform="rotate(-90 22 22)"
                        style={{ transition: 'stroke-dasharray 0.8s ease' }}
                      />
                    </svg>
                    <span className="dash-ring-pct" style={{ fontSize: '0.7rem' }}>{bar}%</span>
                  </div>
                  <div className="dash-overall-labels">
                    <span className="dash-overall-title" style={{ fontSize: '1rem' }}>{o.name}</span>
                    <span className="dash-overall-sub">{o.completed} of {o.total} done</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: Lists */}
        <div className="dash-col-right">
          
          {/* Currently Late */}
          <div className="dash-recent glass-panel">
            <h3 className="dash-sections-title" style={{ color: '#ef4444' }}>⚠️ Currently Late</h3>
            <div className="dash-recent-list">
              {currentlyLate.length === 0 && <div style={{ opacity: 0.6, fontSize: '0.85rem' }}>No late tasks! 🎉</div>}
              {currentlyLate.map((t) => (
                <div key={t.id} className="dash-recent-item" onClick={() => onFocusTask && onFocusTask(t.id)} style={{ cursor: 'pointer' }}>
                  <span className="dash-recent-dot" style={{ background: '#ef4444' }} />
                  <span className="dash-recent-name">{t.name}</span>
                  <span className="dash-recent-date" style={{ color: '#ef4444' }}>Due {formatDate(t.targetDateFinish)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Last 7 days Milestones */}
          <div className="dash-recent glass-panel">
            <h3 className="dash-sections-title" style={{ color: '#10b981' }}>✅ Last 7 days Milestones</h3>
            <div className="dash-recent-list">
              {recentCompleted.length === 0 && <div style={{ opacity: 0.6, fontSize: '0.85rem' }}>No milestones completed recently.</div>}
              {recentCompleted.map((t) => (
                <div key={t.id} className="dash-recent-item" onClick={() => onFocusTask && onFocusTask(t.id)} style={{ cursor: 'pointer' }}>
                  <span className="dash-recent-dot" style={{ background: '#10b981' }} />
                  <span className="dash-recent-name">{t.name}</span>
                  <span className="dash-recent-date">{formatDate(t.dateFinished)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Repairs and Installations */}
          <div className="dash-recent glass-panel">
            <h3 className="dash-sections-title" style={{ color: '#3b82f6' }}>🔧 Last 7 days repairs and installations</h3>
            <div className="dash-recent-list">
              {repairsAndInstalls.length === 0 && <div style={{ opacity: 0.6, fontSize: '0.85rem' }}>No entries found.</div>}
              {repairsAndInstalls.map((t) => (
                <div key={t.id} className="dash-recent-item" onClick={() => { if (!t.id.startsWith('derived-')) { /* open maintenance log */ } }} style={{ cursor: 'pointer' }}>
                  <span className="dash-recent-dot" style={{ background: '#3b82f6' }} />
                  <span className="dash-recent-name">{t.name}</span>
                  <span className="dash-recent-date" style={{ color: '#94a3b8' }}>
                    {t.date ? formatDate(t.date) : 'No date'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
