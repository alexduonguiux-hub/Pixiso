/**
 * Zombie stances. Each pose is a hand-drawn body (the head of the base figure
 * is stamped onto it, lowered and sheared as the pose needs) plus the regions
 * an outfit needs on that body: torso, neck opening, shoulder caps, sleeves,
 * trousers, shorts, shoes, seams, and anchors for details. Mirrored poses are
 * derived. Same vocabulary as hero64.ts: 1-px outline, front light.
 */
import { blank } from './draw.js';
import { sprite, type Sprite } from './format.js';
import { cut, HERO_S_FIGURE, type Box } from './hero64.js';
import type { FormSpec, HeadMap } from './heroforms.js';
import { HERO_ZOMBIE_S, ZOMBIE_HEAD_TOP, zombieHeadShift } from './hero64.zombie.js';

/** Column shift per head row (the tilt), relative to the pose's head column. */
export type HeadShift = (headRow: number) => number;

/** Stamps the base head (chin line only on its last row) onto a body. */
export function posedFigure(
  body: Sprite,
  headX: number,
  headTop: number,
  shift: HeadShift,
): Sprite {
  const out = blank(body.w, body.h);
  out.cells.set(body.cells);
  const head = cut(
    HERO_S_FIGURE,
    [1, 0, 15, 14],
    [
      [1, 14, 5, 14],
      [11, 14, 15, 14],
    ],
  );
  for (let k = 0; k < head.h; k++) {
    const x0 = headX + 1 + shift(k); // base column 1 is the head cut's first column
    const y = headTop + k;
    for (let j = 0; j < head.w; j++) {
      const v = head.cells[k * head.w + j]!;
      if (v >= 0 && x0 + j >= 0 && x0 + j < out.w && y < out.h) out.cells[y * out.w + x0 + j] = v;
    }
  }
  return out;
}

/*
 * Shear steps are placed only on head rows 3, 5, 6, 7 or 9: there both sides
 * of the base skull run vertical, so shifting the rows below by one column
 * keeps the outline 8-connected. A step on a row where the skull already
 * steps the same way would open a gap.
 */
const headMapOf =
  (headX: number, headTop: number, shift: HeadShift): HeadMap =>
  (x, y) => [x + headX + shift(Math.min(y, 14)), y + headTop];

