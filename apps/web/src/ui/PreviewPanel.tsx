import { DIRECTIONS_8 } from '@pixiso/shared';
import { useEffect, useRef, useState } from 'react';
import { vi } from '../i18n/vi.js';
import { drawStage } from '../preview/draw.js';
import { useFrameIndex, useRenderedClip } from '../preview/useRenderedClip.js';
import { useAppStore } from '../state/store.js';

const ZOOMS = [4, 6, 8] as const;

export function PreviewPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState<number>(6);
  const catalog = useAppStore((s) => s.catalog);
  const config = useAppStore((s) => s.config);
  const preview = useAppStore((s) => s.preview);
  const setPreview = useAppStore((s) => s.setPreview);
  const clip = useRenderedClip();
  const frameIndex = useFrameIndex(clip, preview.playing);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = clip?.frames[frameIndex];
    if (!canvas || !clip || !frame) return;
    drawStage(canvas, frame, { zoom, pivot: clip.pivot });
    // What this canvas currently shows; tests wait on it instead of guessing at timing.
    const parts = Object.values(config.parts).filter((p) => p !== 'none').length;
    canvas.dataset.drawn = `${preview.direction}:${preview.animationId}:${frameIndex}:${parts}:${config.colors.length}`;
  }, [clip, frameIndex, zoom, config, preview.direction, preview.animationId]);

  return (
    <section className="panel">
      <h2>{vi.panels.preview}</h2>
      <div className="preview-stage" data-testid="preview-stage">
        <canvas ref={canvasRef} data-testid="preview-canvas" />
        <div className="overlay">{vi.directions[preview.direction]}</div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <label>{vi.preview.direction}</label>
        <div className="direction-buttons">
          {DIRECTIONS_8.map((d) => {
            const available = catalog.directions.includes(d);
            return (
              <button
                key={d}
                type="button"
                className={d === preview.direction ? 'active' : ''}
                data-testid={`dir-${d}`}
                disabled={!available}
                title={available ? vi.directions[d] : vi.preview.directionUnavailable}
                onClick={() => setPreview({ direction: d })}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <div className="row">
        <button
          type="button"
          data-testid="play-toggle"
          onClick={() => setPreview({ playing: !preview.playing })}
        >
          {preview.playing ? vi.preview.pause : vi.preview.play}
        </button>
        <label>{vi.preview.zoom}</label>
        {ZOOMS.map((z) => (
          <button
            key={z}
            type="button"
            className={z === zoom ? 'active' : ''}
            onClick={() => setZoom(z)}
          >
            ×{z}
          </button>
        ))}
        <span className="muted small" data-testid="preview-status">
          {clip
            ? `${vi.preview.cell} ${clip.cell.w}×${clip.cell.h} · ${clip.palette.length} ${vi.preview.colors} · ${vi.preview.frame} ${frameIndex + 1}/${clip.frames.length} · ${clip.frameMs} ms`
            : vi.preview.notReady}
        </span>
      </div>
    </section>
  );
}
