import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { getAuthInfo, type AuthInfo } from '@/api/passkeys';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

interface Props {
  linkedProviders: string[];
  onUpdate: () => void;
}

export default function OIDCSettings({ linkedProviders, onUpdate }: Props) {
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const addToast = useToastStore((s) => s.addToast);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    getAuthInfo().then(setAuthInfo).catch(() => {});
  }, []);

  if (!authInfo || authInfo.oidcProviders.length === 0) return null;

  const handleLink = (providerName: string) => {
    window.location.href = `/auth/oidc/${providerName}/login`;
  };

  const handleUnlink = async (providerName: string) => {
    // Find the OIDC account ID — we need to query settings for this
    // For simplicity, pass the provider name and let the backend handle it
    if (!confirm(`Unlink ${providerName}?`)) return;
    try {
      // We need the account ID. Let's get it from a settings endpoint.
      // Actually, we'll add an endpoint or use the provider name directly.
      // For now, we'll use a simplified approach.
      const settingsData = await api<{ oidcAccounts?: { id: number; provider: string }[] }>('/api/settings');
      const account = settingsData.oidcAccounts?.find((a) => a.provider === providerName);
      if (!account) {
        addToast('error', 'Account not found');
        return;
      }
      await api('/settings/oidc/unlink', {
        method: 'POST',
        body: JSON.stringify({ id: account.id }),
      });
      addToast('success', `${providerName} unlinked`);
      fetchUser();
      onUpdate();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to unlink');
    }
  };

  return (
    <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b-2 border-border">
        <h3 className="text-sm font-medium text-muted-foreground">Single Sign-On</h3>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {authInfo.oidcProviders.map((provider) => {
          const isLinked = linkedProviders.includes(provider.name);
          return (
            <div key={provider.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm text-foreground">{provider.label}</span>
              {isLinked ? (
                <button
                  className="text-xs text-destructive hover:text-destructive/80 cursor-pointer bg-transparent border-0 p-1 transition-colors"
                  onClick={() => handleUnlink(provider.name)}
                >
                  Unlink
                </button>
              ) : (
                <button
                  className="text-xs text-primary hover:text-primary/80 cursor-pointer bg-transparent border-0 p-1 transition-colors"
                  onClick={() => handleLink(provider.name)}
                >
                  Link
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
