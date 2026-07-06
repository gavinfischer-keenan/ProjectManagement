/* ═══════════════════════════════════════════════════════════════
   TaskEditModal — Full Task Editor — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef } from 'react';
import { canStartTask, calculateRollup } from '../utils/treeUtils.js';
import { daysBetween, addDaysToISO } from '../utils/dateUtils.js';

export default function TaskEditModal({
  task,
  allTasks,
  onSave,
  onClose,
  onShowMaintenancePrompt,
  onCreatePrerequisite, // async (name, targetFinish) => createdTask
}) {
  const isParent = allTasks.some(t => t.parentId === task.id);
  const rollup = isParent ? calculateRollup(task, allTasks) : null;

  /* ── Form State ─────────────────────────────────────────── */
  const [form, setForm] = useState({
    name:             task.name || '',
    dependency:       task.dependency || '',
    dependsOnTaskId:  task.dependsOnTaskId || '',
    notes:            task.notes || '',
    targetDateStart:  task.targetDateStart || '',
    targetDateFinish: task.targetDateFinish || '',
    dateStarted:      task.dateStarted || '',
    dateFinished:     task.dateFinished || '',
    duration:         task.duration ?? '',
    status:           task.status || 'Not Started',
    delayed:          task.delayed || false,
    percentComplete:  task.percentComplete ?? 0,
    isMilestone:      task.isMilestone || false,
    milestoneText:    task.milestoneText || '',
    isHardware:       task.isHardware || false,
    hardwareText:     task.hardwareText || '',
  });

  const prevDateFinished = useRef(task.dateFinished || '');
  const overlayRef = useRef(null);

  /* ── Prerequisite Panel State ────────────────────────────── */
  const [showPrereqPanel, setShowPrereqPanel] = useState(false);
  const [prereqName, setPrereqName]           = useState('');
  const [prereqFinish, setPrereqFinish]       = useState(form.targetDateStart || '');
  const [prereqSaving, setPrereqSaving]       = useState(false);
  const [prereqError, setPrereqError]         = useState('');
  const prereqNameRef = useRef(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (showPrereqPanel && prereqNameRef.current) prereqNameRef.current.focus();
  }, [showPrereqPanel]);

  /* ── Dependency Check ───────────────────────────────────── */
  const blockInfo = canStartTask(
    { ...task, dependsOnTaskId: form.dependsOnTaskId },
    allTasks
  );

  /* ── Handlers ───────────────────────────────────────────── */
  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      
      if (field === 'targetDateStart') {
        const start = value;
        const finish = next.targetDateFinish;
        const dur = next.duration;
        
        if (start && finish) {
          next.duration = daysBetween(start, finish);
        } else if (start && dur) {
          next.targetDateFinish = addDaysToISO(start, Number(dur));
        }
      } else if (field === 'targetDateFinish') {
        const start = next.targetDateStart;
        const finish = value;
        const dur = next.duration;
        
        if (start && finish) {
          next.duration = daysBetween(start, finish);
        } else if (finish && dur) {
          next.targetDateStart = addDaysToISO(finish, -Number(dur));
        }
      } else if (field === 'duration') {
        const start = next.targetDateStart;
        const finish = next.targetDateFinish;
        const dur = value !== '' ? Number(value) : null;
        
        if (dur !== null) {
          if (start) {
            next.targetDateFinish = addDaysToISO(start, dur);
          } else if (finish) {
            next.targetDateStart = addDaysToISO(finish, -dur);
          }
        }
      }
      
      return next;
    });
  };

  const handleDateFinishedChange = (value) => {
    const wasEmpty = !prevDateFinished.current;
    const nowFilled = !!value;
    // Auto-sync: filling finish date → mark Completed
    const updates = { dateFinished: value };
    if (nowFilled) {
      updates.status = 'Completed';
      updates.percentComplete = 100;
      if (!form.dateStarted) updates.dateStarted = form.targetDateStart || todayStr();
      if (wasEmpty && onShowMaintenancePrompt) {
        onShowMaintenancePrompt(task);
      }
    }
    setForm((prev) => ({ ...prev, ...updates }));
    prevDateFinished.current = value;
  };

  const todayStr = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  };

  const handleStatusChange = (value) => {
    const updates = { status: value };
    if (value === 'Completed') {
      updates.percentComplete = 100;
      if (!form.dateFinished) updates.dateFinished = todayStr();
      if (!form.dateStarted) updates.dateStarted = form.targetDateStart || todayStr();
    } else if (value === 'In Progress') {
      if (!form.dateStarted) updates.dateStarted = todayStr();
      if (form.percentComplete === 100) updates.percentComplete = 50;
      // Enforce 10% minimum for In Progress
      if (form.percentComplete < 10) updates.percentComplete = 10;
    } else if (value === 'Not Started') {
      updates.percentComplete = 0;
    }
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handlePercentChange = (value) => {
    let num = Number(value);
    
    // Enforce 10% minimum if they try to drag below 10 while in progress (unless they drag to 0 to mark Not Started)
    if (form.status === 'In Progress' && num < 10 && num > 0) {
      num = 10;
    }

    const updates = { percentComplete: num };
    if (num === 100) {
      updates.status = 'Completed';
      if (!form.dateFinished) updates.dateFinished = todayStr();
      if (!form.dateStarted) updates.dateStarted = form.targetDateStart || todayStr();
    } else if (num > 0) {
      if (form.status === 'Completed' || form.status === 'Not Started') {
        updates.status = 'In Progress';
        // Enforce 10% minimum when switching to In Progress via slider
        if (num < 10) {
          num = 10;
          updates.percentComplete = 10;
        }
      }
      if (!form.dateStarted) updates.dateStarted = form.targetDateStart || todayStr();
      if (form.dateFinished) updates.dateFinished = '';
    } else if (num === 0) {
      updates.status = 'Not Started';
      updates.dateFinished = '';
      updates.dateStarted = '';
    }
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      duration: form.duration !== '' ? Number(form.duration) : null,
      percentComplete: Number(form.percentComplete),
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  /* ── Prerequisite creation ──────────────────────────────── */
  const handleCreatePrerequisite = async (e) => {
    e.preventDefault();
    if (!prereqName.trim()) {
      setPrereqError('Task name is required.');
      if (prereqNameRef.current) prereqNameRef.current.focus();
      return;
    }
    if (!onCreatePrerequisite) return;
    setPrereqSaving(true);
    setPrereqError('');
    try {
      const created = await onCreatePrerequisite(prereqName.trim(), prereqFinish || null);
      if (created && created.id) {
        // Wire the current task to depend on the newly created task
        setForm((prev) => ({
          ...prev,
          dependsOnTaskId: created.id,
          dependency: created.name,
          // If this task has no start date yet, inherit the new task's finish date
          targetDateStart: prev.targetDateStart || prereqFinish || '',
        }));
      }
      setShowPrereqPanel(false);
      setPrereqName('');
      setPrereqFinish('');
    } catch (err) {
      setPrereqError('Failed to create prerequisite task.');
    } finally {
      setPrereqSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const otherTasks = allTasks.filter((t) => t.id !== task.id && t.parentId === task.parentId);

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Edit Task</h2>
          <button className="modal-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Tabs */}
          <div className="create-modal-tabs" style={{ padding: '0 1.5rem', borderBottom: '1px solid var(--glass-border)' }}>
            <button type="button" className={`create-tab-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>📝 General</button>
            <button type="button" className={`create-tab-btn ${activeTab === 'dependencies' ? 'active' : ''}`} onClick={() => setActiveTab('dependencies')}>⛓ Dependencies</button>
            <button type="button" className={`create-tab-btn ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>📋 Log & Hardware</button>
          </div>

          <div className="modal-body">
            {activeTab === 'general' && (
              <>
                {/* Task Name */}
                <div className="form-group">
                  <label className="form-label">Task Name</label>
                  <input
                    className="form-input"
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter task name"
                    required
                  />
                </div>

                {/* Date Row 1 */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Target Start</label>
                    <input className="form-input" type="date" value={form.targetDateStart} onChange={(e) => handleChange('targetDateStart', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Finish</label>
                    <input className="form-input" type="date" value={form.targetDateFinish} onChange={(e) => handleChange('targetDateFinish', e.target.value)} />
                  </div>
                </div>

                {/* Date Row 2 */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date Started</label>
                    <input className="form-input" type="date" value={form.dateStarted} onChange={(e) => handleChange('dateStarted', e.target.value)} disabled={!blockInfo.canStart} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date Finished</label>
                    <input className="form-input" type="date" value={form.dateFinished} onChange={(e) => handleDateFinishedChange(e.target.value)} />
                  </div>
                </div>

                {/* Duration & Status */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Duration (days)</label>
                    <input className="form-input" type="number" min="0" value={form.duration} onChange={(e) => handleChange('duration', e.target.value)} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={isParent ? rollup.status : form.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={isParent}>
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                </div>

                {/* Percent Complete */}
                <div className="form-group">
                  <label className="form-label">Percent Complete: {isParent ? rollup.percentComplete : form.percentComplete}%</label>
                  {isParent ? (
                    <><progress value={rollup.percentComplete} max="100" style={{ width: '100%', height: '12px' }} /><span className="form-help">Calculated automatically from sub-tasks.</span></>
                  ) : (
                    <input type="range" min="0" max="100" step="5" value={form.percentComplete} onChange={(e) => handlePercentChange(e.target.value)} />
                  )}
                </div>

                {/* Delayed Checkbox */}
                <div className="form-checkbox-group">
                  <input className="form-checkbox" type="checkbox" id="delayed" checked={form.delayed} onChange={(e) => handleChange('delayed', e.target.checked)} />
                  <label htmlFor="delayed" className="form-label" style={{ textTransform: 'none', letterSpacing: 'normal' }}>Mark as Delayed</label>
                </div>
              </>
            )}

            {activeTab === 'log' && (
              <>
                {/* Milestone */}
                <div className="form-checkbox-group" style={{ marginTop: '0.5rem' }}>
                  <input className="form-checkbox" type="checkbox" id="isMilestone" checked={form.isMilestone} onChange={(e) => handleChange('isMilestone', e.target.checked)} />
                  <label htmlFor="isMilestone" className="form-label" style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--accent-gold, #f5c842)' }}>🏆 This task is a Project Milestone</label>
                </div>
                {form.isMilestone && (
                  <div className="form-group fade-in-up" style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.3)', borderRadius: '8px' }}>
                    <label className="form-label" style={{ color: 'var(--accent-gold, #f5c842)' }}>🏆 Milestone Achievement Text</label>
                    <input className="form-input" type="text" value={form.milestoneText} onChange={(e) => handleChange('milestoneText', e.target.value)} placeholder='e.g. "AC Pads ready for Units"' />
                    <span className="form-help">Automatically added to the Maintenance Log when completed.</span>
                  </div>
                )}

                {/* Hardware */}
                <div className="form-checkbox-group" style={{ marginTop: '1.5rem' }}>
                  <input className="form-checkbox" type="checkbox" id="isHardware" checked={form.isHardware} onChange={(e) => handleChange('isHardware', e.target.checked)} />
                  <label htmlFor="isHardware" className="form-label" style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--accent-teal, #2dd4bf)' }}>🔧 New Hardware Installation</label>
                </div>
                {form.isHardware && (
                  <div className="form-group fade-in-up" style={{ marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.3)', borderRadius: '8px' }}>
                    <label className="form-label" style={{ color: 'var(--accent-teal, #2dd4bf)' }}>🔧 Hardware Details (Model / Serial)</label>
                    <input className="form-input" type="text" value={form.hardwareText} onChange={(e) => handleChange('hardwareText', e.target.value)} placeholder='e.g. "New Ceiling fan model xXXX"' />
                    <span className="form-help">Automatically added to the Maintenance Log when completed.</span>
                  </div>
                )}

                {/* Notes */}
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Free form notes for this task..." rows={6} />
                </div>
              </>
            )}

            {activeTab === 'dependencies' && (
              <>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Dependency Label</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.dependency}
                  onChange={(e) => handleChange('dependency', e.target.value)}
                  placeholder="e.g. 2FS, 3SS"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Depends On Task</label>
                <select
                  className="form-select"
                  value={form.dependsOnTaskId}
                  onChange={(e) => handleChange('dependsOnTaskId', e.target.value)}
                >
                  <option value="">None</option>
                  {otherTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || `Task #${t.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Add Prerequisite Task Panel */}
            <div className="prereq-section">
              {/* Current prerequisite chip */}
              {form.dependsOnTaskId && (() => {
                const pred = allTasks.find((t) => t.id === form.dependsOnTaskId);
                return pred ? (
                  <div className="prereq-current">
                    <span className="prereq-current-label">⛓ Must complete first:</span>
                    <span className="prereq-chip">
                      <span className="prereq-chip-name">{pred.name}</span>
                      <button
                        type="button"
                        className="prereq-chip-remove"
                        title="Remove this dependency"
                        onClick={() => setForm((p) => ({ ...p, dependsOnTaskId: '', dependency: '' }))}
                      >✕</button>
                    </span>
                  </div>
                ) : null;
              })()}

              {!showPrereqPanel ? (
                <button
                  type="button"
                  className="btn-add-prereq"
                  onClick={() => {
                    setPrereqFinish(form.targetDateStart || '');
                    setShowPrereqPanel(true);
                  }}
                  disabled={!onCreatePrerequisite}
                >
                  <span className="btn-add-prereq-icon">⬡</span>
                  Add Prerequisite Task
                  <span className="btn-add-prereq-hint">creates a new task that must finish before this one</span>
                </button>
              ) : (
                <div className="prereq-panel">
                  <div className="prereq-panel-header">
                    <span className="prereq-panel-title">⬡ New Prerequisite Task</span>
                    <button type="button" className="prereq-panel-cancel" onClick={() => {
                      setShowPrereqPanel(false);
                      setPrereqName('');
                      setPrereqError('');
                    }}>✕</button>
                  </div>
                  <p className="prereq-panel-hint">
                    This new task will be inserted before <strong>"{form.name || 'this task'}"</strong> and must be completed first.
                  </p>
                  <div className="form-group">
                    <label className="form-label">Prerequisite Task Name <span className="required-star">*</span></label>
                    <input
                      ref={prereqNameRef}
                      className={'form-input' + (prereqError ? ' input-error' : '')}
                      placeholder='e.g. "Select Paint Color"'
                      value={prereqName}
                      onChange={(e) => { setPrereqName(e.target.value); setPrereqError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Escape') { setShowPrereqPanel(false); setPrereqName(''); } }}
                    />
                    {prereqError && <span className="form-error">{prereqError}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Must be done by (Target Finish)</label>
                    <input
                      type="date"
                      className="form-input"
                      value={prereqFinish}
                      onChange={(e) => setPrereqFinish(e.target.value)}
                    />
                    <span className="form-help">Auto-set to this task's Target Start if left blank.</span>
                  </div>
                  <div className="prereq-panel-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                      setShowPrereqPanel(false);
                      setPrereqName('');
                      setPrereqError('');
                    }}>Cancel</button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleCreatePrerequisite}
                      disabled={prereqSaving}
                    >
                      {prereqSaving ? 'Creating…' : '✅ Create & Link'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Blocked Warning */}
            {!blockInfo.canStart && (
              <div className="form-warning">
                🔒 Blocked by: {blockInfo.blockedBy} — predecessor not yet completed
              </div>
            )}

              </>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