/** Reaching: upright head, upper arms out to the sides, open hands in front of the chest (19×40). */
const BODY_REACH = sprite`
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  .....os.....so.....
  ....ossssssssso....
  ...osssSSsSSssso...
  ...oss$$SsS$$sso...
  ..oSsS$$sss$$SsSo..
  .ossso$$$s$$$ossso.
  oososo$$$s$$$ososoo
  osososo$$s$$osososo
  ososososssssosososo
  ossssso$$$$$ossssso
  ossssso$$$$$ossssso
  oSsssSo$$$$$oSsssSo
  ooooooosssssooooooo
  .....osSSsSSso.....
  .....ossssssso.....
  .....ossssssso.....
  .....ossssssso.....
  .....ossooosso.....
  ....oSsso.ossSo....
  ....o$sSo.oSs$o....
  ....o$sSo.oSs$o....
  ...osssso.osssso...
  ...osssso.osssso...
  ...oooSso.osSooo...
  ..o$$$sso.oss$$$o..
  ..ooooooo.ooooooo..
`;
/** Dragging: head tilted left, left leg under the body, right leg stretched out and the foot flat (21×40). */
const BODY_DRAG = sprite`
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  ....os.....so........
  ...ossssssssso.......
  ..osssSSsSSssso......
  ..oss$$SsS$$sso......
  .oSsS$$sss$$SsSo.....
  .osso$$$s$$$osso.....
  o$sSo$$$s$$$oSs$o....
  o$sSoSSsssSSoSs$o....
  o$sSosssssssoSs$o....
  o$soos$$$$$soos$o....
  o$sooss$$$ssoos$o....
  osssos$$$$$sossso....
  osSsosssssssosSso....
  ososossSSsSSsososo...
  ososossssssssososo...
  ooooosssssssooooo....
  ....osssoosssso......
  ....oSsso.oSsSo......
  ....o$sSo..oSsSo.....
  ....o$sSo..oSsSo.....
  ...osssso..osssso....
  ...osssso..osssso....
  ...oooSso..ossSoooo..
  ..o$$$sso..osss$$$$o.
  ..ooooooo..ooooooooo.
`;
/** Hunched: head sunk between raised shoulders, arms hanging to the knees, short bent legs (19×40). */
const BODY_HUNCH = sprite`
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  .oooo.........oooo.
  osssS.........Sssso
  o$sssS.......Ssss$o
  o$ssSs.......sSss$o
  o$sssSs.....sSsss$o
  o$sSossSSsSSssoSs$o
  o$sSos$$SsS$$soSs$o
  o$sSoSSsssssSSoSs$o
  o$sSosssssssssoSs$o
  o$sSos$$$$$$$soSs$o
  o$sSos$$$$$$$soSs$o
  o$sSosssssssssoSs$o
  o$sSossSSsSSssoSs$o
  o$sSosssssssssoSs$o
  o$sSosssooosssoSs$o
  o$sSoSsso.ossSoSs$o
  o$sSoSsso.ossSoSs$o
  o$sSoSsso.ossSoSs$o
  ossso$sSo.oSs$ossso
  osSso$sSo.oSs$osSso
  ososo$sSo.oSs$ososo
  ososossso.osssososo
  ooooossso.osssooooo
  ..oooSsso.ossSooo..
  ..o$$ssso.osss$$o..
  ..ooooooo.ooooooo..
`;
/** Crawl: head low and forward, hunched shoulders, long arms reaching the ground with clawed hands, crouched legs (21×40). */
const BODY_CRAWL = sprite`
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  .....................
  ......os.....so......
  .....ossssssssso.....
  ...ossssSSsSSsssso...
  ..oSsss$$SsS$$sssSo..
  .oSsSo$$$sss$$$oSsSo.
  o$ssSoSSsssssSSoSss$o
  o$ssSosssssssssoSss$o
  o$ssSosssssssssoSss$o
  o$ssSossooooossoSss$o
  o$ssSo$$so.os$$oSss$o
  o$ssSo$sso.oss$oSss$o
  o$ssSoSSso.ossSoSss$o
  o$ssSo$sSo.oSs$oSss$o
  o$ssSo$sSo.oSs$oSss$o
  o$ssSo$sSo.oSs$oSss$o
  osssso$sSo.oSs$osssso
  ososoo$sSo.oSs$oososo
  ososoooSso.osSooososo
  ososoo$sso.oss$oososo
  oooooooooo.oooooooooo
`;
/** Twisted neck: head slid to the right, knees knocked together, feet apart (19×40). */
const BODY_TWIST = sprite`
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  .......os.....so...
  ....ooossssssso....
  ...osssssSSsSSsso..
  ...oss$$$sSsS$sso..
  ..oSsS$$sss$$SsSo..
  ..osso$$$s$$$osso..
  ..osso$$$s$$$osso..
  .o$sSoSSsssSSoSs$o.
  .o$sSosssssssoSs$o.
  .o$soos$$$$$soos$o.
  .o$sooss$$$ssoos$o.
  .osssos$$$$$sossso.
  .osSsosssssssosSso.
  .osososSSsSSsososo.
  .osososssssssososo.
  .ooooosssssssooooo.
  .....ossooosso.....
  ....oSsso.ossSo....
  .....oSssossSo.....
  .....o$ssoss$o.....
  .....o$ssoss$o.....
  ....ossso.ossso....
  ..oooSsso.ossSooo..
  .o$$$ssso.osss$$$o.
  .oooooooo.oooooooo.
`;

/** Horizontal mirror of a template. */
export function mirrorSprite(s: Sprite): Sprite {
  const out = blank(s.w, s.h);
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) out.cells[y * s.w + (s.w - 1 - x)] = s.cells[y * s.w + x]!;
  return out;
}

export interface SleeveBoxes {
  short: Box;
  long: Box;
  /** Ripped off above the elbow (left arm only). */
  torn?: Box;
}

