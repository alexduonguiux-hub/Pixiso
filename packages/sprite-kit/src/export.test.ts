import {
  checkAseprite,
  gifFrameCount,
  lowestRowsCenterX,
  opaqueBounds,
  unzipFiles,
} from '@pixiso/pixel-core';
import {
  COLOR_NAMES,
  DEFAULT_PROJECT_STYLE,
  DIRECTIONS_8,
  type CharacterConfig,
  type ProjectStyle,
} from '@pixiso/shared';
import { describe, expect, it } from 'vitest';
import { EXPORT_DIRECTIONS_5, exportCharacter, MIRROR_5, pixelsPerMeter } from './export.js';
import { HERO_PRESETS } from './hero64.registry.js';
import { colorTableFrom, renderClip } from './render.js';

const table = colorTableFrom(
  COLOR_NAMES.map((id) => ({ id, hex: id === 'red' ? '#d1343a' : '#888888' })),
);
const style: ProjectStyle = DEFAULT_PROJECT_STYLE;

const knight: CharacterConfig = {
  version: 1,
  baseCharacter: 'human',
  parts: { head: 'knight_helmet', hand_right: 'sword_1handed', back: 'cape' },
  colors: [{ target: 'cape', color: 'red' }],
  animations: ['idle', 'walk'],
};
const son = HERO_PRESETS.find((p) => p.id === 'son')!.config;

const bytesEqual = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((v, i) => v === b[i]);
/** The JSON files are ASCII (ids, hex colours), so a byte-per-char decode is exact. */
const asciiDecode = (bytes: Uint8Array) => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 8192)
    out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return out;
};

/** Width and height from a PNG's IHDR. */
function pngSize(png: Uint8Array): { w: number; h: number } {
  const v = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { w: v.getUint32(16), h: v.getUint32(20) };
}

