/**
 * The crawl's cycle (D-101): a crawler moves on its hands, so its walk is the
 * body and the arms taking turns, not the legs, animated by one-cell limb
 * offsets the way small pixel crawlers are. In the front, back and
 * three-quarter views the arms are the two columns of cells at the figure's
 * sides with the hands on the ground row: a step is the stance with one arm
 * reaching a row further (its forearm and hand moved one row toward where the
 * crawler is going, the elbow row repeated) and the other pulled a row back
 * (moved the other way, the elbow row dropped). In the side view the arms
 * overlap, so the step is a lurch instead: step A moves everything from the
 * hips down a column back under the body (the body ahead of its hands), step
 * B moves the body a column back over them. Step A is the person's left arm
 * forward (D-095).
 */
import { EMPTY, LEGEND, MATERIALS, packCell, type Sprite } from './format.js';
import type { Box, HeroView } from './hero64.js';
import type { ZombiePose } from './hero64.poses.js';

interface ArmsMove {
  kind: 'arms';
  /** Columns of the arm on the viewer's left and on the viewer's right (inclusive; the line shared with the legs excluded). */
  left: [number, number];
  right: [number, number];
  /** First row that moves: the forearm from the elbow down. */
  from: number;
  /** Row direction of "forward" on the screen: down toward the viewer, up away from it. */
  forward: 1 | -1;
  /** Which of the two is the person's left arm. */
  personLeft: 'left' | 'right';
}
interface LurchMove {
  kind: 'lurch';
  /** First row of the lower body (the hips): step A moves these rows, step B the rows above. */
  split: number;
}

/** How the crawl steps in each drawn view (figures in hero64.poses.views.ts). */
const CRAWL_MOVES: Record<HeroView, ArmsMove | LurchMove> = {
  S: { kind: 'arms', left: [0, 4], right: [16, 20], from: 28, forward: 1, personLeft: 'right' },
  SW: { kind: 'arms', left: [1, 4], right: [16, 20], from: 28, forward: 1, personLeft: 'right' },
  W: { kind: 'lurch', split: 29 },
  NW: { kind: 'arms', left: [0, 4], right: [16, 19], from: 28, forward: -1, personLeft: 'left' },
  N: { kind: 'arms', left: [0, 4], right: [16, 20], from: 28, forward: -1, personLeft: 'left' },
};

const LINE = packCell(LEGEND.o!);
const LINE_MATERIAL = MATERIALS.indexOf('line');
const isLine = (v: number) => v !== EMPTY && Math.floor(v / 8) === LINE_MATERIAL;
const N4: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Moves the cells of `cols` from row `from` down by one row (repeating that row) or up by one (dropping it). */
function nudge(
  cells: Int16Array,
  w: number,
  h: number,
  cols: [number, number],
  from: number,
  dy: 1 | -1,
): void {
  const [x0, x1] = cols;
  if (dy > 0) {
    for (let y = h - 2; y >= from; y--)
      for (let x = x0; x <= x1; x++) cells[(y + 1) * w + x] = cells[y * w + x]!;
  } else {
    for (let y = from; y < h - 1; y++)
      for (let x = x0; x <= x1; x++) cells[y * w + x] = cells[(y + 1) * w + x]!;
    for (let x = x0; x <= x1; x++) cells[(h - 1) * w + x] = EMPTY;
  }
}

/**
 * After the moves, from the elbow row down: a line cell touching no material
 * (a piece of another limb's outline carried along) goes, and a material cell
 * facing transparency gets a line there.
 */
function tidy(cells: Int16Array, w: number, h: number, from: number): void {
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h ? cells[y * w + x]! : EMPTY;
  for (let y = Math.max(0, from - 1); y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!isLine(at(x, y))) continue;
      let touches = false;
      for (let ey = -1; ey <= 1 && !touches; ey++)
        for (let ex = -1; ex <= 1 && !touches; ex++) {
          const v = at(x + ex, y + ey);
          if ((ex || ey) && v !== EMPTY && !isLine(v)) touches = true;
        }
      if (!touches) cells[y * w + x] = EMPTY;
    }
  for (let y = Math.max(0, from - 1); y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = at(x, y);
      if (v === EMPTY || isLine(v)) continue;
      for (const [ex, ey] of N4)
        if (at(x + ex, y + ey) === EMPTY && x + ex >= 0 && x + ex < w && y + ey >= 0 && y + ey < h)
          cells[(y + ey) * w + x + ex] = LINE;
    }
}

/** The lowest row with a cell, so the spare row goes when nothing used it. */
function trimmed(cells: Int16Array, w: number, h: number): Sprite {
  let last = h - 1;
  while (last > 0 && cells.subarray(last * w, (last + 1) * w).every((v) => v === EMPTY)) last--;
  return { w, h: last + 1, cells: cells.subarray(0, (last + 1) * w) };
}

