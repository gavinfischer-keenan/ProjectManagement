/* ═══════════════════════════════════════════════════════════════
   ReportGenerator — Global Report / Export Tool
   Appears in the top header bar across all screens.
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { durationDays } from '../utils/dateUtils.js';

const FORMATS = [
  {
    id: 'excel',
    icon: '📊',
    label: 'Excel (.xlsx)',
    desc: 'Full workbook — Tasks + Maintenance Log sheets',
  },
  {
    id: 'tsv',
    icon: '📄',
    label: 'Tab-Delimited Text (.tsv)',
    desc: 'Import into any spreadsheet or database',
  },
  {
    id: 'csv',
    icon: '📋',
    label: 'CSV (.csv)',
    desc: 'Universal format for all apps',
  },
  {
    id: 'google',
    icon: '🔗',
    label: 'Google Sheets',
    desc: 'Downloads CSV — then open with Google Sheets',
  },
];

export default function ReportGenerator({ tasks = [], maintenanceEntries = [] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('excel');
  const [includeGantt, setIncludeGantt] = useState(true);
  const [includeMaint, setIncludeMaint] = useState(true);
  const [generating, setGenerating] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  const taskMap = Object.fromEntries(tasks.map((t) => [t.id, t]));

  const parentName = (task) => {
    if (!task.parentId) return '';
    return taskMap[task.parentId]?.name || '';
  };
  const depName = (task) => {
    if (!task.dependsOnTaskId) return '';
    return taskMap[task.dependsOnTaskId]?.name || '';
  };
  function isDelayed(task) {
    if (!task.targetDateFinish) return '';
    if (task.dateFinished) return task.dateFinished > task.targetDateFinish ? 'Yes' : 'No';
    return task.targetDateFinish < new Date().toISOString().slice(0, 10) ? 'Yes' : 'No';
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Build task rows data (shared across formats)
  const buildTaskRows = useCallback(() => {
    const headers = [
      'Task Name', 'Type', 'Parent Section', 'Dependency', 'Notes',
      'Target Start', 'Target Finish', 'Date Started', 'Date Finished',
      'Duration (days)', 'Status', '% Complete', 'Delayed',
    ];
    const rows = tasks.map((t) => [
      t.name || '',
      t.taskType === 'section' ? 'Section' : 'Task',
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
    return { headers, rows };
  }, [tasks, taskMap]);

  const buildMaintRows = useCallback(() => {
    const headers = [
      'Description', 'Linked Task', 'Date of Repair', 'Date When Fixed',
      'New Installation', 'Installation Date', 'Notes',
    ];
    const rows = (maintenanceEntries || []).map((e) => [
      e.description || '',
      e.taskId ? (taskMap[e.taskId]?.name || '') : '',
      e.dateOfRepair || '',
      e.dateWhenFixed || '',
      e.newInstallation ? 'Yes' : 'No',
      e.newInstallationDate || '',
      e.notes || '',
    ]);
    return { headers, rows };
  }, [maintenanceEntries, taskMap]);

  function toDelimited(delimiter, headersArr, rowsArr) {
    const escapeCell = (v) => {
      const s = String(v);
      if (delimiter === '\t') return s;
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    return [headersArr, ...rowsArr]
      .map((row) => row.map(escapeCell).join(delimiter))
      .join('\n');
  }

  function download(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Build a Gantt sheet: tasks as rows, weeks as columns, cells filled where task spans
  function buildGanttSheet(allTasks) {
    // Get date range
    const withDates = allTasks.filter(t => t.targetDateStart || t.targetDateFinish);
    if (withDates.length === 0) return [['No tasks with dates']];

    const allStarts = withDates.map(t => t.targetDateStart).filter(Boolean).sort();
    const allFinishes = withDates.map(t => t.targetDateFinish).filter(Boolean).sort();
    const minDate = new Date(allStarts[0]);
    const maxDate = new Date(allFinishes[allFinishes.length - 1]);

    // Align to Monday
    const startMonday = new Date(minDate);
    startMonday.setDate(startMonday.getDate() - ((startMonday.getDay() + 6) % 7));
    const endSunday = new Date(maxDate);
    endSunday.setDate(endSunday.getDate() + (7 - endSunday.getDay()));

    // Build week columns
    const weeks = [];
    let cursor = new Date(startMonday);
    while (cursor <= endSunday) {
      weeks.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }

    const fmtDate = (d) => `${d.getMonth()+1}/${d.getDate()}`;

    // Header rows
    const monthRow  = ['Task Name', 'Status', ...weeks.map(w => w.toLocaleString('default', { month: 'short', year: '2-digit' })) ];
    const weekRow   = ['', '', ...weeks.map(w => fmtDate(w))];

    // Task rows
    const taskMap = Object.fromEntries(allTasks.map(t => [t.id, t]));
    const rows = allTasks.map(task => {
      const prefix = task.parentId ? '  ' : '';
      const row = [prefix + (task.name || ''), task.status || ''];
      const start  = task.targetDateStart  ? new Date(task.targetDateStart)  : null;
      const finish = task.targetDateFinish ? new Date(task.targetDateFinish) : null;
      for (const week of weeks) {
        const weekEnd = new Date(week); weekEnd.setDate(weekEnd.getDate() + 6);
        const active = start && finish && start <= weekEnd && finish >= week;
        row.push(active ? '█' : '');
      }
      return row;
    });

    return [monthRow, weekRow, ...rows];
  }

  function handleGenerate() {
    setGenerating(true);
    try {
      const { headers: tH, rows: tR } = buildTaskRows();
      const { headers: mH, rows: mR } = buildMaintRows();
      const stamp = new Date().toISOString().slice(0, 10);

      if (selected === 'excel') {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Tasks
        const wsTasks = XLSX.utils.aoa_to_sheet([tH, ...tR]);
        wsTasks['!cols'] = tH.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
        XLSX.utils.book_append_sheet(wb, wsTasks, 'Tasks');

        // Optional Sheet 2: Gantt
        if (includeGantt && tasks.length > 0) {
          const ganttData = buildGanttSheet(tasks);
          const wsGantt = XLSX.utils.aoa_to_sheet(ganttData);
          wsGantt['!cols'] = ganttData[0]?.map((_, i) => ({ wch: i < 2 ? 28 : 4 })) || [];
          XLSX.utils.book_append_sheet(wb, wsGantt, 'Gantt Chart');
        }

        // Optional Sheet 3: Maintenance
        if (includeMaint) {
          const wsMaint = XLSX.utils.aoa_to_sheet([mH, ...mR]);
          wsMaint['!cols'] = mH.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
          XLSX.utils.book_append_sheet(wb, wsMaint, 'Maintenance Log');
        }

        XLSX.writeFile(wb, `Hawaii_Project_Report_${stamp}.xlsx`);

      } else if (selected === 'tsv') {
        let content = '=== TASKS ===\n' + toDelimited('\t', tH, tR);
        if (includeMaint) content += '\n\n=== MAINTENANCE LOG ===\n' + toDelimited('\t', mH, mR);
        download(`Hawaii_Project_Report_${stamp}.tsv`, content, 'text/tab-separated-values');

      } else if (selected === 'csv' || selected === 'google') {
        let content = toDelimited(',', tH, tR);
        download(`Hawaii_Project_Tasks_${stamp}.csv`, content, 'text/csv');
        if (includeMaint) {
          let mContent = toDelimited(',', mH, mR);
          setTimeout(() => download(`Hawaii_Project_Maintenance_${stamp}.csv`, mContent, 'text/csv'), 300);
        }
      }

      setOpen(false);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="report-generator-wrapper">
      <button
        ref={btnRef}
        className={`btn-report-generator ${open ? 'active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="Generate Reports & Exports"
      >
        <span className="report-gen-icon">📋</span>
        <span className="report-gen-label">Report Generator</span>
        <span className={`report-gen-caret ${open ? 'open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="report-panel" ref={panelRef}>
          <div className="report-panel-header">
            <span className="report-panel-title">📋 Report Generator</span>
            <button className="report-panel-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <p className="report-panel-hint">Choose a format and options, then click Generate.</p>

          {/* Format selector */}
          <div className="report-formats">
            {FORMATS.map((fmt) => (
              <label
                key={fmt.id}
                className={`report-format-option ${selected === fmt.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="report-format"
                  value={fmt.id}
                  checked={selected === fmt.id}
                  onChange={() => setSelected(fmt.id)}
                  style={{ display: 'none' }}
                />
                <span className="report-format-icon">{fmt.icon}</span>
                <div className="report-format-text">
                  <span className="report-format-label">{fmt.label}</span>
                  <span className="report-format-desc">{fmt.desc}</span>
                </div>
                {selected === fmt.id && <span className="report-format-check">✓</span>}
              </label>
            ))}
          </div>

          {/* Options */}
          <div className="report-options">
            <p className="report-options-heading">Include in report:</p>
            <label className="report-option-check">
              <input type="checkbox" checked={includeMaint} onChange={(e) => setIncludeMaint(e.target.checked)} />
              <span>Maintenance Log</span>
            </label>
            <label className="report-option-check" >
              <input type="checkbox" checked={includeGantt} onChange={(e) => setIncludeGantt(e.target.checked)} />
              <span>Gantt Chart sheet (Excel only)</span>
            </label>
          </div>

          <button
            className="btn-generate"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? '⏳ Generating…' : '⬇ Generate Report'}
          </button>
        </div>
      )}
    </div>
  );
}