describe('exportCharacter', () => {
  it('writes a sheet and JSON per animation, an atlas, a GIF and a ZIP that agree (8 directions)', () => {
    const out = exportCharacter(knight, style, table, { name: 'knight', atlas: true });
    expect(out.files.map((f) => f.name)).toEqual([
      'knight_idle.png',
      'knight_idle.json',
      'knight_walk.png',
      'knight_walk.json',
      'knight_atlas.png',
      'knight_atlas.json',
      'knight_preview.gif',
    ]);
    expect(out.cell).toEqual({ w: 32, h: 32 });
    expect(out.pivot).toEqual({ x: 16, y: 30 });
    expect(out.directions).toEqual(DIRECTIONS_8);
    expect(out.mirror).toBeUndefined();
    for (const a of out.animations) {
      expect(checkAseprite(a.aseprite)).toEqual([]);
      expect(a.aseprite.frames).toHaveLength(8 * a.frames);
      expect(a.aseprite.meta.frameTags.map((t) => t.name)).toEqual(
        DIRECTIONS_8.map((d) => `${a.id}_${d}`),
      );
      expect(a.aseprite.meta.image).toBe(a.png.name);
      expect(a.aseprite.meta.size).toEqual({ w: a.frames * 32, h: 8 * 32 });
      expect(pngSize(a.png.data)).toEqual(a.aseprite.meta.size);
      expect(a.aseprite.frames[0]!.duration).toBe(a.frameMs);
      expect(a.aseprite.meta.pixiso.palette).toEqual(out.palette);
      expect(a.aseprite.meta.pixiso.pixelsPerMeter).toBe(pixelsPerMeter(style));
      expect(JSON.parse(asciiDecode(a.json.data))).toEqual(a.aseprite);
    }
    expect(out.animations.map((a) => [a.id, a.frames, a.frameMs])).toEqual([
      ['idle', 2, 500],
      ['walk', 4, 140],
    ]);
    expect(pixelsPerMeter(style)).toBe(21.1);
    expect(out.palette.length).toBeGreaterThan(4);
    for (const hex of out.palette) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    // atlas: every animation's rows stacked, tags in the same order
    expect(checkAseprite(out.atlas!.aseprite)).toEqual([]);
    expect(out.atlas!.aseprite.frames).toHaveLength(8 * (2 + 4));
    expect(out.atlas!.aseprite.meta.frameTags).toHaveLength(16);
    expect(pngSize(out.atlas!.png.data)).toEqual({ w: 4 * 32, h: 16 * 32 });
    // preview gif: the walk in every direction
    expect(gifFrameCount(out.gif.data)).toBe(8 * 4);
    // zip: exactly the files, byte for byte
    const entries = unzipFiles(out.zip.data);
    expect(entries.map((e) => e.name)).toEqual(out.files.map((f) => f.name));
    for (const f of out.files)
      expect(bytesEqual(entries.find((e) => e.name === f.name)!.data, f.data)).toBe(true);
  });

  it('5+mirror keeps the five drawn rows and names the mirrored directions', () => {
    const out = exportCharacter(knight, { ...style, directions: '5+mirror' }, table);
    expect(out.name).toBe('human');
    expect(out.directions).toEqual(EXPORT_DIRECTIONS_5);
    expect(out.mirror).toEqual(MIRROR_5);
    expect(out.atlas).toBeUndefined();
    const walk = out.animations.find((a) => a.id === 'walk')!;
    expect(walk.aseprite.meta.frameTags.map((t) => t.name)).toEqual([
      'walk_S',
      'walk_SW',
      'walk_W',
      'walk_NW',
      'walk_N',
    ]);
    expect(walk.aseprite.meta.pixiso.mirror).toEqual({ NE: 'NW', E: 'W', SE: 'SW' });
    expect(pngSize(walk.png.data)).toEqual({ w: 4 * 32, h: 5 * 32 });
    expect(gifFrameCount(out.gif.data)).toBe(5 * 4);
  });

  it('is deterministic and follows the style: 64 px doubles the knight, the hero stays 1× at 64×64', () => {
    const a = exportCharacter(knight, style, table);
    const b = exportCharacter(knight, style, table);
    expect(bytesEqual(a.zip.data, b.zip.data)).toBe(true);
    const tall = exportCharacter(knight, { ...style, characterHeightPx: 64 }, table);
    expect(tall.scale).toBe(2);
    expect(tall.cell).toEqual({ w: 64, h: 64 });
    expect(tall.pivot).toEqual({ x: 32, y: 60 });
    expect(pngSize(tall.animations[1]!.png.data)).toEqual({ w: 4 * 64, h: 8 * 64 });
    expect(pixelsPerMeter({ ...style, characterHeightPx: 64 })).toBe(42.2);

    const hero = exportCharacter(son, style, table, { previewAnimation: 'idle' });
    expect(hero.name).toBe('hero');
    expect(hero.scale).toBe(1);
    expect(hero.cell).toEqual({ w: 64, h: 64 });
    expect(hero.pivot).toEqual({ x: 32, y: 62 });
    for (const an of hero.animations) expect(checkAseprite(an.aseprite)).toEqual([]);
    expect(gifFrameCount(hero.gif.data)).toBe(8 * 2);
    expect(() => exportCharacter({ ...son, animations: [] }, style, table)).toThrow(
      /no animations/,
    );
  });

  it('nothing slides along a looping clip: feet (32 px) or head and body (hero) stay within ±1 px (Phase 3)', () => {
    // HANDOFF §10 measures the feet: between frames the centre of the lowest two opaque rows moves at most
    // one pixel (the loop closes, so the last frame is checked against the first), the whole clip stays
    // inside a ±1 px band, and a static pose is exact. The hero's steps are transcribed strides: the
    // forward foot is nearer the camera and sits lower on the 2:1 canvas, so the lowest rows hold one foot
    // and alternate sides; there the head must not move at all (D-095) and the body's bounding box stays
    // inside the same band.
    const topRowsCenterX = (img: { width: number; height: number; data: Uint8ClampedArray }) => {
      for (let y = 0; y < img.height; y++) {
        const xs: number[] = [];
        for (let yy = y; yy < Math.min(img.height, y + 2); yy++)
          for (let x = 0; x < img.width; x++)
            if (img.data[(yy * img.width + x) * 4 + 3] === 255) xs.push(x);
        if (xs.length) return (Math.min(...xs) + Math.max(...xs)) / 2;
      }
      return null;
    };
    const band = (centres: number[], where: string, maxStep: number) => {
      const steps = centres.map((c, i) => Math.abs(c - centres[(i + 1) % centres.length]!));
      expect(Math.max(...steps), where).toBeLessThanOrEqual(maxStep);
      expect(Math.max(...centres) - Math.min(...centres), where).toBeLessThanOrEqual(2);
    };
    let checked = 0;
    for (const [label, config] of [
      ['human', knight],
      ['hero', son],
    ] as const) {
      for (const anim of ['idle', 'walk']) {
        for (const d of DIRECTIONS_8) {
          const clip = renderClip(config, style, anim, d, table);
          const feet = clip.frames.map((f) => lowestRowsCenterX(f)!);
          const where = `${label} ${anim} ${d}: ${feet.join(', ')}`;
          if (anim === 'idle') expect(new Set(feet).size, where).toBe(1);
          if (label === 'human') band(feet, where, 1);
          else {
            const heads = clip.frames.map((f) => topRowsCenterX(f)!);
            expect(new Set(heads).size, `${label} ${anim} ${d} head: ${heads.join(', ')}`).toBe(1);
            const boxes = clip.frames.map((f) => {
              const b = opaqueBounds(f)!;
              return b.x + b.w / 2;
            });
            band(boxes, `${label} ${anim} ${d} box: ${boxes.join(', ')}`, 2);
          }
          checked++;
        }
      }
    }
    expect(checked).toBe(2 * 2 * 8);
  });
});
