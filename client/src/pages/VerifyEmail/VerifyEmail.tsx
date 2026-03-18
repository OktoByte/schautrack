import { useState } from 'react';
import { useNavigate } from 'react-router';
import { verifyEmail, resendVerification } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/api/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';

export default function VerifyEmail() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const { fetchUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await verifyEmail({ code });
      if (result.ok) {
        await fetchUser();
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed.');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      const result = await resendVerification({});
      if (result.ok) setSuccess('New code sent to your email.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend.');
    }
    setResending(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 24 }}>Verify Email</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          Enter the verification code sent to your email.
        </p>
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Verification Code" value={code} onChange={(e) => setCode(e.target.value)} required autoComplete="off" />
          <Button type="submit" loading={loading}>Verify</Button>
        </form>
        <div style={{ marginTop: 16 }}>
          <Button variant="ghost" size="sm" onClick={handleResend} loading={resending}>Resend Code</Button>
        </div>
      </Card>
    </div>
  );
}
