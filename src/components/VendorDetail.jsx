/* ═══════════════════════════════════════════════════════════════
   VendorDetail — Full Vendor Contact Page + CRM Log
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useRef, useEffect } from 'react';
import { addVendorInteraction, updateVendorInteraction, deleteVendorInteraction } from '../api/client.js';
import ConfirmDialog from './ConfirmDialog.jsx';

const todayISO = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

const TYPE_LABELS = { phone: '📞 Phone', text: '💬 Text', email: '📧 Email' };

export default function VendorDetail({
  vendor,
  onUpdate,
  onDelete,
  onBack,
  onCreateTask,   // async (taskDefaults) => void — open task creation
  tasks = [],
}) {
  /* ── Edit fields ──────────────────────────────────────────── */
  const [form, setForm] = useState({
    name:          vendor.name || '',
    company:       vendor.company || '',
    phone:         vendor.phone || '',
    address:       vendor.address || '',
    accountNumber: vendor.accountNumber || '',
    notes:         vendor.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* ── Interaction log ──────────────────────────────────────── */
  const [interactions, setInteractions] = useState(vendor.interactions || []);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [entryForm, setEntryForm] = useState({ date: todayISO(), type: 'phone', notes: '' });
  const [entrySaving, setEntrySaving] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [confirmDeleteInteraction, setConfirmDeleteInteraction] = useState(null);
  const notesRef = useRef(null);

  useEffect(() => {
    setForm({
      name:          vendor.name || '',
      company:       vendor.company || '',
      phone:         vendor.phone || '',
      address:       vendor.address || '',
      accountNumber: vendor.accountNumber || '',
      notes:         vendor.notes || '',
    });
    setInteractions(vendor.interactions || []);
    setDirty(false);
  }, [vendor.id]);

  const handleFieldChange = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(vendor.id, form);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  /* ── Interaction helpers ──────────────────────────────────── */
  const openNewEntry = () => {
    setEntryForm({ date: todayISO(), type: 'phone', notes: '' });
    setEditingInteraction(null);
    setShowNewEntry(true);
    setTimeout(() => notesRef.current?.focus(), 80);
  };

  const openEditEntry = (interaction) => {
    setEntryForm({ date: interaction.date, type: interaction.type, notes: interaction.notes });
    setEditingInteraction(interaction);
    setShowNewEntry(true);
    setTimeout(() => notesRef.current?.focus(), 80);
  };

  const handleSaveEntry = async () => {
    if (!entryForm.notes.trim()) return;
    setEntrySaving(true);
    try {
      if (editingInteraction) {
        const updated = await updateVendorInteraction(vendor.id, editingInteraction.id, entryForm);
        setInteractions(prev => prev.map(i => i.id === editingInteraction.id ? updated : i));
      } else {
        const created = await addVendorInteraction(vendor.id, entryForm);
        setInteractions(prev => [created, ...prev]);
      }
      setShowNewEntry(false);
      setEditingInteraction(null);
    } finally {
      setEntrySaving(false);
    }
  };

  const handleDeleteInteraction = async (interaction) => {
    await deleteVendorInteraction(vendor.id, interaction.id);
    setInteractions(prev => prev.filter(i => i.id !== interaction.id));
    setConfirmDeleteInteraction(null);
  };

  const handleCreateTaskFromInteraction = () => {
    setShowNewEntry(false);
    const companyLabel = form.company || form.name || 'Vendor';
    if (onCreateTask) {
      onCreateTask({
        name: `Follow up with ${companyLabel}`,
        vendorId: vendor.id,
        notes: entryForm.notes || '',
      });
    }
  };

  /* ── Linked tasks ─────────────────────────────────────────── */
  const linkedTasks = tasks.filter(t => t.vendorId === vendor.id);

  return (
    <div className="vendor-detail">
      {/* Header bar */}
      <div className="vendor-detail-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          ← Back
        </button>
        <h2 className="vendor-detail-title">
          {form.company || form.name || 'Vendor'}
        </h2>
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          {dirty && (
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Changes'}
            </button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
            🗑 Delete Vendor
          </button>
        </div>
      </div>

      <div className="vendor-detail-body">
        {/* ── Contact Fields ──────────────────────────────── */}
        <div className="vendor-detail-fields glass-panel">
          <h3 className="vendor-section-title">📇 Contact Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => handleFieldChange('name', e.target.value)} placeholder="Contact name" />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="form-input" value={form.company} onChange={e => handleFieldChange('company', e.target.value)} placeholder="Company name" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => handleFieldChange('phone', e.target.value)} placeholder="808-555-1234" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email || ''} onChange={e => handleFieldChange('email', e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input className="form-input" value={form.accountNumber} onChange={e => handleFieldChange('accountNumber', e.target.value)} placeholder="Account / Customer #" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" value={form.address} onChange={e => handleFieldChange('address', e.target.value)} placeholder="Street, City, State" />
          </div>
          <div className="form-group">
            <label className="form-label">Notes &amp; Details</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={form.notes}
              onChange={e => handleFieldChange('notes', e.target.value)}
              placeholder="Any additional details about this vendor — services offered, pricing, preferences..."
            />
          </div>
        </div>

        {/* ── Linked Tasks ──────────────────────────────── */}
        {linkedTasks.length > 0 && (
          <div className="vendor-detail-linked glass-panel">
            <h3 className="vendor-section-title">🔗 Linked Tasks ({linkedTasks.length})</h3>
            <div className="vendor-linked-tasks">
              {linkedTasks.map(t => (
                <span key={t.id} className="vendor-task-chip">
                  {t.status === 'Completed' ? '✅' : t.status === 'In Progress' ? '🔄' : '⬜'} {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── CRM Interaction Log ───────────────────────── */}
        <div className="vendor-detail-crm glass-panel">
          <div className="vendor-crm-header">
            <h3 className="vendor-section-title">📋 Interaction Log</h3>
            <button className="btn btn-primary btn-sm" onClick={openNewEntry}>
              + New Entry
            </button>
          </div>

          {/* New / Edit entry form */}
          {showNewEntry && (
            <div className="vendor-entry-form">
              <div className="vendor-entry-form-header">
                <span className="vendor-entry-form-title">
                  {editingInteraction ? '✏️ Edit Entry' : '📝 New Log Entry'}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowNewEntry(false); setEditingInteraction(null); }}>✕</button>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: '0 0 160px' }}>
                  <label className="form-label">Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={entryForm.date}
                    onChange={e => setEntryForm(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ flex: '0 0 160px' }}>
                  <label className="form-label">Contact Type</label>
                  <select
                    className="form-select"
                    value={entryForm.type}
                    onChange={e => setEntryForm(p => ({ ...p, type: e.target.value }))}
                  >
                    <option value="phone">📞 Phone</option>
                    <option value="text">💬 Text</option>
                    <option value="email">📧 Email</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Notes</label>
                  <input
                    ref={notesRef}
                    className="form-input"
                    value={entryForm.notes}
                    onChange={e => setEntryForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="What was discussed..."
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEntry(); }}
                  />
                </div>
              </div>
              <div className="vendor-entry-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowNewEntry(false); setEditingInteraction(null); }}>Cancel</button>
                <button className="btn btn-secondary btn-sm" onClick={handleCreateTaskFromInteraction} title="Create a linked task for this vendor">
                  🔗 Create Task
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSaveEntry} disabled={entrySaving || !entryForm.notes.trim()}>
                  {entrySaving ? 'Saving…' : (editingInteraction ? '✅ Update' : '✅ Save Entry')}
                </button>
              </div>
            </div>
          )}

          {/* Log list */}
          {interactions.length === 0 && !showNewEntry && (
            <div className="vendor-crm-empty">No interactions logged yet. Click "+ New Entry" to start.</div>
          )}
          <div className="vendor-crm-list">
            {interactions.map(interaction => {
              const linkedTask = tasks.find(t => t.id === interaction.linkedTaskId);
              return (
                <div key={interaction.id} className="vendor-crm-item">
                  <div className="vendor-crm-item-meta">
                    <span className="vendor-crm-date">{interaction.date}</span>
                    <span className={`vendor-crm-type vendor-crm-type--${interaction.type}`}>
                      {TYPE_LABELS[interaction.type] || interaction.type}
                    </span>
                    {linkedTask && (
                      <span className="vendor-crm-task-link" title={`Linked task: ${linkedTask.name}`}>
                        🔗 {linkedTask.name}
                      </span>
                    )}
                  </div>
                  <div className="vendor-crm-notes">{interaction.notes}</div>
                  <div className="vendor-crm-item-actions">
                    <button className="btn-icon" title="Edit" onClick={() => openEditEntry(interaction)}>✏️</button>
                    <button className="btn-icon danger" title="Delete" onClick={() => setConfirmDeleteInteraction(interaction)}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirm delete vendor */}
      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete Vendor?"
        message={`Delete "${form.company || form.name}"? This cannot be undone. The vendor will be removed from all linked tasks.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => onDelete(vendor.id)}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* Confirm delete interaction */}
      {confirmDeleteInteraction && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Interaction?"
          message="Remove this log entry? This cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => handleDeleteInteraction(confirmDeleteInteraction)}
          onCancel={() => setConfirmDeleteInteraction(null)}
        />
      )}
    </div>
  );
}
