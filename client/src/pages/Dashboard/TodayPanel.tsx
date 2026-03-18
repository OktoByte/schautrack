import type { MacroStatus } from '@/types';
import { MACRO_LABELS } from '@/lib/macros';
import Card from '@/components/ui/Card';
import styles from './TodayPanel.module.css';

interface Props {
  dailyGoal: number | null;
  todayTotal: number;
  caloriesEnabled: boolean;
  calorieStatus: MacroStatus;
  enabledMacros: string[];
  macroGoals: Record<string, number>;
  todayMacroTotals: Record<string, number>;
  macroStatuses: Record<string, MacroStatus>;
  macroModes: Record<string, string>;
}

function statusColor(statusClass: string): string {
  if (statusClass === 'macro-stat--success') return 'var(--success)';
  if (statusClass === 'macro-stat--warning') return 'var(--warning)';
  if (statusClass === 'macro-stat--danger') return 'var(--danger)';
  return 'var(--muted)';
}

export default function TodayPanel({ dailyGoal, todayTotal, caloriesEnabled, calorieStatus, enabledMacros, macroGoals, todayMacroTotals, macroStatuses, macroModes }: Props) {
  return (
    <Card className={styles.panel}>
      <div className={styles.stats}>
        {caloriesEnabled && (
          <div className={styles.stat}>
            <div className={styles.statHeader}>
              <span className={styles.statLabel}>Calories</span>
              <span className={styles.statValue}>
                {todayTotal}{dailyGoal ? ` / ${dailyGoal}` : ''}
              </span>
            </div>
            {dailyGoal && (
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{
                    width: `${Math.min((todayTotal / dailyGoal) * 100, 100)}%`,
                    backgroundColor: statusColor(calorieStatus.statusClass),
                  }}
                />
              </div>
            )}
            <span className={styles.statusText} style={{ color: statusColor(calorieStatus.statusClass) }}>
              {calorieStatus.statusText}
            </span>
          </div>
        )}

        {enabledMacros.map((key) => {
          const total = todayMacroTotals[key] || 0;
          const goal = macroGoals[key];
          const status = macroStatuses[key];
          const label = MACRO_LABELS[key as keyof typeof MACRO_LABELS]?.label || key;
          const mode = macroModes[key] || 'limit';

          return (
            <div key={key} className={styles.stat}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>{label} <span className={styles.mode}>{mode}</span></span>
                <span className={styles.statValue}>
                  {total}g{goal ? ` / ${goal}g` : ''}
                </span>
              </div>
              {goal && (
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      width: `${Math.min((total / goal) * 100, 100)}%`,
                      backgroundColor: status ? statusColor(status.statusClass) : 'var(--muted)',
                    }}
                  />
                </div>
              )}
              {status && (
                <span className={styles.statusText} style={{ color: statusColor(status.statusClass) }}>
                  {status.statusText}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
