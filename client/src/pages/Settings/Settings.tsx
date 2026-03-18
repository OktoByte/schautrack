import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/hooks/useAuth';
import { getSettings } from '@/api/settings';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import MacroSettings from './MacroSettings';
import PreferencesSettings from './PreferencesSettings';
import PasswordSettings from './PasswordSettings';
import AISettings from './AISettings';
import LinkSettings from './LinkSettings';
import styles from './Settings.module.css';

export default function Settings() {
  const { isLoading: authLoading } = useRequireAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  if (authLoading || isLoading || !data) {
    return <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 48 }}>Loading...</div>;
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['settings'] });
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  return (
    <div className={styles.settings}>
      {data.linkFeedback && <Alert type={data.linkFeedback.type as 'success' | 'error'} message={data.linkFeedback.message} />}
      {data.passwordFeedback && <Alert type={data.passwordFeedback.type as 'success' | 'error'} message={data.passwordFeedback.message} />}
      {data.aiFeedback && <Alert type={data.aiFeedback.type as 'success' | 'error'} message={data.aiFeedback.message} />}
      {data.emailFeedback && <Alert type={data.emailFeedback.type as 'success' | 'error'} message={data.emailFeedback.message} />}
      {data.importFeedback && <Alert type={data.importFeedback.type as 'success' | 'error'} message={data.importFeedback.message} />}

      <div className={styles.grid}>
        <div className={styles.left}>
          <MacroSettings user={data.user} onSave={refresh} />
        </div>
        <div className={styles.right}>
          <PreferencesSettings user={data.user} timezones={data.timezones} onSave={refresh} />
          <PasswordSettings totpEnabled={data.user.totpEnabled} />
          <AISettings user={data.user} onSave={refresh} />
          <LinkSettings
            incomingRequests={data.incomingRequests}
            outgoingRequests={data.outgoingRequests}
            acceptedLinks={data.acceptedLinks}
            availableSlots={data.availableSlots}
            onUpdate={refresh}
          />
          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Data</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <a href="/settings/export" style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>Export JSON</a>
            </div>
          </Card>
          <Card>
            <a href="/delete" style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>Delete Account</a>
          </Card>
        </div>
      </div>
    </div>
  );
}
