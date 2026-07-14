/* ═══════════════════════════════════════════════════════════════
   OwnerPanel — Owner List View
   ═══════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import OwnerDetail from './OwnerDetail.jsx';
import { createOwner, updateOwner, deleteOwner, fetchOwners } from '../api/client.js';

export default function OwnerPanel({ owners = [], onOwnersChange, tasks = [], onFocusTask }) {
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  /* ── Sort owners alphabetically ─────────────────────── */
  const sorted = [...owners].sort((a, b) =>
    (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
  );

  const selectedOwner = selectedOwnerId ? owners.find(o => o.id === selectedOwnerId) : null;

  /* ── Create owner ────────────────────────────────────── */
  const handleCreate = async () => {
    if (!newForm.name.trim()) { setAddError('Name is required'); return; }
    setAddSaving(true);
    setAddError('');
    try {
      const created = await createOwner(newForm);
      onOwnersChange([...owners, created]);
      setShowAddForm(false);
      setNewForm({ name: '', email: '', phone: '', notes: '' });
      setSelectedOwnerId(created.id);
    } catch (err) {
      setAddError(err.message || 'Failed to create owner');
    } finally {
      setAddSaving(false);
    }
  };

  /* ── Update owner ────────────────────────────────────── */
  const handleUpdate = async (id, updates) => {
    const updated = await updateOwner(id, updates);
    // Refresh from server so detail re-renders
    const refreshed = await fetchOwners();
    onOwnersChange(refreshed);
    return updated;
  };

  /* ── Delete owner ────────────────────────────────────── */
  const handleDelete = async (id) => {
    await deleteOwner(id);
    onOwnersChange(owners.filter(o => o.id !== id));
    setSelectedOwnerId(null);
  };

  /* ── Owner detail view ───────────────────────────────── */
  if (selectedOwner) {
    return (
      <OwnerDetail
        owner={selectedOwner}
        tasks={tasks}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onBack={() => setSelectedOwnerId(null)}
        onFocusTask={onFocusTask}
      />
    );
  }

  return (
    <div className="vendor-panel">
      {/* Header */}
      <div className="vendor-panel-header">
        <h2 className="vendor-panel-title">👤 Owners</h2>
        <div className="vendor-panel-controls">
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(p => !p)}>
            + Add Owner
          </button>
        </div>
      </div>

      {/* Add owner form */}
      {showAddForm && (
        <div className="vendor-add-form glass-panel">
          <div className="vendor-add-form-title">New Owner</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name <span className="required-star">*</span></label>
              <input
                className="form-input"
                value={newForm.name}
                onChange={e => { setNewForm(p => ({ ...p, name: e.target.value })); setAddError(''); }}
                placeholder="e.g. Gavin"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={newForm.email}
                onChange={e => setNewForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={newForm.phone}
                onChange={e => setNewForm(p => ({ ...p, phone: e.target.value }))} placeholder="808-555-1234" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" value={newForm.notes}
              onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
          </div>
          {addError && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{addError}</div>}
          <div className="vendor-add-form-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddForm(false); setAddError(''); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={addSaving || !newForm.name.trim()}>
              {addSaving ? 'Creating…' : '✅ Create Owner'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {sorted.length === 0 && !showAddForm && (
        <div className="vendor-empty">
          <div style={{ fontSize: '2.5em', marginBottom: '0.5rem' }}>👤</div>
          <div>No owners yet.</div>
          <div style={{ fontSize: '0.85em', opacity: 0.6, marginTop: '0.25rem' }}>Click "+ Add Owner" to add people.</div>
        </div>
      )}

      {/* Owner list */}
      {sorted.length > 0 && (
        <div className="vendor-list">
          <table className="vendor-list-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th style={{ width: 60 }}>Tasks</th>
                <th style={{ width: 70 }}>Done</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(o => {
                const ownerTasks = tasks.filter(t => t.ownerId === o.id && t.taskType !== 'section');
                const doneCount = ownerTasks.filter(t => t.status === 'Completed' || t.dateFinished).length;
                return (
                  <tr
                    key={o.id}
                    className="vendor-list-row"
                    onClick={() => setSelectedOwnerId(o.id)}
                    title="Click to view owner details"
                  >
                    <td>
                      <div className="owner-avatar-sm">{(o.name || '?')[0].toUpperCase()}</div>
                    </td>
                    <td className="vendor-list-name" style={{ fontWeight: 600 }}>{o.name}</td>
                    <td className="vendor-list-email">{o.email || '—'}</td>
                    <td className="vendor-list-phone">{o.phone || '—'}</td>
                    <td className="vendor-list-tasks">
                      {ownerTasks.length > 0 && <span className="vendor-task-count">{ownerTasks.length}</span>}
                    </td>
                    <td className="vendor-list-tasks">
                      {doneCount > 0 && (
                        <span className="vendor-task-count" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                          {doneCount}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
