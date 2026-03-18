import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { login } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/api/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import styles from './Login.module.css';

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
        email,
        password,
        token: requireToken ? token : undefined,
        captcha: captchaSvg ? captcha : undefined,
      });

      if (result.requireToken) {
        setRequireToken(true);
        setLoading(false);
        return;
      }

      if (result.requireVerification) {
        navigate('/verify-email');
        return;
      }

      if (result.ok) {
        await fetchUser();
        navigate('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.data.captchaSvg) setCaptchaSvg(err.data.captchaSvg as string);
        if (err.data.requireCaptcha) setCaptcha('');
      } else {
        setError('Could not log in.');
      }
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h2 className={styles.heading}>Log In</h2>

        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit} className={styles.form}>
          {!requireToken ? (
            <>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              {captchaSvg && (
                <div className={styles.captchaBlock}>
                  <div dangerouslySetInnerHTML={{ __html: captchaSvg }} />
                  <Input
                    label="Captcha"
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </div>
              )}
            </>
          ) : (
            <Input
              label="2FA Code"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]*"
            />
          )}

          <Button type="submit" loading={loading}>
            {requireToken ? 'Verify' : 'Log In'}
          </Button>
        </form>

        <div className={styles.links}>
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/register">Create account</Link>
        </div>
      </Card>
    </div>
  );
}
