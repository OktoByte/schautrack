import { useState, useCallback, useMemo } from 'react';
import type { User } from '@/types';
import { saveAiSettings } from '@/api/settings';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToastStore } from '@/stores/toastStore';
import { useAutosave } from '@/hooks/useAutosave';

const selectClass = 'w-full rounded-md border border-input bg-muted/50 px-2.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring';

interface Props {
  user: User;
  onSave: () => void;
}

export default function AISettings({ user, onSave }: Props) {
  const [provider, setProvider] = useState(user.preferredAiProvider || '');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(user.aiModel || '');
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  // Auto-save provider and model (not API key — that needs explicit submit)
  const autoData = useMemo(() => ({ provider, model }), [provider, model]);

  const autoSaveFn = useCallback(async (d: typeof autoData) => {
    await saveAiSettings({ ai_provider: d.provider, ai_key: '', ai_model: d.model });
    onSave();
  }, [onSave]);

  useAutosave(autoData, autoSaveFn);

  // Manual save for API key
  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    setLoading(true);
    try {
      await saveAiSettings({ ai_provider: provider, ai_key: apiKey, ai_model: model });
      setApiKey('');
      onSave();
      addToast('success', 'API key saved');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to save API key');
    }
    setLoading(false);
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      await saveAiSettings({ clear_settings: 'true' });
      setProvider(''); setModel('');
      onSave();
      addToast('success', 'AI settings cleared');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to clear AI settings');
    }
    setLoading(false);
  };

  return (
    <Card>
      <h3 className="text-sm font-semibold mb-3">AI Settings</h3>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className={selectClass}>
            <option value="">Default</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
            <option value="ollama">Ollama</option>
          </select>
        </div>
        <Input label="Model (optional)" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. gpt-4o" />
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input label="API Key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder={user.hasAiKey ? `\u2022\u2022\u2022\u2022${user.aiKeyLast4}` : 'Enter API key'} />
          </div>
          <Button size="sm" loading={loading} onClick={handleSaveKey} disabled={!apiKey.trim()}>Save Key</Button>
        </div>
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>Clear All</Button>
        </div>
      </div>
    </Card>
  );
}