/** Everything an outfit needs to dress one pose, in that pose's figure space. */
export interface ZombiePose {
  id: string;
  form: FormSpec;
  w: number;
  torso: Box;
  neck: Box[];
  shoulders: Box[];
  sleeveL: SleeveBoxes;
  sleeveR: SleeveBoxes;
  pants: Box[];
  shorts: Box[];
  shoeL: Box;
  shoeR: Box;
  flats: Box[];
  collar: Box[];
  hem: Box;
  /** Columns of the frayed hem (same row as `hem`). */
  frayedXs: number[];
  /** Anchors (top-left) for details. */
  chest: [number, number];
  number: [number, number];
  tie: [number, number];
  belt: [number, number];
  stains: [number, number];
  gash: [number, number];
  /** Skirt rows as an overlay drawing with its top-left. */
  skirt: { x: number; y: number; rows: string[] };
  /** Long dress to the ankles (optional). */
  dress?: { x: number; y: number; rows: string[] };
}

const form = (id: string, label: string, figure: Sprite, headMap: HeadMap): FormSpec => ({
  id,
  label,
  figure,
  headMap,
});

/* P0 — standing still: the base figure itself (17×40), head upright. */
export const POSE_STAND: ZombiePose = {
  id: 'stand',
  form: form('zombie_stand', 'Đứng im', HERO_S_FIGURE, (x, y) => [x, y]),
  w: 17,
  torso: [4, 15, 12, 28],
  neck: [
    [6, 15, 10, 16],
    [7, 17, 9, 17],
  ],
  shoulders: [
    [1, 15, 3, 18],
    [13, 15, 15, 18],
  ],
  sleeveL: { short: [0, 18, 4, 22], long: [0, 18, 4, 24], torn: [0, 18, 4, 20] },
  sleeveR: { short: [12, 18, 16, 22], long: [12, 18, 16, 24] },
  pants: [[0, 29, 16, 35]],
  shorts: [[0, 29, 16, 32]],
  shoeL: [1, 36, 7, 39],
  shoeR: [9, 36, 15, 39],
  flats: [
    [1, 38, 7, 39],
    [9, 38, 15, 39],
  ],
  collar: [
    [6, 17, 6, 17],
    [10, 17, 10, 17],
    [7, 18, 9, 18],
  ],
  hem: [5, 28, 11, 28],
  frayedXs: [5, 7, 9, 11],
  chest: [6, 20],
  number: [7, 21],
  tie: [8, 19],
  belt: [8, 28],
  stains: [5, 21],
  gash: [2, 23],
  skirt: {
    x: 2,
    y: 29,
    rows: ['.o&kkkkkkkKo.', '.o&kkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', 'oo.ooo.oooo.o'],
  },
  dress: {
    x: 1,
    y: 29,
    rows: [
      '..o&kkkkkkkKo..',
      '..o&kkkkkkkKo..',
      '.o&kkkkkkkkkKo.',
      '.o&kkkkkkkkkKo.',
      '.o&kkkkKkkkkKo.',
      'o&kkkkkKkkkkkKo',
      'o&kkkkkKkkkkkKo',
      'o&kkkKkKkKkkkKo',
      'oo.oo.ooo.oo.oo',
    ],
  },
};

/* P1 — drooped (hero64.zombie.ts) */
export const POSE_DROOP: ZombiePose = {
  id: 'droop',
  form: form('zombie', 'Zombie gục đầu', HERO_ZOMBIE_S, (x, y) => [
    x + zombieHeadShift(Math.min(y, 14)),
    y + ZOMBIE_HEAD_TOP,
  ]),
  w: 19,
  torso: [4, 14, 14, 30],
  neck: [[8, 17, 14, 17]],
  shoulders: [
    [1, 14, 3, 18],
    [15, 16, 17, 19],
  ],
  sleeveL: { short: [0, 19, 4, 22], long: [0, 19, 4, 24], torn: [0, 19, 4, 20] },
  sleeveR: { short: [14, 20, 18, 24], long: [14, 20, 18, 26] },
  pants: [
    [4, 31, 14, 32],
    [3, 33, 16, 36],
  ],
  shorts: [
    [4, 31, 14, 32],
    [3, 33, 16, 34],
  ],
  shoeL: [2, 37, 8, 39],
  shoeR: [10, 37, 18, 39],
  flats: [
    [2, 38, 8, 39],
    [10, 38, 18, 39],
  ],
  collar: [
    [8, 17, 8, 17],
    [14, 17, 14, 17],
    [9, 18, 13, 18],
  ],
  hem: [5, 30, 13, 30],
  frayedXs: [5, 7, 9, 11, 13],
  chest: [6, 20],
  number: [8, 21],
  tie: [9, 19],
  belt: [9, 30],
  stains: [6, 21],
  gash: [2, 22],
  skirt: {
    x: 3,
    y: 31,
    rows: [
      '.o&kkkkkkkKo..',
      '.o&kkkkkkkKo..',
      'o&kkkkkkkkkkKo',
      'o&kkkkkkkkkkKo',
      'oo.oooo.ooo.oo',
    ],
  },
};

