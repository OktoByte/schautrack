import type { SharedView } from '@/types';
import { useDashboardStore } from '@/stores/dashboardStore';
import ShareCard from './ShareCard';
import Card from '@/components/ui/Card';
import styles from './Timeline.module.css';

const RANGE_PRESETS = [7, 14, 30, 60, 90, 120, 180];

interface Props {
  sharedViews: SharedView[];
  range: { start: string; end: string; days: number; preset: number | null };
  todayStr: string;
}

export default function Timeline({ sharedViews, range, todayStr }: Props) {
  const { rangePreset, setRange, selectDay, selectUser } = useDashboardStore();

  const handlePreset = (days: number) => {
    setRange(days, '', '');
  };

  const handleDotClick = (view: SharedView, date: string) => {
    selectUser(view.userId, view.label, view.isSelf);
    selectDay(date);
  };

  return (
    <Card className={styles.timeline}>
      <div className={styles.rangeBar}>
        {RANGE_PRESETS.map((days) => (
          <button
            key={days}
            type="button"
            className={`${styles.rangeChip} ${(rangePreset || range.preset) === days ? styles.rangeChipActive : ''}`}
            onClick={() => handlePreset(days)}
          >
            {days}d
          </button>
        ))}
      </div>

      <div className={styles.shareGrid}>
        {sharedViews.map((view) => (
          <ShareCard
            key={view.userId}
            view={view}
            todayStr={todayStr}
            onDotClick={(date) => handleDotClick(view, date)}
          />
        ))}
      </div>
    </Card>
  );
}
