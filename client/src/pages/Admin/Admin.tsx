import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRequireAdmin } from '@/hooks/useAuth';
import { getAdminData, saveAdminSettings, deleteUser } from '@/api/admin';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import styles from './Admin.module.css';

export default function Admin() {
  const { isLoading: authLoading } = useRequireAdmin();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin'], queryFn: getAdminData });

  if (authLoading || isLoading || !data) {
    return <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 48 }}>Loading...</div>;
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Delete this user?')) return;
    await deleteUser(userId);
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  return (
    <div className={styles.admin}>
      <AdminSettingsForm settings={data.settings} onSave={() => queryClient.invalidateQueries({ queryKey: ['admin'] })} />

      <Card>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Users</h3>
        <div className={styles.userList}>
          {data.users.map((user) => (
            <div key={user.id} className={styles.userRow}>
              <span>{user.email}</span>
              <span className={styles.userMeta}>
                {user.email_verified ? 'Verified' : 'Unverified'}
                {' \u00B7 '}
                {new Date(user.created_at).toLocaleDateString()}
              </span>
              <Button size="sm" variant="danger" onClick={() => handleDeleteUser(user.id)}>Delete</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AdminSettingsForm({ settings, onSave }: { settings: Record<string, { value: string; source: string }>; onSave: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, v.value]))
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveAdminSettings(values);
      onSave();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const settingLabels: Record<string, string> = {
    support_email: 'Support Email',
    imprint_address: 'Imprint Address',
    imprint_email: 'Imprint Email',
    enable_legal: 'Enable Legal Pages',
    ai_provider: 'AI Provider',
    ai_key: 'AI Key',
    ai_endpoint: 'AI Endpoint',
    ai_model: 'AI Model',
    ai_daily_limit: 'AI Daily Limit',
  };

  return (
    <Card>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Application Settings</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(settings).map(([key, setting]) => (
          <div key={key}>
            <Input
              label={`${settingLabels[key] || key} ${setting.source === 'env' ? '(ENV)' : ''}`}
              value={values[key] || ''}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              disabled={setting.source === 'env'}
            />
          </div>
        ))}
        <Button type="submit" size="sm" loading={loading}>Save</Button>
      </form>
    </Card>
  );
}
