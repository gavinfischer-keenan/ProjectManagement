import React, { useMemo } from 'react';
import { isLate, formatDate } from '../utils/dateUtils.js';

export default function SummaryDashboard({ tasks = [], maintenanceEntries = [] }) {
  /* Identify leaf tasks (not parents) */
  const leafTasks = useMemo(
    () => tasks.filter((t) => !tasks.some((c) => c.parentId === t.id)),
    [tasks]
  );

  /* Overall stats */
  const stats = useMemo(() => {
    const total = leafTasks.length;
    const completed = leafTasks.filter((t) => t.dateFinished || t.status === 'Completed').length;
    const late = leafTasks.filter((t) => isLate(t)).length;
    const inProgress = leafTasks.filter(
      (t) => t.status === 'In Progress' && !t.dateFinished
    ).length;

    return {
      total,
      completed,
      late,
      inProgress,
      pctCompleted: total ? Math.round((completed / total) * 100) : 0,
      pctLate: total ? Math.round((late / total) * 100) : 0,
      pctInProgress: total ? Math.round((inProgress / total) * 100) : 0,
    };
  }, [leafTasks]);

  /* Top-level parents with children */
  const rollups = useMemo(() => {
    const topLevelParents = tasks.filter(
      (t) => t.parentId === null && tasks.some((c) => c.parentId === t.id)
    );

    function getAllDescendantLeaves(parentId) {
      const directChildren = tasks.filter((t) => t.parentId === parentId);
      let leaves = [];
      for (const child of directChildren) {
        const hasChildren = tasks.some((t) => t.parentId === child.id);
        if (hasChildren) {
          leaves = leaves.concat(getAllDescendantLeaves(child.id));
        } else {
          leaves.push(child);
        }
      }
      return leaves;
    }

    return topLevelParents
      .map((parent) => {
        const children = getAllDescendantLeaves(parent.id);
        const total = children.length;
        const completed = children.filter((c) => c.dateFinished || c.status === 'Completed').length;
        const inProgress = children.filter(
          (c) => c.status === 'In Progress' && !c.dateFinished
        ).length;
        const late = children.filter((c) => isLate(c)).length;
        const notStarted = total - completed - inProgress;
        const pct = total ? Math.round((completed / total) * 100) : 0;

        return {
          id: parent.id,
          name: parent.name,
          total,
          completed,
          inProgress,
          late,
          notStarted: notStarted > 0 ? notStarted : 0,
          pct,
        };
      })
      .sort((a, b) => a.pct - b.pct); // least complete first
  }, [tasks]);

  /* Recent completed tasks (last 5) */
  const recentCompleted = useMemo(() => {
    return leafTasks
      .filter((t) => t.dateFinished)
      .sort((a, b) => (b.dateFinished || '').localeCompare(a.dateFinished || ''))
      .slice(0, 5);
  }, [leafTasks]);

  const statCards = [
    { icon: '📋', number: stats.total, label: 'Total Tasks', color: 'var(--text-primary)', accent: 'var(--navy-lighter)' },
    { icon: '✅', number: `${stats.pctCompleted}%`, label: 'Completed', color: 'var(--emerald)', accent: 'var(--emerald)' },
    { icon: '⚠️', number: `${stats.pctLate}%`, label: 'Late', color: 'var(--coral)', accent: 'var(--coral)' },
    { icon: '🔄', number: `${stats.pctInProgress}%`, label: 'In Progress', color: 'var(--amber)', accent: 'var(--amber)' },
  ];

  return (
    <div>
      <h2 className="section-title">📊 Dashboard</h2>

      {/* Section 1: Overall Stats */}
      <div className="stats-grid stagger-children">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card glass-panel-sm fade-in-up">
            <div className="stat-card__accent" style={{ background: card.accent }} />
            <div className="stat-card__icon">{card.icon}</div>
            <div className="stat-card__number" style={{ color: card.color }}>
              {card.number}
            </div>
            <div className="stat-card__label">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Section 2: Per-Parent Rollups */}
      {rollups.length > 0 && (
        <>
          <h3 className="section-title">📁 Category Progress</h3>
          <div className="rollup-grid stagger-children">
            {rollups.map((r) => (
              <div key={r.id} className="rollup-card glass-panel-sm fade-in-up">
                <div className="rollup-card__title">{r.name}</div>
                <div className="rollup-card__progress-text">
                  <span>{r.completed} of {r.total} tasks completed</span>
                  <span className="rollup-card__percent">{r.pct}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar__fill progress-bar__fill--animated"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
                <div className="rollup-card__breakdown">
                  {r.completed > 0 && (
                    <span className="rollup-tag rollup-tag--completed">
                      {r.completed} completed
                    </span>
                  )}
                  {r.inProgress > 0 && (
                    <span className="rollup-tag rollup-tag--progress">
                      {r.inProgress} in progress
                    </span>
                  )}
                  {r.notStarted > 0 && (
                    <span className="rollup-tag rollup-tag--not-started">
                      {r.notStarted} not started
                    </span>
                  )}
                  {r.late > 0 && (
                    <span className="rollup-tag rollup-tag--late">
                      {r.late} late
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Section 3: Recent Activity */}
      {recentCompleted.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>🕐 Recent Activity</h3>
          <ul className="activity-list">
            {recentCompleted.map((t) => (
              <li key={t.id} className="activity-item">
                <span className="activity-item__dot" />
                <span>{t.name}</span>
                <span className="activity-item__date">{formatDate(t.dateFinished)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {leafTasks.length === 0 && (
        <div className="empty-state glass-panel fade-in-up">
          <div className="empty-state__icon">📊</div>
          <div className="empty-state__text">No tasks yet</div>
          <div className="empty-state__subtext">Import a project plan to see your dashboard.</div>
        </div>
      )}
    </div>
  );
}
