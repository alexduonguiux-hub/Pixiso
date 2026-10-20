import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { asepriteJson, checkAseprite } from './aseprite.js';
import { lowestRowsCenterX } from './geometry.js';
import { encodeGif, gifFrameCount } from './gif.js';
import type { Rgb8 } from './oklab.js';
import { crc32, encodePng } from './png.js';
import { packSheet } from './sheet.js';
import { createImage, type RGBAImage } from './types.js';
import { unzipFiles, zipFiles } from './zip.js';

const RED: Rgb8 = [200, 30, 40];
const BLUE: Rgb8 = [20, 60, 200];

/** A w×h image with a filled rectangle of one colour. */
function box(
  w: number,
  h: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  c: Rgb8,
): RGBAImage {
  const img = createImage(w, h);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const o = (y * w + x) * 4;
      img.data.set([c[0], c[1], c[2], 255], o);
    }
  return img;
}

describe('png', () => {
  it('crc32 matches the reference value', () => {
    expect(crc32(Uint8Array.from('123456789', (c) => c.charCodeAt(0)))).toBe(0xcbf43926);
  });

  it('round-trips through a real decoder and is deterministic', () => {
    const img = box(7, 5, 1, 1, 4, 3, RED);
    img.data.set([1, 2, 3, 0], 0); // a transparent pixel with colour data survives too
    const a = encodePng(img);
    const b = encodePng(img);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    const decoded = PNG.sync.read(Buffer.from(a), { checkCRC: true } as never);
    expect(decoded.width).toBe(7);
    expect(decoded.height).toBe(5);
    expect(Buffer.from(decoded.data).equals(Buffer.from(img.data))).toBe(true);
  });
});

describe('sheet + aseprite json', () => {
  const rows = [
    [box(8, 10, 0, 0, 3, 9, RED), box(8, 10, 4, 0, 7, 9, RED)],
    [box(8, 10, 2, 2, 5, 9, BLUE)],
  ];
  const sheet = packSheet(rows);

  it('packs equal cells on a grid, ragged rows allowed', () => {
    expect(sheet.cell).toEqual({ w: 8, h: 10 });
    expect(sheet.image.width).toBe(16);
    expect(sheet.image.height).toBe(20);
    expect(sheet.cells.map((c) => [c.row, c.col, c.x, c.y])).toEqual([
      [0, 0, 0, 0],
      [0, 1, 8, 0],
      [1, 0, 0, 10],
    ]);
    // pixel (12, 3) is the second frame's red; (10, 13) the blue of the second row
    expect([...sheet.image.data.subarray((3 * 16 + 12) * 4, (3 * 16 + 12) * 4 + 4)]).toEqual([
      ...RED,
      255,
    ]);
    expect([...sheet.image.data.subarray((13 * 16 + 4) * 4, (13 * 16 + 4) * 4 + 4)]).toEqual([
      ...BLUE,
      255,
    ]);
    expect(() => packSheet([[box(8, 10, 0, 0, 1, 1, RED), box(9, 10, 0, 0, 1, 1, RED)]])).toThrow(
      /cell/,
    );
  });

  it('writes frames, contiguous tags and one pivot slice that pass the checks', () => {
    const json = asepriteJson({
      sheet,
      image: 'x_walk.png',
      version: '0.1.0',
      rowTags: ['walk_S', 'walk_W'],
      frameName: (r, c) => `x_walk_${['S', 'W'][r]}_${c}`,
      duration: () => 140,
      pivot: { x: 4, y: 9 },
      pixiso: { directions: ['S', 'W'], pixelsPerMeter: 21.1, palette: ['#c81e28'] },
    });
    expect(json.frames.map((f) => f.filename)).toEqual(['x_walk_S_0', 'x_walk_S_1', 'x_walk_W_0']);
    expect(json.meta.frameTags).toEqual([
      { name: 'walk_S', from: 0, to: 1, direction: 'forward' },
      { name: 'walk_W', from: 2, to: 2, direction: 'forward' },
    ]);
    expect(json.meta.size).toEqual({ w: 16, h: 20 });
    expect(json.meta.pixiso.cell).toEqual({ w: 8, h: 10 });
    expect(checkAseprite(json)).toEqual([]);
    // broken variants are caught
    const outside = structuredClone(json);
    outside.frames[2]!.frame.y = 15;
    expect(checkAseprite(outside)).toContain('frame 2 (x_walk_W_0) is outside the image');
    const gap = structuredClone(json);
    gap.meta.frameTags[1]!.from = 1;
    expect(checkAseprite(gap).length).toBeGreaterThan(0);
    const moved = structuredClone(json);
    moved.meta.slices[0]!.keys.push({
      frame: 1,
      bounds: { x: 0, y: 0, w: 8, h: 10 },
      pivot: { x: 5, y: 9 },
    });
    expect(checkAseprite(moved)).toContain('pivot moves at frame 1');
  });
});

describe('gif', () => {
  it('encodes looping frames on the exact palette with transparency', () => {
    const frames = [
      { image: box(6, 6, 0, 0, 2, 5, RED), delayMs: 140 },
      { image: box(6, 6, 3, 0, 5, 5, BLUE), delayMs: 140 },
      { image: box(6, 6, 1, 1, 4, 4, RED), delayMs: 500 },
    ];
    const a = encodeGif(frames, [RED, BLUE]);
    expect(String.fromCharCode(...a.subarray(0, 6))).toBe('GIF89a');
    expect(a[a.length - 1]).toBe(0x3b);
    expect(gifFrameCount(a)).toBe(3);
    expect(Buffer.from(encodeGif(frames, [RED, BLUE])).equals(Buffer.from(a))).toBe(true);
    expect(() => encodeGif(frames, [RED])).toThrow(/not in the palette/);
  });
});

describe('zip', () => {
  it('round-trips entries and gives the same bytes twice', () => {
    const entries = [
      { name: 'a.json', data: Uint8Array.from('{"a":1}', (c) => c.charCodeAt(0)) },
      { name: 'b.png', data: encodePng(box(4, 4, 0, 0, 3, 3, RED)) },
    ];
    const z1 = zipFiles(entries);
    const z2 = zipFiles(entries);
    expect(Buffer.from(z1).equals(Buffer.from(z2))).toBe(true);
    const back = unzipFiles(z1);
    expect(back.map((e) => e.name).sort()).toEqual(['a.json', 'b.png']);
    for (const e of entries)
      expect(
        Buffer.from(back.find((b) => b.name === e.name)!.data).equals(Buffer.from(e.data)),
      ).toBe(true);
  });
});

describe('lowestRowsCenterX', () => {
  it('finds the centre of the feet rows', () => {
    const img = box(10, 6, 2, 1, 7, 5, RED);
    expect(lowestRowsCenterX(img)).toBe(4.5);
    expect(lowestRowsCenterX(createImage(3, 3))).toBeNull();
    // only the lowest two rows count: a wider row above does not move the centre
    const feet = box(10, 6, 0, 0, 9, 3, RED);
    for (let y = 4; y <= 5; y++)
      for (let x = 6; x <= 7; x++) feet.data.set([...RED, 255], (y * 10 + x) * 4);
    expect(lowestRowsCenterX(feet)).toBe(6.5);
  });
});
