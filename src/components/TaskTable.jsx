/* ═══════════════════════════════════════════════════════════════
   TaskTable — Main Project Tracking Table — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useMemo, useCallback } from 'react';
import { buildTree, flattenTree } from '../utils/treeUtils.js';
import TaskRow from './TaskRow.jsx';
import TaskEditModal from './TaskEditModal.jsx';
import CreateTaskModal from './CreateTaskModal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function TaskTable({
  tasks,
  onTaskUpdate,
  onTaskDelete,
  onTaskCreate,
  onShowMaintenancePrompt,
  onTasksRefresh,
}) {
  /* ── State ──────────────────────────────────────────────── */
  const [expandedIds, setExpandedIds] = useState(() => {
    // Default: all parent IDs expanded
    const parentIds = new Set();
    for (const t of tasks) {
      if (t.parentId) parentIds.add(t.parentId);
    }
    return parentIds;
  });
  const [editingTask, setEditingTask] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [dragState, setDragState] = useState({ dragId: null, overId: null });
  const [createModal, setCreateModal] = useState(null); // { defaultType, defaultParentId } | null

  /* ── Tree ───────────────────────────────────────────────── */
  const tree = useMemo(() => buildTree(tasks), [tasks]);
  const flatList = useMemo(() => flattenTree(tree), [tree]);

  // Initialize expanded IDs when tasks change (add any new parent IDs)
  useMemo(() => {
    const parentIds = new Set(expandedIds);
    for (const t of tasks) {
      if (t.parentId) parentIds.add(t.parentId);
    }
    if (parentIds.size !== expandedIds.size) {
      setExpandedIds(parentIds);
    }
  }, [tasks]);

  /* ── Visibility Filter (collapse) ──────────────────────── */
  const visibleRows = useMemo(() => {
    const hiddenParents = new Set();
    return flatList.filter((row) => {
      // If any ancestor is collapsed, hide this row
      if (row.parentId && hiddenParents.has(row.parentId)) {
        if (row.hasChildren) hiddenParents.add(row.id);
        return false;
      }
      // If parent is not expanded, this row is hidden
      if (row.parentId && !expandedIds.has(row.parentId)) {
        if (row.hasChildren) hiddenParents.add(row.id);
        return false;
      }
      return true;
    });
  }, [flatList, expandedIds]);

  /* ── Handlers ───────────────────────────────────────────── */
  const handleToggleExpand = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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

      // If dropping onto a SECTION: nest without dependency
      // If dropping onto a TASK: nest AND create dependency (old behaviour)
      const isTargetSection = targetTask.taskType === 'section';
      const updates = { parentId: targetTask.id };
      if (!isTargetSection) updates.dependsOnTaskId = targetTask.id;

      await onTaskUpdate(sourceTask.id, updates);
    },
    [tasks, onTaskUpdate]
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
      const updates = { parentId: taskAbove.id };

      if (!isAboveSection) {
        // Task-on-task indent: create dependency
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
              <th style={{ width: 70 }}></th>
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
                task={row}
                depth={row.depth}
                isExpanded={expandedIds.has(row.id)}
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
          onSave={handleCreateSave}
          onClose={() => setCreateModal(null)}
        />
      )}

      {/* Edit Modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          allTasks={tasks}
          onSave={handleEditSave}
          onClose={() => setEditingTask(null)}
          onShowMaintenancePrompt={onShowMaintenancePrompt}
          onCreatePrerequisite={handleCreatePrerequisiteFor}
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
