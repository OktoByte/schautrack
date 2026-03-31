import { useState } from 'react';
import type { Entry } from '@/types';
import { updateEntry, deleteEntry } from '@/api/entries';
import { useQueryClient } from '@tanstack/react-query';
import { MACRO_LABELS } from '@/lib/macros';
import { cn } from '@/lib/utils';
import { useToastStore } from '@/stores/toastStore';

const PILL_COLORS: Record<string, { bg: string; border: string }> = {
  kcal:    { bg: 'bg-macro-kcal/10',    border: 'border-macro-kcal/20' },
  protein: { bg: 'bg-macro-protein/10', border: 'border-macro-protein/20' },
  carbs:   { bg: 'bg-macro-carbs/10',   border: 'border-macro-carbs/20' },
  fat:     { bg: 'bg-macro-fat/10',     border: 'border-macro-fat/20' },
  fiber:   { bg: 'bg-macro-fiber/10',   border: 'border-macro-fiber/20' },
  sugar:   { bg: 'bg-macro-sugar/10',   border: 'border-macro-sugar/20' },
};

const LABEL_COLORS: Record<string, string> = {
  kcal: 'text-macro-kcal/70',
  protein: 'text-macro-protein/70',
  carbs: 'text-macro-carbs/70',
  fat: 'text-macro-fat/70',
  fiber: 'text-macro-fiber/70',
  sugar: 'text-macro-sugar/70',
};

interface Props {
  entries: Entry[];
  canEdit: boolean;
  enabledMacros: string[];
  caloriesEnabled: boolean;
  autoCalcCalories: boolean;
}

export default function EntryList({ entries, canEdit, enabledMacros, caloriesEnabled, autoCalcCalories }: Props) {
  const queryClient = useQueryClient();

  if (entries.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-4">No entries for this day.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5 p-2">
      {entries.map((entry) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          canEdit={canEdit}
          enabledMacros={enabledMacros}
          caloriesEnabled={caloriesEnabled}
          autoCalcCalories={autoCalcCalories}
          onUpdate={() => {
            queryClient.refetchQueries({ queryKey: ['dashboard'] });
            queryClient.refetchQueries({ queryKey: ['day-entries'] });
          }}
        />
      ))}
    </div>
  );
}

function EntryRow({ entry, canEdit, enabledMacros, caloriesEnabled, autoCalcCalories, onUpdate }: {
  entry: Entry;
  canEdit: boolean;
  enabledMacros: string[];
  caloriesEnabled: boolean;
  autoCalcCalories: boolean;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  const handleEdit = (field: string, currentValue: string | number | null) => {
    if (!canEdit) return;
    setEditing(field);
    setEditValue(String(currentValue ?? ''));
  };

  const handleSave = async () => {
    if (!editing) return;

    const data: Record<string, unknown> = {};
    if (editing === 'name') {
      data.name = editValue;
    } else if (editing === 'amount') {
      data.amount = editValue;
    } else {
      data[`${editing}_g`] = editValue || null;
    }

    try {
      await updateEntry(entry.id, data);
      onUpdate();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update entry');
    }
    setEditing(null);
  };

  const handleDelete = async () => {
    try {
      await deleteEntry(entry.id);
      onUpdate();
      addToast('success', 'Entry deleted');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to delete entry');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditing(null);
  };

  const hasMacros = caloriesEnabled || enabledMacros.length > 0;

  return (
    <div className={cn(
      'rounded-[10px] border border-border bg-white/[0.015] transition-[border-color,background] duration-150 hover:bg-white/[0.04] hover:border-white/10',
      editing && 'border-[#0ea5e9]/40 shadow-[0_0_0_1px_rgba(14,165,233,0.25),0_8px_22px_rgba(2,18,45,0.4)]',
    )}>
      {/* Row 1: Name + Time + Delete */}
      <div className="flex items-center gap-1.5 px-3 py-2">
        <span className="flex-1 min-w-0 truncate">
          {editing === 'name' ? (
            <input className="bg-muted/50 border border-ring rounded-md px-2 py-0.5 text-sm text-foreground outline-none w-full" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} autoFocus />
          ) : (
            <button
              type="button"
              className={cn('bg-transparent border-0 p-0 text-[15px] font-semibold text-foreground text-left truncate w-full rounded-lg transition-colors', canEdit ? 'cursor-pointer hover:text-[#0ea5e9]' : 'cursor-default')}
              onClick={() => handleEdit('name', entry.name)}
              disabled={!canEdit}
            >
              {entry.name || '\u2014'}
            </button>
          )}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0 opacity-85">{entry.time}</span>
        {canEdit && (
          <button type="button" className="size-7 flex items-center justify-center rounded-[10px] border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer shrink-0" onClick={handleDelete} title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" /><path d="M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Row 2: Macro pills */}
      {hasMacros && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
          {caloriesEnabled && (
            <MacroPill
              macroKey="kcal"
              label="Calories"
              value={entry.amount}
              unit="kcal"
              editing={editing === 'amount'}
              editValue={editValue}
              onEdit={() => canEdit && !autoCalcCalories && handleEdit('amount', entry.amount)}
              onChange={setEditValue}
              onSave={handleSave}
              onKeyDown={handleKeyDown}
              canEdit={canEdit && !autoCalcCalories}
              inputMode="tel"
            />
          )}
          {enabledMacros.map((key) => {
            const val = entry.macros?.[key];
            return (
              <MacroPill
                key={key}
                macroKey={key}
                label={MACRO_LABELS[key as keyof typeof MACRO_LABELS]?.label || key}
                value={val ?? null}
                unit="g"
                editing={editing === key}
                editValue={editValue}
                onEdit={() => handleEdit(key, val ?? null)}
                onChange={setEditValue}
                onSave={handleSave}
                onKeyDown={handleKeyDown}
                canEdit={canEdit}
                inputMode="numeric"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function MacroPill({ macroKey, label, value, unit, editing, editValue, onEdit, onChange, onSave, onKeyDown, canEdit, inputMode }: {
  macroKey: string;
  label: string;
  value: number | null;
  unit: string;
  editing: boolean;
  editValue: string;
  onEdit: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  canEdit: boolean;
  inputMode: 'tel' | 'numeric';
}) {
  const colors = PILL_COLORS[macroKey] || { bg: 'bg-white/[0.06]', border: 'border-white/[0.08]' };
  const labelColor = LABEL_COLORS[macroKey] || 'text-muted-foreground';

  if (editing) {
    return (
      <input
        className="bg-muted/50 border border-ring rounded-full px-3 py-1 text-sm text-foreground outline-none w-20 tabular-nums"
        value={editValue}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSave}
        onKeyDown={onKeyDown}
        autoFocus
        inputMode={inputMode}
      />
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm tabular-nums transition-colors',
        colors.bg, colors.border,
        canEdit ? 'cursor-pointer hover:brightness-125' : 'cursor-default',
      )}
      onClick={onEdit}
      disabled={!canEdit}
    >
      <span className={cn('text-[0.7rem] font-semibold uppercase tracking-wider', labelColor)}>{label}</span>
      <span className="font-bold text-foreground">{value != null ? value : '-'}</span>
      {value != null && <span className="text-[0.8em] font-normal text-muted-foreground/55">{unit}</span>}
    </button>
  );
}
