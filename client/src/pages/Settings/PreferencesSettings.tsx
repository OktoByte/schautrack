import { useState } from 'react';
import type { User } from '@/types';
import { savePreferences } from '@/api/settings';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface Props {
  user: User;
  timezones: string[];
  onSave: () => void;
}

export default function PreferencesSettings({ user, timezones, onSave }: Props) {
  const [timezone, setTimezone] = useState(user.timezone);
  const [weightUnit, setWeightUnit] = useState(user.weightUnit);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await savePreferences({ weight_unit: weightUnit, timezone });
      onSave();
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <Card>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Preferences</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lb')}
            style={{ background: 'var(--bg-1)', border: '1px solid var(--stroke)', borderRadius: 6, color: 'var(--text)', padding: '6px 8px', font: 'inherit', fontSize: '0.85rem' }}>
            <option value="kg">Kilograms (kg)</option>
            <option value="lb">Pounds (lb)</option>
          </select>
        </div>
        <div>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
            style={{ background: 'var(--bg-1)', border: '1px solid var(--stroke)', borderRadius: 6, color: 'var(--text)', padding: '6px 8px', font: 'inherit', fontSize: '0.85rem', width: '100%' }}>
            {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
        <Button type="submit" size="sm" loading={loading}>Save</Button>
      </form>
    </Card>
  );
}
