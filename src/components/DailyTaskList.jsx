import React, { useState, useMemo, useCallback } from 'react';
import { today, formatDate, isoToDate } from '../utils/dateUtils.js';
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

  /* Categorize */
  const { delayed, sections } = useMemo(() => {
    const delayed = [];
    const sectionMap = new Map();

    for (const t of leafTasks) {
      if (t.status === 'Completed') continue; 

      const isDelayed = !!t.delayed;
      const isInProgress = t.status === 'In Progress';
      
      let isUrgent = false;
      if (t.status === 'Not Started' && t.targetDateFinish) {
        const target = isoToDate(t.targetDateFinish);
        if (target) {
          const now = new Date();
          const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
          const diff = target.getTime() - todayUTC;
          const days = diff / 86400000;
          if (days <= 5) isUrgent = true;
        }
      }

      if (isDelayed) {
        delayed.push(t);
      } else if (isInProgress || isUrgent) {
        const secName = getSectionName(t.id);
        if (!sectionMap.has(secName)) sectionMap.set(secName, []);
        sectionMap.get(secName).push({ ...t, _isUrgent: isUrgent });
      }
    }

    const sectionEntries = Array.from(sectionMap.entries()).map(([name, items]) => {
      // sort items: in progress first, then by date
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
  }, [leafTasks, getSectionName]);

  const isEmpty = delayed.length === 0 && sections.length === 0;

  const handleRowClick = (task) => {
    const original = tasks.find(x => x.id === task.id);
    if (original) setEditingTask(original);
  };

  const handleSaveEdit = async (updatedData) => {
    if (onTaskUpdate) {
      await onTaskUpdate(updatedData); // Note: App.jsx handleDailyTaskUpdate expects (updatedTask)
    }
    setEditingTask(null);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
            <div className="task-section task-section--delayed fade-in-up" style={{ marginBottom: '2.5rem' }}>
              <div className="task-section__header" style={{ borderBottom: '2px solid var(--accent-coral)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span className="task-section__title" style={{ color: 'var(--accent-coral)', fontWeight: '800', fontSize: '1.25rem', letterSpacing: '0.05em' }}>⚠️ DELAYED</span>
                <span className="count-badge count-badge--coral">{delayed.length}</span>
              </div>
              <div className="task-list-rows" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {delayed.map(t => (
                  <div key={t.id} className="task-row-item glass-panel-sm" onClick={() => handleRowClick(t)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.05)' } }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {t.status === 'In Progress' && <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', borderRadius: '4px' }}>In Progress</span>}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
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
            <div key={sec.name} className="task-section fade-in-up" style={{ marginBottom: '2.5rem' }}>
              <div className="task-section__header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span className="task-section__title" style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: '700' }}>{sec.name}</span>
                <span className="count-badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{sec.items.length}</span>
              </div>
              <div className="task-list-rows" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sec.items.map(t => (
                  <div key={t.id} className="task-row-item glass-panel-sm" onClick={() => handleRowClick(t)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', transition: 'background 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {t._isUrgent && <span style={{ color: 'var(--accent-coral)', fontSize: '1.1rem' }} title="Due within 5 days">⭐️</span>}
                      {t.status === 'In Progress' && <span style={{ color: 'var(--accent-blue)', fontSize: '1.1rem' }} title="In Progress">▶</span>}
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t.name}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
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
