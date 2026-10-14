import type { Direction } from '@pixiso/shared';
import {
  ArrowHelper,
  Clock,
  Color,
  GridHelper,
  NoToneMapping,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { StoreApi } from 'zustand/vanilla';
import type { AppState } from '../state/store.js';
import { CharacterRig } from './CharacterRig.js';
import { IsoCameraRig } from './IsoCameraRig.js';

/**
 * The reference 3D viewport: one renderer, one scene, the iso camera rig and
 * the character rig, kept in sync with the store. The pixel renderer (Phase 2)
 * reuses the same scene and renderer.
 */
export class SceneController {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly cameraRig = new IsoCameraRig();
  readonly rig = new CharacterRig();
  readonly grid: GridHelper;
  readonly forwardArrow: ArrowHelper;
  /** True once the current store state is fully applied to the rig. */
  ready = false;
  lastError: string | null = null;

  private readonly clock = new Clock();
  private raf = 0;
  private unsubscribe: (() => void) | null = null;
  private playing = true;
  private width = 1;
  private height = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NoToneMapping;
    this.renderer.setClearColor(new Color(0x1c1c22), 1);

    this.grid = new GridHelper(8, 8, 0x3a3a44, 0x2a2a32);
    this.grid.position.y = -0.001;
    this.forwardArrow = new ArrowHelper(
      new Vector3(0, 0, 1),
      new Vector3(0, 0.05, 0),
      1.2,
      0xff3366,
      0.3,
      0.2,
    );
    this.forwardArrow.visible = false;
    this.rig.root.add(this.forwardArrow);

    this.scene.add(this.cameraRig.group, this.grid, this.rig.root);
  }

  bind(store: StoreApi<AppState>): void {
    this.unsubscribe?.();
    const apply = (s: AppState) => {
      this.ready = false;
      this.rig.setDirection(s.preview.direction);
      this.playing = s.preview.playing;
      const anim = s.catalog.animations.find((a) => a.id === s.preview.animationId);
      this.rig
        .applyConfig(s.config, s.catalog, s.preview.recolorMethod)
        .then(() => {
          if (anim) this.rig.setAnimation(anim);
          this.lastError = null;
          this.ready = true;
        })
        .catch((err: unknown) => {
          this.lastError = err instanceof Error ? err.message : String(err);
          console.error('[scene] apply failed', err);
          this.ready = true;
        });
    };
    apply(store.getState());
    this.unsubscribe = store.subscribe((s, prev) => {
      if (s.config !== prev.config || s.preview.recolorMethod !== prev.preview.recolorMethod) {
        apply(s);
        return;
      }
      if (s.preview.direction !== prev.preview.direction)
        this.rig.setDirection(s.preview.direction);
      if (s.preview.playing !== prev.preview.playing) this.playing = s.preview.playing;
      if (s.preview.animationId !== prev.preview.animationId) {
        const anim = s.catalog.animations.find((a) => a.id === s.preview.animationId);
        if (anim) this.rig.setAnimation(anim);
      }
    });
  }

  setDirection(direction: Direction): void {
    this.rig.setDirection(direction);
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.renderer.setSize(this.width, this.height, false);
    this.cameraRig.fitViewer(this.width, this.height);
  }

  renderOnce(): void {
    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  start(): void {
    if (this.raf) return;
    this.clock.start();
    const tick = () => {
      this.raf = requestAnimationFrame(tick);
      const dt = this.clock.getDelta();
      if (this.playing) this.rig.update(dt);
      this.renderOnce();
    };
    tick();
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  dispose(): void {
    this.stop();
    this.unsubscribe?.();
    this.renderer.dispose();
  }
}
