import { countColors, imageHash } from '@pixiso/pixel-core';
import {
  COLOR_NAMES,
  DEFAULT_PROJECT_STYLE,
  DIRECTIONS_8,
  type CharacterConfig,
  type ProjectStyle,
} from '@pixiso/shared';
import { describe, expect, it } from 'vitest';
import { HERO_PRESETS } from './hero64.registry.js';
import {
  colorTableFrom,
  materialColorsFor,
  renderClip,
  specFromConfig,
  usedColors,
} from './render.js';

const table = colorTableFrom(
  COLOR_NAMES.map((id) => ({
    id,
    hex: id === 'red' ? '#d1343a' : id === 'gold' ? '#d9a21b' : '#888888',
  })),
);

const knight: CharacterConfig = {
  version: 1,
  baseCharacter: 'human',
  parts: {
    head: 'knight_helmet',
    hand_right: 'sword_1handed',
    hand_left: 'shield_round',
    back: 'cape',
  },
  colors: [
    { target: 'cape', color: 'red' },
    { target: 'metal', color: 'original' },
  ],
  animations: ['idle', 'walk'],
};

const style: ProjectStyle = DEFAULT_PROJECT_STYLE;

function pixel(img: { width: number; data: Uint8ClampedArray }, x: number, y: number) {
  const o = (y * img.width + x) * 4;
  return [img.data[o], img.data[o + 1], img.data[o + 2], img.data[o + 3]];
}

describe('config → frames', () => {
  it('maps slots to parts in slot order and ignores "none"', () => {
    expect(specFromConfig(knight)).toEqual({
      body: 'human',
      parts: ['knight_helmet', 'sword_1handed', 'shield_round', 'cape'],
    });
    expect(specFromConfig({ ...knight, parts: { head: 'none', back: 'cape' } }).parts).toEqual([
      'cape',
    ]);
    // A part in the wrong slot is not drawn (normalizeConfig would have dropped it anyway).
    expect(specFromConfig({ ...knight, parts: { head: 'cape' } }).parts).toEqual([]);
  });

  it('maps colour targets to materials and skips "original"', () => {
    expect(materialColorsFor(knight, table)).toEqual({ cloth2: [0xd1, 0x34, 0x3a] });
  });

  it('renders every available direction with the clip frame count and cell size', () => {
    const idle = renderClip(knight, style, 'idle', 'S', table);
    expect(idle.frames.length).toBe(2);
    expect(idle.frameMs).toBe(500);
    expect(idle.cell).toEqual({ w: 32, h: 32 });
    expect(idle.pivot).toEqual({ x: 16, y: 30 });
    const walkW = renderClip(knight, style, 'walk', 'W', table);
    const walkE = renderClip(knight, style, 'walk', 'E', table);
    expect(walkW.frames.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      const w = walkW.frames[i]!;
      const e = walkE.frames[i]!;
      for (let y = 0; y < w.height; y += 3)
        for (let x = 0; x < w.width; x++)
          expect(pixel(e, w.width - 1 - x, y)).toEqual(pixel(w, x, y));
    }
    expect(() => renderClip(knight, style, 'walk', 'UP' as never, table)).toThrow(/no drawn view/);
    for (const d of ['SW', 'NW', 'N', 'NE', 'SE'] as const) {
      expect(renderClip(knight, style, 'walk', d, table).frames.length).toBe(4);
    }
    expect(() => renderClip(knight, style, 'fly', 'S', table)).toThrow(/unknown animation/);
  });

  it('scales by nearest neighbour for 64 px and keeps the colour count', () => {
    const a = renderClip(knight, style, 'idle', 'S', table);
    const b = renderClip(knight, { ...style, characterHeightPx: 64 }, 'idle', 'S', table);
    expect(b.scale).toBe(2);
    expect(b.cell).toEqual({ w: 64, h: 64 });
    expect(b.pivot).toEqual({ x: 32, y: 60 });
    expect(countColors(b.frames[0]!)).toBe(countColors(a.frames[0]!));
    expect(pixel(b.frames[0]!, 24, 24)).toEqual(pixel(a.frames[0]!, 12, 12));
  });

  it('recolours only the targeted material and stays deterministic', () => {
    const plain = renderClip({ ...knight, colors: [] }, style, 'idle', 'S', table);
    const red = renderClip(knight, style, 'idle', 'S', table);
    expect(imageHash(red.frames[0]!)).toBe(
      imageHash(renderClip(knight, style, 'idle', 'S', table).frames[0]!),
    );
    expect(imageHash(red.frames[0]!)).not.toBe(imageHash(plain.frames[0]!));
    // Same number of colours: a recolour swaps a ramp, it never adds one.
    expect(red.palette.length).toBe(plain.palette.length);
    expect(usedColors(red.frames)).toEqual(red.palette);
  });

  it('outline presets differ and the fps override rounds to 10 ms', () => {
    const ink = renderClip(knight, style, 'idle', 'S', table);
    const soft = renderClip(knight, { ...style, outline: 'soft' }, 'idle', 'S', table);
    const none = renderClip(knight, { ...style, outline: 'none' }, 'idle', 'S', table);
    const hashes = new Set([ink, soft, none].map((r) => imageHash(r.frames[0]!)));
    expect(hashes.size).toBe(3);
    expect(renderClip(knight, { ...style, fps: 12 }, 'walk', 'S', table).frameMs).toBe(80);
  });
});

