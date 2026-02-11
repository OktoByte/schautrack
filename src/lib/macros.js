const { pool } = require('../db/pool');

// Macro nutrient tracking constants
const MACRO_KEYS = ['protein', 'carbs', 'fat', 'fiber', 'sugar'];
const MACRO_LABELS = {
  protein: { short: 'P', label: 'Protein' },
  carbs: { short: 'C', label: 'Carbs' },
  fat: { short: 'F', label: 'Fat' },
  fiber: { short: 'Fi', label: 'Fiber' },
  sugar: { short: 'S', label: 'Sugar' },
};

const getEnabledMacros = (user) => {
  const enabled = user?.macros_enabled || {};
  return MACRO_KEYS.filter(key => enabled[key] === true);
};

const getMacroGoals = (user) => {
  const goals = user?.macro_goals || {};
  const enabled = getEnabledMacros(user);
  const result = {};
  for (const key of enabled) {
    if (goals[key] != null) {
      result[key] = goals[key];
    }
  }
  return result;
};

const parseMacroInput = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = parseInt(value, 10);
  return Number.isNaN(num) || num < 0 ? null : num;
};

async function getMacroTotalsByDate(userId, oldestDate, newestDate) {
  const { rows } = await pool.query(
    `SELECT entry_date,
            COALESCE(SUM(protein_g), 0) AS protein,
            COALESCE(SUM(carbs_g), 0) AS carbs,
            COALESCE(SUM(fat_g), 0) AS fat,
            COALESCE(SUM(fiber_g), 0) AS fiber,
            COALESCE(SUM(sugar_g), 0) AS sugar
       FROM calorie_entries
      WHERE user_id = $1
        AND entry_date BETWEEN $2 AND $3
      GROUP BY entry_date`,
    [userId, oldestDate, newestDate]
  );

  const macrosByDate = new Map();
  rows.forEach((row) => {
    const dateStr = row.entry_date.toISOString().slice(0, 10);
    macrosByDate.set(dateStr, {
      protein: parseInt(row.protein, 10) || 0,
      carbs: parseInt(row.carbs, 10) || 0,
      fat: parseInt(row.fat, 10) || 0,
      fiber: parseInt(row.fiber, 10) || 0,
      sugar: parseInt(row.sugar, 10) || 0,
    });
  });
  return macrosByDate;
}

module.exports = {
  MACRO_KEYS,
  MACRO_LABELS,
  getEnabledMacros,
  getMacroGoals,
  parseMacroInput,
  getMacroTotalsByDate,
};
