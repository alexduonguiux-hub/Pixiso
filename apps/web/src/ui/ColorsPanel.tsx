import { isHexColor, type ColorName, type HexColor } from '@pixiso/shared';
import { vi } from '../i18n/vi.js';
import { useAppStore } from '../state/store.js';

export function ColorsPanel() {
  const catalog = useAppStore((s) => s.catalog);
  const colors = useAppStore((s) => s.config.colors);
  const setColor = useAppStore((s) => s.setColor);
  return (
    <section className="panel">
      <h2>{vi.panels.colors}</h2>
      {catalog.colorTargets.map((target) => {
        const current: ColorName | HexColor =
          colors.find((c) => c.target === target.id)?.color ?? 'original';
        const custom = isHexColor(current);
        return (
          <div className="row" key={target.id}>
            <label>{target.label_vi}</label>
            <div className="swatches" role="radiogroup" aria-label={target.label_vi}>
              {catalog.colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={c.id === current}
                  className={`swatch${c.id === 'original' ? ' original' : ''}${c.id === current ? ' active' : ''}`}
                  style={c.id === 'original' ? undefined : { background: c.hex }}
                  title={c.id === 'original' ? vi.colors.original : c.label_vi}
                  data-testid={`color-${target.id}-${c.id}`}
                  onClick={() => setColor(target.id, c.id)}
                />
              ))}
              <input
                type="color"
                className={`swatch custom${custom ? ' active' : ''}`}
                value={custom ? current : '#888888'}
                title={vi.colors.custom}
                aria-label={`${target.label_vi}: ${vi.colors.custom}`}
                data-testid={`color-${target.id}-custom`}
                onChange={(e) => setColor(target.id, e.target.value as HexColor)}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}
