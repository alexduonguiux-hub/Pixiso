import type { CharacterHeightPx, OutlineMode } from '@pixiso/shared';
import { vi } from '../i18n/vi.js';
import { useAppStore } from '../state/store.js';

export function StylePanel() {
  const style = useAppStore((s) => s.style);
  const setStyle = useAppStore((s) => s.setStyle);
  return (
    <section className="panel">
      <h2>{vi.panels.style}</h2>
      <div className="row">
        <label htmlFor="style-height">{vi.style.characterHeight}</label>
        <select
          id="style-height"
          value={style.characterHeightPx}
          onChange={(e) =>
            setStyle({ characterHeightPx: Number(e.target.value) as CharacterHeightPx })
          }
        >
          {[32, 64].map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>
      <div className="row">
        <label htmlFor="style-directions">{vi.style.directions}</label>
        <select
          id="style-directions"
          value={String(style.directions)}
          onChange={(e) => setStyle({ directions: e.target.value === '8' ? 8 : '5+mirror' })}
        >
          <option value="8">{vi.style.directions8}</option>
          <option value="5+mirror">{vi.style.directions5mirror}</option>
        </select>
      </div>
      <div className="row">
        <label htmlFor="style-outline">{vi.style.outline}</label>
        <select
          id="style-outline"
          value={style.outline}
          onChange={(e) => setStyle({ outline: e.target.value as OutlineMode })}
        >
          <option value="ink">{vi.style.outlineInk}</option>
          <option value="soft">{vi.style.outlineSoft}</option>
          <option value="none">{vi.style.outlineNone}</option>
        </select>
      </div>
      <div className="row">
        <label htmlFor="style-palette">{vi.style.paletteColors}</label>
        <select
          id="style-palette"
          value={style.palette.mode === 'auto' ? style.palette.colors : 'fixed'}
          disabled
          title={vi.style.paletteLater}
          onChange={(e) => setStyle({ palette: { mode: 'auto', colors: Number(e.target.value) } })}
        >
          {[8, 12, 16, 24, 32].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
