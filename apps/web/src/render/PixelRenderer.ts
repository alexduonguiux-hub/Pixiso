import { createImage, type RGBAImage } from '@pixiso/pixel-core';
import {
  Color,
  NearestFilter,
  OrthographicCamera,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  WebGLRenderTarget,
  type Scene,
  type WebGLRenderer,
} from 'three';
import type { PixelFrustum } from '../scene/IsoCameraRig.js';

/** Scene layer for helpers (grid, arrows) that the pixel pass must not see. */
export const HELPER_LAYER = 1;

/**
 * Renders the scene into a small render target with the pixel frustum and reads
 * the bytes back (HANDOFF §6.3). The target stores sRGB8_ALPHA8, so the GPU
 * encodes linear → sRGB at full precision before quantisation (D-017); the
 * pixel-core pipeline receives ordinary 8-bit sRGB.
 */
export class PixelRenderer {
  readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  private target: WebGLRenderTarget | null = null;
  private readonly clear = new Color(0x000000);

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
    viewerCamera: OrthographicCamera,
  ) {
    this.camera.position.copy(viewerCamera.position);
    this.camera.quaternion.copy(viewerCamera.quaternion);
    this.camera.near = viewerCamera.near;
    this.camera.far = viewerCamera.far;
    this.camera.layers.set(0);
  }

  private ensureTarget(w: number, h: number): WebGLRenderTarget {
    if (this.target && this.target.width === w && this.target.height === h) return this.target;
    this.target?.dispose();
    this.target = new WebGLRenderTarget(w, h, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: UnsignedByteType,
      colorSpace: SRGBColorSpace,
      depthBuffer: true,
      stencilBuffer: false,
      samples: 0,
      generateMipmaps: false,
    });
    return this.target;
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

  /** Renders the current scene state and returns top-to-bottom RGBA bytes. */
  render(f: PixelFrustum): RGBAImage {
    const r = this.renderer;
    const target = this.ensureTarget(f.widthPx, f.heightPx);
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

  dispose(): void {
    this.target?.dispose();
    this.target = null;
  }
}