const REACH_SHIFT: HeadShift = () => 0;
export const HERO_REACH_S = posedFigure(BODY_REACH, 1, 0, REACH_SHIFT);
/* P2 — reaching */
export const POSE_REACH: ZombiePose = {
  id: 'reach',
  form: form('zombie_reach', 'Zombie vươn tay', HERO_REACH_S, headMapOf(1, 0, REACH_SHIFT)),
  w: 19,
  torso: [5, 15, 13, 30],
  neck: [
    [7, 15, 11, 16],
    [8, 17, 10, 17],
  ],
  shoulders: [
    [2, 15, 4, 18],
    [14, 15, 16, 18],
  ],
  sleeveL: { short: [0, 19, 5, 22], long: [0, 19, 5, 22], torn: [0, 19, 5, 20] },
  sleeveR: { short: [13, 19, 18, 22], long: [13, 19, 18, 22] },
  pants: [[4, 31, 14, 36]],
  shorts: [[4, 31, 14, 34]],
  shoeL: [2, 37, 8, 39],
  shoeR: [10, 37, 16, 39],
  flats: [
    [2, 38, 8, 39],
    [10, 38, 16, 39],
  ],
  collar: [
    [7, 17, 7, 17],
    [11, 17, 11, 17],
    [8, 18, 10, 18],
  ],
  hem: [6, 30, 12, 30],
  frayedXs: [6, 8, 10, 12],
  chest: [7, 24],
  number: [8, 23],
  tie: [9, 19],
  belt: [9, 30],
  stains: [7, 23],
  gash: [3, 23],
  skirt: {
    x: 3,
    y: 31,
    rows: ['.o&kkkkkkkKo.', '.o&kkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', 'oo.ooo.oooo.o'],
  },
};

const DRAG_SHIFT: HeadShift = (k) => (k < 3 ? 2 : k < 9 ? 1 : 0);
export const HERO_DRAG_S = posedFigure(BODY_DRAG, 0, 1, DRAG_SHIFT);
/* P3 — dragging */
export const POSE_DRAG: ZombiePose = {
  id: 'drag',
  form: form('zombie_drag', 'Zombie lết chân', HERO_DRAG_S, headMapOf(0, 1, DRAG_SHIFT)),
  w: 21,
  torso: [4, 15, 12, 30],
  neck: [
    [6, 15, 10, 16],
    [7, 17, 9, 17],
  ],
  shoulders: [
    [1, 15, 3, 19],
    [13, 15, 15, 19],
  ],
  sleeveL: { short: [0, 21, 4, 23], long: [0, 21, 4, 25], torn: [0, 21, 4, 22] },
  sleeveR: { short: [12, 21, 16, 23], long: [12, 21, 16, 25] },
  pants: [[3, 31, 19, 36]],
  shorts: [[3, 31, 19, 34]],
  shoeL: [2, 37, 8, 39],
  shoeR: [11, 37, 19, 39],
  flats: [
    [2, 38, 8, 39],
    [11, 38, 19, 39],
  ],
  collar: [
    [6, 17, 6, 17],
    [10, 17, 10, 17],
    [7, 18, 9, 18],
  ],
  hem: [5, 30, 11, 30],
  frayedXs: [5, 7, 9, 11],
  chest: [6, 22],
  number: [7, 23],
  tie: [8, 19],
  belt: [8, 30],
  stains: [5, 21],
  gash: [2, 24],
  skirt: {
    x: 3,
    y: 31,
    rows: ['.o&kkkkkkKo.', '.o&kkkkkkKo.', 'o&kkkkkkkkKo', 'o&kkkkkkkkKo', 'oo.ooo.ooo.o'],
  },
};

