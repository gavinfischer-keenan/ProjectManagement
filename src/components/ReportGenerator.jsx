/* ═══════════════════════════════════════════════════════════════
   ReportGenerator — Global Report / Export Tool
   Appears in the top header bar across all screens.
   ═══════════════════════════════════════════════════════════════ */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { durationDays } from '../utils/dateUtils.js';

const FORMATS = [
  {
    id: 'pdf',
    icon: '📑',
    label: 'Information Send (PDF)',
    desc: 'Full project report ready to print or email',
  },
  {
    id: 'excel',
    icon: '📊',
    label: 'Excel (.xlsx)',
    desc: 'Full workbook — Tasks + Event Log sheets',
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

  const [pdfModalState, setPdfModalState] = useState('idle'); // 'idle', 'generating', 'ready'
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfFilename, setPdfFilename] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);

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

  // Auto-revoke PDF blob after 2 minutes to prevent memory leaks/bloat
  useEffect(() => {
    let timerId;
    if (pdfModalState === 'ready' && pdfBlobUrl) {
      setTimeLeft(120);
      timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            URL.revokeObjectURL(pdfBlobUrl);
            setPdfBlobUrl(null);
            setPdfModalState('idle');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [pdfModalState, pdfBlobUrl]);

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
      
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const MM = pad(now.getMonth() + 1);
      const DD = pad(now.getDate());
      const YY = String(now.getFullYear()).slice(-2);
      const HR = pad(now.getHours());
      const MN = pad(now.getMinutes());
      const stamp = `${MM}_${DD}_${YY}__${HR}__${MN}`;
      const baseFilename = `HAWAII_Project_Status_${stamp}`;

      if (selected === 'pdf') {
        setPdfModalState('generating');
        setOpen(false);

        // Allow UI to update and show "Generating..." modal before freezing
        setTimeout(() => {
          const element = document.getElementById('pdf-report-container');
          if (!element) {
            alert('Error: Could not find report container in DOM.');
            setGenerating(false);
            setPdfModalState('idle');
            return;
          }

          const opt = {
            margin:       0.5,
            filename:     `${baseFilename}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
              scale: 2, 
              useCORS: true, 
              logging: false,
              onclone: (clonedDoc) => {
                const hiddenParent = clonedDoc.getElementById('pdf-report-hidden-parent');
                if (hiddenParent) {
                  hiddenParent.style.width = 'auto';
                  hiddenParent.style.height = 'auto';
                  hiddenParent.style.overflow = 'visible';
                  hiddenParent.style.position = 'relative';
                }
              }
            },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
          };

          html2pdf().set(opt).from(element).output('bloburl').then((url) => {
            setGenerating(false);
            setPdfBlobUrl(url);
            setPdfFilename(opt.filename);
            setPdfModalState('ready');
          });
        }, 100);
        
        return; // async handling above
      }

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
          XLSX.utils.book_append_sheet(wb, wsMaint, 'Event Log');
        }

        XLSX.writeFile(wb, `${baseFilename}.xlsx`);

      } else if (selected === 'tsv') {
        let content = '=== TASKS ===\n' + toDelimited('\t', tH, tR);
        if (includeMaint) content += '\n\n=== EVENT LOG ===\n' + toDelimited('\t', mH, mR);
        download(`${baseFilename}.tsv`, content, 'text/tab-separated-values');

      } else if (selected === 'csv' || selected === 'google') {
        let content = toDelimited(',', tH, tR);
        download(`${baseFilename}_Tasks.csv`, content, 'text/csv');
        if (includeMaint) {
          let mContent = toDelimited(',', mH, mR);
          setTimeout(() => download(`${baseFilename}_Maintenance.csv`, mContent, 'text/csv'), 300);
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
              <span>Event Log</span>
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

      {/* PDF Modal */}
      {pdfModalState !== 'idle' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'var(--bg-panel)',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            textAlign: 'center',
            minWidth: '350px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {pdfModalState === 'generating' ? (
              <>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', fontSize: '1.2rem' }}>Generating PDF...</h3>
                <p style={{ margin: '0 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Please wait, this may take a moment.
                </p>
              </>
            ) : (
              <>
                <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', fontSize: '1.2rem' }}>PDF Generated</h3>
                <p style={{ margin: '0 0 25px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Your Information Send PDF is ready.
                </p>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
                      setPdfBlobUrl(null);
                      setPdfModalState('idle');
                    }}
                  >
                    Cancel (Delete)
                  </button>
                  <a 
                    href={pdfBlobUrl} 
                    download={pdfFilename} 
                    className="btn btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-block' }}
                    onClick={() => {
                      // Wait a beat before revoking so download can start
                      setTimeout(() => {
                        if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
                        setPdfBlobUrl(null);
                        setPdfModalState('idle');
                      }, 1000);
                    }}
                  >
                    Download PDF
                  </a>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--red)', marginTop: '20px' }}>
                  To save browser memory, this PDF will automatically be deleted in <strong>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</strong>.
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
