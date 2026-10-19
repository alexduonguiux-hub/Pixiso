/**
 * The two walk steps of each drawn view as poses (D-095): the regions a look's
 * clothes land on, read off the step frames of hero64.frames.ts the way
 * views64.ts reads them off the standing frames. Index 0 is step A, 1 is step
 * B (`heroFrames(view)[0]` and `[2]`); the head on every step is the standing
 * head (hero64.ts `withStandingHead`), so head items map through the column
 * shift that aligns the step's canvas with the standing one, and figure-space
 * items move by the same shift (`extrasDx`).
 *
 * The regions follow the reference stride: the forward leg is the near one
 * (lit) and the trailing leg the far one; a sleeve ends where the arm bends,
 * so the fist that swings in front of the hip stays bare under a short or a
 * long sleeve alike. Only S, N and W have steps drawn so far.
 */
import { blank } from './draw.js';
import type { Sprite } from './format.js';
import { heroFrames, type Box, type HeroView, type WalkKey } from './hero64.js';
import type { ZombiePose } from './hero64.poses.js';
import type { FormSpec } from './heroforms.js';

export type WalkView = Extract<HeroView, 'S' | 'N' | 'W'>;
export const WALK_VIEWS_DRAWN: readonly WalkView[] = ['S', 'N', 'W'];

/** The figure's cells inside the boxes, on the figure's own canvas: what stays in front of every overlay. */
function frontOf(figure: Sprite, boxes: readonly Box[]): Sprite {
  const out = blank(figure.w, figure.h);
  for (const [x0, y0, x1, y1] of boxes)
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) out.cells[y * figure.w + x] = figure.cells[y * figure.w + x]!;
  return out;
}

/**
 * The step's form: its own figure, with the head grid moved by the canvas shift to the standing frame, and
 * the arm that swings in front of the body (its forearm, fist and their outline) kept in front of every
 * overlay, so a bag on the hip or a coat tail never covers it.
 */
function stepForm(
  view: WalkView,
  step: 0 | 1,
  label: string,
  front: readonly Box[],
): { form: FormSpec; dx: number; walkKey: WalkKey } {
  const frames = heroFrames(view);
  const stand = frames[1];
  const frame = frames[step === 0 ? 0 : 2];
  const dx = stand.x - frame.x;
  return {
    form: {
      id: `walk_${view.toLowerCase()}${step}`,
      label,
      figure: frame.sprite,
      headMap: (x, y) => [x + dx, y],
      front: frontOf(frame.sprite, front),
    },
    dx,
    walkKey: `${view}${step}`,
  };
}

const sa = stepForm('S', 0, 'Bước A (S)', [
  [0, 22, 5, 22],
  [1, 23, 6, 23],
  [1, 24, 7, 24],
  [2, 25, 7, 25],
  [3, 26, 6, 26],
  [3, 27, 5, 27],
]);
/** Front, step A: the person's left leg (the viewer's right) forward, the left fist swung in front of the hip. */
export const WALK_S_A: ZombiePose = {
  id: 'walk_s0',
  form: sa.form,
  extrasDx: sa.dx,
  walkKey: sa.walkKey,
  w: 16,
  torso: [5, 15, 11, 27],
  neck: [
    [5, 15, 9, 16],
    [6, 17, 8, 17],
    [5, 24, 6, 26],
  ],
  shoulders: [
    [2, 15, 4, 18],
    [12, 15, 14, 18],
  ],
  sleeveL: { short: [0, 18, 3, 21], long: [0, 18, 4, 23], torn: [0, 18, 3, 20] },
  sleeveR: { short: [12, 18, 15, 21], long: [12, 18, 15, 22] },
  pants: [
    [0, 28, 7, 33],
    [8, 28, 15, 34],
  ],
  shorts: [
    [0, 28, 7, 31],
    [8, 28, 15, 31],
  ],
  legSplit: 8,
  nearLeg: 'R',
  shoeL: [3, 34, 6, 36],
  shoeR: [8, 35, 11, 37],
  flats: [
    [3, 35, 6, 36],
    [8, 36, 11, 37],
  ],
  collar: [
    [5, 17, 5, 17],
    [9, 17, 9, 17],
    [6, 18, 8, 18],
  ],
  hem: [6, 27, 10, 27],
  frayedXs: [6, 8, 10],
  chest: [5, 20],
  // the buckle two columns left of the hem's middle: the fist in front takes the strap's right end (D-095)
  belt: [6, 27],
  skirt: {
    x: 1,
    y: 28,
    rows: ['.o&kkKkkKkKo.', '.o&kkKkkKkKo.', 'o&kkKkkKkkkKo', 'o&kkKkkKkkkKo', 'oo.ooo.oooo.o'],
  },
  dress: {
    x: 0,
    y: 28,
    rows: [
      '..o&kkKkkKkKo..',
      '..o&kkKkkKkKo..',
      '.o&kkKkKKkkkKo.',
      '.o&kkKkKKkkkKo.',
      '.o&kkKkKKkKkKo.',
      'o&kookkKkkkooKo',
      'ooo..oooooo..oo',
    ],
  },
};

