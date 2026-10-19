import { animationFitsCharacter } from '@pixiso/shared';
import { vi } from '../i18n/vi.js';
import { useAppStore } from '../state/store.js';

export function AnimationsPanel() {
  const catalog = useAppStore((s) => s.catalog);
  const baseCharacter = useAppStore((s) => s.config.baseCharacter);
  const selected = useAppStore((s) => s.config.animations);
  const previewId = useAppStore((s) => s.preview.animationId);
  const toggleAnimation = useAppStore((s) => s.toggleAnimation);
  const setPreview = useAppStore((s) => s.setPreview);
  return (
    <section className="panel">
      <h2>{vi.panels.animations}</h2>
      <div className="anim-list">
        {catalog.animations.map((a) => {
          const on = selected.includes(a.id);
          const fits = animationFitsCharacter(a, baseCharacter);
          return (
            <div className={`anim-item${fits ? '' : ' muted'}`} key={a.id}>
              <input
                type="checkbox"
                id={`anim-${a.id}`}
                data-testid={`anim-${a.id}`}
                checked={on}
                disabled={!fits}
                onChange={() => toggleAnimation(a.id)}
              />
              <label
                htmlFor={`anim-${a.id}`}
                title={
                  fits
                    ? `${a.frameMs} ms/${vi.animations.frame} · ${a.loop ? vi.animations.loop : vi.animations.once}`
                    : vi.animations.unavailable
                }
              >
                {a.label_vi}
              </label>
              <span className="frames">
                {a.frames} {vi.animations.frames}
              </span>
              <button
                type="button"
                className={a.id === previewId ? 'active' : ''}
                disabled={!on}
                data-testid={`preview-${a.id}`}
                onClick={() => setPreview({ animationId: a.id })}
              >
                {vi.animations.preview}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
