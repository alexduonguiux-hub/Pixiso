/**
 * Parametric chibi body built from shapes (draw.ts) instead of hand-typed
 * boxes: an egg for the skull, a hair cap with bangs and side tufts, a tapered
 * tunic, rounded arm stubs with hands, short legs with boots. Every form is
 * shaded with the shifted-shape recipe; compose.ts adds the outlines.
 *
 * Positions are canvas coordinates (32×32, pivot (16, 30)); the feet stand on
 * row 28 so the outer outline lands on row 29.
 */
import type { BodyView } from './body32.js';
import type { View } from './registry.js';
import {
  blank,
  cellOf,
  fillEllipse,
  fillRect,
  fillRoundRect,
  putRows,
  set,
  shadeShape,
  stamp,
  subtract,
  trim,
} from './draw.js';
import { sprite, type Sprite } from './format.js';

export interface BodyParams {
  /** Skull ellipse, pixels. */
  headW: number;
  headH: number;
  torsoW: number;
  torsoH: number;
  /** Legs including boots; boots are the lower `bootH` rows. */
  legH: number;
  bootH: number;
  armH: number;
}

export const CHIBI_ROUND: BodyParams = {
  headW: 14,
  headH: 12,
  torsoW: 8,
  torsoH: 7,
  legH: 5,
  bootH: 3,
  armH: 5,
};
export const CHIBI_CLASSIC: BodyParams = {
  headW: 14,
  headH: 13,
  torsoW: 8,
  torsoH: 8,
  legH: 7,
  bootH: 3,
  armH: 6,
};
export const CHIBI_TALL: BodyParams = {
  headW: 13,
  headH: 12,
  torsoW: 8,
  torsoH: 9,
  legH: 9,
  bootH: 4,
  armH: 7,
};

const FEET_ROW = 28;
const CENTER = 16;

type Side = 'left' | 'right';
const toward = (side: Side): [number, number] => (side === 'right' ? [-1, -1] : [1, -1]);

function egg(w: number, h: number): Sprite {
  const skull = blank(w, h);
  fillEllipse(skull, 0, 0, w - 1, h - 1, 0);
  return skull;
}

function inMask(m: Sprite, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < m.w && y < m.h && m.cells[y * m.w + x]! >= 0;
}

/** Hair cap: the upper ~40 % of the skull. */
function capOf(skull: Sprite, h: number): { cap: Sprite; rows: number } {
  const rows = Math.round(h * 0.42);
  const cap = blank(skull.w, skull.h);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < skull.w; x++) if (inMask(skull, x, y)) set(cap, x, y, 0);
  return { cap, rows };
}

function union(w: number, h: number, masks: Sprite[]): Sprite {
  const out = blank(w, h);
  for (const m of masks) stamp(out, m, 0, 0);
  return out;
}

/** Paints a face region (flat skin, chin crescent) and the fringe's cast shadow row. */
function paintFace(out: Sprite, face: Sprite, hair: Sprite): void {
  stamp(out, shadeShape(face, 'skin', { base: [-1, -1], noHighlight: true }), 0, 0);
  for (let y = 1; y < out.h; y++)
    for (let x = 0; x < out.w; x++)
      if (inMask(hair, x, y - 1) && inMask(face, x, y)) set(out, x, y, cellOf('skin', 0));
}

function eye(out: Sprite, x: number, y: number): void {
  putRows(out, x, y, ['xe', 'ee', 'ee']);
}

/** Front head: egg, hair cap with three bang points and side tufts, two eyes. */
export function buildHeadS(p: BodyParams): Sprite {
  const w = p.headW;
  const h = p.headH;
  const skull = egg(w, h);
  const { cap, rows } = capOf(skull, h);
  const cx = w / 2;
  const bangs = blank(w, h);
  for (const px of [Math.floor(cx) - 5, Math.floor(cx) - 1, Math.ceil(cx) + 3])
    for (let x = px; x < px + 2; x++) if (inMask(skull, x, rows)) set(bangs, x, rows, 0);
  const tuftL = blank(w, h);
  const tuftR = blank(w, h);
  for (let y = rows; y < rows + 3; y++) {
    for (const x of [0, 1]) if (inMask(skull, x, y)) set(tuftL, x, y, 0);
    for (const x of [w - 2, w - 1]) if (inMask(skull, x, y)) set(tuftR, x, y, 0);
  }
  const hair = union(w, h, [cap, bangs, tuftL, tuftR]);
  const face = subtract(skull, hair);
  const out = blank(w, h);
  paintFace(out, face, hair);
  stamp(out, shadeShape(cap, 'hair', { base: [-1, 0], light: [-4, -3] }), 0, 0);
  stamp(out, shadeShape(bangs, 'hair', { base: [0, 0], noHighlight: true }), 0, 0);
  stamp(out, shadeShape(tuftL, 'hair', { base: [0, 0], noHighlight: true }), 0, 0);
  stamp(out, shadeShape(tuftR, 'hair', { base: [5, 5], noHighlight: true }), 0, 0);
  eye(out, Math.floor(cx) - 3, rows + 3);
  eye(out, Math.ceil(cx) + 1, rows + 3);
  return out;
}

