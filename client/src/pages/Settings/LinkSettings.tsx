import { useState } from 'react';
import type { LinkRequest, AcceptedLink } from '@/types';
import { requestLink, respondToLink, removeLink, updateLinkLabel } from '@/api/links';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

interface Props {
  incomingRequests: LinkRequest[];
  outgoingRequests: LinkRequest[];
  acceptedLinks: AcceptedLink[];
  availableSlots: number;
  onUpdate: () => void;
}

export default function LinkSettings({ incomingRequests, outgoingRequests, acceptedLinks, availableSlots, onUpdate }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestLink(email);
      setEmail('');
      onUpdate();
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleRespond = async (linkId: number, action: 'accept' | 'decline') => {
    await respondToLink(linkId, action);
    onUpdate();
  };

  const handleRemove = async (linkId: number) => {
    await removeLink(linkId);
    onUpdate();
  };

  return (
    <Card>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Account Links</h3>

      {incomingRequests.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>Incoming</h4>
          {incomingRequests.map((req) => (
            <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.875rem' }}>
              <span style={{ flex: 1 }}>{req.email}</span>
              <Button size="sm" onClick={() => handleRespond(req.id, 'accept')}>Accept</Button>
              <Button size="sm" variant="ghost" onClick={() => handleRespond(req.id, 'decline')}>Decline</Button>
            </div>
          ))}
        </div>
      )}

      {outgoingRequests.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>Pending</h4>
          {outgoingRequests.map((req) => (
            <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.875rem' }}>
              <span style={{ flex: 1 }}>{req.email}</span>
              <Button size="sm" variant="ghost" onClick={() => handleRemove(req.id)}>Cancel</Button>
            </div>
          ))}
        </div>
      )}

      {acceptedLinks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>Linked</h4>
          {acceptedLinks.map((link) => (
            <LinkRow key={link.linkId} link={link} onRemove={() => handleRemove(link.linkId)} />
          ))}
        </div>
      )}

      {availableSlots > 0 && (
        <form onSubmit={handleRequest} style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
          <Input label="Link by email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" size="sm" loading={loading}>Send</Button>
        </form>
      )}
    </Card>
  );
}

function LinkRow({ link, onRemove }: { link: AcceptedLink; onRemove: () => void }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(link.label || '');

  const saveLabel = async () => {
    await updateLinkLabel(link.linkId, label);
    setEditing(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.875rem' }}>
      {editing ? (
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={saveLabel}
          onKeyDown={(e) => e.key === 'Enter' && saveLabel()}
          autoFocus
          style={{ background: 'var(--bg-1)', border: '1px solid var(--accent)', borderRadius: 4, color: 'var(--text)', padding: '2px 6px', font: 'inherit', fontSize: '0.875rem', flex: 1 }}
        />
      ) : (
        <button type="button" onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: 'var(--text)', font: 'inherit', cursor: 'pointer', flex: 1, textAlign: 'left' }}>
          {link.label || link.email}
        </button>
      )}
      <Button size="sm" variant="danger" onClick={onRemove}>Remove</Button>
    </div>
  );
}
