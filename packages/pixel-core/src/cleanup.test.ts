import { describe, expect, it } from 'vitest';
import { cleanupOrphans } from './cleanup.js';
import { asciiFromImage, imageFromAscii } from './fixtures.test-util.js';
import { addOutline } from './outline.js';
import { paletteFromHex } from './palette.js';

const legend = {
  S: [240, 200, 170] as [number, number, number], // skin
  E: [20, 20, 40] as [number, number, number], // eye
  X: [255, 0, 255] as [number, number, number], // stray
  D: [20, 20, 20] as [number, number, number], // outline
};

describe('cleanupOrphans', () => {
  it('replaces a lone off-colour pixel with the surrounding majority', () => {
    const img = imageFromAscii(['SSS', 'SXS', 'SSS'], legend);
    expect(cleanupOrphans(img)).toBe(1);
    expect(asciiFromImage(img, legend)).toEqual(['SSS', 'SSS', 'SSS']);
  });

  it('keeps 2-pixel details such as eyes', () => {
    const img = imageFromAscii(['SSSSSS', 'SEESSS', 'SSSSSS', 'SSEESS', 'SSSSSS'], legend);
    expect(cleanupOrphans(img)).toBe(0);
    expect(asciiFromImage(img, legend)[1]).toBe('SEESSS');
  });

  it('keeps vertical 2-pixel details', () => {
    const img = imageFromAscii(['SSS', 'SES', 'SES', 'SSS'], legend);
    expect(cleanupOrphans(img)).toBe(0);
  });

  it('never touches outline pixels and removes isolated specks', () => {
    const img = imageFromAscii(['.....', '.SS..', '.SS..', '.....', '...X.'], legend);
    const { mask } = addOutline(img, 'dark', paletteFromHex(['#f0c8aa', '#141414', '#ff00ff']));
    // the speck got outlined too; cleanup must not eat the outline ring around the body
    const changed = cleanupOrphans(img, mask);
    const rows = asciiFromImage(img, legend);
    expect(rows[1]).toBe('DSSD.');
    expect(changed).toBeGreaterThanOrEqual(1);
    expect(rows[4]?.includes('X')).toBe(false);
  });

  it('is independent of scan order (single pass over a snapshot)', () => {
    // X E X: every pixel is an orphan. Scanning in place would turn the row into E E E
    // (the middle E would see the already-replaced left pixel); the snapshot gives E X E.
    const img = imageFromAscii(['XEX'], legend);
    expect(cleanupOrphans(img)).toBe(3);
    expect(asciiFromImage(img, legend)).toEqual(['EXE']);
  });
});
