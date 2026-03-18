import Card from '@/components/ui/Card';

export default function Imprint() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 0' }}>
      <Card>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 24 }}>Imprint</h1>
        <div style={{ color: 'var(--muted)', lineHeight: 1.8, fontSize: '0.9rem' }}>
          <img src="/imprint/address.svg" alt="Address" style={{ maxWidth: '100%', marginBottom: 16 }} />
          <img src="/imprint/email.svg" alt="Email" style={{ maxWidth: '100%' }} />
        </div>
      </Card>
    </div>
  );
}
