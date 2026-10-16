import { createImage, type RGBAImage } from '@pixiso/pixel-core';

/** Ground tile under the character, 2:1 diamond in native pixels (Phase 4 draws the full grid). */
export const TILE_W = 32;
export const TILE_H = 16;
const GROUND: [number, number, number] = [43, 53, 66];

function toCanvas(img: RGBAImage): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.putImageData(
    new ImageData(new Uint8ClampedArray(img.data), img.width, img.height),
    0,
    0,
  );
  return c;
}

function setPixel(img: RGBAImage, x: number, y: number, rgb: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const o = (y * img.width + x) * 4;
  img.data[o] = rgb[0];
  img.data[o + 1] = rgb[1];
  img.data[o + 2] = rgb[2];
  img.data[o + 3] = 255;
}

/**
 * A pixel-art 2:1 diamond (rows widen by 4 px per step) whose middle row is
 * `cy`. Drawn on the pixel grid, never anti-aliased, so the stage is made only
 * of fully opaque or fully transparent pixels and reads back deterministically.
 */
function fillDiamond(img: RGBAImage, cx: number, cy: number, scale: number): void {
  const h = TILE_H * scale;
  for (let r = 0; r < h; r++) {
    const k = r < h / 2 ? r : h - 1 - r;
    const half = 2 * (k + 1);
    const y = cy - h / 2 + r;
    for (let x = cx - half; x < cx + half; x++) setPixel(img, x, y, GROUND);
  }
}

function blitOpaque(dst: RGBAImage, src: RGBAImage, x0: number, y0: number): void {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (y * src.width + x) * 4;
      if (src.data[si + 3] !== 255) continue;
      setPixel(dst, x0 + x, y0 + y, [src.data[si]!, src.data[si + 1]!, src.data[si + 2]!]);
    }
  }
}

export interface StageOptions {
  zoom: number;
  /** Pivot inside the frame (native pixels of the frame). */
  pivot: { x: number; y: number };
  /** Native pixels of margin around the frame. */
  margin?: number;
  ground?: boolean;
}

/** Composes the stage (ground diamond + frame) at native scale, then nearest-scales it once. */
export function composeStage(frame: RGBAImage, o: StageOptions): RGBAImage {
  const margin = o.margin ?? 8;
  const stage = createImage(frame.width + margin * 2, frame.height + margin * 2);
  if (o.ground !== false) {
    const scale = Math.max(1, Math.round(frame.height / 32));
    fillDiamond(stage, margin + o.pivot.x, margin + o.pivot.y + 1, scale);
  }
  blitOpaque(stage, frame, margin, margin);
  return stage;
}

/** Draws one frame nearest-scaled with an iso ground diamond under its pivot. */
export function drawStage(canvas: HTMLCanvasElement, frame: RGBAImage, o: StageOptions): void {
  drawFrame(canvas, composeStage(frame, o), o.zoom);
}

/** Draws an image alone, nearest-scaled by an integer factor. */
export function drawFrame(canvas: HTMLCanvasElement, img: RGBAImage, zoom: number): void {
  canvas.width = img.width * zoom;
  canvas.height = img.height * zoom;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(toCanvas(img), 0, 0, canvas.width, canvas.height);
}
