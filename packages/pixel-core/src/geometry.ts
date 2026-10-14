import { createImage, type RGBAImage } from './types.js';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bounding box of fully opaque pixels, or null for an empty image. */
export function opaqueBounds(img: RGBAImage, alphaMin = 255): Rect | null {
  const { width, height, data } = img;
  let x0 = width,
    y0 = height,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! >= alphaMin) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export function unionRects(rects: (Rect | null)[]): Rect | null {
  let out: Rect | null = null;
  for (const r of rects) {
    if (!r) continue;
    if (!out) {
      out = { ...r };
      continue;
    }
    const x0 = Math.min(out.x, r.x);
    const y0 = Math.min(out.y, r.y);
    const x1 = Math.max(out.x + out.w, r.x + r.w);
    const y1 = Math.max(out.y + out.h, r.y + r.h);
    out = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  return out;
}

/** Grows a rect by `px` on every side, clamped to `[0,width)×[0,height)`. */
export function padRect(r: Rect, px: number, width: number, height: number): Rect {
  const x0 = Math.max(0, r.x - px);
  const y0 = Math.max(0, r.y - px);
  const x1 = Math.min(width, r.x + r.w + px);
  const y1 = Math.min(height, r.y + r.h + px);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Copies a rect out of an image; areas outside the source are transparent. */
export function cropImage(img: RGBAImage, r: Rect): RGBAImage {
  const out = createImage(r.w, r.h);
  for (let y = 0; y < r.h; y++) {
    const sy = r.y + y;
    if (sy < 0 || sy >= img.height) continue;
    for (let x = 0; x < r.w; x++) {
      const sx = r.x + x;
      if (sx < 0 || sx >= img.width) continue;
      const si = (sy * img.width + sx) * 4;
      const di = (y * r.w + x) * 4;
      out.data[di] = img.data[si]!;
      out.data[di + 1] = img.data[si + 1]!;
      out.data[di + 2] = img.data[si + 2]!;
      out.data[di + 3] = img.data[si + 3]!;
    }
  }
  return out;
}

export function flipHorizontal(img: RGBAImage): RGBAImage {
  const out = createImage(img.width, img.height);
  const { width, height } = img;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = (y * width + (width - 1 - x)) * 4;
      out.data[di] = img.data[si]!;
      out.data[di + 1] = img.data[si + 1]!;
      out.data[di + 2] = img.data[si + 2]!;
      out.data[di + 3] = img.data[si + 3]!;
    }
  }
  return out;
}

/** Nearest-neighbour upscale by an integer factor (for review images and previews). */
export function scaleNearest(img: RGBAImage, factor: number): RGBAImage {
  const f = Math.max(1, Math.floor(factor));
  const out = createImage(img.width * f, img.height * f);
  for (let y = 0; y < out.height; y++) {
    const sy = Math.floor(y / f);
    for (let x = 0; x < out.width; x++) {
      const si = (sy * img.width + Math.floor(x / f)) * 4;
      const di = (y * out.width + x) * 4;
      out.data[di] = img.data[si]!;
      out.data[di + 1] = img.data[si + 1]!;
      out.data[di + 2] = img.data[si + 2]!;
      out.data[di + 3] = img.data[si + 3]!;
    }
  }
  return out;
}

/** Blits `src` into `dst` at (x, y), overwriting (no blending). */
export function blit(dst: RGBAImage, src: RGBAImage, x: number, y: number): void {
  for (let sy = 0; sy < src.height; sy++) {
    const dy = y + sy;
    if (dy < 0 || dy >= dst.height) continue;
    for (let sx = 0; sx < src.width; sx++) {
      const dx = x + sx;
      if (dx < 0 || dx >= dst.width) continue;
      const si = (sy * src.width + sx) * 4;
      const di = (dy * dst.width + dx) * 4;
      dst.data[di] = src.data[si]!;
      dst.data[di + 1] = src.data[si + 1]!;
      dst.data[di + 2] = src.data[si + 2]!;
      dst.data[di + 3] = src.data[si + 3]!;
    }
  }
}