/** A hero config (D-096): Dương's parts, the tee in a hex colour. */
const hero: CharacterConfig = {
  version: 1,
  baseCharacter: 'hero',
  parts: {
    hair: 'hair_spiky',
    hat: 'none',
    face: 'none',
    top: 'tee',
    bottoms: 'pants',
    shoes: 'boots',
    gear: 'none',
  },
  colors: [{ target: 'body', color: '#469664' }],
  animations: ['idle', 'walk'],
};

describe('hero config → frames (D-096)', () => {
  it('renders the 64 px body: idle holds the standing frame, walk runs the four-frame cycle', () => {
    const idle = renderClip(hero, style, 'idle', 'S', table);
    expect(idle.frames.length).toBe(2);
    expect(idle.frameMs).toBe(500);
    expect(idle.scale).toBe(1);
    expect(idle.cell).toEqual({ w: 64, h: 64 });
    expect(idle.pivot).toEqual({ x: 32, y: 62 });
    expect(imageHash(idle.frames[0]!)).toBe(imageHash(idle.frames[1]!));
    const walk = renderClip(hero, style, 'walk', 'S', table);
    expect(walk.frames.length).toBe(4);
    expect(walk.frameMs).toBe(140);
    // contact, pass, contact, pass: the passes are the standing frame, the contacts differ
    expect(imageHash(walk.frames[1]!)).toBe(imageHash(idle.frames[0]!));
    expect(imageHash(walk.frames[3]!)).toBe(imageHash(idle.frames[0]!));
    expect(imageHash(walk.frames[0]!)).not.toBe(imageHash(walk.frames[2]!));
    expect(imageHash(walk.frames[0]!)).not.toBe(imageHash(walk.frames[1]!));
    expect(usedColors(walk.frames)).toEqual(walk.palette);
  });

  it('mirrors E from W, renders every direction and refuses clips without hero frames', () => {
    const w = renderClip(hero, style, 'walk', 'W', table);
    const e = renderClip(hero, style, 'walk', 'E', table);
    for (let i = 0; i < 4; i++)
      for (let y = 0; y < 64; y += 3)
        for (let x = 0; x < 64; x++)
          expect(pixel(e.frames[i]!, 63 - x, y)).toEqual(pixel(w.frames[i]!, x, y));
    for (const d of ['SW', 'NW', 'N', 'NE', 'SE'] as const)
      expect(renderClip(hero, style, 'idle', d, table).frames.length).toBe(2);
    expect(() => renderClip(hero, style, 'run', 'S', table)).toThrow(/no hero frames/);
    expect(() => renderClip(hero, style, 'idle', 'UP' as never, table)).toThrow(/no drawn view/);
  });

  it('a hex colour recolours its target, stays deterministic, and 64 px height keeps scale 1', () => {
    const green = renderClip(hero, style, 'idle', 'S', table);
    const red = renderClip(
      { ...hero, colors: [{ target: 'body', color: '#d1343a' }] },
      style,
      'idle',
      'S',
      table,
    );
    expect(imageHash(red.frames[0]!)).not.toBe(imageHash(green.frames[0]!));
    expect(red.palette.length).toBe(green.palette.length);
    expect(imageHash(green.frames[0]!)).toBe(
      imageHash(renderClip(hero, style, 'idle', 'S', table).frames[0]!),
    );
    expect(
      materialColorsFor({ ...hero, colors: [{ target: 'eyes', color: '#102030' }] }, table),
    ).toEqual({ eye: [0x10, 0x20, 0x30] });
    const tall = renderClip(hero, { ...style, characterHeightPx: 64 }, 'idle', 'S', table);
    expect(tall.scale).toBe(1);
    expect(imageHash(tall.frames[0]!)).toBe(imageHash(green.frames[0]!));
    // outline presets still differ on the hero
    const none = renderClip(hero, { ...style, outline: 'none' }, 'idle', 'S', table);
    expect(imageHash(none.frames[0]!)).not.toBe(imageHash(green.frames[0]!));
  });
});

describe('posed bodies (D-100)', () => {
  it('every posed preset renders its standing frame in all eight directions and has no walk yet', () => {
    for (const preset of HERO_PRESETS.filter((p) => p.body !== 'hero')) {
      for (const d of DIRECTIONS_8) {
        const idle = renderClip(preset.config, style, 'idle', d, table);
        expect(idle.frames, `${preset.id} ${d}`).toHaveLength(2);
        expect(idle.cell).toEqual({ w: 64, h: 64 });
        expect(idle.pivot).toEqual({ x: 32, y: 62 });
        expect(imageHash(idle.frames[0]!)).toBe(imageHash(idle.frames[1]!));
        // something is drawn, and its lowest opaque row is on the ground
        const bottom = lowestOpaqueRow(idle.frames[0]!);
        expect(bottom, `${preset.id} ${d}`).toBeGreaterThanOrEqual(60);
        expect(bottom, `${preset.id} ${d}`).toBeLessThanOrEqual(61);
      }
      expect(() => renderClip(preset.config, style, 'walk', 'S', table)).toThrow(/no .* frames/);
    }
    // a part not drawn for the body is ignored, so a config can never crash the renderer
    const droop = HERO_PRESETS.find((p) => p.id === 'zombie_civ_m')!.config;
    const withPack = { ...droop, parts: { ...droop.parts, gear: 'backpack' } };
    expect(imageHash(renderClip(withPack, style, 'idle', 'S', table).frames[0]!)).toBe(
      imageHash(renderClip(droop, style, 'idle', 'S', table).frames[0]!),
    );
  });
});

function lowestOpaqueRow(img: { width: number; height: number; data: Uint8ClampedArray }): number {
  for (let y = img.height - 1; y >= 0; y--)
    for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] === 255) return y;
  return -1;
}
