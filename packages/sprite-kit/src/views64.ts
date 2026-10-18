/**
 * The standing base figure in every drawn view, described as a pose
 * (hero64.poses.ts `ZombiePose`): the regions a look's clothes land on. S is
 * `POSE_STAND`; SW/NW are the hand-drawn three-quarter figures; W and N are
 * the transcribed side and back frames. Hair, hats and faces are drawn per
 * view in cast64.ts (`ViewItem`), not derived from the S drawing.
 */
import { heroStand, type HeroView } from './hero64.js';
import { HERO_NW_FIGURE, HERO_SW_FIGURE } from './hero64.views.js';
import { POSE_STAND, type ZombiePose } from './hero64.poses.js';
import { buildForm, FORM_FAT, FORM_HEAVY, type FormSpec } from './heroforms.js';
import { FORM_BRUTE } from './hero64.mutants.js';
import type { Sprite } from './format.js';

const standForm = (id: string, label: string, figure: Sprite): FormSpec => ({
  id,
  label,
  figure,
  headMap: (x, y) => [x, y],
});

/** Three-quarter front: as S, with the far (left) shoulder two columns in, the far arm one column, the far foot one row back. */
export const STAND_SW: ZombiePose = {
  ...POSE_STAND,
  id: 'stand_sw',
  form: standForm('stand_sw', 'Đứng (SW)', HERO_SW_FIGURE),
  shoulders: [
    [2, 15, 3, 18],
    [13, 15, 15, 18],
  ],
  sleeveL: { short: [1, 18, 4, 22], long: [1, 18, 4, 24], torn: [1, 18, 4, 20] },
  // The far (left) foot sits one row higher: further back.
  shoeL: [1, 35, 7, 38],
  flats: [
    [1, 36, 7, 38],
    [9, 37, 15, 39],
  ],
};

/**
 * Side view (14×41). The near arm hangs in front of the torso (columns 4–8
 * on rows 18–23); the torso box covers columns 8–12 and excludes that arm
 * column through `neck`, which the torso remap treats as its exceptions.
 * No tie, badge, number or belt can be seen from the side.
 */
export const STAND_W: ZombiePose = {
  id: 'stand_w',
  form: standForm('stand_w', 'Đứng (W)', heroStand('W').sprite),
  w: 14,
  torso: [8, 16, 12, 29],
  neck: [[8, 16, 8, 23]],
  shoulders: [[5, 16, 7, 17]],
  sleeveL: { short: [3, 18, 8, 22], long: [3, 18, 8, 25], torn: [3, 18, 8, 19] },
  sleeveR: { short: [3, 18, 8, 22], long: [3, 18, 8, 25] },
  pants: [[3, 29, 13, 35]],
  shorts: [[3, 29, 13, 32]],
  shoeL: [2, 36, 7, 40],
  shoeR: [8, 36, 13, 40],
  flats: [
    [2, 39, 7, 40],
    [8, 39, 13, 40],
  ],
  collar: [[6, 16, 10, 16]],
  hem: [9, 28, 11, 28],
  frayedXs: [9, 11],
  chest: [10, 20],
  gash: [4, 23],
  skirt: {
    x: 3,
    y: 29,
    rows: ['o&kkKkkKo..', 'o&kkKkkkKo.', 'o&kkKkkkKo.', 'o&kkKkkKkKo', 'ooooooooooo'],
  },
  dress: {
    x: 3,
    y: 29,
    rows: [
      'o&kkKkkKo..',
      'o&kkKkkkKo.',
      'o&kkKkkkKo.',
      'o&kkKkkKkKo',
      'o&kkKkkKkKo',
      'o&kkKkkKkKo',
      'ooooooooooo',
    ],
  },
};

