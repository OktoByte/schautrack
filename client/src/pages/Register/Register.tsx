import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { register } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/api/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import styles from './Register.module.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'captcha'>('credentials');
  const navigate = useNavigate();
  const { fetchUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await register({
        step,
        email: step === 'credentials' ? email : undefined,
        password: step === 'credentials' ? password : undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        captcha: step === 'captcha' ? captcha : undefined,
      });

      if (result.requireCaptcha && result.captchaSvg) {
        setCaptchaSvg(result.captchaSvg);
        setStep('captcha');
        setCaptcha('');
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
      } else {
        setError('Could not register.');
      }
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h2 className={styles.heading}>Create Account</h2>

        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit} className={styles.form}>
          {step === 'credentials' ? (
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
                autoComplete="new-password"
                minLength={10}
                placeholder="Minimum 10 characters"
              />
            </>
          ) : (
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

          <Button type="submit" loading={loading}>
            {step === 'credentials' ? 'Continue' : 'Create Account'}
          </Button>
        </form>

        <div className={styles.links}>
          <Link to="/login">Already have an account?</Link>
        </div>
      </Card>
    </div>
  );
}
