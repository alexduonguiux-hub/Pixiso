import { useState } from 'react';
import { vi } from '../i18n/vi.js';
import { useAppStore } from '../state/store.js';

export function ConfigJsonPanel() {
  const config = useAppStore((s) => s.config);
  const importConfigJson = useAppStore((s) => s.importConfigJson);
  const resetConfig = useAppStore((s) => s.resetConfig);
  const [draft, setDraft] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const text = draft ?? JSON.stringify(config, null, 2);

  const doImport = () => {
    const res = importConfigJson(text);
    if (res.ok) {
      setDraft(null);
      setMessage(
        res.dropped.length
          ? `${vi.config.imported} ${vi.config.dropped} ${res.dropped.join(', ')}`
          : vi.config.imported,
      );
    } else {
      setMessage(res.error === 'invalid_json' ? vi.config.invalidJson : vi.config.invalidSchema);
    }
  };

  return (
    <section className="panel">
      <h2>{vi.panels.configJson}</h2>
      <textarea
        className="json"
        data-testid="config-json"
        value={text}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="row">
        <button
          type="button"
          data-testid="config-import"
          onClick={doImport}
          disabled={draft === null}
        >
          {vi.config.import}
        </button>
        <button type="button" onClick={() => navigator.clipboard?.writeText(text)}>
          {vi.config.copy}
        </button>
        <button
          type="button"
          onClick={() => {
            resetConfig();
            setDraft(null);
            setMessage(null);
          }}
        >
          {vi.config.reset}
        </button>
        {message && (
          <span className="small muted" data-testid="config-message">
            {message}
          </span>
        )}
      </div>
    </section>
  );
}
