import { describe, expect, it } from 'vitest';
import { cleanupClusters } from './clusters.js';
import { asciiFromImage, imageFromAscii } from './fixtures.test-util.js';

const legend = {
  A: [120, 120, 130] as [number, number, number], // armour mid
  B: [140, 140, 150] as [number, number, number], // armour highlight (close in L)
  E: [20, 20, 30] as [number, number, number], // eye (very dark)
  S: [240, 200, 170] as [number, number, number], // skin
  D: [10, 10, 10] as [number, number, number], // outline
};

describe('cleanupClusters', () => {
  it('merges a 2-pixel low-contrast speck into the surrounding colour', () => {
    const img = imageFromAscii(['AAAA', 'ABBA', 'AAAA'], legend);
    expect(cleanupClusters(img, { minSize: 3, contrastKeep: 0.3 })).toBe(2);
    expect(asciiFromImage(img, legend)).toEqual(['AAAA', 'AAAA', 'AAAA']);
  });

  it('keeps clusters at or above minSize', () => {
    const img = imageFromAscii(['AAAAA', 'ABBBA', 'AAAAA'], legend);
    expect(cleanupClusters(img, { minSize: 3, contrastKeep: 0.3 })).toBe(0);
  });

  it('keeps a 2-pixel eye because of its contrast with the skin', () => {
    const img = imageFromAscii(['SSSS', 'SEES', 'SSSS'], legend);
    expect(cleanupClusters(img, { minSize: 3, contrastKeep: 0.3 })).toBe(0);
    expect(asciiFromImage(img, legend)[1]).toBe('SEES');
  });

  it('never touches protected (outline) pixels and does not merge into them', () => {
    const img = imageFromAscii(['DDDD', 'DBAD', 'DDDD'], legend);
    const protect = new Uint8Array(12);
    [0, 1, 2, 3, 4, 7, 8, 9, 10, 11].forEach((i) => (protect[i] = 1));
    cleanupClusters(img, { minSize: 3, contrastKeep: 0.3, protect });
    const rows = asciiFromImage(img, legend);
    expect(rows[0]).toBe('DDDD');
    // B (1px) merges into A (its only unprotected neighbour); A then has no unprotected neighbour -> stays
    expect(rows[1]).toBe('DAAD');
  });

  it('erases isolated specks and is deterministic', () => {
    const a = imageFromAscii(['A....', '.....', '...B.'], legend);
    const b = imageFromAscii(['A....', '.....', '...B.'], legend);
    cleanupClusters(a, { minSize: 3, contrastKeep: 0.3 });
    cleanupClusters(b, { minSize: 3, contrastKeep: 0.3 });
    expect(asciiFromImage(a, legend)).toEqual(['.....', '.....', '.....']);
    expect(Array.from(a.data)).toEqual(Array.from(b.data));
  });
});
