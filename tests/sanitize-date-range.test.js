const { describe, test, expect } = require('@jest/globals');
// Set env before pool.js is imported by the entries module
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.SESSION_SECRET = 'test-session-secret';
const { sanitizeDateRange } = require('../src/routes/entries');

describe('sanitizeDateRange', () => {
  test('returns fallback range when no start/end given', () => {
    // Use a fixed end date by providing it explicitly
    const result = sanitizeDateRange(null, '2025-03-15', 14, 'UTC');
    expect(result.endDate).toBe('2025-03-15');
    expect(result.startDate).toBe('2025-03-02'); // 15 - 13 = 2
  });

  test('clamps start to end when start > end', () => {
    const result = sanitizeDateRange('2025-04-01', '2025-03-15', 14, 'UTC');
    expect(result.startDate).toBe('2025-03-15');
    expect(result.endDate).toBe('2025-03-15');
  });

  test('respects explicit start and end', () => {
    const result = sanitizeDateRange('2025-03-01', '2025-03-10', 14, 'UTC');
    expect(result.startDate).toBe('2025-03-01');
    expect(result.endDate).toBe('2025-03-10');
  });

  test('clamps start to max lookback (180 days)', () => {
    const result = sanitizeDateRange('2020-01-01', '2025-03-15', 14, 'UTC');
    // MAX_HISTORY_DAYS = 180, so max lookback = 2025-03-15 minus 179 = 2024-09-17
    expect(result.startDate).toBe('2024-09-17');
  });

  test('handles month boundaries correctly with UTC math', () => {
    // March 1 minus 1 day = Feb 28 (non-leap year 2025)
    const result = sanitizeDateRange(null, '2025-03-01', 2, 'UTC');
    expect(result.startDate).toBe('2025-02-28');
    expect(result.endDate).toBe('2025-03-01');
  });

  test('handles leap year correctly', () => {
    // March 1 minus 1 day on a leap year = Feb 29
    const result = sanitizeDateRange(null, '2024-03-01', 2, 'UTC');
    expect(result.startDate).toBe('2024-02-29');
    expect(result.endDate).toBe('2024-03-01');
  });

  test('handles year boundaries', () => {
    const result = sanitizeDateRange(null, '2025-01-01', 3, 'UTC');
    expect(result.startDate).toBe('2024-12-30');
    expect(result.endDate).toBe('2025-01-01');
  });

  test('ignores malformed date strings', () => {
    const result = sanitizeDateRange('not-a-date', '2025-03-15', 7, 'UTC');
    // bad start is ignored, fallback used: 2025-03-15 minus 6 = 2025-03-09
    expect(result.startDate).toBe('2025-03-09');
    expect(result.endDate).toBe('2025-03-15');
  });

  test('end date in the future is clamped to today', () => {
    const result = sanitizeDateRange(null, '2099-12-31', 7, 'UTC');
    // end should be clamped to today (not 2099)
    expect(result.endDate).not.toBe('2099-12-31');
  });
});
