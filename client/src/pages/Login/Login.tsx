import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { login } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requireToken, setRequireToken] = useState(false);
  const [captchaSvg, setCaptchaSvg] = useState('');
  const navigate = useNavigate();
  const { fetchUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login({
        email, password,
        token: requireToken ? token : undefined,
        captcha: captchaSvg ? captcha : undefined,
      });
      if (result.requireToken) { setRequireToken(true); setLoading(false); return; }
      if (result.requireVerification) { navigate('/verify-email'); return; }
      if (result.ok) { await fetchUser(); navigate('/dashboard'); }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (typeof err.data.captchaSvg === 'string') setCaptchaSvg(err.data.captchaSvg);
        if (err.data.requireCaptcha) setCaptcha('');
      } else { setError('Could not log in.'); }
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center py-12">
      <Card className="w-full max-w-sm">
        <h2 className="mb-6 text-xl font-semibold">Log In</h2>
        {error && <Alert type="error" message={error} className="mb-4" />}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!requireToken ? (
            <>
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              {captchaSvg && (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-center rounded-md bg-muted/50 p-2 invert [&_img]:max-w-full">
                    <img src={`data:image/svg+xml;base64,${btoa(captchaSvg)}`} alt="Captcha" />
                  </div>
                  <Input label="Captcha" value={captcha} onChange={(e) => setCaptcha(e.target.value)} required autoComplete="off" />
                </div>
              )}
            </>
          ) : (
            <Input label="2FA Code" type="text" value={token} onChange={(e) => setToken(e.target.value)} required autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]*" />
          )}
          <Button type="submit" loading={loading}>{requireToken ? 'Verify' : 'Log In'}</Button>
        </form>
        <div className="mt-6 flex justify-between text-sm">
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/register">Create account</Link>
        </div>
      </Card>
    </div>
  );
}
