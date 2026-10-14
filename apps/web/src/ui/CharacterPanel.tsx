import { vi } from '../i18n/vi.js';
import { useAppStore } from '../state/store.js';

export function CharacterPanel() {
  const catalog = useAppStore((s) => s.catalog);
  const current = useAppStore((s) => s.config.baseCharacter);
  const setBaseCharacter = useAppStore((s) => s.setBaseCharacter);
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
    </section>
  );
}
