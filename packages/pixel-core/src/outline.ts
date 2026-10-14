import { createPaletteMapper, darkestIndex } from './palette.js';
import { oklabToSrgb8, srgb8ToOklab, type Rgb8 } from './oklab.js';
import type { RGBAImage } from './types.js';

export type OutlineMode = 'none' | 'dark' | 'selective';

export interface OutlineResult {
  image: RGBAImage;
  /** 1 where a pixel was added as outline (same size as the image). */
  mask: Uint8Array;
}

const N4 = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const;

/**
 * 1-pixel outside outline (HANDOFF §6.5.3): every transparent pixel with an opaque
 * 4-neighbour becomes outline. `dark` uses the darkest palette colour; `selective`
 * darkens the darkest opaque neighbour in OKLab and snaps it to a palette colour
 * that is darker than that neighbour. Mutates and returns `img`.
 */
export function addOutline(img: RGBAImage, mode: OutlineMode, palette: Rgb8[]): OutlineResult {
  const { width, height, data } = img;
  const mask = new Uint8Array(width * height);
  if (mode === 'none' || palette.length === 0) return { image: img, mask };

  const labs = palette.map((c) => srgb8ToOklab(...c));
  const nearest = createPaletteMapper(palette);
  const dark = palette[darkestIndex(palette)]!;
  const source = new Uint8ClampedArray(data); // read from the untouched frame

  const alphaAt = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : source[(y * width + x) * 4 + 3]!;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (source[i + 3] === 255) continue;
      let darkestNeighbour: Rgb8 | null = null;
      let darkestL = Infinity;
      for (const [dx, dy] of N4) {
        if (alphaAt(x + dx, y + dy) !== 255) continue;
        const j = ((y + dy) * width + (x + dx)) * 4;
        const rgb: Rgb8 = [source[j]!, source[j + 1]!, source[j + 2]!];
        const L = srgb8ToOklab(...rgb)[0];
        if (L < darkestL) {
          darkestL = L;
          darkestNeighbour = rgb;
        }
      }
      if (!darkestNeighbour) continue;

      let color = dark;
      if (mode === 'selective') {
        const [L, a, b] = srgb8ToOklab(...darkestNeighbour);
        const target = oklabToSrgb8(L * 0.55, a * 0.8, b * 0.8);
        const candidate = nearest(...target);
        if (labs[candidate]![0] < L - 0.02) {
          color = palette[candidate]!;
        } else {
          // Nearest colour is not darker than the neighbour: pick the closest darker one.
          let best = -1;
          let bestD = Infinity;
          const t = srgb8ToOklab(...target);
          labs.forEach((p, k) => {
            if (p[0] >= L - 0.02) return;
            const d = (p[0] - t[0]) ** 2 + (p[1] - t[1]) ** 2 + (p[2] - t[2]) ** 2;
            if (d < bestD) {
              bestD = d;
              best = k;
            }
          });
          color = best >= 0 ? palette[best]! : dark;
        }
      }
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = 255;
      mask[y * width + x] = 1;
    }
  }
  return { image: img, mask };
}
