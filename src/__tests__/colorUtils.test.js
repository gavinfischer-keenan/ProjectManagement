import { describe, it, expect } from 'vitest';
import { getRowClass, getDateCellClass, getPercentGradient } from '../utils/colorUtils.js';

describe('getRowClass', () => {
  it('returns row-completed for status Completed', () => {
    const task = { status: 'Completed', percentComplete: 100, dateFinished: null, targetDateFinish: null };
    expect(getRowClass(task)).toBe('row-completed');
  });

  it('returns row-completed for dateFinished set', () => {
    const task = { status: 'In Progress', percentComplete: 50, dateFinished: '2026-01-01', targetDateFinish: null };
    expect(getRowClass(task)).toBe('row-completed');
  });

  it('returns row-late class for past deadline with no finish', () => {
    const task = { status: 'Not Started', percentComplete: 0, dateFinished: null, targetDateFinish: '2020-01-01' };
    const cls = getRowClass(task);
    // The class name may be 'row-late' or 'row-border-red' depending on implementation
    expect(['row-late', 'row-border-red']).toContain(cls);
  });

  it('returns row-default for future deadline', () => {
    const task = { status: 'Not Started', percentComplete: 0, dateFinished: null, targetDateFinish: '2099-01-01' };
    expect(getRowClass(task)).toBe('row-default');
  });

  it('returns row-default for null task', () => {
    expect(getRowClass(null)).toBe('row-default');
  });
});

describe('getDateCellClass', () => {
  it('returns cell-green when actual is before target', () => {
    expect(getDateCellClass('2026-01-01', '2026-06-01')).toBe('cell-green');
  });

  it('returns cell-red when actual is after target', () => {
    expect(getDateCellClass('2026-08-01', '2026-06-01')).toBe('cell-red');
  });

  it('returns empty string when actual is null', () => {
    expect(getDateCellClass(null, '2026-06-01')).toBe('');
  });

  it('returns empty string when target is null', () => {
    expect(getDateCellClass('2026-01-01', null)).toBe('');
  });
});

describe('getPercentGradient', () => {
  it('returns a non-empty string', () => {
    const gradient = getPercentGradient(50);
    expect(typeof gradient).toBe('string');
    expect(gradient.length).toBeGreaterThan(0);
  });

  it('handles 0% without error', () => {
    expect(() => getPercentGradient(0)).not.toThrow();
  });

  it('handles 100% without error', () => {
    expect(() => getPercentGradient(100)).not.toThrow();
  });
});