const sb = stepForm('S', 1, 'Bước B (S)', [
  [11, 22, 15, 22],
  [9, 23, 14, 23],
  [8, 24, 14, 25],
  [9, 26, 12, 26],
  [10, 27, 12, 27],
]);
/** Front, step B: the person's right leg (the viewer's left) forward, lit, sole showing; the right fist swung in front of the hip. */
export const WALK_S_B: ZombiePose = {
  id: 'walk_s1',
  form: sb.form,
  extrasDx: sb.dx,
  walkKey: sb.walkKey,
  w: 16,
  torso: [4, 15, 10, 27],
  // the neck's V and the right fist in front of the hip stay skin
  neck: [
    [6, 15, 10, 16],
    [7, 17, 9, 17],
    [9, 24, 10, 26],
  ],
  shoulders: [
    [1, 15, 3, 18],
    [11, 15, 13, 18],
  ],
  // the left arm swings back, foreshortened: its hand starts on row 23
  sleeveL: { short: [0, 18, 4, 21], long: [0, 18, 4, 22], torn: [0, 18, 4, 20] },
  // the right arm swings forward: the long sleeve follows the forearm down to the fist
  sleeveR: { short: [12, 18, 15, 21], long: [11, 18, 15, 23] },
  pants: [
    [0, 28, 8, 34],
    [9, 28, 15, 33],
  ],
  shorts: [
    [0, 28, 8, 31],
    [9, 28, 15, 31],
  ],
  legSplit: 8,
  nearLeg: 'L',
  shoeL: [4, 35, 7, 37],
  shoeR: [9, 34, 12, 36],
  flats: [
    [4, 36, 7, 37],
    [9, 35, 12, 36],
  ],
  collar: [
    [6, 17, 6, 17],
    [10, 17, 10, 17],
    [7, 18, 9, 18],
  ],
  hem: [5, 27, 9, 27],
  frayedXs: [5, 7, 8],
  chest: [6, 20],
  // the buckle at the hem's left end: the fist in front covers the strap's right end (D-095)
  belt: [5, 27],
  skirt: {
    x: 2,
    y: 28,
    rows: ['.o&kkKkkKkKo.', '.o&kkKkkKkKo.', 'o&kkKkkKkkkKo', 'o&kkKkkKkkkKo', 'oo.ooo.oooo.o'],
  },
  dress: {
    x: 1,
    y: 28,
    rows: [
      '..o&kkKkkKkKo..',
      '..o&kkKkkKkKo..',
      '.o&kkKkKKkkkKo.',
      '.o&kkKkKKkkkKo.',
      '.o&kkKkKKkKkKo.',
      'o&kookkKkkkooKo',
      'ooo..oooooo..oo',
    ],
  },
};

