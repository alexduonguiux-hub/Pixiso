import type { RGBAImage } from './types.js';

/**
 * Hard alpha threshold: a >= 128 becomes fully opaque, everything else fully
 * transparent (RGB zeroed so transparent pixels compare equal byte-for-byte).
 * Mutates and returns `img`.
 */
export function alphaThreshold(img: RGBAImage, threshold = 128): RGBAImage {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! >= threshold) {
      d[i + 3] = 255;
    } else {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = 0;
    }
  }
  return img;
}
