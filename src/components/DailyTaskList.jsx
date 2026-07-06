import React, { useState, useMemo, useCallback } from 'react';
import { today, formatDate, isDueSoon } from '../utils/dateUtils.js';
import { updateTask } from '../api/client.js';
import TaskEditModal from './TaskEditModal.jsx';

export default function DailyTaskList({ tasks = [], onTaskUpdate, onShowMaintenancePrompt }) {
  const todayStr = today();
  const [editingTask, setEditingTask] = useState(null);

  /* Helper: parent name logic (walks up to get top-level Section) */
  const getSectionName = useCallback(
    (taskId) => {
      if (!taskId) return 'Uncategorized';
      const t = tasks.find((x) => x.id === taskId);
      if (!t) return 'Uncategorized';
      if (!t.parentId) return t.name;
      return getSectionName(t.parentId);
    },
    [tasks]
  );

  /* Leaf tasks only (not parent containers) */
  const leafTasks = useMemo(
    () => tasks.filter((t) => !tasks.some((c) => c.parentId === t.id)),
    [tasks]
  );

  /* Check if a task is blocked by an incomplete dependency */
  const getBlocker = useCallback(
    (task) => {
      if (!task.dependsOnTaskId) return null;
      const dep = tasks.find((t) => t.id === task.dependsOnTaskId);
      if (!dep || dep.status === 'Completed' || dep.dateFinished) return null;
      return dep; // returns the blocking task object
    },
    [tasks]
  );

  /* Categorize */
  const { delayed, sections } = useMemo(() => {
    const delayed = [];
    const sectionMap = new Map();

    for (const t of leafTasks) {
      if (t.status === 'Completed') continue;

      const isDelayed = !!t.delayed;
      const isInProgress = t.status === 'In Progress';
      const blocker = getBlocker(t);
      const isBlocked = !!blocker;

      // Urgency: Not Started and due within 5 days (regardless of blocked status)
      const isUrgent = t.status === 'Not Started' && isDueSoon(t.targetDateFinish, t.dateFinished, 5);
      // Critical: blocked AND due within 3 days — surface even though blocked
      const isCriticalBlocked = isBlocked && isDueSoon(t.targetDateFinish, t.dateFinished, 3);

      // Blocked tasks only appear if critically close to due date
      if (isBlocked && !isCriticalBlocked) continue;

      if (isDelayed) {
        delayed.push(t);
      } else if (isInProgress || isUrgent || isCriticalBlocked) {
        const secName = getSectionName(t.id);
        if (!sectionMap.has(secName)) sectionMap.set(secName, []);
        sectionMap.get(secName).push({
          ...t,
          _isUrgent: isUrgent,
          _isBlocked: isBlocked,
          _blockedBy: blocker?.name || null,
        });
      }
    }

    const sectionEntries = Array.from(sectionMap.entries()).map(([name, items]) => {
      // Sort: in progress first, then by date
      items.sort((a, b) => {
        if (a.status === 'In Progress' && b.status !== 'In Progress') return -1;
        if (b.status === 'In Progress' && a.status !== 'In Progress') return 1;
        return (a.targetDateFinish || '').localeCompare(b.targetDateFinish || '');
      });
      return { name, items };
    });

    // Sort sections alphabetically
    sectionEntries.sort((a, b) => a.name.localeCompare(b.name));

    return { delayed, sections: sectionEntries };
  }, [leafTasks, getSectionName, getBlocker]);


  const isEmpty = delayed.length === 0 && sections.length === 0;

  const handleRowClick = (task) => {
    const original = tasks.find(x => x.id === task.id);
    if (original) setEditingTask(original);
  };

  const handleSaveEdit = useCallback(async (formData) => {
    if (!editingTask) return;
    try {
      const saved = await updateTask(editingTask.id, {
        ...formData,
        duration: formData.duration !== '' ? Number(formData.duration) : null,
        percentComplete: Number(formData.percentComplete),
      });
      if (onTaskUpdate) onTaskUpdate(saved);
    } catch (err) {
      console.error('Failed to save task from daily view:', err);
    }
    setEditingTask(null);
  }, [editingTask, onTaskUpdate]);

  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>📋 Action Items</h2>
          <p className="section-subtitle" style={{ margin: 0 }}>{formatDate(todayStr)}</p>
        </div>
      </div>

      {isEmpty ? (
        <div className="empty-state glass-panel fade-in-up">
           <div className="empty-state__icon">🎉</div>
           <div className="empty-state__text">All caught up!</div>
           <div className="empty-state__subtext">No delayed, in-progress, or urgent tasks.</div>
        </div>
      ) : (
        <div className="daily-task-container">
          
          {/* DELAYED SECTION */}
          {delayed.length > 0 && (
            <div className="task-section task-section--delayed fade-in-up" style={{ marginBottom: '1.5rem' }}>
              <div className="task-section__header" style={{ borderBottom: '2px solid var(--accent-coral)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span className="task-section__title" style={{ color: 'var(--accent-coral)', fontWeight: '800', fontSize: '1.25rem', letterSpacing: '0.05em' }}>⚠️ DELAYED</span>
                <span className="count-badge count-badge--coral">{delayed.length}</span>
              </div>
              <div className="task-list-rows" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>
                {delayed.map(t => (
                  <div key={t.id} className="task-row-item glass-panel-sm" onClick={() => handleRowClick(t)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.05)' } }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{t.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {t.status === 'In Progress' && <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', borderRadius: '4px' }}>In Progress</span>}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {t.targetDateFinish ? `Due ${formatDate(t.targetDateFinish)}` : 'No Due Date'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STANDARD SECTIONS */}
          {sections.map(sec => (
            <div key={sec.name} className="task-section fade-in-up" style={{ marginBottom: '1.5rem' }}>
              <div className="task-section__header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span className="task-section__title" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: '700' }}>{sec.name}</span>
                <span className="count-badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{sec.items.length}</span>
              </div>
              <div className="task-list-rows" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem' }}>
                {sec.items.map(t => (
                  <div
                    key={t.id}
                    className="task-row-item glass-panel-sm"
                    onClick={() => handleRowClick(t)}
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', transition: 'background 0.2s', borderLeft: t._isBlocked ? '3px solid var(--accent-coral)' : undefined }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      {t._isUrgent && !t._isBlocked && (
                        <span style={{ color: 'var(--accent-coral)', fontSize: '1rem', flexShrink: 0 }} title="Due within 5 days">⭐️</span>
                      )}
                      {t._isBlocked && (
                        <span style={{ color: 'var(--accent-coral)', fontSize: '0.9rem', flexShrink: 0 }} title={`Blocked by: ${t._blockedBy}`}>🔒</span>
                      )}
                      {t.status === 'In Progress' && (
                        <span style={{ color: 'var(--accent-blue)', fontSize: '1rem', flexShrink: 0 }} title="In Progress">▶</span>
                      )}
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                        {t._isBlocked && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent-coral)', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Blocked by: {t._blockedBy}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap', marginLeft: '0.5rem', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      {t.targetDateFinish ? `Due ${formatDate(t.targetDateFinish)}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          allTasks={tasks}
          onSave={handleSaveEdit}
          onClose={() => setEditingTask(null)}
          onShowMaintenancePrompt={onShowMaintenancePrompt}
        />
      )}
    </div>
  );
}
