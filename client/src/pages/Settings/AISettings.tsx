import { useState } from 'react';
import type { User } from '@/types';
import { saveAiSettings } from '@/api/settings';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

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
      <h3 className="text-sm font-semibold mb-3">AI Settings</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className={selectClass}>
            <option value="">Default</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
            <option value="ollama">Ollama</option>
          </select>
        </div>
        <Input label="API Key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
          placeholder={user.hasAiKey ? `\u2022\u2022\u2022\u2022${user.aiKeyLast4}` : 'Enter API key'} />
        <Input label="Model (optional)" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. gpt-4o" />
        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={loading}>Save</Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>Clear All</Button>
        </div>
      </form>
    </Card>
  );
}
