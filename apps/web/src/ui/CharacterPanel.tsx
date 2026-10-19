import { vi } from '../i18n/vi.js';
import { useAppStore } from '../state/store.js';

export function CharacterPanel() {
  const catalog = useAppStore((s) => s.catalog);
  const current = useAppStore((s) => s.config.baseCharacter);
  const setBaseCharacter = useAppStore((s) => s.setBaseCharacter);
  const replaceConfig = useAppStore((s) => s.replaceConfig);
  return (
    <section className="panel">
      <h2>{vi.panels.characters}</h2>
      <div className="character-list" data-testid="character-list">
        {catalog.characters.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`character-card${c.id === current ? ' active' : ''}`}
            data-testid={`character-${c.id}`}
            onClick={() => setBaseCharacter(c.id)}
          >
            <strong>{c.label_vi}</strong>
            {c.description_vi && <span className="small">{c.description_vi}</span>}
          </button>
        ))}
      </div>
      {catalog.presets.length > 0 && (
        <>
          <h3>{vi.panels.presets}</h3>
          <div className="character-list" data-testid="preset-list">
            {catalog.presets.map((p) => (
              <button
                key={p.id}
                type="button"
                className="character-card"
                data-testid={`preset-${p.id}`}
                title={p.description_vi}
                onClick={() => replaceConfig(p.config)}
              >
                <strong>{p.label_vi}</strong>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
