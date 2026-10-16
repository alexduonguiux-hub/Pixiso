import { useEffect, useRef } from 'react';
import { vi } from '../i18n/vi.js';
import { drawFrame } from '../preview/draw.js';
import { useFrameIndex, useRenderedClip } from '../preview/useRenderedClip.js';
import { useAppStore } from '../state/store.js';

const STRIP_ZOOM = 4;

/** Every frame of the previewed clip side by side, plus the colours it uses. */
export function FramesPanel() {
  const clip = useRenderedClip();
  const playing = useAppStore((s) => s.preview.playing);
  const current = useFrameIndex(clip, playing);
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (!clip) return;
    clip.frames.forEach((f, i) => {
      const c = refs.current[i];
      if (c) drawFrame(c, f, STRIP_ZOOM);
    });
  }, [clip]);

  return (
    <section className="panel">
      <h2>{vi.panels.frames}</h2>
      <div className="frame-strip" data-testid="frame-strip">
        {clip?.frames.map((_, i) => (
          <canvas
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={i === current ? 'current' : ''}
            title={`${vi.preview.frame} ${i + 1}`}
          />
        ))}
      </div>
      {clip && (
        <div className="row" style={{ marginTop: 6 }}>
          <label>{vi.frames.palette}</label>
          <div className="swatches" data-testid="pixel-palette">
            {clip.palette.map((c, i) => (
              <span
                key={i}
                className="swatch"
                title={`rgb(${c.join(',')})`}
                style={{ background: `rgb(${c[0]},${c[1]},${c[2]})`, display: 'inline-block' }}
              />
            ))}
          </div>
          <span className="muted small">
            {clip.palette.length} {vi.preview.colors} · {vi.frames.scale} ×{clip.scale}
          </span>
        </div>
      )}
    </section>
  );
}
