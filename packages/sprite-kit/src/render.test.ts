import { countColors, imageHash } from '@pixiso/pixel-core';
import {
  COLOR_NAMES,
  DEFAULT_PROJECT_STYLE,
  type CharacterConfig,
  type ProjectStyle,
} from '@pixiso/shared';
import { describe, expect, it } from 'vitest';
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
    expect(idle.cell).toEqual({ w: 24, h: 32 });
    expect(idle.pivot).toEqual({ x: 12, y: 30 });
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
    expect(b.cell).toEqual({ w: 48, h: 64 });
    expect(b.pivot).toEqual({ x: 24, y: 60 });
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
