import React, { useState, useMemo, useCallback } from 'react';
import { today, formatDate, isLate } from '../utils/dateUtils.js';
import { updateTask } from '../api/client.js';
import TaskEditModal from './TaskEditModal.jsx';

export default function DailyTaskList({ tasks = [], owners = [], onTaskUpdate, onShowMaintenancePrompt }) {
  const todayStr = today();
  const [editingTask, setEditingTask] = useState(null);

  // State for expand/collapse. True = collapsed.
  const [collapsedOwners, setCollapsedOwners] = useState(new Set());
  const [collapsedStatuses, setCollapsedStatuses] = useState(new Set());

  const toggleOwner = (ownerName) => {
    setCollapsedOwners(prev => {
      const next = new Set(prev);
      if (next.has(ownerName)) next.delete(ownerName);
      else next.add(ownerName);
      return next;
    });
  };

  const toggleStatus = (ownerName, status) => {
    const key = `${ownerName}-${status}`;
    setCollapsedStatuses(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* Leaf tasks only */
  const leafTasks = useMemo(
    () => tasks.filter((t) => !tasks.some((c) => c.parentId === t.id)),
    [tasks]
  );

  /* Helper to check if a task is blocked */
  const getBlocker = useCallback((task) => {
    if (!task.dependsOnTaskId) return null;
    const dep = tasks.find((t) => t.id === task.dependsOnTaskId);
    if (!dep || dep.status === 'Completed' || dep.dateFinished) return null;
    return dep;
  }, [tasks]);

  /* Grouping Logic */
  const ownerGroups = useMemo(() => {
    const map = new Map();
    // Pre-seed with the specific requested order
    const PREDEFINED_OWNERS = ['Chris', 'Trish', 'Gavin'];
    
    // Initialize map
    for (const name of PREDEFINED_OWNERS) {
      map.set(name, { inProgress: [], notStarted: [] });
    }
    map.set('Unassigned', { inProgress: [], notStarted: [] });

    for (const t of leafTasks) {
      if (t.status === 'Completed' || t.dateFinished) continue;
      
      let ownerName = 'Unassigned';
      if (t.ownerId && owners) {
        const o = owners.find(owner => owner.id === t.ownerId);
        if (o && o.name) ownerName = o.name;
      }
      
      if (!map.has(ownerName)) {
        map.set(ownerName, { inProgress: [], notStarted: [] });
      }

      const isBlocked = !!getBlocker(t);
      const blocker = isBlocked ? getBlocker(t) : null;
      const isDelayed = t.delayed || isLate(t.targetDateFinish, t.dateFinished);

      const enhancedTask = {
        ...t,
        _isBlocked: isBlocked,
        _blockedBy: blocker?.name || null,
        _isDelayed: isDelayed
      };

      if (t.status === 'In Progress') {
        map.get(ownerName).inProgress.push(enhancedTask);
      } else if (t.status === 'Not Started') {
        map.get(ownerName).notStarted.push(enhancedTask);
      }
    }

    // Sort tasks inside buckets by date
    const sortByDate = (a, b) => (a.targetDateFinish || '').localeCompare(b.targetDateFinish || '');
    
    for (const [name, buckets] of map.entries()) {
      buckets.inProgress.sort(sortByDate);
      buckets.notStarted.sort(sortByDate);
    }

    // Build the final array
    const result = [];
    
    // 1. Chris, Trish, Gavin
    for (const name of PREDEFINED_OWNERS) {
      if (map.has(name)) {
        result.push({ name, ...map.get(name) });
        map.delete(name);
      }
    }
    
    // 2. Any other owners
    const otherNames = Array.from(map.keys()).filter(n => n !== 'Unassigned').sort();
    for (const name of otherNames) {
      result.push({ name, ...map.get(name) });
    }
    
    // 3. Unassigned
    if (map.has('Unassigned')) {
      const u = map.get('Unassigned');
      if (u.inProgress.length > 0 || u.notStarted.length > 0) {
        result.push({ name: 'Unassigned', ...u });
      }
    }

    return result.filter(g => g.inProgress.length > 0 || g.notStarted.length > 0);
  }, [leafTasks, owners, getBlocker]);


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

  if (ownerGroups.length === 0) {
    return (
      <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>📋 Action Items</h2>
            <p className="section-subtitle" style={{ margin: 0 }}>{formatDate(todayStr)}</p>
          </div>
        </div>
        <div className="empty-state glass-panel fade-in-up">
           <div className="empty-state__icon">🎉</div>
           <div className="empty-state__text">All caught up!</div>
           <div className="empty-state__subtext">No pending tasks found.</div>
        </div>
      </div>
    );
  }

  const renderTask = (t) => {
    return (
      <div
        key={t.id}
        className="task-row-item glass-panel-sm"
        onClick={() => handleRowClick(t)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          transition: 'background 0.2s',
          borderLeft: t._isDelayed ? '3px solid var(--accent-coral)' : (t._isBlocked ? '3px solid var(--accent-orange)' : undefined)
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          {t._isDelayed && !t._isBlocked && (
             <span style={{ color: 'var(--accent-coral)', fontSize: '1rem', flexShrink: 0 }} title="Delayed">⚠️</span>
          )}
          {t._isBlocked && (
             <span style={{ color: 'var(--accent-orange)', fontSize: '0.9rem', flexShrink: 0 }} title={`Blocked by: ${t._blockedBy}`}>🔒</span>
          )}
          {t.status === 'In Progress' && (
             <span style={{ color: 'var(--accent-blue)', fontSize: '1rem', flexShrink: 0 }} title="In Progress">▶</span>
          )}
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4', paddingBottom: '2px' }}>{t.name}</div>
            {t._isBlocked && (
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4', paddingBottom: '2px' }}>
                Blocked by: {t._blockedBy}
              </div>
            )}
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap', marginLeft: '0.5rem', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {t.targetDateFinish ? `Due ${formatDate(t.targetDateFinish)}` : ''}
        </div>
      </div>
    );
  };

  const renderStatusGroup = (ownerName, statusName, tasksArr) => {
    if (tasksArr.length === 0) return null;
    const isCollapsed = collapsedStatuses.has(`${ownerName}-${statusName}`);
    
    return (
      <div style={{ marginBottom: '1.25rem' }}>
        <div 
          onClick={() => toggleStatus(ownerName, statusName)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
            marginLeft: '-0.5rem',
            marginBottom: '0.5rem',
            borderRadius: '4px',
            userSelect: 'none'
          }}
          className="hover-bg"
        >
          <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{isCollapsed ? '▶' : '▼'}</span>
          <span style={{ fontSize: '0.9rem', fontWeight: '700', letterSpacing: '0.05em', color: statusName === 'In Progress' ? 'var(--accent-blue)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
            {statusName} ({tasksArr.length})
          </span>
        </div>
        
        {!isCollapsed && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.5rem', paddingLeft: '0.5rem' }}>
            {tasksArr.map(renderTask)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>📋 Action Items</h2>
          <p className="section-subtitle" style={{ margin: 0 }}>{formatDate(todayStr)}</p>
        </div>
      </div>

      <div className="daily-task-container">
        {ownerGroups.map(group => {
          const isCollapsed = collapsedOwners.has(group.name);
          const totalTasks = group.inProgress.length + group.notStarted.length;
          
          return (
            <div key={group.name} className="task-section fade-in-up" style={{ marginBottom: '2rem' }}>
              <div 
                className="task-section__header" 
                onClick={() => toggleOwner(group.name)}
                style={{ 
                  borderBottom: '2px solid rgba(255,255,255,0.1)', 
                  paddingBottom: '0.5rem', 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>{isCollapsed ? '▶' : '▼'}</span>
                <span className="task-section__title" style={{ fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: '800' }}>
                  {group.name}
                </span>
                <span className="count-badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{totalTasks}</span>
              </div>
              
              {!isCollapsed && (
                <div style={{ paddingLeft: '1rem' }}>
                  {renderStatusGroup(group.name, 'In Progress', group.inProgress)}
                  {renderStatusGroup(group.name, 'Not Started', group.notStarted)}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