/** Back view: same columns as S; the collar is a straight line, boots start at the heel row 35. */
export const STAND_N: ZombiePose = {
  id: 'stand_n',
  form: standForm('stand_n', 'Đứng (N)', heroStand('N').sprite),
  w: 17,
  torso: [4, 15, 12, 28],
  neck: [[6, 15, 10, 16]],
  shoulders: [
    [1, 15, 3, 18],
    [13, 15, 15, 18],
  ],
  sleeveL: { short: [0, 18, 4, 22], long: [0, 18, 4, 24], torn: [0, 18, 4, 20] },
  sleeveR: { short: [12, 18, 16, 22], long: [12, 18, 16, 24] },
  pants: [[0, 29, 16, 34]],
  shorts: [[0, 29, 16, 32]],
  shoeL: [1, 35, 7, 39],
  shoeR: [9, 35, 15, 39],
  flats: [
    [1, 37, 7, 39],
    [9, 37, 15, 39],
  ],
  collar: [[6, 17, 10, 17]],
  hem: [5, 28, 11, 28],
  frayedXs: [5, 7, 9, 11],
  number: [7, 21],
  stains: [5, 21],
  gash: [2, 23],
  skirt: POSE_STAND.skirt,
  ...(POSE_STAND.dress ? { dress: POSE_STAND.dress } : {}),
};

/** Three-quarter back: as N, with the far (right) shoulder two columns in, the far arm one column, the far foot one row back. */
export const STAND_NW: ZombiePose = {
  ...STAND_N,
  id: 'stand_nw',
  form: standForm('stand_nw', 'Đứng (NW)', HERO_NW_FIGURE),
  shoulders: [
    [1, 15, 3, 18],
    [13, 15, 14, 18],
  ],
  sleeveR: { short: [12, 18, 15, 22], long: [12, 18, 15, 24] },
  pants: [[0, 29, 15, 34]],
  // The far (right) foot sits one row higher: further back.
  shoeR: [9, 35, 15, 38],
  flats: [
    [1, 37, 7, 39],
    [9, 36, 15, 38],
  ],
};

/**
 * The heavy build standing (23×45, hero64.heavy.ts) as a pose: torso columns
 * 6–16 from the trapezius row 15 to the hem row 33, a neck well between the
 * tank-top straps (columns 7 and 15), arms five columns thick down to row 34,
 * hips on row 34, legs 35–40, boots 41–44. Its other views come from
 * hero64.poses.views.ts like a zombie pose's.
 */
export const STAND_HEAVY: ZombiePose = {
  id: 'heavy',
  form: FORM_HEAVY,
  w: 23,
  torso: [6, 15, 16, 30],
  neck: [
    [8, 15, 14, 18],
    [6, 15, 6, 18],
    [16, 15, 16, 18],
  ],
  shoulders: [
    [5, 16, 6, 17],
    [16, 16, 17, 17],
    [2, 18, 6, 19],
    [16, 18, 20, 19],
  ],
  sleeveL: { short: [0, 20, 5, 23], long: [0, 20, 5, 25], torn: [0, 20, 5, 21] },
  sleeveR: { short: [17, 20, 22, 23], long: [17, 20, 22, 25] },
  pants: [[0, 31, 22, 40]],
  shorts: [[0, 31, 22, 35]],
  shoeL: [3, 41, 10, 44],
  shoeR: [12, 41, 19, 44],
  flats: [
    [3, 43, 10, 44],
    [12, 43, 19, 44],
  ],
  collar: [[8, 18, 14, 18]],
  hem: [7, 30, 15, 30],
  frayedXs: [7, 9, 11, 13, 15],
  chest: [8, 22],
  number: [10, 22],
  tie: [11, 19],
  belt: [11, 30],
  stains: [8, 24],
  gash: [2, 24],
  skirt: {
    x: 2,
    y: 31,
    rows: [
      '.o&kkKkkKkkKkkKkKo.',
      '.o&kkKkkKkkKkkKkKo.',
      'o&kkKkkKkkKkkKkkkKo',
      'o&kkKkkKkkKkkKkkkKo',
      'oo.ooo.ooooo.ooo.oo',
    ],
  },
};