/** Three-quarter head: face on the left two thirds, hair mass behind, two eyes. */
export function buildHeadSW(p: BodyParams): Sprite {
  const w = p.headW - 1;
  const h = p.headH;
  const skull = egg(w, h);
  const { cap, rows } = capOf(skull, h);
  const faceW = Math.round(w * 0.68);
  const back = blank(w, h);
  for (let y = 0; y < h; y++)
    for (let x = faceW; x < w; x++) if (inMask(skull, x, y)) set(back, x, y, 0);
  const bangs = blank(w, h);
  for (const px of [1, 5])
    for (let x = px; x < px + 2; x++) if (inMask(skull, x, rows)) set(bangs, x, rows, 0);
  const tuft = blank(w, h);
  for (let y = rows; y < rows + 3; y++) if (inMask(skull, 0, y)) set(tuft, 0, y, 0);
  const hair = union(w, h, [cap, back, bangs, tuft]);
  const face = subtract(skull, hair);
  const out = blank(w, h);
  paintFace(out, face, hair);
  stamp(out, shadeShape(back, 'hair', { base: [-1, -1], noHighlight: true }), 0, 0);
  stamp(out, shadeShape(cap, 'hair', { base: [-1, 0], light: [-4, -3] }), 0, 0);
  stamp(out, shadeShape(bangs, 'hair', { base: [0, 0], noHighlight: true }), 0, 0);
  stamp(out, shadeShape(tuft, 'hair', { base: [0, 0], noHighlight: true }), 0, 0);
  eye(out, 2, rows + 3);
  eye(out, 6, rows + 3);
  return out;
}

/** Side head: face on the front third, one eye, hair cap and back mass. */
export function buildHeadW(p: BodyParams): Sprite {
  const w = p.headW - 2;
  const h = p.headH;
  const skull = egg(w, h);
  const { cap, rows } = capOf(skull, h);
  const faceW = 5;
  const back = blank(w, h);
  for (let y = 0; y < h; y++)
    for (let x = faceW; x < w; x++) if (inMask(skull, x, y)) set(back, x, y, 0);
  const bangs = blank(w, h);
  for (const x of [1, 2]) if (inMask(skull, x, rows)) set(bangs, x, rows, 0);
  const hair = union(w, h, [cap, back, bangs]);
  const face = subtract(skull, hair);
  const out = blank(w, h);
  paintFace(out, face, hair);
  stamp(out, shadeShape(back, 'hair', { base: [-1, -1], noHighlight: true }), 0, 0);
  stamp(out, shadeShape(cap, 'hair', { base: [-1, 0], light: [-4, -3] }), 0, 0);
  stamp(out, shadeShape(bangs, 'hair', { base: [0, 0], noHighlight: true }), 0, 0);
  eye(out, 1, rows + 3);
  return out;
}

/** Three-quarter back head: all hair but a sliver of cheek on the left. */
export function buildHeadNW(p: BodyParams): Sprite {
  const w = p.headW - 1;
  const h = p.headH;
  const skull = egg(w, h);
  const { rows } = capOf(skull, h);
  const face = blank(w, h);
  for (let y = rows + 2; y < rows + 6; y++)
    for (const x of [0, 1]) if (inMask(skull, x, y)) set(face, x, y, 0);
  const hair = subtract(skull, face);
  const out = blank(w, h);
  paintFace(out, face, hair);
  stamp(out, shadeShape(hair, 'hair', { base: [-1, -1], light: [-4, -3] }), 0, 0);
  return out;
}

/** Back head: all hair, lit from the top-left. */
export function buildHeadN(p: BodyParams): Sprite {
  const skull = egg(p.headW, p.headH);
  return shadeShape(skull, 'hair', { base: [-1, -1], light: [-4, -3] });
}

function beltRow(w: number, buckleX: number | null): string {
  const cells: string[] = Array.from({ length: w }, (_, x) =>
    x === 0 ? '|' : x >= w - 2 ? 'L' : 'l',
  );
  if (buckleX !== null) for (let x = buckleX; x < buckleX + 2 && x < w; x++) cells[x] = 'a';
  return cells.join('');
}

