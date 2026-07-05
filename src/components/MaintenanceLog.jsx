import React, { useState, useMemo, useCallback } from 'react';
import { today, formatDate } from '../utils/dateUtils.js';

const EMPTY_ENTRY = {
  description: '',
  taskId: '',
  dateOfRepair: today(),
  dateWhenFixed: today(),
  newInstallation: false,
  newInstallationDate: '',
  notes: '',
};

export default function MaintenanceLog({ entries = [], onAdd, onUpdate, onDelete, tasks = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_ENTRY });

  /* Sort entries by dateOfRepair descending */
  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => (b.dateOfRepair || '').localeCompare(a.dateOfRepair || ''));
  }, [entries]);

  /* Task name lookup */
  const taskName = useCallback(
    (taskId) => {
      if (!taskId) return '—';
      const t = tasks.find((t) => t.id === taskId);
      return t ? t.name : '—';
    },
    [tasks]
  );

  /* Form field change */
  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /* Open add form */
  function openAdd() {
    setForm({ ...EMPTY_ENTRY, dateOfRepair: today(), dateWhenFixed: today() });
    setEditId(null);
    setShowForm(true);
  }

  /* Open edit */
  function openEdit(entry) {
    setForm({
      description: entry.description || '',
      taskId: entry.taskId || '',
      dateOfRepair: entry.dateOfRepair || '',
      dateWhenFixed: entry.dateWhenFixed || '',
      newInstallation: entry.newInstallation || false,
      newInstallationDate: entry.newInstallationDate || '',
      notes: entry.notes || '',
    });
    setEditId(entry.id);
    setShowForm(true);
  }

  /* Submit */
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editId) {
        if (onUpdate) await onUpdate(editId, form);
      } else {
        if (onAdd) await onAdd(form);
      }
      setShowForm(false);
      setEditId(null);
      setForm({ ...EMPTY_ENTRY });
    } catch (err) {
      console.error('Maintenance save failed:', err);
    }
  }

  /* Delete */
  async function handleDelete(id) {
    if (!window.confirm('Delete this maintenance entry?')) return;
    try {
      if (onDelete) await onDelete(id);
    } catch (err) {
      console.error('Maintenance delete failed:', err);
    }
  }

  /* Cancel */
  function handleCancel() {
    setShowForm(false);
    setEditId(null);
    setForm({ ...EMPTY_ENTRY });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>🔧 Maintenance Log</h2>
        <button className="btn btn--primary" onClick={openAdd}>+ Add Entry</button>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="glass-panel fade-in-up" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            {editId ? 'Edit Entry' : 'New Maintenance Entry'}
          </h3>
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Linked Task</label>
              <select
                className="form-select"
                value={form.taskId}
                onChange={(e) => setField('taskId', e.target.value)}
              >
                <option value="">None</option>
                {tasks
                  .filter((t) => !tasks.some((c) => c.parentId === t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
              </select>
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
                id="newInstallation"
                checked={form.newInstallation}
                onChange={(e) => setField('newInstallation', e.target.checked)}
              />
              <label htmlFor="newInstallation" className="form-label" style={{ marginBottom: 0 }}>
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
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn--secondary" onClick={handleCancel}>Cancel</button>
              <button type="submit" className="btn btn--primary">
                {editId ? 'Save Changes' : 'Add Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="empty-state glass-panel fade-in-up">
          <div className="empty-state__icon">🔧</div>
          <div className="empty-state__text">No maintenance entries yet</div>
          <div className="empty-state__subtext">Add your first entry to start tracking repairs and installations.</div>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Linked Task</th>
                <th>Date of Repair</th>
                <th>Date Fixed</th>
                <th>New Install</th>
                <th>Install Date</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600, maxWidth: 200 }}>
                    {entry.description}
                  </td>
                  <td>{taskName(entry.taskId)}</td>
                  <td>{formatDate(entry.dateOfRepair)}</td>
                  <td>{formatDate(entry.dateWhenFixed)}</td>
                  <td style={{ textAlign: 'center', fontSize: '1rem' }}>
                    {entry.newInstallation ? '✅' : '➖'}
                  </td>
                  <td>{entry.newInstallation ? formatDate(entry.newInstallationDate) : '—'}</td>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.notes || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => openEdit(entry)}>
                        ✏️
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleDelete(entry.id)}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
