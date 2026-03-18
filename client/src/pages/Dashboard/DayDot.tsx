import styles from './DayDot.module.css';

interface Props {
  date: string;
  status: string;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const statusClasses: Record<string, string> = {
  under: styles.under,
  over: styles.over,
  over_threshold: styles.overThreshold,
  zero: styles.zero,
  none: styles.none,
};

export default function DayDot({ date, status, isToday, isSelected, onClick }: Props) {
  return (
    <button
      type="button"
      className={`${styles.dot} ${statusClasses[status] || styles.none} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      title={date}
      aria-label={`${date}: ${status}`}
    />
  );
}
