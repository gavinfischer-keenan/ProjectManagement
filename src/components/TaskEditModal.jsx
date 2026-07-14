/* ═══════════════════════════════════════════════════════════════
   TaskEditModal — Full Task Editor — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef } from 'react';
import { canStartTask, calculateRollup } from '../utils/treeUtils.js';
import { daysBetween, addDaysToISO } from '../utils/dateUtils.js';

export default function TaskEditModal({
  task,
  allTasks,
  vendors = [],
  owners = [],
  onSave,
  onClose,
  onShowMaintenancePrompt,
  onCreatePrerequisite, // async (name, targetFinish) => createdTask
  onVendorCreate,       // async (stubData) => createdVendor
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
    vendorId:         task.vendorId || '',
    ownerId:          task.ownerId  || '3fbda0f6-bca4-407b-a647-fda9e6ce777d',
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

  /* ── Inline vendor creation state ───────────────────────── */
  const [showCreateVendor, setShowCreateVendor] = useState(false);
  const [vendorStub, setVendorStub] = useState({ company: '', name: '', phone: '' });
  const [vendorStubSaving, setVendorStubSaving] = useState(false);
  const [vendorStubError, setVendorStubError] = useState('');
  const vendorStubRef = useRef(null);

  /* ── Supplies state ────────────────────────────────── */
  const [supplies, setSupplies] = useState(task.supplies || []);
  const [newSupply, setNewSupply] = useState({ name: '', qty: '', cost: '' });
  const supplyNameRef = useRef(null);

  const nanoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const handleAddSupply = () => {
    if (!newSupply.name.trim()) return;
    const item = { id: nanoId(), name: newSupply.name.trim(), qty: newSupply.qty.trim(), cost: newSupply.cost.trim(), checkedOff: false };
    const next = [...supplies, item];
    setSupplies(next);
    handleChange('supplies', next);
    setNewSupply({ name: '', qty: '', cost: '' });
    setTimeout(() => supplyNameRef.current?.focus(), 30);
  };

  const handleRemoveSupply = (id) => {
    const next = supplies.filter(s => s.id !== id);
    setSupplies(next);
    handleChange('supplies', next);
  };

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

  const todayStr = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  };

  const handleDateFinishedChange = (value) => {
    let finalValue = value;
    if (finalValue > todayStr()) {
      finalValue = todayStr();
    }
    const wasEmpty = !prevDateFinished.current;
    const nowFilled = !!finalValue;
    // Auto-sync: filling finish date → mark Completed
    const updates = { dateFinished: finalValue };
    if (nowFilled) {
      updates.status = 'Completed';
      updates.percentComplete = 100;
      if (!form.dateStarted) updates.dateStarted = form.targetDateStart || todayStr();
      if (wasEmpty && onShowMaintenancePrompt) {
        onShowMaintenancePrompt(task);
      }
    }
    setForm((prev) => ({ ...prev, ...updates }));
    prevDateFinished.current = finalValue;
  };

  const handleStatusChange = (value) => {
    const updates = { status: value };
    if (value === 'Completed') {
      updates.percentComplete = 100;
      if (!form.dateFinished) updates.dateFinished = todayStr();
      if (!form.dateStarted) updates.dateStarted = form.targetDateStart || todayStr();
    } else if (value === 'In Progress') {
      if (!form.dateStarted) updates.dateStarted = todayStr();
      if (form.dateFinished) updates.dateFinished = '';
      if (form.percentComplete === 100) updates.percentComplete = 50;
      // Enforce 10% minimum for In Progress
      if (form.percentComplete < 10) updates.percentComplete = 10;
    } else if (value === 'Not Started') {
      updates.percentComplete = 0;
      updates.dateStarted = '';
      updates.dateFinished = '';
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
            <button type="button" className={`create-tab-btn ${activeTab === 'vendor' ? 'active' : ''}`} onClick={() => setActiveTab('vendor')}>📇 Vendor</button>
            <button type="button" className={`create-tab-btn ${activeTab === 'supplies' ? 'active' : ''}`} onClick={() => setActiveTab('supplies')}>🛒 Supplies</button>
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

                {/* Owner */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">👤 Owner</label>
                  <select
                    className="form-select"
                    value={form.ownerId}
                    onChange={e => handleChange('ownerId', e.target.value)}
                  >
                    <option value="">— Unassigned —</option>
                    {[...owners]
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))
                    }
                  </select>
                </div>

                {/* Creation Date (Read-only) */}
                {task.createdAt && (
                  <div className="form-group" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Creation Date (System)</label>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0.5rem 0' }}>
                      {new Date(task.createdAt).toLocaleString()}
                    </div>
                  </div>
                )}
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
                    <span className="form-help">Automatically added to the Event Log when completed.</span>
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
                    <span className="form-help">Automatically added to the Event Log when completed.</span>
                  </div>
                )}

                {/* Notes */}
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Free form notes for this task..." rows={6} />
                </div>
              </>
            )}

            {activeTab === 'vendor' && (
              <div style={{ padding: '0.5rem 0' }}>
                <div className="form-group">
                  <label className="form-label">Assigned Vendor</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <select
                      className="form-select"
                      value={form.vendorId}
                      onChange={e => handleChange('vendorId', e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">— No vendor assigned —</option>
                      {[...vendors]
                        .sort((a, b) => (a.company || a.name || '').localeCompare(b.company || b.name || ''))
                        .map(v => (
                          <option key={v.id} value={v.id}>
                            {v.company ? `${v.company}${v.name ? ` — ${v.name}` : ''}` : v.name}
                          </option>
                        ))
                      }
                    </select>
                    {!showCreateVendor && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                        onClick={() => {
                          setVendorStub({ company: '', name: '', phone: '' });
                          setVendorStubError('');
                          setShowCreateVendor(true);
                          setTimeout(() => vendorStubRef.current?.focus(), 60);
                        }}
                        title="Create a new vendor and link it to this task"
                      >
                        + New Vendor
                      </button>
                    )}
                  </div>
                  <span className="form-help">Link this task to a vendor contact. One vendor per task.</span>
                </div>

                {/* Inline vendor stub creation form */}
                {showCreateVendor && (
                  <div className="vendor-entry-form" style={{ marginTop: '12px' }}>
                    <div className="vendor-entry-form-header">
                      <span className="vendor-entry-form-title">📇 Create New Vendor</span>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowCreateVendor(false); setVendorStubError(''); }}>✕</button>
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Enter the basics — you can fill in the rest from the Vendors page later.
                    </p>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Company <span className="required-star">*</span></label>
                        <input
                          ref={vendorStubRef}
                          className={'form-input' + (vendorStubError ? ' input-error' : '')}
                          value={vendorStub.company}
                          onChange={e => { setVendorStub(p => ({ ...p, company: e.target.value })); setVendorStubError(''); }}
                          placeholder="ABC Contractors"
                          onKeyDown={e => { if (e.key === 'Escape') setShowCreateVendor(false); }}
                        />
                        {vendorStubError && <span className="form-error">{vendorStubError}</span>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Contact Name</label>
                        <input
                          className="form-input"
                          value={vendorStub.name}
                          onChange={e => setVendorStub(p => ({ ...p, name: e.target.value }))}
                          placeholder="Jane Smith"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input
                          className="form-input"
                          value={vendorStub.phone}
                          onChange={e => setVendorStub(p => ({ ...p, phone: e.target.value }))}
                          placeholder="808-555-1234"
                        />
                      </div>
                    </div>
                    <div className="vendor-entry-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowCreateVendor(false); setVendorStubError(''); }}>Cancel</button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={vendorStubSaving}
                        onClick={async () => {
                          if (!vendorStub.company.trim()) {
                            setVendorStubError('Company name is required.');
                            vendorStubRef.current?.focus();
                            return;
                          }
                          if (!onVendorCreate) return;
                          setVendorStubSaving(true);
                          try {
                            const created = await onVendorCreate(vendorStub);
                            if (created?.id) {
                              handleChange('vendorId', created.id);
                            }
                            setShowCreateVendor(false);
                          } catch {
                            setVendorStubError('Failed to create vendor.');
                          } finally {
                            setVendorStubSaving(false);
                          }
                        }}
                      >
                        {vendorStubSaving ? 'Creating…' : '✅ Create & Link'}
                      </button>
                    </div>
                  </div>
                )}

                {form.vendorId && (() => {
                  const v = vendors.find(x => x.id === form.vendorId);
                  if (!v) return null;
                  return (
                    <div className="vendor-task-card">
                      <div className="vendor-task-card-name">{v.company || v.name}</div>
                      {v.company && v.name && <div className="vendor-task-card-sub">{v.name}</div>}
                      {v.phone && <div className="vendor-task-card-phone">📞 {v.phone}</div>}
                      {v.accountNumber && <div className="vendor-task-card-acct">Acct: {v.accountNumber}</div>}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ marginTop: '0.5rem' }}
                        onClick={() => handleChange('vendorId', '')}
                      >
                        ✕ Remove vendor
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === 'supplies' && (
              <div style={{ padding: '0.5rem 0' }}>
                <div className="supplies-list">
                  {supplies.filter(s => !s.checkedOff).length === 0 && (
                    <div className="supplies-empty">No supplies added yet.</div>
                  )}
                  {supplies.filter(s => !s.checkedOff).map(s => (
                    <div key={s.id} className="supply-item">
                      <span className="supply-item-name">{s.name}</span>
                      {s.qty && <span className="supply-item-qty">{s.qty}</span>}
                      {s.cost && <span className="supply-item-cost">${s.cost}</span>}
                      <button
                        type="button"
                        className="btn-icon danger"
                        title="Remove supply"
                        onClick={() => handleRemoveSupply(s.id)}
                      >🗑️</button>
                    </div>
                  ))}
                </div>

                <div className="supply-add-row">
                  <input
                    ref={supplyNameRef}
                    className="form-input"
                    placeholder="Supply name (required)"
                    value={newSupply.name}
                    onChange={e => setNewSupply(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSupply(); } }}
                    style={{ flex: 3 }}
                  />
                  <input
                    className="form-input"
                    placeholder="Qty"
                    value={newSupply.qty}
                    onChange={e => setNewSupply(p => ({ ...p, qty: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSupply(); } }}
                    style={{ flex: 1 }}
                  />
                  <input
                    className="form-input"
                    placeholder="Cost $"
                    value={newSupply.cost}
                    onChange={e => setNewSupply(p => ({ ...p, cost: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSupply(); } }}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleAddSupply}
                    disabled={!newSupply.name.trim()}
                  >+ Add</button>
                </div>
                <span className="form-help">These will appear on the Shopping List until the task is complete or the item is checked off.</span>
              </div>
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
