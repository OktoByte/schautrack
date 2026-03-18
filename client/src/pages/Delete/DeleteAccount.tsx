import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api, ApiError } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';

export default function DeleteAccount() {
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api('/delete', {
        method: 'POST',
        body: JSON.stringify({ password, token: token || undefined }),
      });
      setSuccess('Account deleted. Redirecting...');
      clearUser();
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete account.');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8, color: 'var(--danger)' }}>Delete Account</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: 24 }}>
          This will permanently delete your account and all data. This cannot be undone.
        </p>
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}
        {!success && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {user?.totpEnabled && (
              <Input label="2FA Code" value={token} onChange={(e) => setToken(e.target.value)} inputMode="numeric" />
            )}
            <Button type="submit" variant="danger" loading={loading}>Delete My Account</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
