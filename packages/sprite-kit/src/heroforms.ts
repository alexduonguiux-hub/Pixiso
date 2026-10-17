/**
 * Body forms derived from the hand-drawn hero mannequin (hero64.ts) by
 * duplicating rows and columns of the template: a fat build, a heavy build and
 * giants. Duplication keeps every hand-placed pixel (ears, eyes, fists, feet)
 * and keeps the outline one pixel wide as long as the duplicated columns are
 * interior ones, so each form is a parameter set, not a second drawing. The
 * figure stays mirror-symmetric around its centre column: columns are always
 * duplicated in mirrored pairs, the centre column an even number of times, so
 * every row keeps an odd width and centres on the same pixel.
 */
import { blank } from './draw.js';
import { EMPTY, type Sprite } from './format.js';
import { HERO_FIGURE_W, HERO_S_FIGURE } from './hero64.js';
import { HERO_GIANT15_S, HERO_GIANT2_S } from './hero64.giant.js';
import { HERO_HEAVY_S } from './hero64.heavy.js';
import { HERO_ZOMBIE_S, ZOMBIE_HEAD_TOP, zombieHeadShift } from './hero64.zombie.js';

/** Extra copies of columns for a band of source rows. `pairs` lists a column left of the centre with its extra count; the mirrored column gets the same. */
export interface ColumnBand {
  rows: readonly [y0: number, y1: number];
  pairs?: ReadonlyArray<readonly [x: number, extra: number]>;
  /** Extra copies of the centre column (must be even). */
  center?: number;
}

/** Maps base-head coordinates (the standing 17×40 figure) onto a form's own grid. */
export type HeadMap = (x: number, y: number) => readonly [number, number];

export interface FormSpec {
  id: string;
  label: string;
  /** Where the base head sits on this form (default: same place). */
  headMap?: HeadMap;
  /** Source rows to repeat, with the number of extra copies. */
  rows?: ReadonlyArray<readonly [y: number, extra: number]>;
  bands?: readonly ColumnBand[];
  /** Integer nearest-neighbour scale applied last (placeholder until a form is drawn). */
  scale?: number;
  /** A hand-drawn figure: used as is, nothing derived. */
  figure?: Sprite;
  /**
   * Figure cells that stay in front of every overlay (same canvas as the
   * figure): a body part that hides the head, such as a hump seen from behind.
   */
  front?: Sprite;
}

const CENTER = (HERO_FIGURE_W - 1) / 2;

/** Repeat counts per source column for one source row. */
function columnRepeats(spec: FormSpec, y: number): number[] {
  const rep = new Array<number>(HERO_FIGURE_W).fill(1);
  for (const band of spec.bands ?? []) {
    if (y < band.rows[0] || y > band.rows[1]) continue;
    for (const [x, extra] of band.pairs ?? []) {
      rep[x]! += extra;
      rep[2 * CENTER - x]! += extra;
    }
    if (band.center) {
      if (band.center % 2) throw new Error(`${spec.id}: centre extra must be even`);
      rep[CENTER]! += band.center;
    }
  }
  return rep;
}

/** Nearest-neighbour integer scale of a template. */
export function scaleSprite(s: Sprite, k: number): Sprite {
  const out = blank(s.w * k, s.h * k);
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const v = s.cells[y * s.w + x]!;
      if (v < 0) continue;
      for (let dy = 0; dy < k; dy++)
        for (let dx = 0; dx < k; dx++) out.cells[(y * k + dy) * out.w + (x * k + dx)] = v;
    }
  return out;
}

/** Builds the figure of a form from the base mannequin. */
export function buildForm(spec: FormSpec, base: Sprite = HERO_S_FIGURE): Sprite {
  if (spec.figure) return spec.figure;
  const rowExtra = new Map<number, number>(spec.rows ?? []);
  const rows: { cells: number[] }[] = [];
  for (let y = 0; y < base.h; y++) {
    const rep = columnRepeats(spec, y);
    const cells: number[] = [];
    for (let x = 0; x < base.w; x++) {
      const v = base.cells[y * base.w + x]!;
      for (let i = 0; i < rep[x]!; i++) cells.push(v);
    }
    const copies = 1 + (rowExtra.get(y) ?? 0);
    for (let i = 0; i < copies; i++) rows.push({ cells });
  }
  const w = Math.max(...rows.map((r) => r.cells.length));
  const out = blank(w, rows.length);
  rows.forEach((row, y) => {
    if ((w - row.cells.length) % 2)
      throw new Error(`${spec.id}: row parity differs from the widest row`);
    const x0 = (w - row.cells.length) / 2;
    row.cells.forEach((v, i) => {
      if (v !== EMPTY) out.cells[y * w + x0 + i] = v;
    });
  });
  return spec.scale && spec.scale > 1 ? scaleSprite(out, spec.scale) : out;
}

/** The base drawing itself, for line-ups. */
export const FORM_BASE: FormSpec = { id: 'base', label: 'Thường' };

/**
 * Fat build: same height, round face, chest and belly four to six columns
 * wider, hips and thighs to match, feet one column wider on each side.
 */
export const FORM_FAT: FormSpec = {
  id: 'fat',
  label: 'Mập',
  headMap: (x, y) => (y === 0 ? [x + 3, y] : [x < 8 ? x + 2 : x > 8 ? x + 4 : x + 3, y]),
  bands: [
    { rows: [1, 14], center: 2 }, // round face, wider chin line
    { rows: [15, 20], center: 4 }, // neck well and shoulders
    { rows: [21, 23], center: 4 }, // chest
    { rows: [24, 28], center: 6 }, // belly
    { rows: [29, 29], pairs: [[5, 3]] }, // hips: the skin beside the crotch, not the crotch line
    { rows: [30, 35], pairs: [[5, 2]] }, // thighs and calves
    {
      rows: [36, 39],
      pairs: [
        [4, 1],
        [5, 1],
      ],
    }, // feet
  ],
};

/** Heavy build: a hand drawing, 23×45 (hero64.heavy.ts); the base head sits three columns to the right. */
export const FORM_HEAVY: FormSpec = {
  id: 'heavy',
  label: 'To con',
  headMap: (x, y) => [x + 3, y],
  figure: HERO_HEAVY_S,
};

/** Giant at about ×1.5: a hand drawing, 25×60 (hero64.giant.ts). */
export const FORM_GIANT_15: FormSpec = {
  id: 'giant15',
  label: 'Khổng lồ ×1,5',
  figure: HERO_GIANT15_S,
};

/** Giant at ×2: a hand drawing, 33×80 (hero64.giant.ts). */
export const FORM_GIANT_2: FormSpec = { id: 'giant2', label: 'Khổng lồ ×2', figure: HERO_GIANT2_S };

/** Zombie stance: drooped, tilted head, uneven shoulders, open hands, a dragged foot (hero64.zombie.ts). */
export const FORM_ZOMBIE: FormSpec = {
  id: 'zombie',
  label: 'Dáng zombie',
  headMap: (x, y) => [x + zombieHeadShift(y), y + ZOMBIE_HEAD_TOP],
  figure: HERO_ZOMBIE_S,
};

export const FORMS: readonly FormSpec[] = [
  FORM_BASE,
  FORM_FAT,
  FORM_HEAVY,
  FORM_ZOMBIE,
  FORM_GIANT_15,
  FORM_GIANT_2,
];
