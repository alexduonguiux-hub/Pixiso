import { describe, expect, it } from 'vitest';
import { asciiFromImage, imageFromAscii } from './fixtures.test-util.js';
import { removeIslands } from './islands.js';

const legend = { A: [100, 100, 100] as [number, number, number] };

describe('removeIslands', () => {
  it('erases crumbs that are not connected to the sprite', () => {
    const img = imageFromAscii(['AA....A', 'AAAA...', '.AAA..A', '......A'], legend);
    expect(removeIslands(img, 6)).toBe(3);
    expect(asciiFromImage(img, legend)).toEqual(['AA.....', 'AAAA...', '.AAA...', '.......']);
  });

  it('keeps diagonal connections and islands at or above the minimum', () => {
    const img = imageFromAscii(['A....', '.A...', '..A..', '....A'], legend);
    expect(removeIslands(img, 3)).toBe(1); // the diagonal chain of 3 stays, the lone pixel goes
    expect(asciiFromImage(img, legend)[3]).toBe('.....');
  });

  it('is a no-op when disabled', () => {
    const img = imageFromAscii(['A.A'], legend);
    expect(removeIslands(img, 1)).toBe(0);
  });
});
