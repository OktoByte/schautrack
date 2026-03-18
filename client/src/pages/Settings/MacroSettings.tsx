import { useState } from 'react';
import type { User } from '@/types';
import { saveMacros } from '@/api/settings';
import { MACRO_LABELS } from '@/lib/macros';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import styles from './MacroSettings.module.css';

const MACRO_KEYS = ['protein', 'carbs', 'fat', 'fiber', 'sugar'];

interface Props {
  user: User;
  onSave: () => void;
}

export default function MacroSettings({ user, onSave }: Props) {
  const macrosEnabled = user.macrosEnabled || {};
  const macroGoals = user.macroGoals || {};

  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    calories: macrosEnabled.calories !== false,
    ...Object.fromEntries(MACRO_KEYS.map((k) => [k, macrosEnabled[k] === true])),
    auto_calc_calories: macrosEnabled.auto_calc_calories === true,
  });
  const [goals, setGoals] = useState<Record<string, string>>({
    calories: macroGoals.calories != null ? String(macroGoals.calories) : '',
    ...Object.fromEntries(MACRO_KEYS.map((k) => [k, macroGoals[k] != null ? String(macroGoals[k]) : ''])),
  });
  const [modes, setModes] = useState<Record<string, string>>({
    calories: String(macroGoals.calories_mode || 'limit'),
    ...Object.fromEntries(MACRO_KEYS.map((k) => [k, macroGoals[`${k}_mode`] || ''])),
  });
  const [threshold, setThreshold] = useState(String(user.goalThreshold ?? 10));
  const [loading, setLoading] = useState(false);

  const canAutoCalc = enabled.calories && enabled.protein && enabled.carbs && enabled.fat;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data: Record<string, string | boolean | number> = {
      calorie_goal: goals.calories || '0',
      calories_enabled: enabled.calories ? 'on' : '',
      calories_mode: modes.calories,
      auto_calc_calories: enabled.auto_calc_calories && canAutoCalc ? 'on' : '',
      goal_threshold: threshold,
    };

    for (const key of MACRO_KEYS) {
      data[`${key}_enabled`] = enabled[key] ? 'on' : '';
      data[`${key}_goal`] = goals[key] || '0';
      if (modes[key]) data[`${key}_mode`] = modes[key];
    }

    try {
      await saveMacros(data);
      onSave();
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <Card>
      <h3 className={styles.heading}>Nutrition Goals</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.macroRow}>
          <label className={styles.toggle}>
            <input type="checkbox" checked={enabled.calories} onChange={(e) => setEnabled({ ...enabled, calories: e.target.checked })} />
            <span>Calories</span>
          </label>
          {enabled.calories && (
            <>
              <input className={styles.goalInput} type="number" value={goals.calories} onChange={(e) => setGoals({ ...goals, calories: e.target.value })} placeholder="Goal" />
              <select className={styles.modeSelect} value={modes.calories} onChange={(e) => setModes({ ...modes, calories: e.target.value })}>
                <option value="limit">Limit</option>
                <option value="target">Target</option>
              </select>
            </>
          )}
        </div>

        {MACRO_KEYS.map((key) => (
          <div key={key} className={styles.macroRow}>
            <label className={styles.toggle}>
              <input type="checkbox" checked={enabled[key] || false} onChange={(e) => setEnabled({ ...enabled, [key]: e.target.checked })} />
              <span>{MACRO_LABELS[key as keyof typeof MACRO_LABELS]?.label || key}</span>
            </label>
            {enabled[key] && (
              <>
                <input className={styles.goalInput} type="number" value={goals[key]} onChange={(e) => setGoals({ ...goals, [key]: e.target.value })} placeholder="Goal (g)" />
                <select className={styles.modeSelect} value={modes[key]} onChange={(e) => setModes({ ...modes, [key]: e.target.value })}>
                  <option value="limit">Limit</option>
                  <option value="target">Target</option>
                </select>
              </>
            )}
          </div>
        ))}

        {canAutoCalc && (
          <label className={styles.toggle}>
            <input type="checkbox" checked={enabled.auto_calc_calories} onChange={(e) => setEnabled({ ...enabled, auto_calc_calories: e.target.checked })} />
            <span>Auto-calculate calories from macros</span>
          </label>
        )}

        <div className={styles.thresholdRow}>
          <label className={styles.thresholdLabel}>Goal threshold</label>
          <input className={styles.goalInput} type="number" min="0" max="99" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          <span className={styles.thresholdUnit}>%</span>
        </div>

        <Button type="submit" size="sm" loading={loading}>Save</Button>
      </form>
    </Card>
  );
}
