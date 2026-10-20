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

/** Columns a build adds inside each leg of a drawn step view (SW follows S, NW follows N). */
export interface LegBuild {
  cols: Record<'S' | 'W' | 'N', number>;
}

/** The builds whose steps are derived this way, by pose id. */
export const LEG_BUILDS: Record<string, LegBuild> = {
  // thick legs: one column more than the mannequin's in every view (hero64.heavy.ts, HEAVY_W)
  heavy: { cols: { S: 1, W: 1, N: 1 } },
  // FORM_FAT's thigh band (pairs [5, 2]) in the symmetric views, the hand-drawn side view one wider
  fat: { cols: { S: 2, W: 1, N: 2 } },
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

/**
 * The hero's step with `extra` columns added inside each leg below the hem and
 * `extraRows` rows added to (or, negative, taken from the top of) the legs.
 */
export function buildLegs(walk: ZombiePose, extra: number, extraRows: number): BuiltLegs {
  const fig = walk.form.figure!;
  const hem = walk.hem[1];
  const split = walk.legSplit ?? Math.floor(fig.w / 2);
  const src = (x: number, y: number) =>
    x >= 0 && x < fig.w && y >= 0 && y < fig.h ? fig.cells[y * fig.w + x]! : EMPTY;

  // Which rows of the step the legs keep, in order: the trouser rows, minus the top ones a shorter build
  // drops, plus repeats of thigh and shin rows for a taller one.
  const legRows: number[] = [];
  for (let y = hem + 1; y < fig.h; y++) legRows.push(y);
  const dropped = Math.max(0, -extraRows);
  legRows.splice(0, dropped);
  if (extraRows > 0) {
    const candidates = legRows.slice(1, 7).map((y) => ({ y, pairs: linePairs(fig, y) }));
    candidates.sort((a, b) => a.pairs - b.pairs || a.y - b.y);
    const repeats = new Set(candidates.slice(0, extraRows).map((c) => c.y));
    for (let i = legRows.length - 1; i >= 0; i--)
      if (repeats.has(legRows[i]!)) legRows.splice(i, 0, legRows[i]!);
  }
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

  const width = fig.w + 2 * extra;
  const height = hem + 1 + legRows.length;
  const cells = new Int16Array(width * height).fill(EMPTY);
  for (let y = 0; y <= hem && y < fig.h; y++)
    for (let x = 0; x < fig.w; x++) cells[y * width + x] = src(x, y);
  const widenedRow = new Map<number, number[]>();
  for (let y = hem + 1; y < fig.h; y++) {
    const cols = columnsOf(y);
    cols.forEach((c, i) => (last[i] = c));
    const row: number[] = [];
    for (let x = 0; x < fig.w; x++) {
      const v = src(x, y);
      const times = 1 + cols.filter((c) => c === x).length * extra;
      for (let k = 0; k < times; k++) row.push(v);
    }
    widenedRow.set(y, row);
  }
  legRows.forEach((y, i) => {
    const row = widenedRow.get(y)!;
    row.forEach((v, x) => {
      if (v !== EMPTY) cells[(hem + 1 + i) * width + x] = v;
    });
  });

  // Boxes: a left-leg box grows by the left leg's extra; a right-leg box moves by it and grows by its own.
  const box = ([x0, y0, x1, y1]: Box): Box => [
    x0 >= split ? x0 + extra : x0,
    mapY0(y0),
    x1 >= split ? x1 + 2 * extra : x1 + extra,
    mapY1(y1),
  ];
  const drawn = (d: Drawn): Drawn => ({
    x: d.x,
    y: mapY0(d.y),
    rows: widenRows(d.rows, extra),
  });
  return {
    figure: { w: width, h: height, cells },
    pants: walk.pants.map(box),
    shorts: walk.shorts.map(box),
    shoeL: box(walk.shoeL),
    shoeR: box(walk.shoeR),
    flats: walk.flats.map(box),
    ...(walk.legSplit !== undefined ? { legSplit: walk.legSplit + extra } : {}),
    skirt: drawn(walk.skirt),
    ...(walk.dress ? { dress: drawn(walk.dress) } : {}),
    shift: extra,
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
