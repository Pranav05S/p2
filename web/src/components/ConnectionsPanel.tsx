import { useState } from 'react';
import { apiFetch, ApiError } from '../lib/api';
import type { ConnectedAccount } from '../lib/types';

const PROVIDERS: { id: string; label: string; supported: boolean }[] = [
  { id: 'spotify', label: 'Spotify', supported: true },
  { id: 'apple_music', label: 'Apple Music', supported: false },
  { id: 'amazon_music', label: 'Amazon Music', supported: false },
  { id: 'youtube_music', label: 'YouTube Music', supported: false },
];

interface Props {
  connections: ConnectedAccount[];
  onChange: (connections: ConnectedAccount[]) => void;
}

export function ConnectionsPanel({ connections, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);

  async function connect(provider: string) {
    setError(null);
    try {
      const { authorization_url } = await apiFetch<{ authorization_url: string }>(
        `/connections/${provider}/authorize`,
      );
      window.location.href = authorization_url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start connection');
    }
  }

  async function disconnect(provider: string) {
    await apiFetch(`/connections/${provider}`, { method: 'DELETE' });
    onChange(connections.filter((c) => c.provider !== provider));
  }

  return (
    <section className="connections-panel">
      <h3>Connected streaming accounts</h3>
      {error && <p className="error">{error}</p>}
      <ul className="connections-list">
        {PROVIDERS.map((p) => {
          const connection = connections.find((c) => c.provider === p.id);
          return (
            <li key={p.id}>
              <span>{p.label}</span>
              {!p.supported ? (
                <span className="muted">not yet available</span>
              ) : connection ? (
                <>
                  <span className="badge">{connection.status}</span>
                  <button onClick={() => disconnect(p.id)}>Disconnect</button>
                </>
              ) : (
                <button onClick={() => connect(p.id)}>Connect</button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
