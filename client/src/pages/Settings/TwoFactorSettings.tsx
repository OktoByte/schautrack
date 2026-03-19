import { useState } from 'react';
import { setup2fa, enable2fa, disable2fa } from '@/api/settings';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';

interface Props {
  totpEnabled: boolean;
  onUpdate: () => void;
}

export default function TwoFactorSettings({ totpEnabled, onUpdate }: Props) {
  const [setupData, setSetupData] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [token, setToken] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSetup = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await setup2fa();
      if (res.ok && res.qrDataUrl && res.secret) {
        setSetupData({ qrDataUrl: res.qrDataUrl, secret: res.secret });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Setup failed.');
    }
    setLoading(false);
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await enable2fa({ token });
      if (res.ok) {
        setSuccess('2FA enabled successfully.');
        setSetupData(null);
        setToken('');
        onUpdate();
      } else {
        setError(res.error || 'Invalid code.');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to enable 2FA.');
    }
    setLoading(false);
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await disable2fa({ token: disableToken });
      if (res.ok) {
        setSuccess('2FA disabled.');
        setDisableToken('');
        onUpdate();
      } else {
        setError(res.error || 'Invalid code.');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to disable 2FA.');
    }
    setLoading(false);
  };

  const handleCopySecret = async () => {
    if (!setupData) return;
    try {
      await navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  const handleCancel = () => {
    setSetupData(null);
    setToken('');
    setError('');
  };

  return (
    <Card>
      <h3 className="text-base font-semibold mb-4">Two-Factor Authentication</h3>
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      {totpEnabled ? (
        <>
          <p className="text-muted-foreground text-sm mb-3">
            2FA is enabled on your account.
          </p>
          <form onSubmit={handleDisable} className="flex flex-col gap-3">
            <Input
              label="2FA Code"
              value={disableToken}
              onChange={(e) => setDisableToken(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit code"
              required
            />
            <Button type="submit" variant="destructive" size="sm" loading={loading}>Disable 2FA</Button>
          </form>
        </>
      ) : setupData ? (
        <div className="flex flex-col gap-3 items-center">
          <p className="text-muted-foreground text-sm text-center">
            Scan this QR code with your authenticator app:
          </p>
          <img src={setupData.qrDataUrl} alt="2FA QR Code" className="w-[200px] h-[200px] rounded-lg" />
          <div className="flex items-center gap-2">
            <code className="text-xs text-muted-foreground bg-surface px-2 py-1 rounded break-all">
              {setupData.secret}
            </code>
            <button
              type="button"
              onClick={handleCopySecret}
              className="bg-transparent border-none text-primary cursor-pointer text-xs whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <form onSubmit={handleEnable} className="flex flex-col gap-3 w-full">
            <Input
              label="Verification Code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit code"
              required
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={loading}>Activate</Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
            </div>
          </form>
        </div>
      ) : (
        <Button size="sm" onClick={handleSetup} loading={loading}>Setup 2FA</Button>
      )}
    </Card>
  );
}
