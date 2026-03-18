import type { SharedView } from '@/types';
import { useDashboardStore } from '@/stores/dashboardStore';
import DayDot from './DayDot';
import styles from './ShareCard.module.css';

interface Props {
  view: SharedView;
  todayStr: string;
  onDotClick: (date: string) => void;
}

export default function ShareCard({ view, todayStr, onDotClick }: Props) {
  const { selectedDate, currentUserId } = useDashboardStore();
  const isActive = currentUserId === view.userId;

  return (
    <div className={`${styles.card} ${isActive ? styles.cardActive : ''}`}>
      <div className={styles.head}>
        <span className={styles.label}>{view.label}</span>
      </div>
      <div className={styles.dotRow}>
        {view.dailyStats.map((stat) => (
          <DayDot
            key={stat.date}
            date={stat.date}
            status={stat.status}
            isToday={stat.date === todayStr}
            isSelected={isActive && stat.date === selectedDate}
            onClick={() => onDotClick(stat.date)}
          />
        ))}
      </div>
    </div>
  );
}
