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
  isMilestone: false,
  milestoneText: '',
  sectionName: '',
  sectionId: '',
};

export default function MaintenanceLog({ entries = [], onAdd, onUpdate, onDelete, tasks = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_ENTRY });
  const [collapsedSections, setCollapsedSections] = useState(new Set());

  /* Section tasks from project (top-level sections) */
  const sectionTasks = useMemo(
    () => tasks.filter(t => !t.parentId && t.taskType === 'section'),
    [tasks]
  );

  /* Task name lookup */
  const getTaskName = useCallback(
    (taskId) => {
      if (!taskId) return '—';
      const t = tasks.find(t => t.id === taskId);
      return t ? t.name : '—';
    },
    [tasks]
  );

  /* Sort entries newest first */
  const sorted = useMemo(() => {
    // 1. Map manual entries (from maintenance.json)
    const manual = entries.map(e => ({ ...e, isDerived: false }));

    // 2. Map derived entries from completed tasks
    const getSectionName = (parentId) => {
      if (!parentId) return '';
      const parent = tasks.find(t => t.id === parentId);
      return parent ? parent.name : '';
    };

    const derived = tasks
      .filter(t => t.status === 'Completed' && (t.isMilestone || t.isHardware))
      .map(t => ({
        id: `derived-${t.id}`,
        description: t.isHardware ? (t.hardwareText || `Hardware installed for ${t.name}`) : (t.milestoneText || `Milestone achieved: ${t.name}`),
        taskId: t.id,
        dateOfRepair: t.dateFinished || t.targetDateFinish || today(),
        dateWhenFixed: t.dateFinished || t.targetDateFinish || today(),
        newInstallation: !!t.isHardware,
        newInstallationDate: t.isHardware ? (t.dateFinished || t.targetDateFinish || today()) : '',
        notes: t.notes || '',
        isMilestone: !!t.isMilestone,
        milestoneText: t.milestoneText || '',
        sectionName: t.parentId ? getSectionName(t.parentId) : '',
        sectionId: t.parentId,
        isDerived: true // indicates it's read-only in the log!
      }));

    // 3. Combine and sort
    const all = [...manual, ...derived];
    return all.sort((a, b) => (b.dateOfRepair || '').localeCompare(a.dateOfRepair || ''));
  }, [entries, tasks]);

  /* Group entries by section */
  const sections = useMemo(() => {
    const map = new Map();
    for (const entry of sorted) {
      const key = entry.sectionName || 'General';
      if (!map.has(key)) map.set(key, { name: key, repairs: [], milestones: [] });
      if (entry.isMilestone) map.get(key).milestones.push(entry);
      else map.get(key).repairs.push(entry);
    }
    const projectOrder = sectionTasks.map(s => s.name);
    return [...map.values()].sort((a, b) => {
      if (a.name === 'General') return 1;
      if (b.name === 'General') return -1;
      const ai = projectOrder.indexOf(a.name);
      const bi = projectOrder.indexOf(b.name);
      if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [sorted, sectionTasks]);

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
      isMilestone: entry.isMilestone || false,
      milestoneText: entry.milestoneText || '',
      sectionName: entry.sectionName || '',
      sectionId: entry.sectionId || '',
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

  /* Toggle section collapse */
  function toggleSection(name) {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>🔧 Maintenance Log &amp; Milestones</h2>
        <button className="btn btn--primary" onClick={openAdd}>+ Add Entry</button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="glass-panel fade-in-up" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            {editId ? 'Edit Entry' : 'New Maintenance Entry'}
          </h3>
          <form className="modal-form" onSubmit={handleSubmit}>

            {/* Milestone toggle */}
            <div className="form-checkbox-row" style={{ marginBottom: '0.75rem' }}>
              <input type="checkbox" className="form-checkbox" id="formIsMilestone"
                checked={form.isMilestone} onChange={e => setField('isMilestone', e.target.checked)} />
              <label htmlFor="formIsMilestone" className="form-label" style={{ marginBottom: 0, color: 'var(--accent-gold, #f5c842)' }}>
                🏆 This is a Project Milestone
              </label>
            </div>

            {form.isMilestone ? (
              <div className="form-group fade-in-up" style={{ padding: '0.75rem 1rem', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.3)', borderRadius: '8px', marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ color: 'var(--accent-gold, #f5c842)' }}>Milestone Achievement Text</label>
                <input className="form-input" type="text" value={form.milestoneText}
                  onChange={e => setField('milestoneText', e.target.value)}
                  placeholder='e.g. "AC Pads ready for Units"' required />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description}
                  onChange={e => setField('description', e.target.value)} required />
              </div>
            )}

            {/* Section */}
            <div className="form-group">
              <label className="form-label">Area / Section</label>
              <select className="form-select" value={form.sectionName}
                onChange={e => {
                  const sec = sectionTasks.find(s => s.name === e.target.value);
                  setField('sectionName', e.target.value);
                  setField('sectionId', sec?.id || '');
                }}>
                <option value="">General</option>
                {sectionTasks.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            {/* Linked Task */}
            <div className="form-group">
              <label className="form-label">Linked Task</label>
              <select className="form-select" value={form.taskId} onChange={e => setField('taskId', e.target.value)}>
                <option value="">None</option>
                {tasks.filter(t => !tasks.some(c => c.parentId === t.id)).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Date of Repair</label>
                <input type="date" className="form-input" value={form.dateOfRepair} onChange={e => setField('dateOfRepair', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Date When Fixed</label>
                <input type="date" className="form-input" value={form.dateWhenFixed} onChange={e => setField('dateWhenFixed', e.target.value)} />
              </div>
            </div>

            {!form.isMilestone && (
              <>
                <div className="form-checkbox-row">
                  <input type="checkbox" className="form-checkbox" id="newInstallation"
                    checked={form.newInstallation} onChange={e => setField('newInstallation', e.target.checked)} />
                  <label htmlFor="newInstallation" className="form-label" style={{ marginBottom: 0 }}>New Installation</label>
                </div>
                {form.newInstallation && (
                  <div className="form-group fade-in-up">
                    <label className="form-label">Installation Date</label>
                    <input type="date" className="form-input" value={form.newInstallationDate} onChange={e => setField('newInstallationDate', e.target.value)} />
                  </div>
                )}
              </>
            )}

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => setField('notes', e.target.value)} />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn--secondary" onClick={handleCancel}>Cancel</button>
              <button type="submit" className="btn btn--primary">{editId ? 'Save Changes' : 'Add Entry'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {sections.length === 0 && (
        <div className="empty-state glass-panel fade-in-up">
          <div className="empty-state__icon">🔧</div>
          <div className="empty-state__text">No maintenance entries yet</div>
          <div className="empty-state__subtext">Add your first entry to start tracking repairs, installations, and milestones.</div>
        </div>
      )}

      {/* Section Cards */}
      {sections.map(sec => {
        const isCollapsed = collapsedSections.has(sec.name);
        return (
          <div key={sec.name} className="glass-panel fade-in-up" style={{ marginBottom: '1.25rem', overflow: 'hidden' }}>
            {/* Section Header */}
            <div
              onClick={() => toggleSection(sec.name)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.25rem', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.08)', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{sec.name === 'General' ? '📋' : '🏠'}</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{sec.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.08)', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
                  {sec.repairs.length} repair{sec.repairs.length !== 1 ? 's' : ''} · {sec.milestones.length} milestone{sec.milestones.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'inline-block', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
            </div>

            {!isCollapsed && (
              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Milestones Panel */}
                {sec.milestones.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span>🏆</span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-gold, #f5c842)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Milestones</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {sec.milestones.map(m => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.9rem', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.25)', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                            <span style={{ fontSize: '1.1rem' }}>🏆</span>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{m.milestoneText || m.description}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                Completed: {formatDate(m.dateOfRepair)}
                                {m.taskId && <> &nbsp;·&nbsp; Task: {getTaskName(m.taskId)}</>}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                            {!m.isDerived ? (
                              <>
                                <button className="btn btn--ghost btn--sm" onClick={() => openEdit(m)}>✏️</button>
                                <button className="btn btn--danger btn--sm" onClick={() => handleDelete(m.id)}>🗑</button>
                              </>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🔒 Auto-logged</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Repairs & Installations */}
                {sec.repairs.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span>🔧</span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Repairs &amp; Installations</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Description</th><th>Linked Task</th><th>Date of Repair</th><th>Date Fixed</th><th>New Install</th><th>Install Date</th><th>Notes</th><th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sec.repairs.map(entry => (
                            <tr key={entry.id}>
                              <td style={{ color: 'var(--text-primary)', fontWeight: 600, maxWidth: 200 }}>{entry.description}</td>
                              <td>{getTaskName(entry.taskId)}</td>
                              <td>{formatDate(entry.dateOfRepair)}</td>
                              <td>{formatDate(entry.dateWhenFixed)}</td>
                              <td style={{ textAlign: 'center', fontSize: '1rem' }}>{entry.newInstallation ? '✅' : '➖'}</td>
                              <td>{entry.newInstallation ? formatDate(entry.newInstallationDate) : '—'}</td>
                              <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.notes || '—'}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  {!entry.isDerived ? (
                                    <>
                                      <button className="btn btn--ghost btn--sm" onClick={() => openEdit(entry)}>✏️</button>
                                      <button className="btn btn--danger btn--sm" onClick={() => handleDelete(entry.id)}>🗑</button>
                                    </>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🔒 Live from Task</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