const na = stepForm('N', 0, 'Bước A (N)', [
  [10, 22, 14, 26],
  [10, 27, 13, 27],
]);
/** Back, step A: the viewer's-left leg forward; the left arm swings back (seen whole), the right fist forward. */
export const WALK_N_A: ZombiePose = {
  id: 'walk_n0',
  form: na.form,
  extrasDx: na.dx,
  walkKey: na.walkKey,
  w: 15,
  torso: [3, 15, 10, 27],
  neck: [[6, 15, 8, 15]],
  shoulders: [
    [0, 15, 2, 18],
    [11, 15, 13, 18],
  ],
  // the back-swinging arm's long sleeve reaches the hand's first row: six rows, so its cuff can grow to three cells
  sleeveL: { short: [0, 18, 3, 21], long: [0, 18, 3, 23], torn: [0, 18, 3, 20] },
  sleeveR: { short: [11, 18, 14, 21], long: [11, 18, 14, 23] },
  pants: [
    [0, 28, 7, 34],
    [8, 28, 14, 33],
  ],
  shorts: [
    [0, 28, 7, 31],
    [8, 28, 14, 31],
  ],
  legSplit: 7,
  nearLeg: 'L',
  shoeL: [3, 35, 6, 37],
  shoeR: [8, 34, 11, 36],
  flats: [
    [3, 36, 6, 37],
    [8, 35, 11, 36],
  ],
  collar: [
    [5, 15, 5, 15],
    [9, 15, 9, 15],
    [6, 16, 8, 16],
  ],
  hem: [4, 27, 9, 27],
  frayedXs: [4, 6, 8],
  skirt: {
    x: 1,
    y: 28,
    rows: ['.o&kkKkkKkKo.', '.o&kkKkkKkKo.', 'o&kkKkkKkkkKo', 'o&kkKkkKkkkKo', 'oo.ooo.oooo.o'],
  },
  dress: {
    x: 0,
    y: 28,
    rows: [
      '..o&kkKkkKkKo..',
      '..o&kkKkkKkKo..',
      '.o&kkKkKKkkkKo.',
      '.o&kkKkKKkkkKo.',
      '.o&kkKkKKkKkKo.',
      'o&kookkKkkkooKo',
      'ooo..oooooo..oo',
    ],
  },
};

const nb = stepForm('N', 1, 'Bước B (N)', [
  [0, 22, 4, 26],
  [1, 27, 4, 27],
]);
/** Back, step B: the viewer's-right leg forward; the left fist swings forward, the right arm back. */
export const WALK_N_B: ZombiePose = {
  id: 'walk_n1',
  form: nb.form,
  extrasDx: nb.dx,
  walkKey: nb.walkKey,
  w: 15,
  torso: [4, 15, 11, 27],
  neck: [[6, 15, 8, 15]],
  shoulders: [
    [1, 15, 3, 18],
    [12, 15, 14, 18],
  ],
  sleeveL: { short: [0, 18, 3, 21], long: [0, 18, 3, 23], torn: [0, 18, 3, 20] },
  sleeveR: { short: [12, 18, 14, 21], long: [12, 18, 14, 23] },
  pants: [
    [0, 28, 7, 33],
    [8, 28, 14, 34],
  ],
  shorts: [
    [0, 28, 7, 31],
    [8, 28, 14, 31],
  ],
  legSplit: 8,
  nearLeg: 'R',
  shoeL: [3, 34, 6, 36],
  shoeR: [8, 35, 11, 37],
  flats: [
    [3, 35, 6, 36],
    [8, 36, 11, 37],
  ],
  collar: [
    [5, 15, 5, 15],
    [9, 15, 9, 15],
    [6, 16, 8, 16],
  ],
  hem: [5, 27, 10, 27],
  frayedXs: [5, 7, 9],
  skirt: WALK_N_A.skirt,
  ...(WALK_N_A.dress ? { dress: WALK_N_A.dress } : {}),
};

const wa = stepForm('W', 0, 'Bước A (W)', [
  [5, 21, 9, 21],
  [4, 22, 8, 22],
  [4, 23, 13, 23],
  [3, 24, 12, 24],
  [3, 25, 10, 25],
  [4, 26, 9, 26],
  [5, 27, 7, 27],
]);
/**
 * Side, step A: the near leg strides forward (left), the far leg trails; the near arm swings forward with
 * its forearm level in front of the chest and the fist out past the belly; the far arm shows as a strip
 * behind the back. The torso box spans the whole trunk and excepts the near arm's cells, like the standing
 * side view's arm column.
 */
