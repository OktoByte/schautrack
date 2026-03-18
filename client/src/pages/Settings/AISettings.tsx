import { useState } from 'react';
import type { User } from '@/types';
import { saveAiSettings } from '@/api/settings';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

interface Props {
  user: User;
  onSave: () => void;
}

export default function AISettings({ user, onSave }: Props) {
  const [provider, setProvider] = useState(user.preferredAiProvider || '');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(user.aiModel || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await saveAiSettings({ ai_provider: provider, ai_key: apiKey, ai_model: model });
      setApiKey('');
      onSave();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      await saveAiSettings({ clear_settings: 'true' });
      setProvider(''); setModel('');
      onSave();
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <Card>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>AI Settings</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <select value={provider} onChange={(e) => setProvider(e.target.value)}
          style={{ background: 'var(--bg-1)', border: '1px solid var(--stroke)', borderRadius: 6, color: 'var(--text)', padding: '6px 8px', font: 'inherit' }}>
          <option value="">Default</option>
          <option value="openai">OpenAI</option>
          <option value="claude">Claude</option>
          <option value="ollama">Ollama</option>
        </select>
        <Input label="API Key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
          placeholder={user.hasAiKey ? `\u2022\u2022\u2022\u2022${user.aiKeyLast4}` : 'Enter API key'} />
        <Input label="Model (optional)" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. gpt-4o" />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="submit" size="sm" loading={loading}>Save</Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>Clear</Button>
        </div>
      </form>
    </Card>
  );
}
