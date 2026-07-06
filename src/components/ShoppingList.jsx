/* ═══════════════════════════════════════════════════════════════
   ShoppingList — Aggregated Supply Items Across All Tasks
   Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function ShoppingList({ tasks = [], onTaskUpdate, onTasksRefresh }) {
  const [confirmItem, setConfirmItem] = useState(null); // { task, supply }

  /* ── Build the shopping list ────────────────────────────── */
  // Only include tasks that are NOT complete, and only supply items
  // that have NOT been individually checked off (dismissed)
  const listItems = useMemo(() => {
    const items = [];
    for (const task of tasks) {
      if (task.status === 'Completed' || task.percentComplete === 100 || task.dateFinished) continue;
      const supplies = (task.supplies || []).filter(s => !s.checkedOff);
      for (const supply of supplies) {
        items.push({ task, supply });
      }
    }
    // Sort: group by task, within task preserve order
    return items;
  }, [tasks]);

  // Group by task for display
  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of listItems) {
      const key = item.task.id;
      if (!map.has(key)) map.set(key, { task: item.task, supplies: [] });
      map.get(key).supplies.push(item.supply);
    }
    return [...map.values()];
  }, [listItems]);

  /* ── Checkbox handler ───────────────────────────────────── */
  const handleCheck = (task, supply) => {
    setConfirmItem({ task, supply });
  };

  const handleConfirmYes = async () => {
    if (!confirmItem) return;
    const { task } = confirmItem;
    // Mark task complete
    await onTaskUpdate(task.id, {
      status: 'Completed',
      percentComplete: 100,
      dateFinished: todayISO(),
      dateStarted: task.dateStarted || task.targetDateStart || todayISO(),
    });
    if (onTasksRefresh) await onTasksRefresh();
    setConfirmItem(null);
  };

  const handleConfirmNo = async () => {
    if (!confirmItem) return;
    const { task, supply } = confirmItem;
    // Mark this supply item as checkedOff (dismissed) without completing the task
    const updatedSupplies = (task.supplies || []).map(s =>
      s.id === supply.id ? { ...s, checkedOff: true } : s
    );
    await onTaskUpdate(task.id, { supplies: updatedSupplies });
    if (onTasksRefresh) await onTasksRefresh();
    setConfirmItem(null);
  };

  const todayISO = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="shopping-list">
      <div className="shopping-list-header">
        <h2 className="shopping-list-title">🛒 Shopping List</h2>
        <span className="shopping-list-count">
          {listItems.length} item{listItems.length !== 1 ? 's' : ''}
        </span>
      </div>

      {listItems.length === 0 && (
        <div className="shopping-list-empty">
          <div style={{ fontSize: '2.5em', marginBottom: '0.5rem' }}>🛒</div>
          <div>No supplies needed right now.</div>
          <div style={{ fontSize: '0.85em', opacity: 0.6, marginTop: '0.25rem' }}>
            Add supplies to tasks via the task's "Supplies" tab.
          </div>
        </div>
      )}

      {grouped.map(({ task, supplies }) => (
        <div key={task.id} className="shopping-group glass-panel">
          <div className="shopping-group-task">
            <span className="shopping-group-icon">📋</span>
            <span className="shopping-group-name">{task.name}</span>
            {task.targetDateFinish && (
              <span className="shopping-group-due">Due: {task.targetDateFinish}</span>
            )}
          </div>
          <ul className="shopping-items">
            {supplies.map(supply => (
              <li key={supply.id} className="shopping-item">
                <label className="shopping-item-label">
                  <input
                    type="checkbox"
                    className="shopping-checkbox"
                    checked={false}
                    onChange={() => handleCheck(task, supply)}
                  />
                  <span className="shopping-item-name">{supply.name}</span>
                  {supply.qty && (
                    <span className="shopping-item-qty">{supply.qty}</span>
                  )}
                  {supply.cost && (
                    <span className="shopping-item-cost">${supply.cost}</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Confirm dialog */}
      {confirmItem && (
        <ConfirmDialog
          isOpen={true}
          title="Mark Task Complete?"
          message={`Mark "${confirmItem.task.name}" as complete?`}
          confirmText="Yes, Mark Complete"
          cancelText="No, Just Remove Item"
          onConfirm={handleConfirmYes}
          onCancel={handleConfirmNo}
        />
      )}
    </div>
  );
}
