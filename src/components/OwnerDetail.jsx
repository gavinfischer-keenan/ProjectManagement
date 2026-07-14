/* ═══════════════════════════════════════════════════════════════
   OwnerDetail — Owner Detail View with Tasks Grouped by Section
   ═══════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { updateOwner } from '../api/client.js';
import { formatDate } from '../utils/dateUtils.js';

export default function OwnerDetail({ owner, tasks = [], onUpdate, onDelete, onBack, onFocusTask }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: owner.name || '',
    email: owner.email || '',
    phone: owner.phone || '',
    notes: owner.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* ── Filters ───────────────────────────── */
  const [showDone, setShowDone] = useState(true);
  const [showInProgress, setShowInProgress] = useState(true);
  const [showNotStarted, setShowNotStarted] = useState(true);

  /* ── Get tasks assigned to this owner ──── */
  const ownerTasks = tasks.filter(t => t.ownerId === owner.id && t.taskType !== 'section');
  const completedCount = ownerTasks.filter(t => t.status === 'Completed' || t.dateFinished).length;
  const inProgressCount = ownerTasks.filter(t => t.status === 'In Progress' && !t.dateFinished).length;

  const displayedTasks = ownerTasks.filter(t => {
    const isDone = t.status === 'Completed' || t.dateFinished;
    const isInProgress = t.status === 'In Progress' && !t.dateFinished;
    const isNotStarted = !isDone && !isInProgress;

    if (isDone && !showDone) return false;
    if (isInProgress && !showInProgress) return false;
    if (isNotStarted && !showNotStarted) return false;
    return true;
  });

  /* ── Group by section ──────────────────── */
  const sections = tasks.filter(t => t.taskType === 'section');
  const tasksBySection = {};
  const unassigned = [];

  for (const task of displayedTasks) {
    const section = sections.find(s => s.id === task.parentId);
    if (section) {
      if (!tasksBySection[section.id]) {
        tasksBySection[section.id] = { section, tasks: [] };
      }
      tasksBySection[section.id].tasks.push(task);
    } else {
      unassigned.push(task);
    }
  }

  const sectionGroups = Object.values(tasksBySection).sort((a, b) =>
    (a.section.name || '').localeCompare(b.section.name || '', undefined, { numeric: true, sensitivity: 'base' })
  );

  /* ── Save handler ──────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(owner.id, form);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete handler ────────────────────── */
  const handleDelete = async () => {
    await onDelete(owner.id);
  };

  const statusBadge = (task) => {
    if (task.status === 'Completed' || task.dateFinished) return <span className="status-badge status-completed">Done</span>;
    if (task.status === 'In Progress') return <span className="status-badge status-in-progress">In Progress</span>;
    if (task.status === 'Blocked') return <span className="status-badge status-blocked">Blocked</span>;
    return <span className="status-badge status-not-started">Not Started</span>;
  };

  return (
    <div className="vendor-panel">
      {/* Header */}
      <div className="vendor-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="owner-avatar-lg">{(owner.name || '?')[0].toUpperCase()}</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{owner.name}</h2>
              <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>
                {ownerTasks.length} tasks · {completedCount} done · {inProgressCount} in progress
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(e => !e)}>
            {editing ? '✕ Cancel' : '✏️ Edit'}
          </button>
          {!confirmDelete
            ? <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>Delete</button>
            : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--red)' }}>Delete {owner.name}?</span>
                <button className="btn btn-danger btn-sm" onClick={handleDelete}>Yes, Delete</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </span>
            )
          }
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="vendor-add-form glass-panel" style={{ marginBottom: '1.5rem' }}>
          <div className="vendor-add-form-title">Edit Owner</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" rows={2} value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="vendor-add-form-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : '✅ Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Contact info bar */}
      {!editing && (owner.email || owner.phone || owner.notes) && (
        <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {owner.email && <span>📧 <a href={`mailto:${owner.email}`} style={{ color: 'var(--accent)' }}>{owner.email}</a></span>}
          {owner.phone && <span>📞 {owner.phone}</span>}
          {owner.notes && <span style={{ opacity: 0.8 }}>📝 {owner.notes}</span>}
        </div>
      )}

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Show:</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />
          Done
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={showInProgress} onChange={e => setShowInProgress(e.target.checked)} />
          In Progress
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={showNotStarted} onChange={e => setShowNotStarted(e.target.checked)} />
          Not Started
        </label>
      </div>

      {/* Task count empty */}
      {ownerTasks.length === 0 && (
        <div className="vendor-empty">
          <div style={{ fontSize: '2.5em', marginBottom: '0.5rem' }}>📭</div>
          <div>No tasks assigned to {owner.name}.</div>
        </div>
      )}

      {/* Tasks grouped by section */}
      {sectionGroups.map(({ section, tasks: secTasks }) => (
        <div key={section.id} className="glass-panel" style={{ marginBottom: '1rem' }}>
          <div style={{
            fontWeight: 700,
            fontSize: '1rem',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            color: 'var(--accent)',
            letterSpacing: '0.02em',
          }}>
            § {section.name}
            <span style={{ fontWeight: 400, opacity: 0.5, fontSize: '0.82rem', marginLeft: '0.5rem' }}>
              ({secTasks.filter(t => t.status === 'Completed' || t.dateFinished).length}/{secTasks.length} done)
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {secTasks.map(task => (
                <tr key={task.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: onFocusTask ? 'pointer' : 'default' }}
                  onClick={() => onFocusTask && onFocusTask(task.id)}
                  title={onFocusTask ? 'Click to focus in Project Tracker' : ''}
                >
                  <td style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>{task.name}</td>
                  <td style={{ padding: '0.6rem 0.5rem', whiteSpace: 'nowrap' }}>{statusBadge(task)}</td>
                  <td style={{ padding: '0.6rem 0.5rem', opacity: 0.6, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {task.targetDateFinish ? `Due ${formatDate(task.targetDateFinish)}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Unassigned to a section */}
      {unassigned.length > 0 && (
        <div className="glass-panel" style={{ marginBottom: '1rem' }}>
          <div style={{
            fontWeight: 700,
            fontSize: '1rem',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            opacity: 0.6,
          }}>
            Other Tasks (no section)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {unassigned.map(task => (
                <tr key={task.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: onFocusTask ? 'pointer' : 'default' }}
                  onClick={() => onFocusTask && onFocusTask(task.id)}
                >
                  <td style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}>{task.name}</td>
                  <td style={{ padding: '0.6rem 0.5rem', whiteSpace: 'nowrap' }}>{statusBadge(task)}</td>
                  <td style={{ padding: '0.6rem 0.5rem', opacity: 0.6, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {task.targetDateFinish ? `Due ${formatDate(task.targetDateFinish)}` : ''}
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
