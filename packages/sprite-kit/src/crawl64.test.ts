import { describe, expect, it } from 'vitest';
import { crawlStep } from './crawl64.js';
import { toAscii } from './format.js';
import { HERO_VIEWS } from './hero64.js';
import { POSE_CRAWL } from './hero64.poses.js';
import { poseInView } from './poseviews64.js';

const bare = (row: string) => row.replace(/\.+$/, '');
const lastRowOf = (rows: string[], x0: number, x1: number) => {
  for (let y = rows.length - 1; y >= 0; y--)
    if ([...rows[y]!.slice(x0, x1 + 1)].some((c) => c !== '.')) return y;
  return -1;
};

describe('crawl cycle (D-101)', () => {
  it('nudges the arms a row each way in the front, back and three-quarter views, leaving the body alone', () => {
    for (const view of ['S', 'SW', 'NW', 'N'] as const) {
      const stance = poseInView(POSE_CRAWL, view)!;
      const rows = toAscii(stance.form.figure!);
      const a = toAscii(crawlStep(stance, view, 0).form.figure!);
      const b = toAscii(crawlStep(stance, view, 1).form.figure!);
      expect(a).not.toEqual(b);
      // the head and the body above the elbows are the stance's
      for (let y = 0; y < 28; y++) {
        expect(bare(a[y]!), `${view} A row ${y}`).toBe(bare(rows[y]!));
        expect(bare(b[y]!), `${view} B row ${y}`).toBe(bare(rows[y]!));
      }
      // the legs between the arms are the stance's
      for (let y = 28; y < rows.length; y++) {
        expect(a[y]!.slice(5, 16), `${view} A legs row ${y}`).toBe(rows[y]!.slice(5, 16));
        expect(b[y]!.slice(5, 16), `${view} B legs row ${y}`).toBe(rows[y]!.slice(5, 16));
      }
      // one hand ends a row lower than it stood, the other a row higher, and they swap between A and B
      const ground = rows.length - 1;
      const leftA = lastRowOf(a, 0, 4);
      const rightA = lastRowOf(a, 16, 20);
      const leftB = lastRowOf(b, 0, 4);
      const rightB = lastRowOf(b, 16, 20);
      expect(new Set([leftA, rightA]), `${view} A`).toEqual(new Set([ground - 1, ground + 1]));
      expect(leftB, view).toBe(rightA);
      expect(rightB, view).toBe(leftA);
    }
  });

  it('lurches in the side view: A moves the lower body a column, B the upper body with the frame drawn a column back', () => {
    const stance = poseInView(POSE_CRAWL, 'W')!;
    const rows = toAscii(stance.form.figure!);
    const a = crawlStep(stance, 'W', 0);
    const b = crawlStep(stance, 'W', 1);
    const ra = toAscii(a.form.figure!);
    const rb = toAscii(b.form.figure!);
    expect(a.form.figure!.w).toBe(stance.form.figure!.w + 1);
    expect(a.originDx).toBeUndefined();
    expect(b.originDx).toBe(1);
    for (let y = 0; y < rows.length; y++) {
      if (!bare(rows[y]!)) continue;
      const lower = y >= 29;
      expect(bare(ra[y]!), `A row ${y}`).toBe((lower ? '.' : '') + bare(rows[y]!));
      expect(bare(rb[y]!), `B row ${y}`).toBe((lower ? '' : '.') + bare(rows[y]!));
    }
    // boxes follow their rows: the hem (row 28) moves with the upper body in B only
    expect(a.hem[0]).toBe(stance.hem[0]);
    expect(b.hem[0]).toBe(stance.hem[0] + 1);
    expect(a.shoeL[0]).toBe(stance.shoeL[0] + 1);
    expect(b.shoeL[0]).toBe(stance.shoeL[0]);
  });

  it('is defined for every drawn view with the stance kept as the standing frame between steps', () => {
    for (const view of HERO_VIEWS) {
      const stance = poseInView(POSE_CRAWL, view)!;
      const a = crawlStep(stance, view, 0);
      expect(a.id).toBe(`${stance.id}_${view}0`);
      expect(a.form.figure!.h).toBeGreaterThanOrEqual(stance.form.figure!.h);
    }
  });
});
