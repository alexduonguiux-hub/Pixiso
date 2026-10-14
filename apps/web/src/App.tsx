import { catalog } from '@pixiso/shared/catalog';
import { useEffect, useState } from 'react';
import { vi } from './i18n/vi.js';

interface Health {
  ok: boolean;
  describeEnabled: boolean;
}

export function App() {
  const [health, setHealth] = useState<Health | null | 'offline'>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((r) => (r.ok ? (r.json() as Promise<Health>) : Promise.reject(new Error(r.statusText))))
      .then((h) => {
        if (!cancelled) setHealth(h);
      })
      .catch(() => {
        if (!cancelled) setHealth('offline');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statusText =
    health === null
      ? vi.status.loading
      : health === 'offline'
        ? vi.status.serverOffline
        : health.describeEnabled
          ? vi.status.describeEnabled
          : vi.status.describeDisabled;

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>{vi.appTitle}</h1>
      <p style={{ marginTop: 0, opacity: 0.7 }}>{vi.appTagline}</p>
      <p data-testid="server-status">{statusText}</p>
      <h2>{vi.panels.characters}</h2>
      <ul data-testid="character-list">
        {catalog.characters.map((c) => (
          <li key={c.id}>
            {c.label_vi} <code style={{ opacity: 0.6 }}>{c.id}</code>
          </li>
        ))}
      </ul>
    </main>
  );
}
