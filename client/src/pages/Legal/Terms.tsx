import Card from '@/components/ui/Card';

export default function Terms() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 0' }}>
      <Card>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 24 }}>Terms of Service</h1>
        <div style={{ color: 'var(--muted)', lineHeight: 1.8, fontSize: '0.9rem' }}>
          <p>By using Schautrack, you agree to these terms.</p>
          <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>Service</h3>
          <p>Schautrack provides calorie and nutrition tracking tools. The service is provided "as is" without warranty.</p>
          <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>Your Account</h3>
          <p>You are responsible for maintaining the security of your account and password.</p>
          <h3 style={{ color: 'var(--text)', marginTop: 24, marginBottom: 8 }}>Acceptable Use</h3>
          <p>Don't abuse the service, attempt to access other users' data, or use automated tools to scrape the service.</p>
        </div>
      </Card>
    </div>
  );
}
