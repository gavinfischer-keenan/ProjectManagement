import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  excelSerialToISO,
  isoToDate,
  formatDate,
  isLate,
  isDueSoon,
  daysBetween,
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

describe('daysBetween', () => {
  it('calculates days between two ISO dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-11')).toBe(10);
  });
  it('returns 0 for same date', () => {
    expect(daysBetween('2026-06-01', '2026-06-01')).toBe(0);
  });
});

describe('today', () => {
  it('returns a YYYY-MM-DD string', () => {
    const t = today();
    expect(t).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

