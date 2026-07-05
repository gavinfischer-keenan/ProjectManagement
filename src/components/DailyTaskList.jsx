import React, { useMemo, useCallback } from 'react';
import { today, isLate, formatDate, daysOverdue } from '../utils/dateUtils.js';
import { updateTask } from '../api/client.js';

export default function DailyTaskList({ tasks = [], onTaskUpdate, onShowMaintenancePrompt }) {
  const todayStr = today();

  /* Look up whether a dependency task is incomplete */
  const isBlocked = useCallback(
    (task) => {
      if (!task.dependsOnTaskId) return false;
      const dep = tasks.find((t) => t.id === task.dependsOnTaskId);
      return dep && !dep.dateFinished;
    },
    [tasks]
  );

  /* Leaf tasks only (not parent containers) */
  const leafTasks = useMemo(
    () => tasks.filter((t) => !tasks.some((c) => c.parentId === t.id)),
    [tasks]
  );

  /* Categorize */
  const { toDo, inProgress, unscheduled } = useMemo(() => {
    const toDo = [];
    const inProgress = [];
    const unscheduled = [];

    for (const t of leafTasks) {
      if (t.dateFinished) continue; // already finished
      if (isBlocked(t)) continue; // do not show blocked tasks

      if (t.status === 'In Progress') {
        inProgress.push(t);
      } else if (!t.targetDateStart) {
        unscheduled.push(t);
      } else if (t.targetDateStart <= todayStr) {
        toDo.push(t);
      }
    }

    // Sort toDo by earliest target finish date
    toDo.sort((a, b) => (a.targetDateFinish || '').localeCompare(b.targetDateFinish || ''));

    return { toDo, inProgress, unscheduled };
  }, [leafTasks, todayStr, isBlocked]);

  const isEmpty = toDo.length === 0 && inProgress.length === 0 && unscheduled.length === 0;

  /* Quick actions */
  const handleStart = useCallback(
    async (task) => {
      try {
        const updated = await updateTask(task.id, {
          dateStarted: todayStr,
          status: 'In Progress',
        });
        if (onTaskUpdate) onTaskUpdate(updated);
      } catch (err) {
        console.error('Failed to start task:', err);
      }
    },
    [todayStr, onTaskUpdate]
  );

  const handleComplete = useCallback(
    async (task) => {
      try {
        const updated = await updateTask(task.id, {
          dateFinished: todayStr,
          status: 'Completed',
          percentComplete: 100,
        });
        if (onTaskUpdate) onTaskUpdate(updated);
        if (onShowMaintenancePrompt) onShowMaintenancePrompt(task);
      } catch (err) {
        console.error('Failed to complete task:', err);
      }
    },
    [todayStr, onTaskUpdate, onShowMaintenancePrompt]
  );

  /* Helper: parent name */
  const parentName = useCallback(
    (task) => {
      if (!task.parentId) return null;
      const parent = tasks.find((t) => t.id === task.parentId);
      return parent ? parent.name : null;
    },
    [tasks]
  );

  /* Render a single task card */
  function TaskCard({ task }) {
    const blocked = isBlocked(task);
    const overdueDays = daysOverdue(task);

    return (
      <div className={`task-card glass-panel-sm fade-in-up ${blocked ? 'task-card--blocked' : ''}`}>
        <div className="task-card__header">
          <div>
            <div className="task-card__name">
              {blocked && <span className="task-card__blocked-icon">🔒</span>}
              {task.name}
            </div>
            {parentName(task) && (
              <div className="task-card__parent">{parentName(task)}</div>
            )}
          </div>
          {overdueDays > 0 && (
            <span className="task-card__overdue-badge">
              {overdueDays}d overdue
            </span>
          )}
        </div>

        <div className="task-card__meta">
          {task.targetDateFinish && (
            <span className="task-card__meta-item">
              📅 {formatDate(task.targetDateFinish)}
            </span>
          )}
          {task.percentComplete != null && (
            <span className="task-card__meta-item">
              📊 {task.percentComplete}%
            </span>
          )}
          {task.status && (
            <span className="task-card__meta-item">
              ● {task.status}
            </span>
          )}
        </div>

        <div className="task-card__actions">
          {!task.dateStarted && (
            <button
              className="btn btn--primary btn--sm"
              disabled={blocked}
              onClick={() => handleStart(task)}
              title={blocked ? 'Blocked by dependency' : 'Start task'}
            >
              ▶ Start
            </button>
          )}
          {!task.dateFinished && (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => handleComplete(task)}
            >
              ✓ Complete
            </button>
          )}
          <button className="btn btn--ghost btn--sm">✏️ Edit</button>
        </div>
      </div>
    );
  }

  /* Render a section */
  function Section({ title, titleClass, badgeClass, items }) {
    if (items.length === 0) return null;
    return (
      <div className="task-section">
        <div className="task-section__header">
          <span className={`task-section__title ${titleClass}`}>{title}</span>
          <span className={`count-badge ${badgeClass}`}>{items.length}</span>
        </div>
        <div className="stagger-children">
          {items.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title">📋 Today&rsquo;s Tasks</h2>
      <p className="section-subtitle">{formatDate(todayStr)}</p>

      {isEmpty ? (
        <div className="empty-state glass-panel fade-in-up">
          <div className="empty-state__icon">🎉</div>
          <div className="empty-state__text">All caught up!</div>
          <div className="empty-state__subtext">No active, in-progress, or unscheduled tasks.</div>
        </div>
      ) : (
        <>
          <Section
            title="IN PROGRESS"
            titleClass="task-section__title--progress"
            badgeClass="count-badge--emerald"
            items={inProgress}
          />
          <Section
            title="AVAILABLE TO START"
            titleClass="task-section__title--overdue"
            badgeClass="count-badge--coral"
            items={toDo}
          />
          <Section
            title="UNSCHEDULED TASKS"
            titleClass="task-section__title--today"
            badgeClass="count-badge--amber"
            items={unscheduled}
          />
        </>
      )}
    </div>
  );
}