/** Tunic: flat shoulder line, one pixel in from the belt down, belt with an optional buckle. */
export function buildTorso(p: BodyParams, w: number, buckleX: number | null): Sprite {
  const h = p.torsoH;
  const mask = blank(w, h);
  const waist = Math.max(3, Math.floor(h / 2));
  fillRect(mask, 0, 0, w - 1, waist - 1, 0);
  fillRoundRect(mask, 1, waist - 1, w - 2, h - 1, 1, 0);
  const out = shadeShape(mask, 'cloth', { base: [-1, -1], light: [-3, -2] });
  putRows(out, 1, h - 3, [beltRow(w - 2, buckleX === null ? null : buckleX - 1)]);
  return out;
}

/** Arm stub with a hand: rounded cloth sleeve, two skin rows at the end. */
export function buildArm(p: BodyParams, side: Side): Sprite {
  const h = p.armH;
  const mask = blank(3, h);
  fillRoundRect(mask, 0, 0, 2, h - 1, 1, 0);
  const out = shadeShape(mask, 'cloth', { base: toward(side), light: [-3, -2] });
  const hand = blank(3, 2);
  fillRect(hand, 0, 0, 2, 1, 0);
  stamp(out, shadeShape(hand, 'skin', { base: toward(side), noHighlight: true }), 0, h - 2);
  return out;
}

/** Arm raised straight up: hand at the top, sleeve long enough to keep covering the shoulder. */
export function buildArmUp(p: BodyParams, side: Side): Sprite {
  const h = p.armH + 2;
  const mask = blank(3, h);
  fillRoundRect(mask, 0, 0, 2, h - 1, 1, 0);
  const out = shadeShape(mask, 'cloth', { base: toward(side), light: [-3, -2] });
  const hand = blank(3, 2);
  fillRect(hand, 0, 0, 2, 1, 0);
  stamp(out, shadeShape(hand, 'skin', { base: toward(side), noHighlight: true }), 0, 0);
  return out;
}

/** Arm extended forward (screen-left), hand at the left end; 7×3. */
export function buildArmForward(): Sprite {
  const mask = blank(7, 3);
  fillRoundRect(mask, 0, 0, 6, 2, 1, 0);
  const out = shadeShape(mask, 'cloth', { base: [-1, -1], light: [-3, -2] });
  const hand = blank(2, 3);
  fillRoundRect(hand, 0, 0, 1, 2, 1, 0);
  stamp(out, shadeShape(hand, 'skin', { base: [-1, -1], noHighlight: true }), 0, 0);
  return out;
}

/** Leg with a boot; the outer bottom corner is cut so the foot reads as a shoe. */
export function buildLeg(p: BodyParams, side: Side): Sprite {
  const w = 4;
  const h = p.legH;
  const pants = blank(w, h);
  fillRect(pants, 0, 0, w - 1, h - p.bootH - 1, 0);
  const boot = blank(w, h);
  fillRect(boot, 0, h - p.bootH, w - 1, h - 1, 0);
  set(boot, side === 'right' ? 0 : w - 1, h - 1, -1);
  const out = blank(w, h);
  stamp(out, shadeShape(pants, 'pants', { base: toward(side), noHighlight: true }), 0, 0);
  stamp(out, shadeShape(boot, 'boots', { base: toward(side), noHighlight: true }), 0, 0);
  return out;
}

/** Lying on the back, head to the left, eyes closed; outlines come from compose. */
export const LYING = sprite`
  ..............................
  ...#####......................
  ..###hhSS.....................
  .##hhSsssS.^cccccccC..........
  .#hhhsseeS.^ccccccCC.+pPPbB...
  .hhhhSsSSSS|llaallLC.+pPPbB...
  .hhhhsseeSSccccccccC.pPPPBB...
  .HhhhSssSS.CCCCCCCCC.PPPPBB...
  ..HHhhSsS..CCCCCCCCC..........
  ...HHHSS......................
  ..............................
`;

interface Placement {
  headX: number;
  torsoW: number;
  buckleX: number | null;
  /** Screen-left arm/leg is the character's right limb in front views, left in back views. */
  nearIsRight: boolean;
}

