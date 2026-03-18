import Card from '@/components/ui/Card';

export default function Privacy() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 0' }}>
      <Card>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 24 }}>Privacy Policy</h1>
        <div style={{ color: 'var(--muted)', lineHeight: 1.8, fontSize: '0.9rem' }}>
          <p>Schautrack collects only the data necessary to provide the calorie and macro tracking service.</p>
          <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>Data We Collect</h3>
          <ul style={{ paddingLeft: 24 }}>
            <li>Email address (for authentication)</li>
            <li>Calorie and macro entries you create</li>
            <li>Weight entries you create</li>
            <li>Timezone and display preferences</li>
          </ul>
          <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>Data We Don't Collect</h3>
          <ul style={{ paddingLeft: 24 }}>
            <li>No analytics or tracking scripts</li>
            <li>No third-party cookies</li>
            <li>No data sold to third parties</li>
          </ul>
          <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>Data Deletion</h3>
          <p>You can delete your account and all associated data at any time from Settings.</p>
        </div>
      </Card>
    </div>
  );
}