type SleeveBoxes = { short: Box; long: Box; torn?: Box };
const mapSleeves = (s: SleeveBoxes, f: (b: Box) => Box): SleeveBoxes => ({
  ...s,
  short: f(s.short),
  long: f(s.long),
  ...(s.torn ? { torn: f(s.torn) } : {}),
});

/** A step of the crawl in a drawn view: the stance with its arms nudged, or lurched in the side view. */
export function crawlStep(stance: ZombiePose, view: HeroView, step: 0 | 1): ZombiePose {
  const move = CRAWL_MOVES[view];
  const figure = stance.form.figure!;
  const id = `${stance.id}_${view}${step}`;
  const label = `${stance.form.label} ${step === 0 ? 'A' : 'B'}`;
  const front = stance.form.front;

  if (move.kind === 'lurch') {
    // step A: the rows from the hips down move a column right; step B: the rows above do
    const moves = (y: number) => y >= move.split === (step === 0);
    const w = figure.w + 1;
    const shifted = (src: Sprite): Sprite => {
      const cells = new Int16Array(w * src.h).fill(EMPTY);
      for (let y = 0; y < src.h; y++)
        for (let x = 0; x < src.w; x++)
          cells[y * w + x + (moves(y) ? 1 : 0)] = src.cells[y * src.w + x]!;
      return { w, h: src.h, cells };
    };
    const box = ([x0, y0, x1, y1]: Box): Box => {
      let any = false;
      let all = true;
      for (let y = y0; y <= y1; y++) moves(y) ? (any = true) : (all = false);
      return [x0 + (all ? 1 : 0), y0, x1 + (any ? 1 : 0), y1];
    };
    const headMap = stance.form.headMap;
    return {
      ...stance,
      id,
      form: {
        ...stance.form,
        id,
        label,
        figure: shifted(figure),
        ...(headMap
          ? {
              headMap: (x: number, y: number) => {
                const [fx, fy] = headMap(x, y);
                return [fx + (moves(fy) ? 1 : 0), fy] as const;
              },
            }
          : {}),
        ...(front ? { front: shifted(front) } : {}),
      },
      w,
      torso: box(stance.torso),
      neck: stance.neck.map(box),
      shoulders: stance.shoulders.map(box),
      sleeveL: mapSleeves(stance.sleeveL, box),
      sleeveR: mapSleeves(stance.sleeveR, box),
      pants: stance.pants.map(box),
      shorts: stance.shorts.map(box),
      shoeL: box(stance.shoeL),
      shoeR: box(stance.shoeR),
      flats: stance.flats.map(box),
      collar: stance.collar.map(box),
      hem: box(stance.hem),
      skirt: { ...stance.skirt, x: stance.skirt.x + (moves(stance.skirt.y) ? 1 : 0) },
      ...(stance.dress
        ? { dress: { ...stance.dress, x: stance.dress.x + (moves(stance.dress.y) ? 1 : 0) } }
        : {}),
      ...(stance.legSplit !== undefined
        ? { legSplit: stance.legSplit + (moves(move.split) ? 1 : 0) }
        : {}),
      // step B moved the body: the frame draws a column further left so the head stays and the hands go back
      ...(step === 1 ? { originDx: 1 } : {}),
    };
  }

  // one row more at the bottom for the arm that reaches toward the viewer
  const h = figure.h + 1;
  const cells = new Int16Array(figure.w * h).fill(EMPTY);
  cells.set(figure.cells, 0);
  const forwardArm = (step === 0) === (move.personLeft === 'left') ? 'left' : 'right';
  const dyOf = (side: 'left' | 'right'): 1 | -1 =>
    side === forwardArm ? move.forward : move.forward === 1 ? -1 : 1;
  nudge(cells, figure.w, h, move.left, move.from, dyOf('left'));
  nudge(cells, figure.w, h, move.right, move.from, dyOf('right'));
  tidy(cells, figure.w, h, move.from);
  const out = trimmed(cells, figure.w, h);
  const paddedFront: Sprite | undefined = front
    ? {
        w: front.w,
        h: out.h,
        cells: (() => {
          const c = new Int16Array(front.w * out.h).fill(EMPTY);
          c.set(front.cells.subarray(0, Math.min(front.cells.length, c.length)), 0);
          return c;
        })(),
      }
    : undefined;
  // the sleeves end a row lower or higher with their arm
  const grow =
    (side: 'left' | 'right') =>
    (b: Box): Box =>
      b[3] >= move.from ? [b[0], b[1], b[2], b[3] + dyOf(side)] : b;
  return {
    ...stance,
    id,
    form: {
      ...stance.form,
      id,
      label,
      figure: out,
      ...(paddedFront ? { front: paddedFront } : {}),
    },
    sleeveL: mapSleeves(stance.sleeveL, grow('left')),
    sleeveR: mapSleeves(stance.sleeveR, grow('right')),
  };
}