function assemble(
  p: BodyParams,
  head: Sprite,
  place: Placement,
  layout: 'front' | 'side' | 'quarter',
): BodyView {
  const legTop = FEET_ROW - p.legH + 1;
  const torsoTop = legTop - p.torsoH + 1;
  const headBottom = torsoTop;
  const headTop = headBottom - p.headH + 1;
  const torsoX = CENTER - Math.floor(place.torsoW / 2);
  const armTop = torsoTop + 1;
  const h = trim(head);
  const near: Side = place.nearIsRight ? 'right' : 'left';
  const far: Side = place.nearIsRight ? 'left' : 'right';
  const nearId = place.nearIsRight ? 'armR' : 'armL';
  const farId = place.nearIsRight ? 'armL' : 'armR';
  const nearLeg = place.nearIsRight ? 'legR' : 'legL';
  const farLeg = place.nearIsRight ? 'legL' : 'legR';
  const handY = armTop + p.armH - 2;

  let arms: Record<string, { sprite: Sprite; x: number; y: number; z: number }>;
  let legs: Record<string, { sprite: Sprite; x: number; y: number; z: number }>;
  let hands: { near: { x: number; y: number }; far: { x: number; y: number } };
  if (layout === 'front') {
    arms = {
      [nearId]: { sprite: buildArm(p, 'right'), x: torsoX - 3, y: armTop, z: 30 },
      [farId]: { sprite: buildArm(p, 'left'), x: torsoX + place.torsoW, y: armTop, z: 30 },
    };
    legs = {
      [nearLeg]: { sprite: buildLeg(p, 'right'), x: CENTER - 4, y: legTop, z: 11 },
      [farLeg]: { sprite: buildLeg(p, 'left'), x: CENTER, y: legTop, z: 10 },
    };
    hands = { near: { x: torsoX - 2, y: handY }, far: { x: torsoX + place.torsoW + 1, y: handY } };
  } else if (layout === 'quarter') {
    arms = {
      [nearId]: { sprite: buildArm(p, 'right'), x: torsoX - 3, y: armTop, z: 30 },
      [farId]: { sprite: buildArm(p, 'left'), x: torsoX + place.torsoW - 1, y: armTop, z: 15 },
    };
    legs = {
      [nearLeg]: { sprite: buildLeg(p, 'right'), x: CENTER - 4, y: legTop, z: 12 },
      [farLeg]: { sprite: buildLeg(p, 'left'), x: CENTER, y: legTop - 1, z: 10 },
    };
    hands = { near: { x: torsoX - 2, y: handY }, far: { x: torsoX + place.torsoW, y: handY } };
  } else {
    arms = {
      [nearId]: { sprite: buildArm(p, 'right'), x: torsoX + 1, y: armTop, z: 30 },
      [farId]: { sprite: buildArm(p, 'left'), x: torsoX + place.torsoW - 2, y: armTop, z: 15 },
    };
    legs = {
      [nearLeg]: { sprite: buildLeg(p, 'right'), x: CENTER - 3, y: legTop, z: 12 },
      [farLeg]: { sprite: buildLeg(p, 'left'), x: CENTER, y: legTop, z: 10 },
    };
    hands = { near: { x: torsoX + 2, y: handY }, far: { x: torsoX + place.torsoW - 1, y: handY } };
  }
  const parts = {
    ...legs,
    torso: { sprite: buildTorso(p, place.torsoW, place.buckleX), x: torsoX, y: torsoTop, z: 20 },
    ...arms,
    head: { sprite: h.sprite, x: place.headX + h.dx, y: headTop + h.dy, z: 40 },
  } as BodyView['parts'];
  void near;
  void far;
  return {
    parts,
    anchors: {
      head: { x: place.headX, y: headTop },
      hand_right: place.nearIsRight ? hands.near : hands.far,
      hand_left: place.nearIsRight ? hands.far : hands.near,
      back: { x: CENTER, y: torsoTop + 1 },
    },
  };
}

/** Every authored view of the body for one parameter set. */
export function buildBody(p: BodyParams): Record<View, BodyView> {
  const wide = p.torsoW;
  const mid = p.torsoW - 1;
  const narrow = p.torsoW - 2;
  return {
    S: assemble(
      p,
      buildHeadS(p),
      {
        headX: CENTER - Math.floor(p.headW / 2),
        torsoW: wide,
        buckleX: wide / 2 - 1,
        nearIsRight: true,
      },
      'front',
    ),
    SW: assemble(
      p,
      buildHeadSW(p),
      { headX: CENTER - Math.floor(p.headW / 2), torsoW: mid, buckleX: 2, nearIsRight: true },
      'quarter',
    ),
    W: assemble(
      p,
      buildHeadW(p),
      {
        headX: CENTER - Math.floor((p.headW - 2) / 2),
        torsoW: narrow,
        buckleX: 1,
        nearIsRight: true,
      },
      'side',
    ),
    NW: assemble(
      p,
      buildHeadNW(p),
      { headX: CENTER - Math.floor(p.headW / 2), torsoW: mid, buckleX: null, nearIsRight: false },
      'quarter',
    ),
    N: assemble(
      p,
      buildHeadN(p),
      { headX: CENTER - Math.floor(p.headW / 2), torsoW: wide, buckleX: null, nearIsRight: false },
      'front',
    ),
  };
}

/** Pose drawings used by the clips, matching the body parameters. */
export function buildPoses(p: BodyParams) {
  return {
    armUpR: buildArmUp(p, 'right'),
    armUpL: buildArmUp(p, 'left'),
    armForward: buildArmForward(),
    lying: LYING,
  };
}