const HUNCH_SHIFT: HeadShift = () => 0;
export const HERO_HUNCH_S = posedFigure(BODY_HUNCH, 1, 4, HUNCH_SHIFT);
/* P4 — hunched */
export const POSE_HUNCH: ZombiePose = {
  id: 'hunch',
  form: form('zombie_hunch', 'Zombie khom lưng', HERO_HUNCH_S, headMapOf(1, 4, HUNCH_SHIFT)),
  w: 19,
  torso: [4, 19, 14, 27],
  neck: [[7, 19, 11, 19]],
  shoulders: [
    [0, 14, 2, 15],
    [0, 16, 4, 16],
    [0, 17, 5, 17],
    [0, 18, 6, 18],
    [16, 14, 18, 15],
    [14, 16, 18, 16],
    [13, 17, 18, 17],
    [12, 18, 18, 18],
  ],
  sleeveL: { short: [0, 19, 4, 22], long: [0, 19, 4, 26], torn: [0, 19, 4, 20] },
  sleeveR: { short: [14, 19, 18, 22], long: [14, 19, 18, 26] },
  pants: [[4, 28, 14, 36]],
  shorts: [[4, 28, 14, 31]],
  shoeL: [1, 37, 8, 39],
  shoeR: [10, 37, 17, 39],
  flats: [
    [1, 38, 8, 39],
    [10, 38, 17, 39],
  ],
  collar: [
    [6, 19, 6, 19],
    [12, 19, 12, 19],
    [7, 20, 11, 20],
  ],
  hem: [5, 27, 13, 27],
  frayedXs: [5, 7, 9, 11, 13],
  chest: [6, 21],
  number: [8, 22],
  tie: [9, 21],
  belt: [9, 27],
  stains: [5, 21],
  gash: [2, 23],
  skirt: {
    x: 3,
    y: 28,
    rows: ['.o&kkkkkkkKo.', '.o&kkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', '.o.ooo.ooo.o.'],
  },
};

const TWIST_SHIFT: HeadShift = (k) => (k < 3 ? -1 : k < 6 ? 0 : k < 9 ? 1 : 2);
export const HERO_TWIST_S = posedFigure(BODY_TWIST, 1, 1, TWIST_SHIFT);
/* P5 — twisted neck */
export const POSE_TWIST: ZombiePose = {
  id: 'twist',
  form: form('zombie_twist', 'Zombie ngoẹo cổ', HERO_TWIST_S, headMapOf(1, 1, TWIST_SHIFT)),
  w: 19,
  torso: [4, 16, 14, 30],
  neck: [[8, 15, 14, 17]],
  shoulders: [
    [1, 19, 3, 21],
    [15, 19, 17, 21],
  ],
  sleeveL: { short: [1, 22, 5, 23], long: [1, 22, 5, 25], torn: [1, 22, 5, 22] },
  sleeveR: { short: [13, 22, 17, 23], long: [13, 22, 17, 25] },
  pants: [[4, 31, 14, 36]],
  shorts: [[4, 31, 14, 34]],
  shoeL: [1, 37, 8, 39],
  shoeR: [10, 37, 17, 39],
  flats: [
    [1, 38, 8, 39],
    [10, 38, 17, 39],
  ],
  collar: [
    [7, 17, 7, 17],
    [15, 17, 15, 17],
    [8, 18, 14, 18],
  ],
  hem: [6, 30, 12, 30],
  frayedXs: [6, 8, 10, 12],
  chest: [7, 22],
  number: [8, 23],
  tie: [9, 19],
  belt: [9, 30],
  stains: [6, 21],
  gash: [3, 24],
  skirt: {
    x: 3,
    y: 31,
    rows: ['.o&kkkkkkkKo.', '.o&kkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', 'oo.ooo.oooo.o'],
  },
};

