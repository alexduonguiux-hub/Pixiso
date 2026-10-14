import { describe, expect, it } from 'vitest';
import {
  hexToRgb8,
  linearRgbToOklab,
  oklabToLinearRgb,
  oklabToOklch,
  oklabToSrgb8,
  oklchToOklab,
  rgb8ToHex,
  srgb8ToOklab,
} from './oklab.js';

describe('oklab', () => {
  it('maps white and black to the expected lightness', () => {
    const [L, a, b] = linearRgbToOklab(1, 1, 1);
    expect(L).toBeCloseTo(1, 3);
    expect(a).toBeCloseTo(0, 3);
    expect(b).toBeCloseTo(0, 3);
    expect(linearRgbToOklab(0, 0, 0)[0]).toBeCloseTo(0, 6);
  });

  it('round-trips 8-bit sRGB colours exactly', () => {
    const samples: [number, number, number][] = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [12, 200, 90],
      [128, 128, 128],
      [250, 240, 10],
      [1, 2, 3],
    ];
    for (const [r, g, b] of samples) {
      expect(oklabToSrgb8(...srgb8ToOklab(r, g, b))).toEqual([r, g, b]);
    }
  });

  it('round-trips through OKLCh', () => {
    const lab = srgb8ToOklab(200, 50, 120);
    const [L, C, h] = oklabToOklch(...lab);
    const back = oklchToOklab(L, C, h);
    expect(back[0]).toBeCloseTo(lab[0], 9);
    expect(back[1]).toBeCloseTo(lab[1], 9);
    expect(back[2]).toBeCloseTo(lab[2], 9);
  });

  it('inverse matrices agree', () => {
    const [r, g, b] = oklabToLinearRgb(...linearRgbToOklab(0.2, 0.5, 0.9));
    expect(r).toBeCloseTo(0.2, 6);
    expect(g).toBeCloseTo(0.5, 6);
    expect(b).toBeCloseTo(0.9, 6);
  });

  it('parses and formats hex', () => {
    expect(hexToRgb8('#d1343a')).toEqual([209, 52, 58]);
    expect(rgb8ToHex(209, 52, 58)).toBe('#d1343a');
    expect(() => hexToRgb8('red')).toThrow();
  });
});
