import { colorTableFrom, exportCharacter, type CharacterExport } from '@pixiso/sprite-kit';
import { useState } from 'react';
import { downloadFile } from '../export/download.js';
import { vi } from '../i18n/vi.js';
import { useAppStore } from '../state/store.js';

/** Export (D-097): sheets, Aseprite JSON, GIF and ZIP of the current config, rendered by the same code as the preview. */
export function ExportBar() {
  const catalog = useAppStore((s) => s.catalog);
  const config = useAppStore((s) => s.config);
  const style = useAppStore((s) => s.style);
  const previewAnimation = useAppStore((s) => s.preview.animationId);
  const [name, setName] = useState('');
  const [atlas, setAtlas] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = (): CharacterExport | null => {
    try {
      return exportCharacter(config, style, colorTableFrom(catalog.colors), {
        ...(name.trim() ? { name: name.trim() } : {}),
        atlas,
        previewAnimation,
      });
    } catch (err) {
      setMessage(`${vi.export.failed} ${(err as Error).message}`);
      return null;
    }
  };
  const done = (files: string[]) => setMessage(`${vi.export.done} ${files.join(', ')}`);

  const onZip = () => {
    const out = run();
    if (!out) return;
    downloadFile(out.zip);
    done([out.zip.name]);
  };
  const onPngJson = () => {
    const out = run();
    if (!out) return;
    const anim = out.animations.find((a) => a.id === previewAnimation) ?? out.animations[0]!;
    downloadFile(anim.png);
    downloadFile(anim.json);
    done([anim.png.name, anim.json.name]);
  };
  const onGif = () => {
    const out = run();
    if (!out) return;
    downloadFile(out.gif);
    done([out.gif.name]);
  };

  return (
    <section className="panel">
      <h2>{vi.panels.export}</h2>
      <div className="row">
        <label htmlFor="export-name">{vi.export.name}</label>
        <input
          id="export-name"
          data-testid="export-name"
          value={name}
          placeholder={config.baseCharacter}
          onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
          style={{ width: 120 }}
        />
        <label>
          <input
            type="checkbox"
            data-testid="export-atlas"
            checked={atlas}
            onChange={(e) => setAtlas(e.target.checked)}
          />{' '}
          {vi.export.atlas}
        </label>
      </div>
      <div className="row">
        <button type="button" data-testid="export-zip" onClick={onZip}>
          {vi.export.zip}
        </button>
        <button type="button" data-testid="export-png-json" onClick={onPngJson}>
          {vi.export.pngJson}
        </button>
        <button type="button" data-testid="export-gif" onClick={onGif}>
          {vi.export.gif}
        </button>
        <a className="small muted" href="/dev/player.html" target="_blank" rel="noreferrer">
          {vi.export.player}
        </a>
      </div>
      {style.directions === '5+mirror' && <div className="small muted">{vi.export.mirrorNote}</div>}
      {message && (
        <div className="small muted" data-testid="export-message">
          {message}
        </div>
      )}
    </section>
  );
}