const CRAWL_SHIFT: HeadShift = () => 0;
export const HERO_CRAWL_S = posedFigure(BODY_CRAWL, 2, 6, CRAWL_SHIFT);
/* P6 — crawl (ceiling crawler on the ground) */
export const POSE_CRAWL: ZombiePose = {
  id: 'crawl',
  form: form('zombie_crawl', 'Dáng bò rình', HERO_CRAWL_S, headMapOf(2, 6, CRAWL_SHIFT)),
  w: 21,
  torso: [5, 21, 15, 28],
  neck: [[7, 20, 13, 22]],
  shoulders: [],
  sleeveL: { short: [0, 24, 5, 27], long: [0, 24, 5, 31], torn: [0, 24, 5, 25] },
  sleeveR: { short: [15, 24, 20, 27], long: [15, 24, 20, 31] },
  pants: [[5, 28, 15, 36]],
  shorts: [[5, 28, 15, 31]],
  shoeL: [5, 37, 9, 39],
  shoeR: [11, 37, 15, 39],
  flats: [
    [5, 38, 9, 39],
    [11, 38, 15, 39],
  ],
  collar: [
    [7, 22, 7, 22],
    [13, 22, 13, 22],
    [8, 23, 12, 23],
  ],
  hem: [6, 27, 14, 27],
  frayedXs: [6, 8, 10, 12, 14],
  chest: [7, 25],
  number: [8, 25],
  tie: [10, 24],
  belt: [10, 27],
  stains: [6, 24],
  gash: [2, 29],
  skirt: {
    x: 4,
    y: 28,
    rows: ['.o&kkkkkkkKo.', '.o&kkkkkkkKo.', 'o&kkkkkkkkkKo', 'o&kkkkkkkkkKo', 'oo.ooo.oooo.o'],
  },
};

/** The same pose seen in a mirror: figure flipped, boxes and anchors mirrored, head map mirrored. */
export function mirrorPose(p: ZombiePose, id: string, label: string): ZombiePose {
  const W = p.w;
  const mb = ([x0, y0, x1, y1]: Box): Box => [W - 1 - x1, y0, W - 1 - x0, y1];
  const mp = ([x, y]: [number, number], w: number): [number, number] => [W - w - x, y];
  const figure = mirrorSprite(p.form.figure!);
  const inner = p.form.headMap!;
  const headMap: HeadMap = (x, y) => {
    const [fx, fy] = inner(16 - x, y);
    return [W - 1 - fx, fy];
  };
  const sleeves = (s: SleeveBoxes): SleeveBoxes => ({
    short: mb(s.short),
    long: mb(s.long),
    ...(s.torn ? { torn: mb(s.torn) } : {}),
  });
  return {
    id,
    form: { ...p.form, id: `${p.form.id}_m`, label, figure, headMap },
    w: W,
    torso: mb(p.torso),
    neck: p.neck.map(mb),
    shoulders: p.shoulders.map(mb),
    sleeveL: sleeves(p.sleeveR),
    sleeveR: sleeves(p.sleeveL),
    pants: p.pants.map(mb),
    shorts: p.shorts.map(mb),
    shoeL: mb(p.shoeR),
    shoeR: mb(p.shoeL),
    flats: p.flats.map(mb),
    collar: p.collar.map(mb),
    hem: mb(p.hem),
    frayedXs: p.frayedXs.map((x) => W - 1 - x),
    chest: mp(p.chest, 1),
    ...(p.dress
      ? {
          dress: {
            x: W - p.dress.rows[0]!.length - p.dress.x,
            y: p.dress.y,
            rows: p.dress.rows.map((r) => [...r].reverse().join('')),
          },
        }
      : {}),
    number: mp(p.number, 3),
    tie: mp(p.tie, 1),
    belt: mp(p.belt, 1),
    stains: mp(p.stains, 7),
    gash: mp(p.gash, 1),
    skirt: {
      x: W - p.skirt.rows[0]!.length - p.skirt.x,
      y: p.skirt.y,
      rows: p.skirt.rows.map((r) => [...r].reverse().join('')),
    },
  };
}

export const POSE_DROOP_M = mirrorPose(POSE_DROOP, 'droop_m', 'Zombie gục đầu (lật)');
export const POSE_DRAG_M = mirrorPose(POSE_DRAG, 'drag_m', 'Zombie lết chân (lật)');
export const POSE_TWIST_M = mirrorPose(POSE_TWIST, 'twist_m', 'Zombie ngoẹo cổ (lật)');

export const ZOMBIE_POSES: readonly ZombiePose[] = [
  POSE_DROOP,
  POSE_REACH,
  POSE_DRAG,
  POSE_HUNCH,
  POSE_TWIST,
  POSE_DROOP_M,
  POSE_DRAG_M,
  POSE_TWIST_M,
];