/**
 * The fat build standing (23×40, FORM_FAT's band expansion of the base) as a
 * pose: torso columns 5–17, belly six columns wider than the base, thighs and
 * feet to match. Its other views are the same bands on that view's base
 * figure (hero64.poses.views.ts); the head is drawn wider, so items in head
 * space map through `headCols` there and `FORM_FAT.headMap` here.
 */
export const STAND_FAT: ZombiePose = {
  id: 'fat',
  form: { ...FORM_FAT, figure: buildForm(FORM_FAT) },
  w: 23,
  torso: [5, 15, 17, 28],
  neck: [
    [8, 15, 14, 16],
    [9, 17, 13, 17],
  ],
  shoulders: [
    [2, 15, 4, 18],
    [18, 15, 20, 18],
  ],
  sleeveL: { short: [0, 18, 5, 22], long: [0, 18, 5, 24], torn: [0, 18, 5, 20] },
  sleeveR: { short: [17, 18, 22, 22], long: [17, 18, 22, 24] },
  pants: [[0, 29, 22, 35]],
  shorts: [[0, 29, 22, 32]],
  shoeL: [2, 36, 10, 39],
  shoeR: [12, 36, 20, 39],
  flats: [
    [2, 38, 10, 39],
    [12, 38, 20, 39],
  ],
  collar: [
    [8, 17, 8, 17],
    [14, 17, 14, 17],
    [9, 18, 13, 18],
  ],
  hem: [6, 28, 16, 28],
  frayedXs: [6, 8, 10, 12, 14, 16],
  chest: [7, 20],
  number: [10, 21],
  tie: [11, 19],
  belt: [11, 28],
  stains: [8, 22],
  gash: [2, 23],
  skirt: {
    x: 2,
    y: 29,
    rows: [
      '.o&kkKkkKkkKkkKkKo.',
      '.o&kkKkkKkkKkkKkKo.',
      'o&kkKkkKkkKkkKkkkKo',
      'o&kkKkkKkkKkkKkkkKo',
      'oo.ooo.ooooo.ooo.oo',
    ],
  },
};

/**
 * The brute (31×60, hero64.mutants.ts: the ×1.5 giant with the claw arm and
 * spikes) as a pose: torso columns 10–22 from row 24 to the hem row 44, the
 * claw arm in columns 0–8, legs 45–53, bare feet 54–59. Its other views are
 * in hero64.poses.views.ts (W drawn, SW/N/NW edited from S).
 */
export const STAND_BRUTE: ZombiePose = {
  id: 'brute',
  form: FORM_BRUTE,
  w: 31,
  torso: [10, 24, 22, 44],
  neck: [[12, 24, 20, 25]],
  shoulders: [],
  sleeveL: { short: [0, 28, 8, 32], long: [0, 28, 8, 40], torn: [0, 28, 8, 29] },
  sleeveR: { short: [23, 27, 28, 31], long: [23, 27, 28, 40] },
  pants: [[8, 45, 24, 56]],
  shorts: [[8, 45, 24, 50]],
  shoeL: [5, 54, 15, 59],
  shoeR: [17, 54, 27, 59],
  flats: [
    [5, 58, 15, 59],
    [17, 58, 27, 59],
  ],
  collar: [[12, 25, 20, 25]],
  hem: [11, 44, 21, 44],
  frayedXs: [11, 13, 15, 17, 19, 21],
  chest: [12, 30],
  stains: [12, 32],
  gash: [25, 34],
  skirt: {
    x: 7,
    y: 45,
    rows: [
      '.o&kkKkkKkkKkkKo.',
      '.o&kkKkkKkkKkkKo.',
      'o&kkKkkKkkKkkKkKo',
      'o&kkKkkKkkKkkKkKo',
      'oo.ooo.oooo.ooo.o',
    ],
  },
};

export const STAND_VIEWS: Record<HeroView, ZombiePose> = {
  S: POSE_STAND,
  SW: STAND_SW,
  W: STAND_W,
  NW: STAND_NW,
  N: STAND_N,
};
