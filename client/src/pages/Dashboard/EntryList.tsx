import { useState } from 'react';
import type { Entry } from '@/types';
import { updateEntry, deleteEntry } from '@/api/entries';
import { useQueryClient } from '@tanstack/react-query';
import { MACRO_LABELS } from '@/lib/macros';
import styles from './EntryList.module.css';

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
    return <p className={styles.empty}>No entries for this day.</p>;
  }

  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <span className={styles.headerCell}>Time</span>
        {caloriesEnabled && <span className={styles.headerCell}>Cal</span>}
        {enabledMacros.map((key) => (
          <span key={key} className={styles.headerCell}>
            {MACRO_LABELS[key as keyof typeof MACRO_LABELS]?.short || key}
          </span>
        ))}
        <span className={styles.headerCell}>Name</span>
        {canEdit && <span className={styles.headerCell} />}
      </div>

      {entries.map((entry) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          canEdit={canEdit}
          enabledMacros={enabledMacros}
          caloriesEnabled={caloriesEnabled}
          autoCalcCalories={autoCalcCalories}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['day-entries'] });
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

  const handleEdit = (field: string, currentValue: string | number | null) => {
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
    } catch { /* ignore */ }
    setEditing(null);
  };

  const handleDelete = async () => {
    try {
      await deleteEntry(entry.id);
      onUpdate();
    } catch { /* ignore */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditing(null);
  };

  return (
    <div className={styles.row}>
      <span className={styles.cell}>{entry.time}</span>

      {caloriesEnabled && (
        <span className={styles.cell}>
          {canEdit && !autoCalcCalories && editing === 'amount' ? (
            <input className={styles.editInput} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} autoFocus inputMode="tel" />
          ) : (
            <button type="button" className={styles.editBtn} onClick={() => canEdit && !autoCalcCalories && handleEdit('amount', entry.amount)} disabled={!canEdit || autoCalcCalories}>
              {entry.amount}
            </button>
          )}
        </span>
      )}

      {enabledMacros.map((key) => {
        const val = entry.macros?.[key];
        return (
          <span key={key} className={styles.cell}>
            {canEdit && editing === key ? (
              <input className={styles.editInput} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} autoFocus inputMode="numeric" />
            ) : (
              <button type="button" className={styles.editBtn} onClick={() => canEdit && handleEdit(key, val ?? null)} disabled={!canEdit}>
                {val != null ? val : '-'}
              </button>
            )}
          </span>
        );
      })}

      <span className={`${styles.cell} ${styles.nameCell}`}>
        {canEdit && editing === 'name' ? (
          <input className={styles.editInput} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} autoFocus />
        ) : (
          <button type="button" className={`${styles.editBtn} ${styles.nameBtn}`} onClick={() => canEdit && handleEdit('name', entry.name)} disabled={!canEdit}>
            {entry.name || '\u2014'}
          </button>
        )}
      </span>

      {canEdit && (
        <span className={styles.cell}>
          <button type="button" className={styles.deleteBtn} onClick={handleDelete} title="Delete">&times;</button>
        </span>
      )}
    </div>
  );
}
