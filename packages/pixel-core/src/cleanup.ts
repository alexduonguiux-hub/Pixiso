import { rgbKey } from './stats.js';
import type { RGBAImage } from './types.js';

const N8 = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

/**
 * Orphan removal (HANDOFF §6.5.4): an opaque pixel whose colour differs from all
 * 8 neighbours, and which is not an outline pixel, takes the majority colour of
 * its opaque neighbours (ties: lowest colour key). A pixel with no opaque
 * neighbour at all is a stray speck and becomes transparent. Two adjacent pixels
 * of one colour (e.g. an eye) are never touched because each has a same-coloured
 * neighbour. Single pass over a snapshot, so results do not depend on scan order.
 * Mutates `img`; returns the number of pixels changed.
 */
export function cleanupOrphans(img: RGBAImage, protect?: Uint8Array): number {
  const { width, height, data } = img;
  const src = new Uint8ClampedArray(data);
  let changed = 0;
  const counts = new Map<number, number>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const i = p * 4;
      if (src[i + 3] !== 255 || protect?.[p]) continue;
      const me = rgbKey(src[i]!, src[i + 1]!, src[i + 2]!);
      counts.clear();
      let same = false;
      for (const [dx, dy] of N8) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = (ny * width + nx) * 4;
        if (src[j + 3] !== 255) continue;
        const k = rgbKey(src[j]!, src[j + 1]!, src[j + 2]!);
        if (k === me) {
          same = true;
          break;
        }
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      if (same) continue;
      if (counts.size === 0) {
        data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
        changed++;
        continue;
      }
      let bestKey = -1;
      let bestN = 0;
      for (const [k, n] of counts) {
        if (n > bestN || (n === bestN && k < bestKey)) {
          bestN = n;
          bestKey = k;
        }
      }
      data[i] = (bestKey >> 16) & 255;
      data[i + 1] = (bestKey >> 8) & 255;
      data[i + 2] = bestKey & 255;
      changed++;
    }
  }
  return changed;
}
