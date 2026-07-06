/* ═══════════════════════════════════════════════════════════════
   VendorPanel — Vendor List and Tile Views
   ═══════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import VendorDetail from './VendorDetail.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { createVendor, updateVendor, deleteVendor } from '../api/client.js';

export default function VendorPanel({
  vendors = [],
  onVendorsChange,
  tasks = [],
  onCreateTask,
}) {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'tile'
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', company: '', phone: '', address: '', accountNumber: '', notes: '' });
  const [addSaving, setAddSaving] = useState(false);

  /* ── Sort vendors alphabetically by company then name ──── */
  const sorted = [...vendors].sort((a, b) => {
    const ca = (a.company || '').toLowerCase();
    const cb = (b.company || '').toLowerCase();
    if (ca !== cb) return ca.localeCompare(cb);
    return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
  });

  /* ── Selected vendor detail view ───────────────────────── */
  const selectedVendor = selectedVendorId ? vendors.find(v => v.id === selectedVendorId) : null;

  /* ── Create vendor ──────────────────────────────────────── */
  const handleCreate = async () => {
    if (!newForm.name.trim() && !newForm.company.trim()) return;
    setAddSaving(true);
    try {
      const created = await createVendor(newForm);
      onVendorsChange([...vendors, created]);
      setShowAddForm(false);
      setNewForm({ name: '', company: '', phone: '', address: '', accountNumber: '', notes: '' });
      setSelectedVendorId(created.id);
    } finally {
      setAddSaving(false);
    }
  };

  /* ── Update vendor ──────────────────────────────────────── */
  const handleUpdate = async (id, updates) => {
    const updated = await updateVendor(id, updates);
    onVendorsChange(vendors.map(v => v.id === id ? { ...v, ...updated } : v));
  };

  /* ── Delete vendor ──────────────────────────────────────── */
  const handleDelete = async (id) => {
    await deleteVendor(id);
    onVendorsChange(vendors.filter(v => v.id !== id));
    setSelectedVendorId(null);
  };

  /* ── If a vendor is selected, show detail view ──────────── */
  if (selectedVendor) {
    return (
      <VendorDetail
        vendor={selectedVendor}
        onUpdate={async (id, updates) => {
          await handleUpdate(id, updates);
          // Refresh local copy so detail view re-renders with new values
          const refreshed = await fetch('/api/vendors').then(r => r.json());
          onVendorsChange(refreshed);
        }}
        onDelete={handleDelete}
        onBack={() => setSelectedVendorId(null)}
        onCreateTask={onCreateTask}
        tasks={tasks}
      />
    );
  }

  return (
    <div className="vendor-panel">
      {/* Header */}
      <div className="vendor-panel-header">
        <h2 className="vendor-panel-title">📇 Vendors</h2>
        <div className="vendor-panel-controls">
          <div className="vendor-view-toggle">
            <button
              className={`vendor-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
            <button
              className={`vendor-toggle-btn ${viewMode === 'tile' ? 'active' : ''}`}
              onClick={() => setViewMode('tile')}
              title="Tile view"
            >
              ⊞
            </button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(p => !p)}>
            + Add Vendor
          </button>
        </div>
      </div>

      {/* Add vendor inline form */}
      {showAddForm && (
        <div className="vendor-add-form glass-panel">
          <div className="vendor-add-form-title">New Vendor</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="form-input" value={newForm.company} onChange={e => setNewForm(p => ({ ...p, company: e.target.value }))} placeholder="ABC Contractors" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} placeholder="Contact name" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={newForm.phone} onChange={e => setNewForm(p => ({ ...p, phone: e.target.value }))} placeholder="808-555-1234" />
            </div>
            <div className="form-group">
              <label className="form-label">Account #</label>
              <input className="form-input" value={newForm.accountNumber} onChange={e => setNewForm(p => ({ ...p, accountNumber: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" value={newForm.address} onChange={e => setNewForm(p => ({ ...p, address: e.target.value }))} placeholder="Street, City, State" />
          </div>
          <div className="vendor-add-form-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={addSaving || (!newForm.name.trim() && !newForm.company.trim())}>
              {addSaving ? 'Creating…' : '✅ Create Vendor'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {sorted.length === 0 && !showAddForm && (
        <div className="vendor-empty">
          <div style={{ fontSize: '2.5em', marginBottom: '0.5rem' }}>📇</div>
          <div>No vendors yet.</div>
          <div style={{ fontSize: '0.85em', opacity: 0.6, marginTop: '0.25rem' }}>Click "+ Add Vendor" to add your first contact.</div>
        </div>
      )}

      {/* ── LIST VIEW ──────────────────────────────────────── */}
      {viewMode === 'list' && sorted.length > 0 && (
        <div className="vendor-list">
          <table className="vendor-list-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Name</th>
                <th>Phone</th>
                <th style={{ width: 60 }}>Tasks</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(v => {
                const taskCount = tasks.filter(t => t.vendorId === v.id).length;
                return (
                  <tr
                    key={v.id}
                    className="vendor-list-row"
                    onClick={() => setSelectedVendorId(v.id)}
                    title="Click to view details"
                  >
                    <td className="vendor-list-company">{v.company || '—'}</td>
                    <td className="vendor-list-name">{v.name || '—'}</td>
                    <td className="vendor-list-phone">{v.phone || '—'}</td>
                    <td className="vendor-list-tasks">
                      {taskCount > 0 && <span className="vendor-task-count">{taskCount}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TILE VIEW ──────────────────────────────────────── */}
      {viewMode === 'tile' && sorted.length > 0 && (
        <div className="vendor-tile-grid">
          {sorted.map(v => {
            const taskCount = tasks.filter(t => t.vendorId === v.id).length;
            const interactionCount = (v.interactions || []).length;
            return (
              <div
                key={v.id}
                className="vendor-tile"
                onClick={() => setSelectedVendorId(v.id)}
                title="Click to view details"
              >
                <div className="vendor-tile-company">{v.company || v.name || 'Vendor'}</div>
                {v.company && v.name && <div className="vendor-tile-name">{v.name}</div>}
                {v.phone && <div className="vendor-tile-phone">📞 {v.phone}</div>}
                {v.address && <div className="vendor-tile-address">📍 {v.address}</div>}
                {v.accountNumber && <div className="vendor-tile-account">Acct: {v.accountNumber}</div>}
                <div className="vendor-tile-meta">
                  {taskCount > 0 && <span className="vendor-task-count">{taskCount} task{taskCount !== 1 ? 's' : ''}</span>}
                  {interactionCount > 0 && <span className="vendor-log-count">{interactionCount} log{interactionCount !== 1 ? 's' : ''}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
