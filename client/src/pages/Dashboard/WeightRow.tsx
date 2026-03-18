import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { WeightEntry } from '@/types';
import { upsertWeight, deleteWeight } from '@/api/weight';
import { useToastStore } from '@/stores/toastStore';

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

  const entry = weightEntry || lastWeightEntry;
  const isLastKnown = !weightEntry && !!lastWeightEntry;

  const handleSave = async () => {
    const num = parseFloat(value);
    if (!num || num <= 0) return;
    setLoading(true);
    try {
      await upsertWeight({ date: selectedDate, weight: num });
      queryClient.invalidateQueries({ queryKey: ['weight'] });
      addToast('success', 'Weight saved');
      setEditing(false);
      setValue('');
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!weightEntry) return;
    setLoading(true);
    try {
      await deleteWeight(weightEntry.id);
      queryClient.invalidateQueries({ queryKey: ['weight'] });
    } catch { /* ignore */ }
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
    <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-sm">
      <span className="flex-1 text-muted-foreground text-xs">
        {isLastKnown ? 'Last' : 'Weight'}
      </span>

      {editing ? (
        <>
          <input
            className="w-16 bg-muted/50 border border-ring rounded-md px-2 py-0.5 text-sm text-foreground outline-none tabular-nums"
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="0.0"
            autoFocus
          />
          <span className="text-xs text-muted-foreground">{weightUnit}</span>
          {loading ? (
            <span className="size-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          ) : (
            <>
              <button type="button" className="bg-transparent border-0 p-0 text-xs text-primary cursor-pointer font-medium" onClick={handleSave}>Save</button>
              <button type="button" className="bg-transparent border-0 p-0 text-xs text-muted-foreground cursor-pointer" onClick={() => { setEditing(false); setValue(''); }}>&times;</button>
            </>
          )}
        </>
      ) : entry ? (
        <>
          <button
            type="button"
            className="bg-transparent border-0 p-0 tabular-nums text-foreground cursor-pointer hover:text-primary transition-colors text-sm"
            onClick={canEdit ? startEdit : undefined}
            disabled={!canEdit}
          >
            {Number(entry.weight).toFixed(1)}
          </button>
          <span className="text-xs text-muted-foreground">{weightUnit}</span>
          {isLastKnown && entry.entry_date && (
            <span className="text-xs text-muted-foreground ml-1">{entry.entry_date}</span>
          )}
          {canEdit && weightEntry && (
            <button
              type="button"
              className="bg-transparent border-0 p-0 ml-auto text-muted-foreground/40 hover:text-destructive cursor-pointer transition-colors"
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
          className="bg-transparent border-0 p-0 text-xs text-muted-foreground/40 cursor-pointer hover:text-muted-foreground transition-colors"
          onClick={startEdit}
        >
          —
        </button>
      )}
    </div>
  );
}
