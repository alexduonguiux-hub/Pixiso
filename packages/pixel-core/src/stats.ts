import type { RGBAImage } from './types.js';

export const rgbKey = (r: number, g: number, b: number): number => (r << 16) | (g << 8) | b;

/** Histogram of fully opaque pixel colours across images, keyed by 24-bit rgb. */
export function colorHistogram(images: RGBAImage[]): Map<number, number> {
  const hist = new Map<number, number>();
  for (const img of images) {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] !== 255) continue;
      const k = rgbKey(d[i]!, d[i + 1]!, d[i + 2]!);
      hist.set(k, (hist.get(k) ?? 0) + 1);
    }
  }
  return hist;
}

export function countColors(img: RGBAImage): number {
  return colorHistogram([img]).size;
}

export function countSemiTransparent(img: RGBAImage): number {
  let n = 0;
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) if (d[i] !== 0 && d[i] !== 255) n++;
  return n;
}

export function imagesEqual(a: RGBAImage, b: RGBAImage): boolean {
  if (a.width !== b.width || a.height !== b.height || a.data.length !== b.data.length) return false;
  for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) return false;
  return true;
}

/** FNV-1a over the bytes, as a hex string; handy for determinism tests. */
export function imageHash(img: RGBAImage): string {
  let h = 0x811c9dc5;
  const d = img.data;
  for (let i = 0; i < d.length; i++) {
    h ^= d[i]!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${img.width}x${img.height}:${h.toString(16).padStart(8, '0')}`;
}
