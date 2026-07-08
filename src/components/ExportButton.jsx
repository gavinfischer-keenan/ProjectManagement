import React, { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { formatDate, durationDays } from '../utils/dateUtils.js';

export default function ExportButton({ tasks = [], maintenanceEntries = [] }) {
  /* Build a map of task id → task for lookups */
  const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t]));

  const parentName = useCallback(
    (task) => {
      if (!task.parentId) return '';
      const parent = taskMap[task.parentId];
      return parent ? parent.name : '';
    },
    [taskMap]
  );

  const depName = useCallback(
    (task) => {
      if (!task.dependsOnTaskId) return '';
      const dep = taskMap[task.dependsOnTaskId];
      return dep ? dep.name : '';
    },
    [taskMap]
  );

  function isDelayed(task) {
    if (!task.targetDateFinish) return '';
    if (task.dateFinished) {
      return task.dateFinished > task.targetDateFinish ? 'Yes' : 'No';
    }
    const today = new Date().toISOString().slice(0, 10);
    return task.targetDateFinish < today ? 'Yes' : 'No';
  }

  function handleExport() {
    const wb = XLSX.utils.book_new();

    /* Sheet 1: Tasks */
    const taskHeaders = [
      'Task Name',
      'Parent',
      'Dependency',
      'Notes',
      'Target Start',
      'Target Finish',
      'Date Started',
      'Date Finished',
      'Duration (days)',
      'Status',
      '% Complete',
      'Delayed',
    ];

    const taskRows = tasks.map((t) => [
      t.name || '',
      parentName(t),
      depName(t),
      t.notes || '',
      t.targetDateStart || '',
      t.targetDateFinish || '',
      t.dateStarted || '',
      t.dateFinished || '',
      durationDays(t) ?? '',
      t.status || '',
      t.percentComplete != null ? t.percentComplete : '',
      isDelayed(t),
    ]);

    const wsTaskData = [taskHeaders, ...taskRows];
    const wsTasks = XLSX.utils.aoa_to_sheet(wsTaskData);

    /* Set column widths */
    wsTasks['!cols'] = taskHeaders.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, wsTasks, 'Tasks');

    /* Sheet 2: Event Log */
    const maintHeaders = [
      'Description',
      'Linked Task',
      'Date of Repair',
      'Date When Fixed',
      'New Installation',
      'Installation Date',
      'Notes',
    ];

    const maintRows = (maintenanceEntries || []).map((e) => {
      const linkedTask = e.taskId ? (taskMap[e.taskId]?.name || '') : '';
      return [
        e.description || '',
        linkedTask,
        e.dateOfRepair || '',
        e.dateWhenFixed || '',
        e.newInstallation ? 'Yes' : 'No',
        e.newInstallationDate || '',
        e.notes || '',
      ];
    });

    const wsMaintData = [maintHeaders, ...maintRows];
    const wsMaint = XLSX.utils.aoa_to_sheet(wsMaintData);
    wsMaint['!cols'] = maintHeaders.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, wsMaint, 'Event Log');

    /* Trigger download */
    XLSX.writeFile(wb, 'Hawaii_Project_Plan_Export.xlsx');
  }

  return (
    <button className="btn btn--secondary export-btn" onClick={handleExport}>
      📤 Export to Excel
    </button>
  );
}
