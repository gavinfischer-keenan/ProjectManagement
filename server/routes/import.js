import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '..', 'data', 'tasks.json');

// Store uploads in OS temp directory
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert an Excel serial date number to an ISO date string (YYYY-MM-DD).
 * Returns null if the value is not a valid serial date.
 */
function excelSerialToISO(serial) {
  if (serial == null || typeof serial !== 'number' || serial < 1) {
    return null;
  }
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split('T')[0];
}

/**
 * Safely read a cell value — returns the raw value or an empty string.
 */
function cellVal(sheet, col, row) {
  const addr = `${col}${row + 1}`; // XLSX uses 1-indexed rows in cell refs
  const cell = sheet[addr];
  return cell ? cell.v : undefined;
}

/**
 * Check if a row has a MAX or MIN formula in any cell, marking it as a Section.
 */
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

// ---------------------------------------------------------------------------
// POST /  — import an .xlsx file
// ---------------------------------------------------------------------------
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);

    // Try the named sheet first, fall back to the first sheet
    const sheetName = workbook.SheetNames.includes('Renovation Tracker')
      ? 'Renovation Tracker'
      : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return res.status(400).json({ error: 'No usable sheet found in workbook' });
    }

    // Determine the used range
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const lastRow = range.e.r; // 0-indexed

    // -----------------------------------------------------------------
    // Phase 1: Parse actual data rows starting at row 18 (0-indexed).
    // Build parent/child structure using MIN/MAX formula detection.
    // -----------------------------------------------------------------
    const tasks = [];
    let currentParentId = null;
    let orderCounter = 0;

    for (let r = 17; r <= lastRow; r++) {
      const rawName = cellVal(sheet, 'B', r);

      // Skip completely empty rows — they act as section separators
      if (rawName == null || (typeof rawName === 'string' && rawName.trim() === '')) {
        // A blank row ends the current parent section
        currentParentId = null;
        continue;
      }

      const name = typeof rawName === 'string' ? rawName.trim() : String(rawName).trim();
      if (name === '') continue;

      const dependency = cellVal(sheet, 'C', r);
      const notes = cellVal(sheet, 'D', r);
      const startDateRaw = cellVal(sheet, 'E', r);
      const durationRaw = cellVal(sheet, 'F', r);
      const endDateRaw = cellVal(sheet, 'G', r);
      const statusRaw = cellVal(sheet, 'H', r);
      const delayedRaw = cellVal(sheet, 'I', r);
      const adjustedEndRaw = cellVal(sheet, 'J', r);

      const targetDateStart = excelSerialToISO(startDateRaw);
      let targetDateFinish = excelSerialToISO(endDateRaw);
      const adjustedEnd = excelSerialToISO(adjustedEndRaw);

      // If there's an adjusted end date and it differs, prefer it
      if (adjustedEnd && adjustedEnd !== targetDateFinish) {
        targetDateFinish = adjustedEnd;
      }

      const duration = typeof durationRaw === 'number' ? durationRaw : null;

      const status = statusRaw && typeof statusRaw === 'string'
        ? statusRaw.trim()
        : 'Not Started';

      const delayed = delayedRaw === true
        || delayedRaw === 'Yes'
        || delayedRaw === 'yes'
        || delayedRaw === 'TRUE'
        || delayedRaw === 1;

      const taskId = uuidv4();

      // Determine if this row is a section header via formulas
      const isParent = isRowSection(sheet, r);

      if (isParent) {
        currentParentId = taskId;
      }

      const task = {
        id: taskId,
        parentId: isParent ? null : currentParentId,
        order: orderCounter++,
        name,
        taskType: isParent ? 'section' : 'task',
        dependency: dependency != null ? String(dependency).trim() : '',
        dependsOnTaskId: null,
        notes: notes != null ? String(notes).trim() : '',
        targetDateStart,
        targetDateFinish,
        dateStarted: null,
        dateFinished: null,
        duration,
        status,
        delayed,
        percentComplete: 0,
      };

      if (status === 'Completed') {
        task.percentComplete = 100;
        task.dateFinished = targetDateFinish || targetDateStart || new Date().toISOString().split('T')[0];
        task.dateStarted = targetDateStart || task.dateFinished;
      }

      tasks.push(task);
    }

    // -----------------------------------------------------------------
    // Phase 3: Resolve "line above" dependencies
    // -----------------------------------------------------------------
    for (let i = 0; i < tasks.length; i++) {
      const dep = tasks[i].dependency.toLowerCase().trim();
      if (!dep) continue;

      if (dep === 'line above' && i > 0) {
        tasks[i].dependsOnTaskId = tasks[i - 1].id;
        tasks[i].parentId = tasks[i - 1].id;
        tasks[i].dependency = tasks[i - 1].name;
      } else {
        // Fuzzy match against other tasks
        const match = tasks.find(t => 
          t.name.toLowerCase().trim() === dep || 
          t.name.toLowerCase().includes(dep) || 
          dep.includes(t.name.toLowerCase())
        );
        if (match) {
          tasks[i].dependsOnTaskId = match.id;
          tasks[i].parentId = match.id;
          tasks[i].dependency = match.name;
        }
      }
    }

    // -----------------------------------------------------------------
    // Persist and respond (Fully Purging old db)
    // -----------------------------------------------------------------
    fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks }, null, 2), 'utf-8');
    
    // Purge maintenance log as well
    const MAINT_FILE = path.join(__dirname, '..', 'data', 'maintenance.json');
    fs.writeFileSync(MAINT_FILE, JSON.stringify({ entries: [] }, null, 2), 'utf-8');

    // Clean up the uploaded temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // non-critical
    }

    return res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    console.error('POST /import error:', err);

    // Clean up on error too
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }

    return res.status(500).json({ error: 'Failed to import file', details: err.message });
  }
});

export default router;
