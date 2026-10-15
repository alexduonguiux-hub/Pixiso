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
 * Removes opaque islands (8-connected) smaller than `minPixels`. A sprite is one
 * connected silhouette; a 3-pixel crumb floating next to it is a thin fin or a
 * sliver that fell under the coverage threshold, not a detail worth keeping
 * (PIXEL_RULES §1). Returns the number of pixels erased. Deterministic.
 */
export function removeIslands(img: RGBAImage, minPixels: number): number {
  if (minPixels <= 1) return 0;
  const { width, height, data } = img;
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];
  let removed = 0;
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || data[start * 4 + 3] !== 255) continue;
    const members: number[] = [];
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop()!;
      members.push(p);
      const x = p % width;
      const y = (p - x) / width;
      for (const [dx, dy] of N8) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const q = ny * width + nx;
        if (seen[q] || data[q * 4 + 3] !== 255) continue;
        seen[q] = 1;
        stack.push(q);
      }
    }
    if (members.length >= minPixels) continue;
    for (const p of members) data[p * 4] = data[p * 4 + 1] = data[p * 4 + 2] = data[p * 4 + 3] = 0;
    removed += members.length;
  }
  return removed;
}
