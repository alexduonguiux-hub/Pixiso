import { imageHash } from '@pixiso/pixel-core';
import { COLOR_NAMES, DEFAULT_PROJECT_STYLE, DIRECTIONS_8 } from '@pixiso/shared';
import { describe, expect, it } from 'vitest';
import { toAscii, type Sprite } from './format.js';
import { HERO_VIEWS } from './hero64.js';
import { RAT_PACK, RAT_UNITS, ratClip, RATS_BODY_ID, RATS_GROUND, RATS_PRESETS } from './rats64.js';
import { bodyById } from './registry.js';
import { colorTableFrom, renderClip } from './render.js';

const table = colorTableFrom(COLOR_NAMES.map((id) => ({ id, hex: '#888888' })));
const FUR = new Set('^cCvV');
const SKIN = new Set('sS$zZ');

function cellsOf(s: Sprite) {
  const rows = toAscii(s);
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < s.w && y < s.h ? rows[y]![x]! : '.';
  return { rows, at };
}

/** 4-connected components of cells matching `want`, as cell lists. */
function components(s: Sprite, want: (ch: string) => boolean, eight = false): [number, number][][] {
  const { at } = cellsOf(s);
  const seen = new Set<number>();
  const out: [number, number][][] = [];
  const near = eight
    ? [-1, 0, 1]
        .flatMap((dx) => [-1, 0, 1].map((dy) => [dx, dy] as const))
        .filter(([dx, dy]) => dx || dy)
    : ([
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const);
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (!want(at(x, y)) || seen.has(y * s.w + x)) continue;
      const comp: [number, number][] = [];
      const stack: [number, number][] = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        if (cx < 0 || cy < 0 || cx >= s.w || cy >= s.h) continue;
        const k = cy * s.w + cx;
        if (seen.has(k) || !want(at(cx, cy))) continue;
        seen.add(k);
        comp.push([cx, cy]);
        for (const [dx, dy] of near) stack.push([cx + dx, cy + dy]);
      }
      out.push(comp);
    }
  return out;
}

describe('rat units', () => {
  it('are outlined, without line blocks, lone cells, floating cells or holes, in every view and pose', () => {
    for (const view of HERO_VIEWS)
      for (const pose of ['idle', 'a', 'b'] as const) {
        const s = RAT_UNITS[view][pose];
        const where = `${view}.${pose}`;
        const { at } = cellsOf(s);
        for (let y = 0; y < s.h; y++)
          for (let x = 0; x < s.w; x++) {
            const c = at(x, y);
            if (c === '.') continue;
            // a material cell never touches transparency: the outline is closed
            if (c !== 'o')
              for (const [dx, dy] of [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
              ] as const)
                expect(at(x + dx, y + dy), `${where} open at (${x},${y})`).not.toBe('.');
            // no 2×2 block of line cells
            if (c === 'o')
              expect(
                at(x + 1, y) === 'o' && at(x, y + 1) === 'o' && at(x + 1, y + 1) === 'o',
                `${where} line block at (${x},${y})`,
              ).toBe(false);
          }
        // every fur or skin patch is at least two cells (D-073); the eye is the one allowed dot
        for (const comp of components(s, (ch) => FUR.has(ch)))
          expect(comp.length, `${where} fur patch ${comp[0]}`).toBeGreaterThanOrEqual(2);
        for (const comp of components(s, (ch) => SKIN.has(ch)))
          expect(comp.length, `${where} skin patch ${comp[0]}`).toBeGreaterThanOrEqual(2);
        // one rat per unit (8-connected), no enclosed transparent pocket of 3+ cells
        expect(components(s, (ch) => ch !== '.', true)).toHaveLength(1);
        for (const pocket of components(s, (ch) => ch === '.'))
          if (pocket.every(([x, y]) => x > 0 && y > 0 && x < s.w - 1 && y < s.h - 1))
            expect(pocket.length, `${where} hole at ${pocket[0]}`).toBeLessThan(3);
      }
  });

  it('pack frames hold three separate rats, the front one on the ground row, inside the canvas', () => {
    for (const view of HERO_VIEWS) {
      expect(RAT_PACK[view]).toHaveLength(3);
      const frames = [...ratClip(view, 'idle'), ...ratClip(view, 'walk')];
      expect(frames).toHaveLength(6);
      frames.forEach((f, i) => {
        expect(
          components(f, (ch) => ch !== '.', true),
          `${view} frame ${i}`,
        ).toHaveLength(3);
      });
      const { rows } = cellsOf(frames[0]!);
      const bottom = rows
        .map((r, y) => (r.includes('o') ? y : -1))
        .reduce((a, b) => Math.max(a, b));
      expect(bottom, `${view} ground`).toBe(RATS_GROUND);
      // the scurry's bob frames differ from the rest frames
      expect(toAscii(frames[2]!)).not.toEqual(toAscii(frames[3]!));
      expect(toAscii(frames[4]!)).not.toEqual(toAscii(frames[3]!));
      expect(toAscii(frames[1]!)).not.toEqual(toAscii(frames[0]!));
    }
    expect(() => ratClip('S', 'run')).toThrow(/no rat frames/);
  });

  it('renders through renderClip as the rats body: idle 2, walk 4, 64×64, E mirrors W, recolourable, deterministic', () => {
    const preset = RATS_PRESETS[0]!;
    expect(preset.config.baseCharacter).toBe(RATS_BODY_ID);
    expect(bodyById(RATS_BODY_ID)?.canvas).toEqual({ w: 64, h: 64 });
    const idle = renderClip(preset.config, DEFAULT_PROJECT_STYLE, 'idle', 'S', table);
    expect(idle.frames).toHaveLength(2);
    expect(idle.cell).toEqual({ w: 64, h: 64 });
    expect(idle.pivot).toEqual({ x: 32, y: 62 });
    const walk = renderClip(preset.config, DEFAULT_PROJECT_STYLE, 'walk', 'W', table);
    expect(walk.frames).toHaveLength(4);
    const east = renderClip(preset.config, DEFAULT_PROJECT_STYLE, 'walk', 'E', table);
    for (let i = 0; i < 4; i++)
      for (let y = 0; y < 64; y += 2)
        for (let x = 0; x < 64; x++) {
          const w = walk.frames[i]!;
          const e = east.frames[i]!;
          const a = (y * 64 + x) * 4;
          const b = (y * 64 + 63 - x) * 4;
          expect([...e.data.subarray(b, b + 4)]).toEqual([...w.data.subarray(a, a + 4)]);
        }
    for (const d of DIRECTIONS_8)
      expect(
        renderClip(preset.config, DEFAULT_PROJECT_STYLE, 'idle', d, table).frames,
      ).toHaveLength(2);
    expect(() => renderClip(preset.config, DEFAULT_PROJECT_STYLE, 'run', 'S', table)).toThrow(
      /no rats frames/,
    );
    const grey = renderClip(
      { ...preset.config, colors: [{ target: 'body', color: 'gray' }] },
      DEFAULT_PROJECT_STYLE,
      'idle',
      'S',
      table,
    );
    expect(imageHash(grey.frames[0]!)).not.toBe(imageHash(idle.frames[0]!));
    expect(imageHash(idle.frames[0]!)).toBe(
      imageHash(renderClip(preset.config, DEFAULT_PROJECT_STYLE, 'idle', 'S', table).frames[0]!),
    );
  });
});
