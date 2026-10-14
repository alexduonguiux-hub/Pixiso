import { useEffect, useState } from 'react';
import { vi } from '../i18n/vi.js';

interface Health {
  ok: boolean;
  describeEnabled: boolean;
}

export function DescribeBar() {
  const [health, setHealth] = useState<Health | null | 'offline'>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((r) => (r.ok ? (r.json() as Promise<Health>) : Promise.reject(new Error(r.statusText))))
      .then((h) => !cancelled && setHealth(h))
      .catch(() => !cancelled && setHealth('offline'));
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
    <div>
      <div className="brand">
        <h1>{vi.appTitle}</h1>
        <span className="muted">{vi.appTagline}</span>
        <span className="muted small" data-testid="server-status" style={{ marginLeft: 'auto' }}>
          {statusText}
        </span>
      </div>
      <form
        className="describe-form"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={vi.describe.placeholder}
          aria-label={vi.panels.describe}
        />
        <button type="submit" disabled title={vi.describe.comingSoon}>
          {vi.describe.generate}
        </button>
      </form>
    </div>
  );
}
