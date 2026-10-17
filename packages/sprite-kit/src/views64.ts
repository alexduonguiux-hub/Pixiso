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
import type { FormSpec } from './heroforms.js';
import type { Sprite } from './format.js';

const standForm = (id: string, label: string, figure: Sprite): FormSpec => ({
  id,
  label,
  figure,
  headMap: (x, y) => [x, y],
});

/** Three-quarter front: as S, with the far (left) shoulder and arm one column narrower. */
export const STAND_SW: ZombiePose = {
  ...POSE_STAND,
  id: 'stand_sw',
  form: standForm('stand_sw', 'Đứng (SW)', HERO_SW_FIGURE),
  shoulders: [
    [2, 15, 3, 18],
    [13, 15, 15, 18],
  ],
  sleeveL: { short: [1, 18, 4, 22], long: [1, 18, 4, 24], torn: [1, 18, 4, 20] },
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
    rows: ['o&kkkkkKo..', 'o&kkkkkkKo.', 'o&kkkkkkKo.', 'o&kkkkkkkKo', 'ooooooooooo'],
  },
  dress: {
    x: 3,
    y: 29,
    rows: [
      'o&kkkkkKo..',
      'o&kkkkkkKo.',
      'o&kkkkkkKo.',
      'o&kkkkkkkKo',
      'o&kkkkkkkKo',
      'o&kkkkkkkKo',
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

/** Three-quarter back: as N, with the far (right) shoulder and arm one column narrower. */
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
};

export const STAND_VIEWS: Record<HeroView, ZombiePose> = {
  S: POSE_STAND,
  SW: STAND_SW,
  W: STAND_W,
  NW: STAND_NW,
  N: STAND_N,
};
