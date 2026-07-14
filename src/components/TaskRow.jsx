/* ═══════════════════════════════════════════════════════════════
   TaskRow — Single Task Row — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useRef, useEffect } from 'react';
import { getRowClass, getDateCellClass } from '../utils/colorUtils.js';
import { formatDate } from '../utils/dateUtils.js';
import { calculateRollup, canStartTask } from '../utils/treeUtils.js';
import PercentCell from './PercentCell.jsx';

export default function TaskRow({
  task,
  depth,
  isExpanded,
  hasChildren,
  onToggleExpand,
  onUpdate,
  onDelete,
  onEdit,
  onAddSubtask,
  onShowMaintenancePrompt,
  allTasks,
  owners = [],
  dragState,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onIndent,
  onOutdent,
  isFirstRow,
  readOnly = false,
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(task.name || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingName]);

  /* ── Inline Name Edit ──────────────────────────────────── */
  const handleNameDoubleClick = () => {
    setNameValue(task.name || '');
    setEditingName(true);
  };

  const commitNameEdit = () => {
    setEditingName(false);
    if (nameValue.trim() && nameValue.trim() !== task.name) {
      onUpdate(task.id, { name: nameValue.trim() });
    }
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      commitNameEdit();
    } else if (e.key === 'Escape') {
      setEditingName(false);
      setNameValue(task.name || '');
    }
  };

  /* ── Derived data ────────────────────────────────────────── */
  const isSection    = task.taskType === 'section';
  // We still calculate rollups for tasks with children, but they no longer look like sections.
  const needsRollup = isSection || hasChildren;
  
  // Rollup for parent tasks and sections
  const rollup = needsRollup ? calculateRollup(task, allTasks) : null;
  const displayPercent = rollup ? rollup.percentComplete : (task.percentComplete || 0);
  const displayStatus  = rollup ? rollup.status : (task.status || 'Not Started');
  
  const displayTask = {
    ...task,
    percentComplete: displayPercent,
    status: displayStatus,
    dateFinished: rollup ? (rollup.percentComplete === 100 ? (task.dateFinished || '2099-01-01') : null) : task.dateFinished,
  };

  const baseRowClass = getRowClass(displayTask);
  
  const rowClass = [
    baseRowClass,
    isSection ? 'row-group-header row-section-type' : '',
  ].join(' ').trim();
  const startCellClass  = getDateCellClass(task.dateStarted, task.targetDateStart);
  const finishCellClass = getDateCellClass(task.dateFinished, task.targetDateFinish);
  const { canStart, blockedBy } = canStartTask(task, allTasks);

  const totalDepth = depth;

  /* ── Drag state classes ─────────────────────────────────── */
  const isDragging = dragState.dragId === String(task.id);
  const isDragOver = dragState.overId === task.id;

  /* ── Status Badge ───────────────────────────────────────── */
  const statusBadgeClass = () => {
    switch (displayStatus) {
      case 'Completed':   return 'badge badge-completed';
      case 'In Progress': return 'badge badge-in-progress';
      case 'Blocked':     return 'badge badge-blocked';
      default:            return 'badge badge-not-started';
    }
  };

  return (
    <tr
      className={`${rowClass} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, String(task.id))}
      onDragOver={(e) => onDragOver(e, task.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, task.id)}
      onDragEnd={onDragEnd}
    >
      {/* Indent controls + Expand/Drag Handle */}
      <td style={{ whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {/* Outdent */}
          {!readOnly && (
            <button
              className="indent-btn"
              onClick={() => onOutdent(task.id)}
              disabled={!task.parentId}
              title="Outdent (remove from parent)"
            >
              ◀
            </button>
          )}
          {/* Expand toggle or drag handle */}
          {hasChildren ? (
            <button
              className="expand-toggle"
              onClick={() => onToggleExpand(task.id)}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
            </button>
          ) : (
            !readOnly && <span className="drag-handle" title="Drag to reorder">⠿</span>
          )}
          {/* Indent */}
          {!readOnly && (
            <button
              className="indent-btn"
              onClick={() => onIndent(task.id)}
              disabled={isFirstRow}
              title="Indent (make dependent on row above)"
            >
              ▶
            </button>
          )}
        </div>
      </td>

      {/* Task Name and Details — full-span for sections ONLY */}
      {isSection ? (
        <td colSpan={7}>
          <div className={`indent-${Math.min(totalDepth, 5)}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {editingName ? (
              <input
                ref={inputRef}
                className="task-name-input"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitNameEdit}
                onKeyDown={handleNameKeyDown}
              />
            ) : (
              <span
                className="task-name-editable group-label-text"
                onClick={() => onEdit(task)}
                title="Click to view/edit"
              >
                {task.name || 'Untitled'}
              </span>
            )}
            {!canStart && (
              <span className="blocked-icon" title={`Blocked by: ${blockedBy}`}>🔒</span>
            )}
            {isSection && (
              <span className="section-badge" title="Section — groups tasks below it">§ SECTION</span>
            )}
            {rollup && rollup.totalChildren > 0 && (
              <span className="rollup-info">
                ({rollup.completedChildren}/{rollup.totalChildren} done)
              </span>
            )}
            {isSection && rollup && rollup.totalChildren === 0 && !readOnly && (
              <span className="section-empty-hint">drag tasks here or use indent ▶</span>
            )}
            {isSection && !readOnly && (
              <button 
                className="btn-add-subtask-inline"
                onClick={() => onAddSubtask(task.id)}
                title="Add task in this section"
              >
                + Add Task
              </button>
            )}
          </div>
        </td>
      ) : (
        <>
          {/* Task Name */}
          <td>
            <div className={`indent-${Math.min(totalDepth, 5)}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {task.dependsOnTaskId && <span style={{ color: 'var(--text-muted)', fontSize: '1.2em' }}>↳</span>}
              {editingName ? (
                <input
                  ref={inputRef}
                  className="task-name-input"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={commitNameEdit}
                  onKeyDown={handleNameKeyDown}
                />
              ) : (
                <span
                  className="task-name-editable"
                  onClick={() => onEdit(task)}
                  title="Click to view details"
                >
                  {task.name || 'Untitled'}
                </span>
              )}
              {!canStart && (
                <span className="blocked-icon" title={`Blocked by: ${blockedBy}`}>🔒</span>
              )}
              {task.ownerId && (() => {
                const owner = owners.find(o => o.id === task.ownerId);
                if (!owner) return null;
                return (
                  <span
                    className="owner-badge"
                    title={`Owner: ${owner.name}`}
                  >
                    {owner.name[0].toUpperCase()}
                  </span>
                );
              })()}
            </div>
          </td>

          {/* Dependency */}
          <td>{task.dependency || '—'}</td>

          {/* Target Start */}
          <td>{formatDate(task.targetDateStart)}</td>

          {/* Target Finish */}
          <td>{formatDate(task.targetDateFinish)}</td>

          {/* Date Started */}
          <td className={startCellClass}>{formatDate(task.dateStarted)}</td>

          {/* Date Finished */}
          <td className={finishCellClass}>{formatDate(task.dateFinished)}</td>

          {/* Duration */}
          <td>{task.duration != null ? `${task.duration}d` : '—'}</td>
        </>
      )}

      {/* Progress */}
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <progress 
            value={displayPercent} 
            max="100" 
            style={{ width: '80px', height: '12px' }}
            title={`${displayStatus}: ${displayPercent}%`}
          />
          <span style={{ fontSize: '0.85em', opacity: 0.8, minWidth: '35px' }}>{displayPercent}%</span>
        </div>
      </td>

      {/* Edit */}
      <td>
        {!readOnly && (
          <button
            className="btn-icon"
            onClick={() => onEdit(task)}
            title="Edit task"
          >
            ✏️
          </button>
        )}
      </td>

      {/* Delete */}
      <td>
        {!readOnly && (
          <button
            className="btn-icon danger"
            onClick={() => onDelete(task)}
            title="Delete task"
          >
            🗑️
          </button>
        )}
      </td>
    </tr>
  );
}
