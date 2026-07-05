/* ═══════════════════════════════════════════════════════════════
   TaskEditModal — Full Task Editor — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef } from 'react';
import { canStartTask } from '../utils/treeUtils.js';

export default function TaskEditModal({
  task,
  allTasks,
  onSave,
  onClose,
  onShowMaintenancePrompt,
}) {
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
  });

  const prevDateFinished = useRef(task.dateFinished || '');
  const overlayRef = useRef(null);

  /* ── Dependency Check ───────────────────────────────────── */
  const blockInfo = canStartTask(
    { ...task, dependsOnTaskId: form.dependsOnTaskId },
    allTasks
  );

  /* ── Handlers ───────────────────────────────────────────── */
  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateFinishedChange = (value) => {
    const wasEmpty = !prevDateFinished.current;
    const nowFilled = !!value;
    handleChange('dateFinished', value);

    if (wasEmpty && nowFilled && onShowMaintenancePrompt) {
      onShowMaintenancePrompt(task);
    }
    prevDateFinished.current = value;
  };

  const handlePercentChange = (value) => {
    const num = Number(value);
    handleChange('percentComplete', num);
    // Auto-set status
    if (num === 100) {
      handleChange('status', 'Completed');
    } else if (num > 0) {
      handleChange('status', 'In Progress');
    }
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

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  /* ── Other tasks for dependency dropdown ────────────────── */
  const otherTasks = allTasks.filter((t) => t.id !== task.id);

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
          <div className="modal-body">
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

            {/* Dependency Row */}
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

            {/* Blocked Warning */}
            {!blockInfo.canStart && (
              <div className="form-warning">
                🔒 Blocked by: {blockInfo.blockedBy} — predecessor not yet completed
              </div>
            )}

            {/* Date Row 1 */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Target Start</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.targetDateStart}
                  onChange={(e) => handleChange('targetDateStart', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Finish</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.targetDateFinish}
                  onChange={(e) => handleChange('targetDateFinish', e.target.value)}
                />
              </div>
            </div>

            {/* Date Row 2 */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date Started</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.dateStarted}
                  onChange={(e) => handleChange('dateStarted', e.target.value)}
                  disabled={!blockInfo.canStart}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date Finished</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.dateFinished}
                  onChange={(e) => handleDateFinishedChange(e.target.value)}
                />
              </div>
            </div>

            {/* Duration & Status */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Duration (days)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={form.duration}
                  onChange={(e) => handleChange('duration', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>
            </div>

            {/* Percent Complete */}
            <div className="form-group">
              <label className="form-label">
                Percent Complete: {form.percentComplete}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={form.percentComplete}
                onChange={(e) => handlePercentChange(e.target.value)}
              />
            </div>

            {/* Delayed Checkbox */}
            <div className="form-checkbox-group">
              <input
                className="form-checkbox"
                type="checkbox"
                id="delayed"
                checked={form.delayed}
                onChange={(e) => handleChange('delayed', e.target.checked)}
              />
              <label htmlFor="delayed" className="form-label" style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                Mark as Delayed
              </label>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                className="form-textarea"
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes…"
                rows={3}
              />
            </div>
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
