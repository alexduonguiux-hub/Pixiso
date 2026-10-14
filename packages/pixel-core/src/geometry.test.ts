import { describe, expect, it } from 'vitest';
import { asciiFromImage, imageFromAscii } from './fixtures.test-util.js';
import {
  cropImage,
  flipHorizontal,
  opaqueBounds,
  padRect,
  scaleNearest,
  unionRects,
} from './geometry.js';
import { processFrames } from './pipeline.js';
import { countColors, countSemiTransparent, imageHash, imagesEqual } from './stats.js';

const legend = {
  A: [255, 0, 0] as [number, number, number],
  B: [0, 0, 255] as [number, number, number],
};

describe('geometry', () => {
  it('finds opaque bounds and unions them', () => {
    const img = imageFromAscii(['.....', '..A..', '..AB.', '.....'], legend);
    expect(opaqueBounds(img)).toEqual({ x: 2, y: 1, w: 2, h: 2 });
    expect(
      unionRects([
        { x: 2, y: 1, w: 2, h: 2 },
        { x: 0, y: 3, w: 1, h: 1 },
      ]),
    ).toEqual({ x: 0, y: 1, w: 4, h: 3 });
    expect(opaqueBounds(imageFromAscii(['..'], legend))).toBeNull();
    expect(padRect({ x: 1, y: 1, w: 1, h: 1 }, 1, 2, 5)).toEqual({ x: 0, y: 0, w: 2, h: 3 });
  });

  it('crops, flips and scales with nearest neighbour', () => {
    const img = imageFromAscii(['AB.', '...'], legend);
    expect(asciiFromImage(cropImage(img, { x: 0, y: 0, w: 2, h: 1 }), legend)).toEqual(['AB']);
    expect(asciiFromImage(flipHorizontal(img), legend)).toEqual(['.BA', '...']);
    expect(asciiFromImage(scaleNearest(img, 2), legend)).toEqual([
      'AABB..',
      'AABB..',
      '......',
      '......',
    ]);
  });
});

describe('pipeline', () => {
  it('produces ≤ N colours, no semi-transparent pixels and is deterministic', () => {
    const raw = imageFromAscii(['.AAB.', 'ABABA', '.BAA.'], { ...legend, '.': [0, 0, 0, 90] });
    const a = processFrames([raw, raw], { mode: 'auto', colors: 2 }, 'dark');
    const b = processFrames([raw, raw], { mode: 'auto', colors: 2 }, 'dark');
    expect(a.palette.length).toBeLessThanOrEqual(2);
    for (const f of a.frames) {
      expect(countColors(f)).toBeLessThanOrEqual(2);
      expect(countSemiTransparent(f)).toBe(0);
    }
    expect(imagesEqual(a.frames[0]!, b.frames[0]!)).toBe(true);
    expect(imageHash(a.frames[1]!)).toBe(imageHash(b.frames[1]!));
  });
});
