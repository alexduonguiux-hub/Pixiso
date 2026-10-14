import { describe, expect, it } from 'vitest';
import { asciiFromImage, imageFromAscii } from './fixtures.test-util.js';
import { addOutline } from './outline.js';
import { paletteFromHex } from './palette.js';

const legend = {
  W: [230, 230, 230] as [number, number, number],
  M: [120, 120, 120] as [number, number, number],
  D: [20, 20, 20] as [number, number, number],
  R: [200, 40, 40] as [number, number, number],
  r: [90, 10, 10] as [number, number, number],
};

describe('addOutline', () => {
  it('dark mode wraps the shape in the darkest palette colour (4-neighbourhood only)', () => {
    const img = imageFromAscii(['.....', '.WW..', '.WW..', '.....'], legend);
    const palette = paletteFromHex(['#e6e6e6', '#787878', '#141414']);
    const { image, mask } = addOutline(img, 'dark', palette);
    expect(asciiFromImage(image, legend)).toEqual(['.DD..', 'DWWD.', 'DWWD.', '.DD..']);
    expect(Array.from(mask).reduce((a, b) => a + b, 0)).toBe(8);
  });

  it('selective mode darkens the neighbour colour and snaps to a darker palette entry', () => {
    const img = imageFromAscii(['....', '.RR.', '.WW.', '....'], legend);
    const palette = paletteFromHex(['#e6e6e6', '#787878', '#141414', '#c82828', '#5a0a0a']);
    const { image } = addOutline(img, 'selective', palette);
    const rows = asciiFromImage(image, legend);
    expect(rows[0]).toBe('.rr.'); // next to red -> dark red
    expect(rows[3]).toBe('.MM.'); // next to white -> grey (darker than white)
  });

  it('none mode leaves the image untouched', () => {
    const img = imageFromAscii(['.W.', '...'], legend);
    const before = Array.from(img.data);
    addOutline(img, 'none', paletteFromHex(['#000000']));
    expect(Array.from(img.data)).toEqual(before);
  });
});
