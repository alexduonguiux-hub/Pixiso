/**
 * Legs for the large builds' derived steps (D-101). A heavy or fat build keeps
 * the mannequin's proportions multiplied (SKILL §4: "thể hình lấy tỉ lệ từ form
 * nhân hàng/cột đã duyệt"), so its step is the hero's step from the trousers
 * down with the build's extra columns inside each leg and the rows its legs
 * have over the mannequin's, under the stance's own upper body (posedwalk64).
 * A column is added at a material cell of the leg in each row, never at a
 * vertical line cell, so the outline stays one cell wide and the leg's far edge
 * moves by the extra whichever interior cell is repeated; a leg absent from a
 * row (the sole of the forward foot alone) keeps its column from the row
 * above, so what lies beyond it still moves with the leg. Rows are repeated in
 * the thigh and shin, at rows without two line cells side by side, which a
 * repeat would turn into a line block.
 */
import { EMPTY, MATERIALS, type Sprite } from './format.js';
import type { Box } from './hero64.js';
import type { ZombiePose } from './hero64.poses.js';

type PerView = Record<'S' | 'W' | 'N', number>;

/** What a build adds to the hero's step legs per drawn step view (SW follows S, NW follows N). */
export interface LegBuild {
  /** Columns added inside each leg. */
  cols: PerView;
  /** Columns added inside each foot, from the shoe boxes' top row down (default: the leg's). */
  feet?: PerView;
  /** Rows added inside the feet; the rest of the rows the stance's legs have over the hero's go to the legs. */
  feetRows?: PerView;
}

/** The builds whose steps are derived this way, by pose id. */
export const LEG_BUILDS: Record<string, LegBuild> = {
  // thick legs: one column more than the mannequin's in every view (hero64.heavy.ts, HEAVY_W)
  heavy: { cols: { S: 1, W: 1, N: 1 } },
  // FORM_FAT's thigh band (pairs [5, 2]) in the symmetric views, the hand-drawn side view one wider
  fat: { cols: { S: 2, W: 1, N: 2 } },
  // the x1.5 giant (hero64.mutants.ts): legs six wide and feet ten wide from the front, two rows more of foot
  brute: { cols: { S: 3, W: 1, N: 3 }, feet: { S: 5, W: 1, N: 5 }, feetRows: { S: 2, W: 0, N: 2 } },
};

export type Drawn = { x: number; y: number; rows: string[] };

export interface BuiltLegs {
  figure: Sprite;
  pants: Box[];
  shorts: Box[];
  shoeL: Box;
  shoeR: Box;
  flats: Box[];
  legSplit?: number;
  skirt: Drawn;
  dress?: Drawn;
  /** Columns the legs' middle moved right (the left leg's extra): the step shifts left by this to stay under the hem. */
  shift: number;
}

const LINE_MATERIAL = MATERIALS.indexOf('line');
const isLine = (v: number) => v !== EMPTY && Math.floor(v / 8) === LINE_MATERIAL;
const isMaterial = (v: number) => v !== EMPTY && !isLine(v);

export interface LegExtra {
  /** Columns added inside each leg. */
  cols: number;
  /** Columns added inside each foot (rows from the shoe boxes' top down). */
  feet: number;
  /** Rows added to the legs above the feet (negative: trouser rows dropped from the top). */
  legRows: number;
  /** Rows added inside the feet. */
  feetRows: number;
}

/**
 * The hero's step with columns added inside each leg and foot below the hem
 * and rows added to (or, negative, taken from the top of) the legs and feet.
 */
