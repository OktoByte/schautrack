export const MACRO_KEYS = ['protein', 'carbs', 'fat', 'fiber', 'sugar'] as const;
export type MacroKey = (typeof MACRO_KEYS)[number];

export const MACRO_LABELS: Record<MacroKey, { short: string; label: string }> = {
  protein: { short: 'P', label: 'Protein' },
  carbs: { short: 'C', label: 'Carbs' },
  fat: { short: 'F', label: 'Fat' },
  fiber: { short: 'Fi', label: 'Fiber' },
  sugar: { short: 'S', label: 'Sugar' },
};

export const MACRO_HEADER_SHORT: Record<MacroKey, string> = {
  protein: 'Pro',
  carbs: 'Carb',
  fat: 'Fat',
  fiber: 'Fib',
  sugar: 'Sug',
};

export const MACRO_GOAL_MODES: Record<string, string> = {
  calories: 'limit',
  protein: 'target',
  carbs: 'limit',
  fat: 'limit',
  fiber: 'target',
  sugar: 'limit',
};

export function computeMacroStatus(total: number, goal: number | null, mode?: string, threshold?: number | null) {
  if (goal == null || goal === 0) {
    return { statusClass: '', statusText: 'No goal set' };
  }

  if (mode === 'target') {
    if (total >= goal) {
      const over = total - goal;
      return { statusClass: 'macro-stat--success', statusText: over > 0 ? `${over} over target` : 'Goal met' };
    }
    const under = goal - total;
    const pctT = threshold != null ? threshold : 10;
    if (under * 100 > goal * pctT) {
      return { statusClass: 'macro-stat--danger', statusText: `${under} remaining` };
    }
    return { statusClass: 'macro-stat--warning', statusText: `${under} remaining` };
  }

  // Limit mode
  if (total <= goal) {
    return { statusClass: 'macro-stat--success', statusText: `${goal - total} remaining` };
  }
  const over = total - goal;
  const pct = threshold != null ? threshold : 10;
  if (over * 100 > goal * pct) {
    return { statusClass: 'macro-stat--danger', statusText: `${over} over` };
  }
  return { statusClass: 'macro-stat--warning', statusText: `${over} over` };
}

export function computeCaloriesFromMacros(protein: number, carbs: number, fat: number): number | null {
  const p = protein || 0;
  const c = carbs || 0;
  const f = fat || 0;
  if (p === 0 && c === 0 && f === 0) return null;
  return p * 4 + c * 4 + f * 9;
}

export function getEnabledMacros(macrosEnabled: Record<string, boolean>): MacroKey[] {
  return MACRO_KEYS.filter((key) => macrosEnabled[key] === true);
}
