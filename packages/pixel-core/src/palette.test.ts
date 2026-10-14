import { describe, expect, it } from 'vitest';
import { imageFromAscii } from './fixtures.test-util.js';
import {
  buildPaletteMedianCut,
  createPaletteMapper,
  darkestIndex,
  mapToPalette,
  paletteFromHex,
} from './palette.js';
import { countColors } from './stats.js';
import { createImage } from './types.js';

const legend = {
  R: [200, 30, 30] as [number, number, number],
  G: [30, 160, 40] as [number, number, number],
  B: [40, 60, 220] as [number, number, number],
  K: [10, 10, 10] as [number, number, number],
};

describe('buildPaletteMedianCut', () => {
  it('returns the exact colours when there are fewer than requested', () => {
    const img = imageFromAscii(['RRGG', 'BBKK'], legend);
    const pal = buildPaletteMedianCut([img], 16);
    expect(pal.map((c) => c.join(','))).toEqual(
      expect.arrayContaining(['200,30,30', '30,160,40', '40,60,220', '10,10,10']),
    );
    expect(pal.length).toBe(4);
  });

  it('reduces to at most N colours and is deterministic across calls', () => {
    const img = createImage(32, 32);
    for (let i = 0; i < img.data.length; i += 4) {
      const p = i / 4;
      img.data[i] = (p * 7) % 256;
      img.data[i + 1] = (p * 13) % 256;
      img.data[i + 2] = (p * 29) % 256;
      img.data[i + 3] = 255;
    }
    const a = buildPaletteMedianCut([img], 8);
    const b = buildPaletteMedianCut([img], 8);
    expect(a.length).toBeLessThanOrEqual(8);
    expect(a.length).toBeGreaterThan(4);
    expect(a).toEqual(b);
    const mapped = mapToPalette(img, a);
    expect(countColors(mapped)).toBeLessThanOrEqual(8);
  });

  it('ignores transparent pixels', () => {
    const img = imageFromAscii(['R.', '.G'], { ...legend, '.': [0, 0, 0, 0] });
    expect(buildPaletteMedianCut([img], 4).length).toBe(2);
  });

  it('shares one palette across frames', () => {
    const f1 = imageFromAscii(['RR'], legend);
    const f2 = imageFromAscii(['BB'], legend);
    const pal = buildPaletteMedianCut([f1, f2], 2);
    expect(pal.length).toBe(2);
  });
});

describe('palette mapping', () => {
  it('snaps to the nearest OKLab colour', () => {
    const pal = paletteFromHex(['#ff0000', '#0000ff', '#000000']);
    const nearest = createPaletteMapper(pal);
    expect(pal[nearest(250, 10, 10)]).toEqual([255, 0, 0]);
    expect(pal[nearest(20, 20, 200)]).toEqual([0, 0, 255]);
    expect(pal[nearest(5, 5, 5)]).toEqual([0, 0, 0]);
  });

  it('finds the darkest colour', () => {
    expect(darkestIndex(paletteFromHex(['#ffffff', '#102030', '#808080']))).toBe(1);
  });

  it('dedupes fixed palettes', () => {
    expect(paletteFromHex(['#ffffff', '#FFFFFF', '#000000']).length).toBe(2);
  });
});