export const WALK_W_A: ZombiePose = {
  id: 'walk_w0',
  form: wa.form,
  extrasDx: wa.dx,
  walkKey: wa.walkKey,
  w: 22,
  torso: [8, 15, 15, 28],
  neck: [
    [10, 15, 15, 15],
    [9, 17, 12, 17],
    [8, 18, 11, 18],
    [8, 19, 10, 19],
    [8, 20, 9, 20],
    [8, 23, 12, 23],
    [8, 24, 10, 24],
    [8, 25, 9, 25],
  ],
  shoulders: [[9, 17, 12, 17]],
  sleeveL: { short: [8, 17, 12, 20], long: [8, 17, 12, 25], torn: [8, 17, 12, 18] },
  // the far arm's strip behind the back: a long sleeve covers it whole (a two-cell hand is a piece at 1x)
  sleeveR: { short: [16, 19, 17, 22], long: [16, 19, 17, 25] },
  // torso cells inside the near sleeve's box (the forearm crosses the chest diagonally)
  sleeveExcept: [
    [12, 19, 12, 19],
    [11, 20, 12, 20],
    [10, 21, 12, 21],
    [9, 22, 12, 22],
    [11, 25, 12, 25],
  ],
  pants: [
    [0, 29, 13, 35],
    [14, 29, 21, 35],
  ],
  shorts: [
    [0, 29, 13, 32],
    [14, 29, 21, 32],
  ],
  legSplit: 14,
  nearLeg: 'L',
  shoeL: [0, 36, 7, 40],
  shoeR: [14, 36, 21, 39],
  flats: [
    [0, 39, 7, 40],
    [14, 38, 21, 39],
  ],
  collar: [[9, 16, 14, 16]],
  hem: [8, 28, 15, 28],
  frayedXs: [9, 11, 13, 15],
  chest: [12, 20],
  skirt: {
    x: 5,
    y: 29,
    rows: [
      '.o&kkKkkKkKo..',
      '.o&kkKkkKkkKo.',
      'o&kkKkkKkkKkKo',
      'o&kkKkkKkkKkKo',
      'oooooooooooooo',
    ],
  },
  dress: {
    x: 4,
    y: 29,
    rows: [
      '..o&kkKkkKkKo...',
      '..o&kkKkkKkkKo..',
      '.o&kkKkkKkkKkKo.',
      '.o&kkKkkKkkKkKo.',
      'o&kkKkkKkkKkKkKo',
      'o&kkKkkKkkKkKkKo',
      'oooooooooooooooo',
    ],
  },
};

const wb = stepForm('W', 1, 'Bước B (W)', [
  [13, 17, 16, 17],
  [12, 18, 16, 18],
  [13, 19, 17, 20],
  [14, 21, 17, 21],
  [14, 22, 18, 22],
  [13, 23, 18, 26],
  [14, 27, 17, 27],
  [15, 28, 16, 28],
]);
/**
 * Side, step B: the far leg swings forward (in shadow), the near leg trails flat on the ground; the near
 * arm hangs back behind the hip, the far fist shows in front of the belly.
 */
export const WALK_W_B: ZombiePose = {
  id: 'walk_w1',
  form: wb.form,
  extrasDx: wb.dx,
  walkKey: wb.walkKey,
  w: 21,
  torso: [7, 15, 14, 28],
  neck: [
    [9, 15, 14, 15],
    [13, 17, 14, 17],
    [13, 18, 14, 18],
    [14, 19, 14, 20],
    [14, 23, 14, 26],
  ],
  shoulders: [[13, 17, 15, 17]],
  sleeveL: { short: [13, 18, 17, 22], long: [13, 18, 17, 25], torn: [13, 18, 17, 19] },
  sleeveR: { short: [13, 18, 17, 22], long: [13, 18, 17, 25] },
  sleeveExcept: [[13, 21, 13, 22]],
  pants: [
    [0, 29, 8, 34],
    [9, 29, 20, 35],
  ],
  shorts: [
    [0, 29, 8, 32],
    [9, 29, 20, 32],
  ],
  legSplit: 9,
  nearLeg: 'R',
  shoeL: [0, 35, 7, 38],
  shoeR: [13, 36, 20, 39],
  flats: [
    [0, 37, 7, 38],
    [13, 38, 20, 39],
  ],
  collar: [[8, 16, 13, 16]],
  hem: [7, 28, 14, 28],
  frayedXs: [8, 10, 12, 14],
  chest: [8, 20],
  skirt: {
    x: 4,
    y: 29,
    rows: [
      '..o&kkKkkKkKo.',
      '.o&kkKkkKkkKo.',
      '.o&kkKkkKkkKko',
      'o&kkKkkKkkKkKo',
      'oooooooooooooo',
    ],
  },
  dress: {
    x: 3,
    y: 29,
    rows: [
      '...o&kkKkkKkKo...',
      '..o&kkKkkKkkKo...',
      '..o&kkKkkKkkKko..',
      '.o&kkKkkKkkKkKo..',
      '.o&kkKkkKkkKkKko.',
      'o&kkKkkKkkKkKkKko',
      'ooooooooooooooooo',
    ],
  },
};

/** The two steps of each drawn walk view: [step A, step B]. */
export const WALK_VIEWS: Record<WalkView, readonly [ZombiePose, ZombiePose]> = {
  S: [WALK_S_A, WALK_S_B],
  N: [WALK_N_A, WALK_N_B],
  W: [WALK_W_A, WALK_W_B],
};
