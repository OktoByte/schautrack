import { useState } from 'react';
import { useNavigate } from 'react-router';
import { verifyEmailChange, cancelEmailChange } from '@/api/settings';
import { ApiError } from '@/api/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';

export default function VerifyEmailChange() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyEmailChange({ code });
      navigate('/settings');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed.');
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    await cancelEmailChange();
    navigate('/settings');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 24 }}>Verify New Email</h2>
        {error && <Alert type="error" message={error} />}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Verification Code" value={code} onChange={(e) => setCode(e.target.value)} required autoComplete="off" />
          <Button type="submit" loading={loading}>Verify</Button>
        </form>
        <div style={{ marginTop: 16 }}>
          <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
}