export function buildLegs(walk: ZombiePose, extra: LegExtra): BuiltLegs {
  const fig = walk.form.figure!;
  const hem = walk.hem[1];
  const split = walk.legSplit ?? Math.floor(fig.w / 2);
  const feetTop = Math.min(walk.shoeL[1], walk.shoeR[1]);
  const src = (x: number, y: number) =>
    x >= 0 && x < fig.w && y >= 0 && y < fig.h ? fig.cells[y * fig.w + x]! : EMPTY;

  // Which rows of the step the legs keep, in order: the trouser rows, minus the top ones a shorter build
  // drops, plus repeats of leg rows (thigh and shin, above the feet) and of foot rows for a taller one.
  const legRows: number[] = [];
  for (let y = hem + 1; y < fig.h; y++) legRows.push(y);
  const dropped = Math.max(0, -extra.legRows);
  legRows.splice(0, dropped);
  const repeats = new Set<number>();
  const pick = (rows: number[], n: number) => {
    const candidates = rows.map((y) => ({ y, pairs: linePairs(fig, y) }));
    candidates.sort((a, b) => a.pairs - b.pairs || a.y - b.y);
    for (const c of candidates.slice(0, Math.max(0, n))) repeats.add(c.y);
  };
  if (extra.legRows > 0)
    pick(
      legRows.filter((y) => y < feetTop - 1),
      extra.legRows,
    );
  if (extra.feetRows > 0)
    pick(
      legRows.filter((y) => y >= feetTop),
      extra.feetRows,
    );
  for (let i = legRows.length - 1; i >= 0; i--)
    if (repeats.has(legRows[i]!)) legRows.splice(i, 0, legRows[i]!);
  const firstOf = new Map<number, number>();
  const lastOf = new Map<number, number>();
  legRows.forEach((y, i) => {
    const Y = hem + 1 + i;
    if (!firstOf.has(y)) firstOf.set(y, Y);
    lastOf.set(y, Y);
  });
  // a dropped row maps to the first kept one
  const mapY0 = (y: number) => (y <= hem ? y : (firstOf.get(y) ?? hem + 1));
  const mapY1 = (y: number) => {
    if (y <= hem) return y;
    for (let k = y; k > hem; k--) if (lastOf.has(k)) return lastOf.get(k)!;
    return hem + 1;
  };

  // Where each leg's column goes in a row: the middle of its widest material run, else the column it had
  // in the row above when that cell may be repeated (material, empty, or a line with no material beside it).
  const okToRepeat = (x: number, y: number) => {
    const v = src(x, y);
    if (!isLine(v)) return true;
    return !isMaterial(src(x - 1, y)) && !isMaterial(src(x + 1, y));
  };
  const runsOf = (y: number, x0: number, x1: number): [number, number][] => {
    const runs: [number, number][] = [];
    let start = -1;
    for (let x = x0; x <= x1 + 1; x++) {
      const m = x <= x1 && isMaterial(src(x, y));
      if (m && start < 0) start = x;
      if (!m && start >= 0) {
        runs.push([start, x - 1]);
        start = -1;
      }
    }
    return runs;
  };
  const sides: readonly [number, number][] = [
    [0, split - 1],
    [split, fig.w - 1],
  ];
  const last: number[] = sides.map(([a, b]) => Math.floor((a + b) / 2));
  const columnsOf = (y: number): number[] =>
    sides.map(([a, b], i) => {
      const runs = runsOf(y, a, b);
      if (runs.length) {
        const widest = runs.reduce((p, r) => (r[1] - r[0] > p[1] - p[0] ? r : p));
        return Math.floor((widest[0] + widest[1]) / 2);
      }
      const want = Math.min(b, Math.max(a, last[i]!));
      if (okToRepeat(want, y)) return want;
      for (let d = 1; d <= b - a; d++) {
        if (want - d >= a && okToRepeat(want - d, y)) return want - d;
        if (want + d <= b && okToRepeat(want + d, y)) return want + d;
      }
      return want;
    });

  // Feet wider than the legs sit back under them: the foot rows move left by half the difference, on a
  // margin that keeps every column on the canvas.
  const wider = Math.max(0, extra.feet - extra.cols);
  const margin = Math.floor(wider / 2);
  const footDx = -margin;
  const most = Math.max(extra.cols, extra.feet);
  const width = fig.w + 2 * most + margin;
  const height = hem + 1 + legRows.length;
  const cells = new Int16Array(width * height).fill(EMPTY);
  for (let y = 0; y <= hem && y < fig.h; y++)
    for (let x = 0; x < fig.w; x++) cells[y * width + x + margin] = src(x, y);
  const widenedRow = new Map<number, number[]>();
  for (let y = hem + 1; y < fig.h; y++) {
    const cols = columnsOf(y);
    cols.forEach((c, i) => (last[i] = c));
    const add = y >= feetTop ? extra.feet : extra.cols;
    const row: number[] = [];
    for (let x = 0; x < fig.w; x++) {
      const v = src(x, y);
      const times = 1 + cols.filter((c) => c === x).length * add;
      for (let k = 0; k < times; k++) row.push(v);
    }
    widenedRow.set(y, row);
  }
  legRows.forEach((y, i) => {
    const row = widenedRow.get(y)!;
    const dx = margin + (y >= feetTop ? footDx : 0);
    row.forEach((v, x) => {
      if (v !== EMPTY) cells[(hem + 1 + i) * width + x + dx] = v;
    });
  });

  // Boxes: a left-leg box grows by the left leg's extra; a right-leg box moves by it and grows by its own
  // (a foot box by the feet's, wider when the build's feet are).
  const box = ([x0, y0, x1, y1]: Box, add = extra.cols, dx = margin): Box => [
    (x0 >= split ? x0 + add : x0) + dx,
    mapY0(y0),
    (x1 >= split ? x1 + 2 * add : x1 + add) + dx,
    mapY1(y1),
  ];
  const foot = (b: Box) => box(b, extra.feet, margin + footDx);
  const drawn = (d: Drawn): Drawn => ({
    x: d.x + margin,
    y: mapY0(d.y),
    rows: widenRows(d.rows, extra.cols),
  });
  return {
    figure: { w: width, h: height, cells },
    pants: walk.pants.map((b) => box(b)),
    shorts: walk.shorts.map((b) => box(b)),
    shoeL: foot(walk.shoeL),
    shoeR: foot(walk.shoeR),
    flats: walk.flats.map(foot),
    ...(walk.legSplit !== undefined ? { legSplit: walk.legSplit + extra.cols + margin } : {}),
    skirt: drawn(walk.skirt),
    ...(walk.dress ? { dress: drawn(walk.dress) } : {}),
    shift: extra.cols + margin,
  };
}

/** Pairs of line cells side by side in a row: what a repeat of the row would turn into line blocks. */
function linePairs(fig: Sprite, y: number): number {
  let n = 0;
  for (let x = 0; x + 1 < fig.w; x++)
    if (isLine(fig.cells[y * fig.w + x]!) && isLine(fig.cells[y * fig.w + x + 1]!)) n++;
  return n;
}

/** A drawn piece (skirt, dress) widened like the legs: a column inside each half repeated `extra` times. */
function widenRows(rows: string[], extra: number): string[] {
  if (!extra) return rows;
  const w = rows[0]!.length;
  const a = Math.min(5, Math.floor(w / 2) - 1);
  const b = w - 1 - a;
  return rows.map((r) =>
    [...r].map((c, x) => (x === a || x === b ? c.repeat(1 + extra) : c)).join(''),
  );
}
