import { createImage, type PassFrame, type RGBAImage } from '@pixiso/pixel-core';
import {
  Color,
  NearestFilter,
  NoColorSpace,
  OrthographicCamera,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  WebGLRenderTarget,
  type ColorSpace,
  type Scene,
  type WebGLRenderer,
} from 'three';
import type { PixelFrustum } from '../scene/IsoCameraRig.js';
import { setPixisoPass } from '../scene/toon.js';

/** Scene layer for helpers (grid, arrows) that the pixel pass must not see. */
export const HELPER_LAYER = 1;

/** Depth range of the pixel camera around the character, metres (near = distance − half, far = distance + half). */
export const PIXEL_DEPTH_HALF_RANGE_M = 5;

/**
 * Renders the scene into small render targets with the pixel frustum and reads
 * the bytes back (HANDOFF §6.3). Colour passes use an sRGB8_ALPHA8 target so the
 * GPU encodes linear → sRGB at full precision (D-017); data passes (light band,
 * depth) use a linear target so bytes are the raw values.
 */
export class PixelRenderer {
  readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  private colorTarget: WebGLRenderTarget | null = null;
  private dataTarget: WebGLRenderTarget | null = null;
  private readonly clear = new Color(0x000000);

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
    viewerCamera: OrthographicCamera,
  ) {
    this.camera.position.copy(viewerCamera.position);
    this.camera.quaternion.copy(viewerCamera.quaternion);
    const distance = viewerCamera.position.length();
    this.camera.near = distance - PIXEL_DEPTH_HALF_RANGE_M;
    this.camera.far = distance + PIXEL_DEPTH_HALF_RANGE_M;
    this.camera.layers.set(0);
  }

  /** Depth range in metres covered by the depth pass (0..1). */
  get depthRangeM(): number {
    return this.camera.far - this.camera.near;
  }

  private ensureTarget(kind: 'color' | 'data', w: number, h: number): WebGLRenderTarget {
    const current = kind === 'color' ? this.colorTarget : this.dataTarget;
    if (current && current.width === w && current.height === h) return current;
    current?.dispose();
    const colorSpace: ColorSpace = kind === 'color' ? SRGBColorSpace : NoColorSpace;
    const target = new WebGLRenderTarget(w, h, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: UnsignedByteType,
      colorSpace,
      depthBuffer: true,
      stencilBuffer: false,
      samples: 0,
      generateMipmaps: false,
    });
    if (kind === 'color') this.colorTarget = target;
    else this.dataTarget = target;
    return target;
  }

  /** Sets the frustum so the world origin lands on the centre of pixel (pivotX, pivotY) (D-016). */
  setFrustum(f: PixelFrustum): void {
    const c = this.camera;
    c.left = -(f.pivotX + 0.5) / f.ppm;
    c.right = (f.widthPx - f.pivotX - 0.5) / f.ppm;
    c.top = (f.pivotY + 0.5) / f.ppm;
    c.bottom = -(f.heightPx - f.pivotY - 0.5) / f.ppm;
    c.updateProjectionMatrix();
  }

  private renderInto(f: PixelFrustum, kind: 'color' | 'data'): RGBAImage {
    const r = this.renderer;
    const target = this.ensureTarget(kind, f.widthPx, f.heightPx);
    this.setFrustum(f);

    const prevTarget = r.getRenderTarget();
    const prevColor = new Color();
    r.getClearColor(prevColor);
    const prevAlpha = r.getClearAlpha();

    r.setRenderTarget(target);
    r.setClearColor(this.clear, 0);
    r.clear(true, true, false);
    r.render(this.scene, this.camera);

    const flipped = new Uint8Array(f.widthPx * f.heightPx * 4);
    r.readRenderTargetPixels(target, 0, 0, f.widthPx, f.heightPx, flipped);

    r.setRenderTarget(prevTarget);
    r.setClearColor(prevColor, prevAlpha);

    // GL rows are bottom-up; images are top-down.
    const img = createImage(f.widthPx, f.heightPx);
    const row = f.widthPx * 4;
    for (let y = 0; y < f.heightPx; y++) {
      img.data.set(flipped.subarray((f.heightPx - 1 - y) * row, (f.heightPx - y) * row), y * row);
    }
    return img;
  }

  /** Renders the shaded scene (pass 0) and returns top-to-bottom sRGB bytes. */
  render(f: PixelFrustum): RGBAImage {
    return this.renderInto(f, 'color');
  }

  /**
   * The data passes of the pixel-look pipeline at `k`× supersampling,
   * pixel-centre aligned with the 1× frustum (block (x, y) covers 1× pixel (x, y)).
   */
  renderPasses(f: PixelFrustum, k: number): PassFrame {
    const fk: PixelFrustum = {
      widthPx: f.widthPx * k,
      heightPx: f.heightPx * k,
      ppm: f.ppm * k,
      pivotX: k * f.pivotX + (k - 1) / 2,
      pivotY: k * f.pivotY + (k - 1) / 2,
    };
    try {
      setPixisoPass(1);
      const albedo = this.renderInto(fk, 'color');
      setPixisoPass(2);
      const light = this.renderInto(fk, 'data');
      setPixisoPass(3);
      const depth = this.renderInto(fk, 'data');
      return { albedo, light, depth };
    } finally {
      setPixisoPass(0);
    }
  }

  dispose(): void {
    this.colorTarget?.dispose();
    this.dataTarget?.dispose();
    this.colorTarget = null;
    this.dataTarget = null;
  }
}
