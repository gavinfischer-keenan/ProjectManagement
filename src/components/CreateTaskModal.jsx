/* ═══════════════════════════════════════════════════════════════
   CreateTaskModal — Add Task or Add Section
   Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef } from 'react';

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed', 'Blocked'];

export default function CreateTaskModal({
  allTasks = [],
  onSave,
  onClose,
  defaultType = 'task',
  defaultParentId = null,
}) {
  const [tab, setTab] = useState(defaultType === 'section' ? 'section' : 'task');
  const [form, setForm] = useState({
    name: '',
    notes: '',
    parentId: defaultParentId || '',
    targetDateStart: '',
    targetDateFinish: '',
    duration: '',
    status: 'Not Started',
    percentComplete: 0,
  });
  const [error, setError] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    if (nameRef.current) nameRef.current.focus();
  }, [tab]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'name' && value.trim()) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required.');
      if (nameRef.current) nameRef.current.focus();
      return;
    }
    const payload = {
      name: form.name.trim(),
      taskType: tab,
      notes: form.notes || '',
      parentId: form.parentId || null,
    };
    if (tab === 'task') {
      payload.targetDateStart  = form.targetDateStart  || null;
      payload.targetDateFinish = form.targetDateFinish || null;
      payload.duration         = form.duration !== '' ? Number(form.duration) : null;
      payload.status           = form.status;
      payload.percentComplete  = Number(form.percentComplete);
    } else {
      payload.status          = 'Not Started';
      payload.percentComplete = 0;
    }
    onSave(payload);
  };

  const potentialParents = allTasks.filter((t) => t.taskType === 'section');

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-content create-task-modal" role="dialog" aria-modal="true">

        <div className="modal-header">
          <div className="create-modal-tabs">
            <button
              type="button"
              className={'create-tab-btn' + (tab === 'task' ? ' active' : '')}
              onClick={() => setTab('task')}
            >
              ✅ Task
            </button>
            <button
              type="button"
              className={'create-tab-btn' + (tab === 'section' ? ' active' : '')}
              onClick={() => setTab('section')}
            >
              § Section
            </button>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">

          <div className="form-group">
            <label className="form-label">
              {tab === 'section' ? 'Section Name' : 'Task Name'}
              <span className="required-star"> *</span>
            </label>
            <input
              ref={nameRef}
              className={'form-input' + (error ? ' input-error' : '')}
              placeholder={tab === 'section' ? 'e.g. Air Conditioning' : 'e.g. Install Condenser Unit'}
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
            {error && <span className="form-error">{error}</span>}
          </div>

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" placeholder="Free form notes for this task…" rows={3}
              value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">
              {tab === 'section' ? 'Nest inside Section (optional)' : 'Parent Section (optional)'}
            </label>
            <select
              className="form-select"
              value={form.parentId}
              onChange={(e) => handleChange('parentId', e.target.value)}
            >
              <option value="">— None (top level) —</option>
              {potentialParents.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.taskType === 'section' ? '§ ' + t.name : t.name}
                </option>
              ))}
            </select>
          </div>

          {tab === 'task' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Target Start</label>
                  <input type="date" className="form-input" value={form.targetDateStart}
                    onChange={(e) => handleChange('targetDateStart', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Finish</label>
                  <input type="date" className="form-input" value={form.targetDateFinish}
                    onChange={(e) => handleChange('targetDateFinish', e.target.value)} />
                </div>
                <div className="form-group form-group-sm">
                  <label className="form-label">Duration (d)</label>
                  <input type="number" className="form-input" placeholder="0" min="0"
                    value={form.duration} onChange={(e) => handleChange('duration', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </>
          )}

          {tab === 'section' && (
            <div className="form-group">
              <div className="section-info-box">
                <span>ℹ️</span>
                <p>
                  Sections group related tasks and automatically summarise the earliest
                  start date, latest finish date, and overall completion % of all nested tasks.
                  No dependency is created when nesting tasks under a section.
                </p>
              </div>
            </div>
          )}



          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {tab === 'section' ? '⊞ Create Section' : '✅ Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

