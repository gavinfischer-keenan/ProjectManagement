/* ═══════════════════════════════════════════════════════════════
   TaskTable — Main Project Tracking Table — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useMemo, useCallback } from 'react';
import { buildTree, flattenTree, applyDependencyDepths } from '../utils/treeUtils.js';
import TaskRow from './TaskRow.jsx';
import TaskEditModal from './TaskEditModal.jsx';
import CreateTaskModal from './CreateTaskModal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function TaskTable({
  tasks,
  vendors = [],
  onTaskUpdate,
  onTaskDelete,
  onTaskCreate,
  onShowMaintenancePrompt,
  onTasksRefresh,
  onVendorCreate,
  focusedSectionId,
  focusedTaskId,
  vendorTaskDefaults,
  onClearFocus,
}) {
  /* ── State ──────────────────────────────────────────────── */
  const [collapsedIds, setCollapsedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('hawaii_pm_collapsed_sections');
      if (saved) return new Set(JSON.parse(saved));
    } catch(e) {}
    return new Set();
  });
  const [editingTask, setEditingTask] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [dragState, setDragState] = useState({ dragId: null, overId: null });
  const [createModal, setCreateModal] = useState(null); // { defaultType, defaultParentId } | null

  /* ── Tree ───────────────────────────────────────────────── */
  const tree = useMemo(() => buildTree(applyDependencyDepths(tasks)), [tasks]);
  const flatList = useMemo(() => flattenTree(tree), [tree]);



  /* ── Visibility Filter (collapse) ──────────────────────── */
  const visibleRows = useMemo(() => {
    const hiddenParents = new Set();
    return flatList.filter((row) => {
      // If any ancestor is collapsed, hide this row
      if (row.parentId && hiddenParents.has(row.parentId)) {
        if (row.hasChildren) hiddenParents.add(row.id);
        return false;
      }
      // If parent is collapsed, this row is hidden
      if (row.parentId && collapsedIds.has(row.parentId)) {
        if (row.hasChildren) hiddenParents.add(row.id);
        return false;
      }
      return true;
    });
  }, [flatList, collapsedIds]);

  /* ── Routing / Focus Effect ─────────────────────────────── */
  React.useEffect(() => {
    if (focusedTaskId || focusedSectionId) {
      let targetId = focusedTaskId || focusedSectionId;
      
      // Auto-expand parents so the target row is visible
      const expandAncestors = (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.parentId) {
          setCollapsedIds(prev => {
            const next = new Set(prev);
            next.delete(task.parentId);
            localStorage.setItem('hawaii_pm_collapsed_sections', JSON.stringify([...next]));
            return next;
          });
          expandAncestors(task.parentId);
        }
      };
      expandAncestors(targetId);

      // Give React a tick to render the expanded rows
      setTimeout(() => {
        const rowElement = document.getElementById(`task-row-${targetId}`);
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        if (focusedTaskId) {
          const taskObj = tasks.find(t => t.id === focusedTaskId);
          if (taskObj) setEditingTask(taskObj);
        }
        
        if (onClearFocus) onClearFocus();
      }, 100);
    }
  }, [focusedTaskId, focusedSectionId, tasks, onClearFocus]);

  /* ── Vendor task defaults (from Vendor CRM "Create Task") ─── */
  React.useEffect(() => {
    if (vendorTaskDefaults) {
      setCreateModal({ defaultType: 'task', defaultParentId: null, prefill: vendorTaskDefaults });
    }
  }, [vendorTaskDefaults]);

  /* ── Handlers ───────────────────────────────────────────── */
  const handleToggleExpand = useCallback((id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id); // Expand
      } else {
        next.add(id); // Collapse
      }
      localStorage.setItem('hawaii_pm_collapsed_sections', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setCollapsedIds(new Set());
    localStorage.setItem('hawaii_pm_collapsed_sections', JSON.stringify([]));
  }, []);

  const handleCollapseAll = useCallback(() => {
    const parentIds = new Set();
    for (const t of tasks) {
      if (t.parentId) parentIds.add(t.parentId);
    }
    setCollapsedIds(parentIds);
    localStorage.setItem('hawaii_pm_collapsed_sections', JSON.stringify([...parentIds]));
  }, [tasks]);

  const handleEdit = useCallback((task) => {
    setEditingTask(task);
  }, []);

  const handleEditSave = useCallback(
    async (updatedData) => {
      if (!editingTask) return;

      let needsRefresh = false;

      // If dependency changed and is not null
      if (
        updatedData.dependsOnTaskId &&
        updatedData.dependsOnTaskId !== editingTask.dependsOnTaskId
      ) {
        const predecessor = tasks.find((t) => t.id === updatedData.dependsOnTaskId);
        const currentTask = tasks.find((t) => t.id === editingTask.id);
        
        if (predecessor && currentTask) {
          const insertAt = (predecessor.order ?? 0) + 1;
          const newParentId = predecessor.parentId || null;
          
          const isCorrectlyPositioned = 
            currentTask.parentId === newParentId && 
            (currentTask.order ?? 0) === insertAt;

          if (!isCorrectlyPositioned) {
            updatedData.parentId = newParentId;
            updatedData.order = insertAt;
            needsRefresh = true;
            
            // Shift siblings down
            const siblings = tasks.filter(
              (t) => t.parentId === newParentId && t.id !== editingTask.id
            );
            const toShift = siblings.filter((t) => (t.order ?? 0) >= insertAt);
            
            if (toShift.length > 0) {
              const orderings = toShift.map((t) => ({ id: t.id, order: (t.order ?? 0) + 1 }));
              try {
                await fetch('/api/tasks/reorder', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderings }),
                });
              } catch (err) {
                console.error('Failed to shift task orders:', err);
              }
            }
          }
        }
      }

      await onTaskUpdate(editingTask.id, updatedData);

      if (onTasksRefresh) {
        await onTasksRefresh();
      }

      setEditingTask(null);
    },
    [editingTask, onTaskUpdate, tasks, onTasksRefresh]
  );

  /**
   * Create a prerequisite task that inserts before `editingTask`.
   * - Same parentId as the current task
   * - Inserts at the same order slot; everything at that slot+ shifts up
   * - targetDateFinish = provided finish (or this task's targetDateStart)
   * Returns the created task object so the modal can set dependsOnTaskId.
   */
  const handleCreatePrerequisiteFor = useCallback(
    async (prereqName, prereqFinish) => {
      if (!editingTask) return null;

      // Shift order: all sibling tasks at same or higher order get +1
      const siblings = tasks.filter(
        (t) => t.parentId === editingTask.parentId && t.id !== editingTask.id
      );
      const insertAt = editingTask.order ?? 0;
      const toShift = siblings.filter((t) => (t.order ?? 0) >= insertAt);

      // Perform the shifts via batch reorder
      if (toShift.length > 0) {
        const orderings = toShift.map((t) => ({ id: t.id, order: (t.order ?? 0) + 1 }));
        try {
          await fetch('/api/tasks/reorder', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderings }),
          });
        } catch (err) {
          console.error('Failed to shift task orders:', err);
        }
      }

      // Create the prerequisite task
      const newTask = {
        name: prereqName,
        taskType: 'task',
        parentId: editingTask.parentId,
        order: insertAt,
        status: 'Not Started',
        percentComplete: 0,
        targetDateFinish: prereqFinish || editingTask.targetDateStart || null,
      };
      const created = await onTaskCreate(newTask);
      if (onTasksRefresh) {
        await onTasksRefresh();
      }
      return created;
    },
    [editingTask, tasks, onTaskCreate, onTasksRefresh]
  );

  const handleDeleteRequest = useCallback(
    (task) => {
      const hasChildren = tasks.some((t) => t.parentId === task.id);
      if (hasChildren) {
        setConfirmDelete(task);
      } else {
        onTaskDelete(task.id);
      }
    },
    [tasks, onTaskDelete]
  );

  const handleConfirmDelete = useCallback(() => {
    if (confirmDelete) {
      onTaskDelete(confirmDelete.id);
      setConfirmDelete(null);
    }
  }, [confirmDelete, onTaskDelete]);

  const handleAddTask = useCallback(() => {
    setCreateModal({ defaultType: 'task', defaultParentId: null });
  }, []);

  const handleAddSection = useCallback(() => {
    setCreateModal({ defaultType: 'section', defaultParentId: null });
  }, []);

  const handleCreateSave = useCallback(async (payload) => {
    // 1. Shift existing siblings down by 1 to make room at order 0
    const parentId = payload.parentId || null;
    const siblings = tasks.filter((t) => t.parentId === parentId);
    if (siblings.length > 0) {
      const orderings = siblings.map((t) => ({ id: t.id, order: (t.order ?? 0) + 1 }));
      try {
        await fetch('/api/tasks/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderings }),
        });
      } catch (err) {
        console.error('Failed to shift task orders for new task:', err);
      }
    }

    // 2. Create the new task at order 0
    await onTaskCreate({ order: 0, ...payload });
    setCreateModal(null);
  }, [tasks, onTaskCreate]);

  const handleAddSubtask = useCallback(
    (parentId) => {
      // Open the creation modal pre-filled with this section as the parent
      setCreateModal({ defaultType: 'task', defaultParentId: parentId });
    },
    []
  );

  /* ── Drag & Drop ────────────────────────────────────────── */
  const handleDragStart = useCallback((e, taskId) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    setDragState((prev) => ({ ...prev, dragId: taskId }));
  }, []);

  const handleDragOver = useCallback((e, taskId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragState((prev) => ({ ...prev, overId: taskId }));
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragState((prev) => ({ ...prev, overId: null }));
  }, []);

  const handleDrop = useCallback(
    async (e, targetId) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData('text/plain');
      setDragState({ dragId: null, overId: null });
      if (sourceId === targetId) return;
      const sourceTask = tasks.find((t) => String(t.id) === sourceId);
      const targetTask = tasks.find((t) => t.id === targetId);
      if (!sourceTask || !targetTask) return;

      // Find dependency chain (tasks that act as visual children)
      const getChain = (taskId) => {
        const deps = tasks.filter(t => t.dependsOnTaskId === taskId && t.parentId === sourceTask.parentId);
        let chain = [...deps];
        for (const d of deps) {
          chain = chain.concat(getChain(d.id));
        }
        return chain;
      };
      
      const chainToMove = getChain(sourceTask.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const tasksToMove = [sourceTask, ...chainToMove];

      // Prevent dropping onto itself or its own descendants
      if (tasksToMove.some(t => t.id === targetId)) return;

      const isTargetSection = targetTask.taskType === 'section';
      const newParentId = isTargetSection ? targetTask.id : targetTask.parentId;

      // 1. Reorder source siblings to close the gap if moving to a new section
      if (sourceTask.parentId !== newParentId) {
        const remainingSourceSiblings = tasks
          .filter(t => t.parentId === sourceTask.parentId && !tasksToMove.some(m => m.id === t.id))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        
        const sourceOrderings = remainingSourceSiblings.map((t, idx) => ({ id: t.id, order: idx }));
        if (sourceOrderings.length > 0) {
          try {
            await fetch('/api/tasks/reorder', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderings: sourceOrderings }),
            });
          } catch(e) { console.error(e); }
        }
      }

      // 2. Insert tasksToMove into the target section
      const targetSiblings = tasks
        .filter(t => t.parentId === newParentId && !tasksToMove.some(m => m.id === t.id))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      let insertIdx = 0;
      if (!isTargetSection) {
        const targetIdx = targetSiblings.findIndex(t => t.id === targetId);
        if (targetIdx >= 0) insertIdx = targetIdx + 1;
        else insertIdx = targetSiblings.length;
      }

      targetSiblings.splice(insertIdx, 0, ...tasksToMove);

      const targetOrderings = targetSiblings.map((t, idx) => ({ id: t.id, order: idx }));
      try {
        await fetch('/api/tasks/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderings: targetOrderings }),
        });
      } catch (err) { console.error('Failed to update orders:', err); }

      // 3. Update parentId for all moved tasks, and dependencies for the head task
      const headUpdates = { parentId: newParentId };
      if (isTargetSection) {
        headUpdates.dependsOnTaskId = null;
        headUpdates.dependency = '';
      } else {
        headUpdates.dependsOnTaskId = targetTask.id;
        headUpdates.dependency = targetTask.name;
        if (targetTask.targetDateFinish) {
          headUpdates.targetDateStart = targetTask.targetDateFinish;
        }
      }
      
      await onTaskUpdate(sourceTask.id, headUpdates);
      
      if (sourceTask.parentId !== newParentId) {
        await Promise.all(
          chainToMove.map(t => onTaskUpdate(t.id, { parentId: newParentId }))
        );
      }

      if (onTasksRefresh) {
        await onTasksRefresh();
      }
    },
    [tasks, onTaskUpdate, onTasksRefresh]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({ dragId: null, overId: null });
  }, []);

  /* ── Indent / Outdent ───────────────────────────────────── */
  const handleIndent = useCallback(
    async (taskId) => {
      const idx = visibleRows.findIndex((r) => r.id === taskId);
      if (idx <= 0) return;
      const taskAbove = visibleRows[idx - 1];
      const task = visibleRows[idx];
      if (task.parentId === taskAbove.id) return;

      const isAboveSection = taskAbove.taskType === 'section';
      const updates = {};

      if (isAboveSection) {
        // Section indent: become a child of the section
        updates.parentId = taskAbove.id;
      } else {
        // Task-on-task indent: create dependency, but remain a sibling
        updates.parentId = taskAbove.parentId;
        updates.dependsOnTaskId = taskAbove.id;
        updates.dependency = taskAbove.name;
        if (taskAbove.targetDateFinish) {
          updates.targetDateStart = taskAbove.targetDateFinish;
        }
      }
      // Section indent: parentId only, no dependency
      await onTaskUpdate(taskId, updates);
    },
    [visibleRows, onTaskUpdate]
  );

  const handleOutdent = useCallback(
    async (taskId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || !task.parentId) return; // already top level
      const parent = tasks.find((t) => t.id === task.parentId);
      await onTaskUpdate(taskId, {
        parentId: parent ? parent.parentId : null,
        dependsOnTaskId: null,
        dependency: '',
      });
    },
    [tasks, onTaskUpdate]
  );

  /* ── Render ─────────────────────────────────────────────── */
  if (tasks.length === 0) {
    return (
      <div>
        <div className="table-toolbar">
          <h2 className="table-title">Project Tasks</h2>
          <div className="table-toolbar-actions">
            <button className="btn btn-primary btn-sm" onClick={handleAddTask}>
              + Add Task
            </button>
          </div>
        </div>
        <div className="empty-state glass-panel">
          <span className="empty-state-icon">📋</span>
          <p className="empty-state-text">
            No tasks yet. Click &quot;Add Task&quot; to get started, or import from an Excel file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="table-toolbar">
        <h2 className="table-title">Project Tasks</h2>
        <div className="toolbar-primary-actions">
          <button className="btn btn-secondary btn-md" onClick={handleAddSection} title="Add a new section header">
            § Add Section
          </button>
          <button className="btn btn-primary btn-md" onClick={handleAddTask}>
            + Add Task
          </button>
        </div>
      </div>

      <div className="task-table-container">
        <table className="task-table">
          <thead>
            <tr>
              <th style={{ width: 70, textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  <button title="Expand All" onClick={handleExpandAll} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '1.2em', padding: '0 4px' }}>⏬</button>
                  <button title="Collapse All" onClick={handleCollapseAll} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '1.2em', padding: '0 4px' }}>⏫</button>
                </div>
              </th>
              <th>Task Name</th>
              <th>Dep.</th>
              <th>Target Start</th>
              <th>Target Finish</th>
              <th>Started</th>
              <th>Finished</th>
              <th>Duration</th>
              <th style={{ width: 140 }}>Progress</th>
              <th style={{ width: 36 }}></th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, idx) => (
              <TaskRow
                key={row.id}
                id={`task-row-${row.id}`}
                task={row}
                depth={row.depth}
                isExpanded={!collapsedIds.has(row.id)}
                hasChildren={row.hasChildren}
                onToggleExpand={handleToggleExpand}
                onUpdate={onTaskUpdate}
                onDelete={handleDeleteRequest}
                onEdit={handleEdit}
                onAddSubtask={handleAddSubtask}
                onShowMaintenancePrompt={onShowMaintenancePrompt}
                allTasks={tasks}
                dragState={dragState}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onIndent={handleIndent}
                onOutdent={handleOutdent}
                isFirstRow={idx === 0}
              />
            ))}
          </tbody>
        </table>
        </div>

      {/* Create Task/Section Modal */}
      {createModal && (
        <CreateTaskModal
          allTasks={tasks}
          defaultType={createModal.defaultType}
          defaultParentId={createModal.defaultParentId}
          prefill={createModal.prefill || null}
          onSave={handleCreateSave}
          onClose={() => setCreateModal(null)}
        />
      )}

      {/* Edit Modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          allTasks={tasks}
          vendors={vendors}
          onSave={handleEditSave}
          onClose={() => setEditingTask(null)}
          onShowMaintenancePrompt={onShowMaintenancePrompt}
          onCreatePrerequisite={handleCreatePrerequisiteFor}
          onVendorCreate={onVendorCreate}
        />
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Parent Task?"
          message={`"${confirmDelete.name}" has sub-tasks. Deleting it will also remove all its children. This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
          confirmText="Delete All"
          cancelText="Cancel"
        />
      )}
    </div>
  );
}
