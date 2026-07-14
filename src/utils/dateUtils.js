/* ═══════════════════════════════════════════════════════════════
   Date Utilities — Hawaii Project Manager
   ═══════════════════════════════════════════════════════════════ */

/**
 * Convert an Excel serial date number to an ISO date string (YYYY-MM-DD).
 * Excel epoch is Jan 0, 1900 (serial 1 = Jan 1, 1900).
 * Accounts for the Lotus 123 leap-year bug (serial 60 = Feb 29, 1900 which didn't exist).
 */
export function excelSerialToISO(serial) {
  if (serial == null || serial === '' || isNaN(serial)) return null;
  const num = Number(serial);
  if (num <= 0) return null;

  // Excel incorrectly treats 1900 as a leap year; serials > 60 are off by 1 day.
  const adjusted = num > 60 ? num - 1 : num;
  // Excel serial 1 = Jan 1, 1900.  JS Date epoch: Jan 1, 1970.
  // Days between 1900-01-01 and 1970-01-01 = 25567
  const msPerDay = 86400000;
  const date = new Date((adjusted - 1) * msPerDay - 25567 * msPerDay);

  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse an ISO string (YYYY-MM-DD) to a Date object (UTC midnight).
 */
export function isoToDate(isoStr) {
  if (!isoStr) return null;
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Format an ISO string to 'MMM DD, YYYY' for display.
 */
export function formatDate(isoStr) {
  if (!isoStr) return '—';
  const date = isoToDate(isoStr);
  if (!date || isNaN(date.getTime())) return '—';

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/**
 * Returns true if the task is late:
 * targetDateFinish is in the past AND dateFinished is null/empty.
 */
export function isLate(targetDateFinish, dateFinished) {
  if (!targetDateFinish) return false;
  if (dateFinished) return false;

  const target = isoToDate(targetDateFinish);
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return target.getTime() < todayUTC;
}

/**
 * Returns true if targetDateFinish is within `days` days from today
 * AND the task is not yet finished.
 */
export function isDueSoon(targetDateFinish, dateFinished, days = 3) {
  if (!targetDateFinish) return false;
  if (dateFinished) return false;

  const target = isoToDate(targetDateFinish);
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = target.getTime() - todayUTC;
  const msPerDay = 86400000;

  return diff >= 0 && diff <= days * msPerDay;
}

/**
 * Returns true if actualDate is before targetDate (both ISO strings).
 */
export function isBeforeTarget(actualDate, targetDate) {
  if (!actualDate || !targetDate) return false;
  const actual = isoToDate(actualDate);
  const target = isoToDate(targetDate);
  return actual.getTime() < target.getTime();
}

/**
 * Return the number of days between two ISO dates (absolute value).
 */
export function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return 0;
  const a = isoToDate(dateA);
  const b = isoToDate(dateB);
  const msPerDay = 86400000;
  return Math.round(Math.abs(a.getTime() - b.getTime()) / msPerDay);
}

/**
 * Return today's date as an ISO string (YYYY-MM-DD).
 */
export function today() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Return the number of days a task is overdue (positive = overdue).
 * Returns 0 if not overdue or if dates are missing.
 */
export function daysOverdue(task) {
  if (!task || !task.targetDateFinish || task.dateFinished) return 0;
  const target = isoToDate(task.targetDateFinish);
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = todayUTC - target.getTime();
  const msPerDay = 86400000;
  return diff > 0 ? Math.floor(diff / msPerDay) : 0;
}

/**
 * Calculate duration in days between dateStarted and dateFinished (or today if not finished).
 * Returns task.duration if actual dates are not available.
 */
export function durationDays(task) {
  if (!task) return null;
  if (task.dateStarted && task.dateFinished) {
    return daysBetween(task.dateStarted, task.dateFinished);
  }
  if (task.dateStarted) {
    return daysBetween(task.dateStarted, today());
  }
  return task.duration ?? null;
}

/**
 * Add days to an ISO date string and return a new ISO date string.
 */
export function addDaysToISO(isoStr, days) {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yOut = date.getUTCFullYear();
  const mOut = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dOut = String(date.getUTCDate()).padStart(2, '0');
  return `${yOut}-${mOut}-${dOut}`;
}

