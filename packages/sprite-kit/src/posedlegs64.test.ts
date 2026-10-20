import { describe, expect, it } from 'vitest';
import { EMPTY, MATERIALS, toAscii } from './format.js';
import { HERO_VIEWS } from './hero64.js';
import { buildLegs, LEG_BUILDS } from './posedlegs64.js';
import { POSED_BODIES } from './posed64.js';
import { posedStep } from './posedwalk64.js';
import { poseInView } from './poseviews64.js';
import { STAND_VIEWS } from './views64.js';
import { WALK_VIEWS } from './walk64.js';

const LINE = MATERIALS.indexOf('line');
const lineCount = (row: string) => [...row].filter((c) => c === 'o').length;
const bare = (row: string) => row.replace(/\.+$/, '');
const span = (row: string) => {
  const first = row.search(/[^.]/);
  return first < 0 ? 0 : bare(row).length - first;
};

describe('legs of the large builds (D-101)', () => {
  it('adds the extra inside each leg: rows above the hem unchanged, every leg row wider by it per leg, no line repeated', () => {
    for (const view of ['S', 'W', 'N'] as const)
      for (const step of [0, 1] as const)
        for (const extra of [1, 2]) {
          const walk = WALK_VIEWS[view]![step];
          const src = toAscii(walk.form.figure!);
          const built = buildLegs(walk, { cols: extra, feet: extra, legRows: 0, feetRows: 0 });
          const out = toAscii(built.figure);
          const hem = walk.hem[1];
          expect(built.figure.w).toBe(walk.form.figure!.w + 2 * extra);
          expect(built.figure.h).toBe(walk.form.figure!.h);
          for (let y = 0; y <= hem; y++) expect(bare(out[y]!)).toBe(bare(src[y]!));
          for (let y = hem + 1; y < src.length; y++) {
            const where = `${view}${step} +${extra} row ${y}`;
            // the outline is never repeated: as many line cells as before, unless the repeated cell was a
            // horizontal line (a sole), which only gets longer
            expect(lineCount(out[y]!), where).toBeGreaterThanOrEqual(lineCount(src[y]!));
            // the silhouette of the row is wider by one extra per leg present (two legs: both extras)
            expect(span(out[y]!) - span(src[y]!), where).toBeGreaterThanOrEqual(extra);
            expect(span(out[y]!) - span(src[y]!), where).toBeLessThanOrEqual(2 * extra);
          }
          // no cell of the leg rows became a two-wide vertical line
          for (let y = hem + 1; y < built.figure.h; y++)
            for (let x = 0; x + 1 < built.figure.w; x++) {
              const a = built.figure.cells[y * built.figure.w + x]!;
              const b = built.figure.cells[y * built.figure.w + x + 1]!;
              if (a === EMPTY || b === EMPTY) continue;
              if (Math.floor(a / 8) !== LINE || Math.floor(b / 8) !== LINE) continue;
              const srcRow = src[Math.min(y, src.length - 1)]!;
              // a pair of lines side by side existed in the source row too (two legs sharing a line, a sole)
              expect(/oo/.test(srcRow), `${view}${step} +${extra} new line pair at ${x},${y}`).toBe(
                true,
              );
            }
        }
  });

  it('lengthens or shortens the legs by whole rows, keeping the boxes on them', () => {
    const walk = WALK_VIEWS.S![0];
    const longer = buildLegs(walk, { cols: 1, feet: 1, legRows: 2, feetRows: 0 });
    expect(longer.figure.h).toBe(walk.form.figure!.h + 2);
    expect(longer.shoeR[3]).toBe(walk.shoeR[3] + 2);
    const shorter = buildLegs(walk, { cols: 2, feet: 2, legRows: -1, feetRows: 0 });
    expect(shorter.figure.h).toBe(walk.form.figure!.h - 1);
    expect(shorter.pants[0]![1]).toBe(walk.hem[1] + 1);
    expect(shorter.shoeR[3]).toBe(walk.shoeR[3] - 1);
    expect(shorter.legSplit).toBe(walk.legSplit! + 2);
  });

  it('gives the heavy and fat bodies steps in every view that end where their stance ends, plus the stride', () => {
    for (const id of Object.keys(LEG_BUILDS)) {
      const body = POSED_BODIES.find((b) => b.id === id)!;
      for (const view of HERO_VIEWS) {
        const stance = poseInView(body.pose, view)!.form.figure!;
        const heroStand = STAND_VIEWS[view].form.figure!;
        for (const step of [0, 1] as const) {
          const pose = posedStep(body, view, step);
          expect(pose, `${id}@${view}${step}`).toBeDefined();
          const heroStep = WALK_VIEWS[view]![step].form.figure!;
          // the step is as many rows taller than the stance as the hero's step is than the hero's stand
          expect(pose!.form.figure!.h - stance.h, `${id}@${view}${step}`).toBe(
            heroStep.h - heroStand.h,
          );
          // the top rows are the stance's
          const rows = toAscii(pose!.form.figure!);
          const stanceRows = toAscii(stance);
          expect(bare(rows[20]!)).toBe(bare(stanceRows[20]!));
        }
      }
    }
  });
});
