import { useState, useCallback } from 'react';
import type { User, AIUsage } from '@/types';
import { createEntry } from '@/api/entries';
import { MACRO_LABELS, computeCaloriesFromMacros } from '@/lib/macros';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import styles from './EntryForm.module.css';

interface Props {
  user: User;
  selectedDate: string;
  caloriesEnabled: boolean;
  autoCalcCalories: boolean;
  enabledMacros: string[];
  hasAiEnabled: boolean;
  aiUsage: AIUsage | null;
  onSubmit: () => void;
}

export default function EntryForm({ user, selectedDate, caloriesEnabled, autoCalcCalories, enabledMacros, hasAiEnabled: _hasAi, aiUsage: _aiUsage, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [macros, setMacros] = useState<Record<string, string>>({});
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);

  const computedCalories = autoCalcCalories
    ? computeCaloriesFromMacros(
        parseFloat(macros.protein || '0'),
        parseFloat(macros.carbs || '0'),
        parseFloat(macros.fat || '0')
      )
    : null;

  const handleMacroChange = useCallback((key: string, value: string) => {
    setMacros((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data: Record<string, unknown> = { entry_date: selectedDate };
    if (name.trim()) data.entry_name = name.trim();
    if (amount && !autoCalcCalories) data.amount = amount;
    if (weight) data.weight = weight;

    for (const key of enabledMacros) {
      if (macros[key]) data[`${key}_g`] = macros[key];
    }

    try {
      await createEntry(data as Parameters<typeof createEntry>[0]);
      setName('');
      setAmount('');
      setMacros({});
      setWeight('');
      onSubmit();
    } catch {
      // Error handling could be added
    }
    setLoading(false);
  };

  return (
    <Card className={styles.form}>
      <form onSubmit={handleSubmit}>
        <div className={styles.row}>
          <input
            className={styles.input}
            type="text"
            placeholder="Food name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className={styles.row}>
          {caloriesEnabled && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Cal</label>
              <input
                className={styles.input}
                type="text"
                inputMode="tel"
                placeholder="0"
                value={autoCalcCalories ? (computedCalories ?? '') : amount}
                onChange={(e) => setAmount(e.target.value)}
                readOnly={autoCalcCalories}
              />
            </div>
          )}

          {enabledMacros.map((key) => (
            <div key={key} className={styles.field}>
              <label className={styles.fieldLabel}>
                {MACRO_LABELS[key as keyof typeof MACRO_LABELS]?.short || key}
              </label>
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={macros[key] || ''}
                onChange={(e) => handleMacroChange(key, e.target.value)}
              />
            </div>
          ))}

          <div className={styles.field}>
            <label className={styles.fieldLabel}>{user.weightUnit}</label>
            <input
              className={styles.input}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <Button type="submit" size="sm" loading={loading}>Log</Button>
        </div>
      </form>
    </Card>
  );
}
