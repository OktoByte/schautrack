import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { WeightEntry } from '@/types';
import { upsertWeight, deleteWeight } from '@/api/weight';
import { useToastStore } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';

interface Props {
  weightEntry: WeightEntry | null;
  lastWeightEntry: WeightEntry | null;
  weightUnit: string;
  canEdit: boolean;
  selectedDate: string;
}

export default function WeightRow({ weightEntry, lastWeightEntry, weightUnit, canEdit, selectedDate }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const inputRef = useRef<HTMLInputElement>(null);

  const entry = weightEntry || lastWeightEntry;
  const isLastKnown = !weightEntry && !!lastWeightEntry;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = async () => {
    const num = parseFloat(value);
    if (!num || num <= 0) { setEditing(false); setValue(''); return; }
    setLoading(true);
    try {
      await upsertWeight({ date: selectedDate, weight: num });
      queryClient.invalidateQueries({ queryKey: ['weight'] });
      addToast('success', 'Weight tracked');
      setEditing(false);
      setValue('');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save weight');
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!weightEntry) return;
    setLoading(true);
    try {
      await deleteWeight(weightEntry.id);
      queryClient.invalidateQueries({ queryKey: ['weight'] });
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to delete weight');
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setEditing(false); setValue(''); }
  };

  const startEdit = () => {
    setValue(entry ? String(Number(entry.weight)) : '');
    setEditing(true);
  };

  if (!entry && !canEdit) return null;

  return (
    <div className="border-t-2 border-border px-4 py-3">
      {editing ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); handleSave(); }}
        >
          <label htmlFor="weight-input" className="text-sm text-muted-foreground shrink-0">Weight</label>
          <div className="relative">
            <input
              id="weight-input"
              ref={inputRef}
              className="w-24 rounded-md border border-input bg-muted/50 px-3 py-1.5 pr-8 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring tabular-nums"
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0.0"
              aria-label={`Weight in ${weightUnit}`}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{weightUnit}</span>
          </div>
          <Button type="submit" size="sm" loading={loading}>Track</Button>
          <button
            type="button"
            className="bg-transparent border-0 p-0 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            onClick={() => { setEditing(false); setValue(''); }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Weight</span>
          {entry ? (
            <>
              <button
                type="button"
                className={`bg-transparent border-0 p-0 text-lg font-semibold tabular-nums cursor-pointer hover:text-primary transition-colors ${isLastKnown ? 'text-muted-foreground' : 'text-green-400'}`}
                onClick={canEdit ? startEdit : undefined}
                disabled={!canEdit}
              >
                {Number(entry.weight).toFixed(1)}
              </button>
              <span className="text-sm text-muted-foreground">{weightUnit}</span>
              {isLastKnown && entry.entry_date && (
                <span className="text-xs text-muted-foreground/60">{entry.entry_date}</span>
              )}
              {canEdit && weightEntry && (
                <button
                  type="button"
                  className="bg-transparent border-0 p-0 ml-auto text-muted-foreground/60 hover:text-destructive cursor-pointer transition-colors text-lg leading-none"
                  onClick={handleDelete}
                  title="Delete"
                >
                  &times;
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              className="bg-transparent border-0 p-0 text-sm text-muted-foreground/50 cursor-pointer hover:text-primary transition-colors"
              onClick={startEdit}
            >
              Track weight
            </button>
          )}
        </div>
      )}
    </div>
  );
}
