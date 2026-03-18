import type { WeightEntry } from '@/types';
import styles from './WeightRow.module.css';

interface Props {
  weightEntry: WeightEntry | null;
  lastWeightEntry: WeightEntry | null;
  weightUnit: string;
  canEdit: boolean;
  selectedDate: string;
}

export default function WeightRow({ weightEntry, lastWeightEntry, weightUnit }: Props) {
  if (!weightEntry && !lastWeightEntry) return null;

  const entry = weightEntry || lastWeightEntry;
  if (!entry) return null;

  const isLastKnown = !weightEntry && !!lastWeightEntry;

  return (
    <div className={styles.row}>
      <span className={styles.label}>
        {isLastKnown ? 'Last weight' : 'Weight'}
      </span>
      <span className={styles.value}>
        {Number(entry.weight).toFixed(1)} {weightUnit}
      </span>
      {isLastKnown && entry.entry_date && (
        <span className={styles.date}>{entry.entry_date}</span>
      )}
    </div>
  );
}
