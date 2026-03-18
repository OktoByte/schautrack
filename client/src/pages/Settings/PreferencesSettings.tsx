import { useState } from 'react';
import type { User } from '@/types';
import { savePreferences } from '@/api/settings';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToastStore } from '@/stores/toastStore';

const selectClass = 'w-full rounded-md border border-input bg-muted/50 px-2.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring';

interface Props {
  user: User;
  timezones: string[];
  onSave: () => void;
}

export default function PreferencesSettings({ user, timezones, onSave }: Props) {
  const [timezone, setTimezone] = useState(user.timezone);
  const [weightUnit, setWeightUnit] = useState(user.weightUnit);
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await savePreferences({ weight_unit: weightUnit, timezone });
      onSave();
      addToast('success', 'Preferences saved');
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <Card>
      <h3 className="text-sm font-semibold mb-3">Preferences</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Weight Unit</label>
          <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lb')} className={selectClass}>
            <option value="kg">Kilograms (kg)</option>
            <option value="lb">Pounds (lb)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timezone</label>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={selectClass}>
            {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
        <div>
          <Button type="submit" size="sm" loading={loading}>Save</Button>
        </div>
      </form>
    </Card>
  );
}
