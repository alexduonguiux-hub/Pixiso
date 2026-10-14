import { describe, expect, it } from 'vitest';
import { imageFromAscii } from './fixtures.test-util.js';
import { buildPaletteMedianCut } from './palette.js';

describe('median cut representative', () => {
  it('mode keeps real material colours instead of box averages', () => {
    const legend = {
      G: [150, 150, 160] as [number, number, number], // grey armour, large
      S: [240, 200, 170] as [number, number, number], // skin, small
      R: [200, 40, 40] as [number, number, number], // red, medium
    };
    const img = imageFromAscii(['GGGGGGGG', 'GGGGGGGG', 'GGGRRRSS', 'GGGRRRGG'], legend);
    const mean = buildPaletteMedianCut([img], 2, 1, 'mean');
    const mode = buildPaletteMedianCut([img], 2, 1, 'mode');
    const has = (pal: [number, number, number][], c: [number, number, number]) =>
      pal.some((p) => p.join() === c.join());
    expect(has(mode, legend.G)).toBe(true);
    expect(mode.length).toBe(2);
    // the averaged palette blends grey with something else
    expect(has(mean, legend.G) && has(mean, legend.R)).toBe(false);
  });
});
