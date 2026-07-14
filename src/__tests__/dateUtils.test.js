import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  excelSerialToISO,
  isoToDate,
  formatDate,
  isLate,
  isDueSoon,
  isBeforeTarget,
  daysBetween,
  daysOverdue,
  durationDays,
  addDaysToISO,
  today,
} from '../utils/dateUtils.js';

describe('excelSerialToISO', () => {
  it('converts a known Excel serial date', () => {
    // Excel 45108 — verify it produces a valid ISO date string
    const result = excelSerialToISO(45108);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('returns null for null input', () => {
    expect(excelSerialToISO(null)).toBeNull();
  });
  it('returns null for zero', () => {
    expect(excelSerialToISO(0)).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(excelSerialToISO('')).toBeNull();
  });
  it('returns null for negative serial', () => {
    expect(excelSerialToISO(-5)).toBeNull();
  });
  it('handles the Lotus 1900 leap-year bug boundary (serial 60)', () => {
    // serial 60 = fictional Feb 29, 1900. Should not crash.
    const r = excelSerialToISO(60);
    expect(r).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('isoToDate', () => {
  it('parses YYYY-MM-DD to a Date in UTC', () => {
    const d = isoToDate('2026-07-05');
    expect(d).toBeInstanceOf(Date);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(6); // 0-indexed
    expect(d.getUTCDate()).toBe(5);
  });
  it('returns null for empty string', () => {
    expect(isoToDate('')).toBeNull();
  });
  it('returns null for null', () => {
    expect(isoToDate(null)).toBeNull();
  });
});

describe('formatDate', () => {
  it('formats an ISO date to readable string', () => {
    expect(formatDate('2026-01-15')).toBe('Jan 15, 2026');
  });
  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });
  it('returns em dash for empty string', () => {
    expect(formatDate('')).toBe('—');
  });
});

describe('isLate', () => {
  const PAST = '2020-01-01';
  const FUTURE = '2099-01-01';

  it('returns true if targetDateFinish is past and not finished', () => {
    expect(isLate(PAST, null)).toBe(true);
  });
  it('returns false if dateFinished is set (task done)', () => {
    expect(isLate(PAST, '2020-01-02')).toBe(false);
  });
  it('returns false if targetDateFinish is in the future', () => {
    expect(isLate(FUTURE, null)).toBe(false);
  });
  it('returns false if no targetDateFinish', () => {
    expect(isLate(null, null)).toBe(false);
  });
});

describe('isDueSoon', () => {
  it('returns false if no targetDateFinish', () => {
    expect(isDueSoon(null, null)).toBe(false);
  });
  it('returns false if task is already finished', () => {
    expect(isDueSoon('2099-01-01', '2099-01-01')).toBe(false);
  });
  it('returns false if due date is far in the future', () => {
    expect(isDueSoon('2099-01-01', null)).toBe(false);
  });
});

describe('isBeforeTarget', () => {
  it('returns true when actualDate is before targetDate', () => {
    expect(isBeforeTarget('2026-01-01', '2026-06-01')).toBe(true);
  });
  it('returns false when actualDate is after targetDate', () => {
    expect(isBeforeTarget('2026-09-01', '2026-06-01')).toBe(false);
  });
  it('returns false when dates are equal', () => {
    expect(isBeforeTarget('2026-06-01', '2026-06-01')).toBe(false);
  });
  it('returns false when actualDate is null', () => {
    expect(isBeforeTarget(null, '2026-06-01')).toBe(false);
  });
  it('returns false when targetDate is null', () => {
    expect(isBeforeTarget('2026-01-01', null)).toBe(false);
  });
});

describe('daysBetween', () => {
  it('calculates days between two ISO dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-11')).toBe(10);
  });
  it('returns 0 for same date', () => {
    expect(daysBetween('2026-06-01', '2026-06-01')).toBe(0);
  });
  it('is symmetric (order does not matter)', () => {
    expect(daysBetween('2026-01-11', '2026-01-01')).toBe(10);
  });
  it('returns 0 when a date is null', () => {
    expect(daysBetween(null, '2026-01-01')).toBe(0);
  });
});

describe('daysOverdue', () => {
  it('returns 0 for task with no targetDateFinish', () => {
    expect(daysOverdue({ targetDateFinish: null })).toBe(0);
  });
  it('returns 0 for completed task', () => {
    expect(daysOverdue({ targetDateFinish: '2020-01-01', dateFinished: '2020-01-01' })).toBe(0);
  });
  it('returns 0 for future deadline', () => {
    expect(daysOverdue({ targetDateFinish: '2099-01-01', dateFinished: null })).toBe(0);
  });
  it('returns positive days for past deadline', () => {
    const overdue = daysOverdue({ targetDateFinish: '2020-01-01', dateFinished: null });
    expect(overdue).toBeGreaterThan(0);
  });
  it('returns 0 for null task', () => {
    expect(daysOverdue(null)).toBe(0);
  });
});

describe('addDaysToISO', () => {
  it('adds positive days correctly', () => {
    expect(addDaysToISO('2026-01-01', 10)).toBe('2026-01-11');
  });
  it('adds negative days (subtracts)', () => {
    expect(addDaysToISO('2026-01-11', -10)).toBe('2026-01-01');
  });
  it('handles month boundary crossing', () => {
    expect(addDaysToISO('2026-01-28', 5)).toBe('2026-02-02');
  });
  it('handles year boundary crossing', () => {
    expect(addDaysToISO('2026-12-28', 10)).toBe('2027-01-07');
  });
  it('returns empty string for null input', () => {
    expect(addDaysToISO(null, 5)).toBe('');
  });
  it('returns same date for 0 days', () => {
    expect(addDaysToISO('2026-06-01', 0)).toBe('2026-06-01');
  });
});

describe('durationDays', () => {
  it('returns null for null task', () => {
    expect(durationDays(null)).toBeNull();
  });
  it('returns task.duration when no actual dates', () => {
    expect(durationDays({ duration: 5 })).toBe(5);
  });
  it('returns null when no dates and no duration', () => {
    expect(durationDays({ duration: null })).toBeNull();
  });
  it('calculates from dateStarted and dateFinished', () => {
    expect(durationDays({ dateStarted: '2026-01-01', dateFinished: '2026-01-11' })).toBe(10);
  });
  it('uses dateStarted to today when not yet finished', () => {
    // As long as dateStarted is set and no finish, result >= 0
    const result = durationDays({ dateStarted: '2020-01-01', dateFinished: null, duration: null });
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe('today', () => {
  it('returns a YYYY-MM-DD string', () => {
    const t = today();
    expect(t).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
