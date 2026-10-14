import { describe, expect, it } from 'vitest';
import { alphaThreshold } from './alpha.js';
import { createImage } from './types.js';

describe('alphaThreshold', () => {
  it('binarizes alpha and zeroes transparent RGB', () => {
    const img = createImage(2, 1);
    img.data.set([200, 100, 50, 127, 10, 20, 30, 128]);
    alphaThreshold(img);
    expect(Array.from(img.data)).toEqual([0, 0, 0, 0, 10, 20, 30, 255]);
  });

  it('leaves no semi-transparent pixel', () => {
    const img = createImage(4, 4);
    for (let i = 0; i < img.data.length; i++) img.data[i] = (i * 37) % 256;
    alphaThreshold(img);
    for (let i = 3; i < img.data.length; i += 4) expect([0, 255]).toContain(img.data[i]);
  });
});
