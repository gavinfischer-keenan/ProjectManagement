import React, { useState, useEffect } from 'react';
import { today } from '../utils/dateUtils.js';

export default function MaintenancePrompt({ isOpen, task, onSubmit, onSkip }) {
  const [form, setForm] = useState({
    description: '',
    dateOfRepair: today(),
    dateWhenFixed: today(),
    newInstallation: false,
    newInstallationDate: '',
    notes: '',
  });

  /* Reset form when a new task is shown */
  useEffect(() => {
    if (isOpen && task) {
      setForm({
        description: task.name || '',
        dateOfRepair: today(),
        dateWhenFixed: today(),
        newInstallation: false,
        newInstallationDate: '',
        notes: '',
      });
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        ...form,
        taskId: task.id,
      });
    }
  }

  function handleSkip() {
    if (onSkip) onSkip();
  }

  /* Close on overlay click */
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) handleSkip();
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content glass-panel">
        <div className="modal-title">Task Completed! 🎉</div>
        <div className="modal-subtitle">
          Anything to add to the maintenance log for &ldquo;{task.name}&rdquo;?
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={2}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Date of Repair</label>
              <input
                type="date"
                className="form-input"
                value={form.dateOfRepair}
                onChange={(e) => setField('dateOfRepair', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date When Fixed</label>
              <input
                type="date"
                className="form-input"
                value={form.dateWhenFixed}
                onChange={(e) => setField('dateWhenFixed', e.target.value)}
              />
            </div>
          </div>

          <div className="form-checkbox-row">
            <input
              type="checkbox"
              className="form-checkbox"
              id="mp-newInstall"
              checked={form.newInstallation}
              onChange={(e) => setField('newInstallation', e.target.checked)}
            />
            <label htmlFor="mp-newInstall" className="form-label" style={{ marginBottom: 0 }}>
              New Installation
            </label>
          </div>

          {form.newInstallation && (
            <div className="form-group fade-in-up">
              <label className="form-label">Installation Date</label>
              <input
                type="date"
                className="form-input"
                value={form.newInstallationDate}
                onChange={(e) => setField('newInstallationDate', e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={2}
              placeholder="Additional details…"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn--secondary" onClick={handleSkip}>
              Skip
            </button>
            <button type="submit" className="btn btn--primary">
              Add to Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
