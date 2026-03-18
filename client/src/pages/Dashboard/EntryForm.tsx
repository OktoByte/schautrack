import { useState, useCallback, useEffect } from 'react';
import type { AIUsage } from '@/types';
import { createEntry } from '@/api/entries';
import { MACRO_LABELS, computeCaloriesFromMacros } from '@/lib/macros';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/stores/toastStore';
import AIPhotoModal from './AIPhotoModal';

interface Props {
  selectedDate: string;
  caloriesEnabled: boolean;
  autoCalcCalories: boolean;
  enabledMacros: string[];
  hasAiEnabled: boolean;
  aiUsage: AIUsage | null;
  onSubmit: () => void;
}

const inputClass = 'w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50';

export default function EntryForm({ selectedDate, caloriesEnabled, autoCalcCalories, enabledMacros, hasAiEnabled, aiUsage, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [macros, setMacros] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(selectedDate);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    setDate(selectedDate);
  }, [selectedDate]);

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

    const data: Record<string, unknown> = { entry_date: date };
    if (name.trim()) data.entry_name = name.trim();
    if (amount && !autoCalcCalories) data.amount = amount;
    for (const key of enabledMacros) {
      if (macros[key]) data[`${key}_g`] = macros[key];
    }

    try {
      await createEntry(data as Parameters<typeof createEntry>[0]);
      setName('');
      setAmount('');
      setMacros({});
      onSubmit();
      addToast('success', 'Entry tracked');
    } catch {
      // Error handling could be added
    }
    setLoading(false);
  };

  const aiDisabled = hasAiEnabled && aiUsage && aiUsage.remaining === 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <form onSubmit={handleSubmit}>
        {/* Food name */}
        <div className="mb-3">
          <input
            className={inputClass}
            type="text"
            placeholder="Breakfast, snack..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />
        </div>

        {/* Nutrient inputs */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(70px,1fr))] max-sm:grid-cols-3 gap-2 mb-3">
          {caloriesEnabled && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-macro-kcal">Cal</label>
              <input
                className={`${inputClass} ${autoCalcCalories ? 'opacity-60 cursor-not-allowed' : ''}`}
                type="text"
                inputMode="tel"
                placeholder="0"
                value={autoCalcCalories ? (computedCalories ?? '') : amount}
                onChange={(e) => setAmount(e.target.value)}
                readOnly={autoCalcCalories}
              />
            </div>
          )}

          {enabledMacros.map((key) => {
            const color = {
              protein: 'text-macro-protein',
              carbs: 'text-macro-carbs',
              fat: 'text-macro-fat',
              fiber: 'text-macro-fiber',
              sugar: 'text-macro-sugar',
            }[key] || 'text-muted-foreground';

            return (
              <div key={key} className="flex flex-col gap-1">
                <label className={`text-[10px] font-semibold uppercase tracking-wider ${color}`}>
                  {MACRO_LABELS[key as keyof typeof MACRO_LABELS]?.short || key}
                </label>
                <input
                  className={inputClass}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={macros[key] || ''}
                  onChange={(e) => handleMacroChange(key, e.target.value)}
                />
              </div>
            );
          })}

        </div>

        {/* Date + AI + Submit */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-md border border-input bg-muted/50 px-2 py-1.5 text-sm text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {hasAiEnabled && (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent"
              onClick={() => setAiModalOpen(true)}
              disabled={!!aiDisabled}
              title={aiDisabled ? 'Daily AI limit reached' : 'Estimate with AI'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {aiUsage && aiUsage.limit > 0 && (
                <span className="text-[10px] font-medium tabular-nums">{aiUsage.remaining}</span>
              )}
            </button>
          )}

          <div className="ml-auto">
            <Button type="submit" size="sm" loading={loading}>Track</Button>
          </div>
        </div>
      </form>

      <AIPhotoModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onResult={(result) => {
          if (result.name) setName(result.name);
          if (result.calories) setAmount(String(result.calories));
          if (result.macros) {
            const newMacros: Record<string, string> = {};
            for (const [key, val] of Object.entries(result.macros)) {
              if (enabledMacros.includes(key) && val) {
                newMacros[key] = String(val);
              }
            }
            setMacros(newMacros);
          }
          setAiModalOpen(false);
        }}
        enabledMacros={enabledMacros}
      />
    </div>
  );
}
