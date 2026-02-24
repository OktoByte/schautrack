const { describe, test, expect } = require('@jest/globals');

// Mock DB pool — buildDailyStats is pure but the module imports pool
jest.mock('../src/db/pool', () => ({
  pool: { query: jest.fn() },
  getEffectiveSetting: jest.fn().mockResolvedValue(null),
}));

const { buildDailyStats } = require('../src/routes/entries');

// Helper: build a totalsByDate Map from an object
const toMap = (obj) => new Map(Object.entries(obj));

describe('buildDailyStats', () => {
  const days = ['2024-01-03', '2024-01-02', '2024-01-01'];

  test('returns correct dot status for calorie-only (under goal)', () => {
    const totals = toMap({ '2024-01-01': 1500 });
    const stats = buildDailyStats(days, totals, 2000, { threshold: 10 });
    const jan1 = stats.find((s) => s.date === '2024-01-01');
    expect(jan1.status).toBe('under');
    expect(jan1.overThreshold).toBe(false);
  });

  test('returns over_threshold when calories exceed goal + threshold%', () => {
    // Goal 2000, threshold 10% → danger at > 2200
    const totals = toMap({ '2024-01-01': 2500 });
    const stats = buildDailyStats(days, totals, 2000, { threshold: 10 });
    const jan1 = stats.find((s) => s.date === '2024-01-01');
    expect(jan1.status).toBe('over_threshold');
    expect(jan1.overThreshold).toBe(true);
  });

  test('returns zero for days with no entries when goal is set', () => {
    const totals = toMap({});
    const stats = buildDailyStats(days, totals, 2000, { threshold: 10 });
    expect(stats[0].status).toBe('zero');
  });

  test('returns none when no goal is set', () => {
    const totals = toMap({ '2024-01-01': 1500 });
    const stats = buildDailyStats(days, totals, null, { threshold: 10 });
    expect(stats.find((s) => s.date === '2024-01-01').status).toBe('none');
  });

  // --- Regression: linked user dots must include macro goals ---

  test('macro goals affect dot status (worst-of-all)', () => {
    // Calories: 1500 / 2000 goal → under (green)
    // Protein: 10 / 150 goal, target mode → danger (red, far below target)
    const totals = toMap({ '2024-01-01': 1500 });
    const macroTotals = toMap({ '2024-01-01': { protein: 10 } });
    const stats = buildDailyStats(days, totals, 2000, {
      macroTotalsByDate: macroTotals,
      enabledMacros: ['protein'],
      macroGoals: { protein: 150 },
      macroModes: { protein: 'target' },
      threshold: 10,
    });
    const jan1 = stats.find((s) => s.date === '2024-01-01');
    // Worst of (under, over_threshold) should be over_threshold
    expect(jan1.status).toBe('over_threshold');
  });

  test('without macro data, only calorie goal determines dot status', () => {
    // Same scenario but no macro data passed — should be green (calorie-only)
    const totals = toMap({ '2024-01-01': 1500 });
    const stats = buildDailyStats(days, totals, 2000, { threshold: 10 });
    const jan1 = stats.find((s) => s.date === '2024-01-01');
    expect(jan1.status).toBe('under');
  });

  test('linked user dots must match self view when same data and settings', () => {
    // Simulate: user has calories under goal but protein over limit
    const totals = toMap({ '2024-01-01': 1800 });
    const macroTotals = toMap({ '2024-01-01': { protein: 200, fat: 50 } });
    const opts = {
      macroTotalsByDate: macroTotals,
      enabledMacros: ['protein', 'fat'],
      macroGoals: { protein: 100, fat: 60 },
      macroModes: { protein: 'limit', fat: 'limit' },
      threshold: 10,
    };

    // "Self" view — includes macros
    const selfStats = buildDailyStats(days, totals, 2000, opts);
    // "Linked" view — must also include macros to match
    const linkedStats = buildDailyStats(days, totals, 2000, opts);

    const selfJan1 = selfStats.find((s) => s.date === '2024-01-01');
    const linkedJan1 = linkedStats.find((s) => s.date === '2024-01-01');
    expect(linkedJan1.status).toBe(selfJan1.status);
    // Protein 200 vs 100 limit with 10% threshold → over by 100% → over_threshold
    expect(selfJan1.status).toBe('over_threshold');
  });

  test('different thresholds produce different dot status', () => {
    // Goal 2000, total 2150 → over by 150 (7.5%)
    // With threshold 10% → warning (7.5% < 10%)
    // With threshold 5% → danger (7.5% > 5%)
    const totals = toMap({ '2024-01-01': 2150 });

    const lenient = buildDailyStats(days, totals, 2000, { threshold: 10 });
    const strict = buildDailyStats(days, totals, 2000, { threshold: 5 });

    expect(lenient.find((s) => s.date === '2024-01-01').status).toBe('over');
    expect(strict.find((s) => s.date === '2024-01-01').status).toBe('over_threshold');
  });

  test('macro goals with no entries on a day are skipped', () => {
    const totals = toMap({});
    const macroTotals = toMap({});
    const stats = buildDailyStats(days, totals, 2000, {
      macroTotalsByDate: macroTotals,
      enabledMacros: ['protein'],
      macroGoals: { protein: 150 },
      macroModes: { protein: 'target' },
      threshold: 10,
    });
    // No entries → 'zero' (grey dot), macro check is skipped
    expect(stats[0].status).toBe('zero');
  });

  test('macros without goals do not affect dot status', () => {
    // Protein enabled but no goal set → should not contribute to dot
    const totals = toMap({ '2024-01-01': 1500 });
    const macroTotals = toMap({ '2024-01-01': { protein: 10 } });
    const stats = buildDailyStats(days, totals, 2000, {
      macroTotalsByDate: macroTotals,
      enabledMacros: ['protein'],
      macroGoals: {},
      macroModes: { protein: 'target' },
      threshold: 10,
    });
    const jan1 = stats.find((s) => s.date === '2024-01-01');
    // Only calorie status matters → under goal → green
    expect(jan1.status).toBe('under');
  });
});
