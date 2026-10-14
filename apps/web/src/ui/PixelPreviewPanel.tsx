import { opaqueBounds, padRect, cropImage, type RGBAImage, type Rgb8 } from '@pixiso/pixel-core';
import { useEffect, useRef, useState } from 'react';
import { vi } from '../i18n/vi.js';
import type { SceneController } from '../scene/SceneController.js';
import { subscribeSceneController } from '../scene/sceneRegistry.js';
import { appStore, useAppStore } from '../state/store.js';

interface PreviewClip {
  frames: RGBAImage[];
  palette: Rgb8[];
  frameDurationMs: number;
  ppm: number;
  cell: { w: number; h: number };
}

const ZOOMS = [4, 6, 8] as const;

function toCanvasFrames(frames: RGBAImage[]): PreviewClip['frames'] {
  // Crop all frames to their union bounds (+1 px margin) so the preview is tight but stable.
  const bounds = frames.map((f) => opaqueBounds(f));
  let union: { x: number; y: number; w: number; h: number } | null = null;
  for (const b of bounds) {
    if (!b) continue;
    union = union
      ? {
          x: Math.min(union.x, b.x),
          y: Math.min(union.y, b.y),
          w: Math.max(union.x + union.w, b.x + b.w) - Math.min(union.x, b.x),
          h: Math.max(union.y + union.h, b.y + b.h) - Math.min(union.y, b.y),
        }
      : { ...b };
  }
  if (!union) return frames;
  const f0 = frames[0]!;
  const rect = padRect(union, 1, f0.width, f0.height);
  return frames.map((f) => cropImage(f, rect));
}

export function PixelPreviewPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState<number>(6);
  const [clip, setClip] = useState<PreviewClip | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [ctl, setCtl] = useState<SceneController | null>(null);
  const playing = useAppStore((s) => s.preview.playing);

  useEffect(() => subscribeSceneController(setCtl), []);

  // Re-render the processed clip whenever the scene becomes ready or the relevant state changes.
  useEffect(() => {
    if (!ctl) return;
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, 60);
    };
    const run = () => {
      if (!ctl.ready || !ctl.rig.ready) return;
      const s = appStore.getState();
      const animation = s.catalog.animations.find((a) => a.id === s.preview.animationId);
      if (!animation) return;
      setRendering(true);
      try {
        const res = ctl.renderClip({ animation, direction: s.preview.direction, style: s.style });
        const frames = toCanvasFrames(res.frames);
        setClip({
          frames,
          palette: res.palette,
          frameDurationMs: res.frameDurationMs,
          ppm: res.ppm,
          cell: { w: frames[0]?.width ?? 0, h: frames[0]?.height ?? 0 },
        });
        setFrameIndex(0);
      } finally {
        setRendering(false);
      }
    };
    const offReady = ctl.onReady(schedule);
    const offStore = appStore.subscribe((s, prev) => {
      if (
        s.style !== prev.style ||
        s.preview.direction !== prev.preview.direction ||
        s.preview.animationId !== prev.preview.animationId
      ) {
        schedule();
      }
    });
    schedule();
    return () => {
      window.clearTimeout(timer);
      offReady();
      offStore();
    };
  }, [ctl]);

  // Frame timer.
  useEffect(() => {
    if (!clip || clip.frames.length < 2 || !playing) return;
    const id = window.setInterval(
      () => setFrameIndex((i) => (i + 1) % clip.frames.length),
      clip.frameDurationMs,
    );
    return () => window.clearInterval(id);
  }, [clip, playing]);

  // Draw.
  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = clip?.frames[frameIndex];
    if (!canvas || !frame) return;
    canvas.width = frame.width * zoom;
    canvas.height = frame.height * zoom;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const tmp = document.createElement('canvas');
    tmp.width = frame.width;
    tmp.height = frame.height;
    tmp
      .getContext('2d')!
      .putImageData(
        new ImageData(new Uint8ClampedArray(frame.data), frame.width, frame.height),
        0,
        0,
      );
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  }, [clip, frameIndex, zoom]);

  return (
    <section className="panel">
      <h2>{vi.panels.pixelPreview}</h2>
      <div className="row">
        <label>{vi.pixelPreview.zoom}</label>
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
        <span className="muted small" data-testid="pixel-status">
          {!ctl ? vi.pixelPreview.notReady : rendering ? vi.pixelPreview.rendering : ''}
          {clip &&
            !rendering &&
            `${vi.pixelPreview.cell} ${clip.cell.w}×${clip.cell.h} · ${clip.palette.length} ${vi.pixelPreview.colors} · ${clip.ppm.toFixed(2)} ${vi.pixelPreview.ppm} · ${vi.pixelPreview.frame} ${frameIndex + 1}/${clip.frames.length}`}
        </span>
      </div>
      <div
        style={{
          background: 'repeating-conic-gradient(#2a2a32 0 25%, #222228 0 50%) 0 0 / 16px 16px',
          padding: 8,
          borderRadius: 6,
          overflow: 'auto',
          minHeight: 120,
        }}
      >
        <canvas ref={canvasRef} data-testid="pixel-canvas" style={{ margin: '0 auto' }} />
      </div>
      {clip && (
        <div className="row" style={{ marginTop: 6 }}>
          <label>{vi.pixelPreview.palette}</label>
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
        </div>
      )}
    </section>
  );
}
