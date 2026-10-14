import { DIRECTIONS_8 } from '@pixiso/shared';
import { useEffect, useRef, useState } from 'react';
import { vi } from '../i18n/vi.js';
import { preloadAllAssets } from '../scene/loader.js';
import { SceneController } from '../scene/SceneController.js';
import { appStore, useAppStore } from '../state/store.js';

export function ViewportPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<SceneController | null>(null);
  const [showArrow, setShowArrow] = useState(false);
  const preview = useAppStore((s) => s.preview);
  const setPreview = useAppStore((s) => s.setPreview);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctl = new SceneController(canvas);
    const parent = canvas.parentElement!;
    const ro = new ResizeObserver(() => ctl.resize(parent.clientWidth, parent.clientHeight));
    ro.observe(parent);
    ctl.resize(parent.clientWidth, parent.clientHeight);
    ctl.bind(appStore);
    ctl.start();
    if (window.__pixiso) window.__pixiso.scene = ctl;
    controllerRef.current = ctl;
    preloadAllAssets();
    return () => {
      ro.disconnect();
      ctl.dispose();
      if (window.__pixiso) window.__pixiso.scene = null;
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ctl = controllerRef.current;
    if (ctl) ctl.forwardArrow.visible = showArrow;
  }, [showArrow]);

  return (
    <section className="panel">
      <h2>{vi.panels.viewport}</h2>
      <div className="viewport">
        <canvas ref={canvasRef} data-testid="viewport-canvas" />
        <div className="overlay">{vi.directions[preview.direction]}</div>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <label>{vi.viewport.direction}</label>
        <div className="direction-buttons">
          {DIRECTIONS_8.map((d) => (
            <button
              key={d}
              type="button"
              className={d === preview.direction ? 'active' : ''}
              data-testid={`dir-${d}`}
              title={vi.directions[d]}
              onClick={() => setPreview({ direction: d })}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <button
          type="button"
          data-testid="play-toggle"
          onClick={() => setPreview({ playing: !preview.playing })}
        >
          {preview.playing ? vi.viewport.pause : vi.viewport.play}
        </button>
        <label>{vi.viewport.recolorMethod}</label>
        <button
          type="button"
          className={preview.recolorMethod === 'hue' ? 'active' : ''}
          data-testid="recolor-hue"
          onClick={() => setPreview({ recolorMethod: 'hue' })}
        >
          {vi.viewport.recolorHue}
        </button>
        <button
          type="button"
          className={preview.recolorMethod === 'ramp' ? 'active' : ''}
          data-testid="recolor-ramp"
          onClick={() => setPreview({ recolorMethod: 'ramp' })}
        >
          {vi.viewport.recolorRamp}
        </button>
        <label className="small" style={{ minWidth: 0 }}>
          <input
            type="checkbox"
            checked={showArrow}
            onChange={(e) => setShowArrow(e.target.checked)}
          />{' '}
          {vi.viewport.showForward}
        </label>
      </div>
    </section>
  );
}
