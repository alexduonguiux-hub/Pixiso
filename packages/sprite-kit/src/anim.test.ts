import { describe, expect, it } from 'vitest';
import { CLIPS } from './anim.js';
import { CANVAS_H, CANVAS_W } from './body32.js';
import { buildClip } from './character.js';
import { toAscii } from './format.js';
import { VIEWS } from './registry.js';

const knight = { parts: ['cape', 'knight_helmet', 'sword_1handed', 'shield_round'] };
const clip = (id: string) => CLIPS.find((c) => c.id === id)!;

function opaqueCount(rows: string[]): number {
  return rows.join('').replace(/\./g, '').length;
}

describe('clips', () => {
  it('has the six MVP clips with the planned frame counts in every view', () => {
    const counts = Object.fromEntries(CLIPS.map((c) => [c.id, c.frames.S.length]));
    expect(counts).toEqual({ idle: 2, walk: 4, run: 4, attack: 3, hit: 2, death: 4 });
    for (const c of CLIPS)
      for (const v of VIEWS) expect(c.frames[v].length).toBe(c.frames.S.length);
  });

  it('keeps every frame inside the canvas without clipping the sword', () => {
    for (const c of CLIPS) {
      for (const d of ['S', 'SW', 'W', 'NW', 'N'] as const) {
        for (const [i, f] of buildClip(knight, d, c).entries()) {
          const rows = toAscii(f);
          expect(f.w).toBe(CANVAS_W);
          expect(f.h).toBe(CANVAS_H);
          // nothing drawn on the outermost column/row would mean the pose ran out of room
          const edge = rows[rows.length - 1]! + rows.map((r) => r[0]! + r[r.length - 1]!).join('');
          expect(edge.replace(/\./g, ''), `${c.id} ${d} frame ${i}`).toBe('');
        }
      }
    }
  });

  it('the attack swing uses the sword pose and the death ends lying with gear dropped', () => {
    const attack = buildClip(knight, 'S', clip('attack'));
    const idle = buildClip(knight, 'S', clip('idle'))[0]!;
    // Swing frame: metal spreads horizontally (the blade crosses the body).
    const swingRows = toAscii(attack[1]!);
    const widest = Math.max(...swingRows.map((r) => (r.match(/[mw]/g) ?? []).length));
    expect(widest).toBeGreaterThanOrEqual(8);
    const death = buildClip(knight, 'S', clip('death'));
    const lying = toAscii(death[3]!);
    expect(lying).toEqual(toAscii(death[2]!));
    expect(lying.join('')).not.toMatch(/[kK&]/); // no cape
    expect(opaqueCount(lying)).toBeLessThan(opaqueCount(toAscii(idle)));
    // lying body touches the sole row and nothing below it
    expect(lying[29]).toMatch(/o/);
    expect(lying[30]).toMatch(/^\.+$/);
  });

  it('run flight frames never push the head out of the canvas', () => {
    for (const d of ['S', 'W', 'SW'] as const) {
      const idleTop = toAscii(buildClip(knight, d, clip('idle'))[0]!).find((r) => /[^.]/.test(r))!;
      for (const f of buildClip(knight, d, clip('run'))) {
        // the first drawn row is the same helmet top as in idle, so nothing was cut above it
        const top = toAscii(f).find((r) => /[^.]/.test(r))!;
        expect(top.replace(/\./g, '').length).toBe(idleTop.replace(/\./g, '').length);
      }
    }
  });

  it('hit pushes the upper body away from the facing (head twice as far)', () => {
    const hitW = buildClip(knight, 'W', clip('hit'));
    const idleW = buildClip(knight, 'W', clip('idle'))[0]!;
    const firstHead = (s: { w: number; cells: Int16Array }) => {
      for (let i = 0; i < s.cells.length; i++) if (s.cells[i]! >= 0) return i % s.w;
      return -1;
    };
    expect(firstHead(hitW[0]!)).toBe(firstHead(idleW) + 2);
  });
});
