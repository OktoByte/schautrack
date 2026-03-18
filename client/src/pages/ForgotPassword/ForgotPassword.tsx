import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { forgotPassword, getCaptcha } from '@/api/auth';
import { ApiError } from '@/api/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getCaptcha().then((data) => setCaptchaSvg(data.svg)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPassword({ email, captcha });
      navigate('/reset-password');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.data.captchaSvg) setCaptchaSvg(err.data.captchaSvg as string);
      } else {
        setError('Request failed.');
      }
      setCaptcha('');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 24 }}>Forgot Password</h2>
        {error && <Alert type="error" message={error} />}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {captchaSvg && (
            <div>
              <div style={{ background: 'white', borderRadius: 6, padding: 8, display: 'flex', justifyContent: 'center' }}
                dangerouslySetInnerHTML={{ __html: captchaSvg }} />
              <Input label="Captcha" value={captcha} onChange={(e) => setCaptcha(e.target.value)} required autoComplete="off" />
            </div>
          )}
          <Button type="submit" loading={loading}>Send Reset Code</Button>
        </form>
      </Card>
    </div>
  );
}
