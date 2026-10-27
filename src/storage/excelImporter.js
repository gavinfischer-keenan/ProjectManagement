/**
 * Client-Side Excel Importer for Hawaii PM
 * Replicates server/routes/import.js using SheetJS in-browser!
 */

import * as XLSX from 'xlsx';
import { dbFetchTasks } from './db.js';

function excelSerialToISO(serial) {
  if (serial == null || typeof serial !== 'number' || serial < 1) {
    return null;
  }
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

function cellVal(sheet, col, row) {
  const addr = `${col}${row + 1}`;
  const cell = sheet[addr];
  return cell ? cell.v : undefined;
}

function isRowSection(sheet, row) {
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  for (const col of cols) {
    const addr = `${col}${row + 1}`;
    const cell = sheet[addr];
    if (cell && typeof cell.f === 'string') {
      const formula = cell.f.toUpperCase();
      if (formula.includes('MAX(') || formula.includes('MIN(')) {
        return true;
      }
    }
  }
  return false;
}

export async function parseExcelTasks(file) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellFormula: true, cellDates: false });

  const sheetName = workbook.SheetNames.includes('Renovation Tracker')
    ? 'Renovation Tracker'
    : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error('No usable sheet found in workbook');
  }

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const lastRow = range.e.r;

  const tasks = [];
  let currentParentId = null;
  let orderCounter = 0;

  for (let r = 17; r <= lastRow; r++) {
    const rawName = cellVal(sheet, 'B', r);
    if (rawName == null || (typeof rawName === 'string' && rawName.trim() === '')) {
      currentParentId = null;
      continue;
    }

    const name = String(rawName).trim();
    const isSection = isRowSection(sheet, r);
    const taskId = crypto.randomUUID();

    if (isSection) {
      currentParentId = taskId;
    }

    const rawDuration = cellVal(sheet, 'C', r);
    const duration = typeof rawDuration === 'number' ? Math.round(rawDuration) : 0;

    const rawDep = cellVal(sheet, 'D', r);
    const dependency = rawDep != null ? String(rawDep).trim() : '';

    const startVal = cellVal(sheet, 'E', r);
    const finishVal = cellVal(sheet, 'F', r);
    const actStartVal = cellVal(sheet, 'G', r);
    const actFinishVal = cellVal(sheet, 'H', r);

    const targetDateStart = typeof startVal === 'number' ? excelSerialToISO(startVal) : (startVal ? String(startVal).split('T')[0] : null);
    const targetDateFinish = typeof finishVal === 'number' ? excelSerialToISO(finishVal) : (finishVal ? String(finishVal).split('T')[0] : null);
    const dateStarted = typeof actStartVal === 'number' ? excelSerialToISO(actStartVal) : (actStartVal ? String(actStartVal).split('T')[0] : null);
    const dateFinished = typeof actFinishVal === 'number' ? excelSerialToISO(actFinishVal) : (actFinishVal ? String(actFinishVal).split('T')[0] : null);

    const rawStatus = cellVal(sheet, 'I', r);
    const status = rawStatus ? String(rawStatus).trim() : (isSection ? 'Not Started' : 'Not Started');

    const rawPct = cellVal(sheet, 'J', r);
    const percentComplete = typeof rawPct === 'number' ? Math.min(100, Math.max(0, Math.round(rawPct <= 1 ? rawPct * 100 : rawPct))) : 0;

    const rawDelayed = cellVal(sheet, 'K', r);
    const delayed = rawDelayed === true || String(rawDelayed).toUpperCase() === 'YES';

    tasks.push({
      id: taskId,
      parentId: isSection ? null : currentParentId,
      order: orderCounter++,
      name,
      taskType: isSection ? 'section' : 'task',
      dependency,
      dependsOnTaskId: null,
      notes: '',
      targetDateStart,
      targetDateFinish,
      dateStarted,
      dateFinished,
      duration,
      status,
      delayed,
      percentComplete,
      isMilestone: false,
      milestoneText: '',
      isHardware: false,
      hardwareText: '',
      vendorId: null,
      ownerId: null,
      supplies: [],
      createdAt: new Date().toISOString()
    });
  }

  return tasks;
}
