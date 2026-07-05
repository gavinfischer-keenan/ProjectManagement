/* ═══════════════════════════════════════════════════════════════
   TaskTable — Main Project Tracking Table — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useMemo, useCallback } from 'react';
import { buildTree, flattenTree } from '../utils/treeUtils.js';
import TaskRow from './TaskRow.jsx';
import TaskEditModal from './TaskEditModal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function TaskTable({
  tasks,
  onTaskUpdate,
  onTaskDelete,
  onTaskCreate,
  onShowMaintenancePrompt,
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
      if (editingTask) {
        await onTaskUpdate(editingTask.id, updatedData);
        setEditingTask(null);
      }
    },
    [editingTask, onTaskUpdate]
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
    const newTask = {
      name: 'New Task',
      parentId: null,
      order: tasks.filter((t) => !t.parentId).length,
      status: 'Not Started',
      percentComplete: 0,
    };
    onTaskCreate(newTask);
  }, [tasks, onTaskCreate]);

  const handleAddSubtask = useCallback(
    (parentId) => {
      const newTask = {
        name: 'New Sub-task',
        parentId,
        order: tasks.filter((t) => t.parentId === parentId).length,
        status: 'Not Started',
        percentComplete: 0,
      };
      onTaskCreate(newTask);
    },
    [tasks, onTaskCreate]
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

      // Indent (Reparent): Make the source task a child (dependency) of the target task
      await onTaskUpdate(sourceTask.id, { 
        parentId: targetTask.id,
        dependsOnTaskId: targetTask.id 
      });
    },
    [tasks, onTaskUpdate]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({ dragId: null, overId: null });
  }, []);

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
        <div className="table-toolbar-actions">
          <button className="btn btn-primary btn-sm" onClick={handleAddTask}>
            + Add Task
          </button>
        </div>
      </div>

      <div className="task-table-container">
        <table className="task-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
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
            {visibleRows.map((row) => (
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
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          allTasks={tasks}
          onSave={handleEditSave}
          onClose={() => setEditingTask(null)}
          onShowMaintenancePrompt={onShowMaintenancePrompt}
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
