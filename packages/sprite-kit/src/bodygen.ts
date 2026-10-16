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
  /** Native frame size (square). Feet stand on row `canvas - 4`. */
  canvas: number;
  /** Detail unit in pixels: belt and hand rows, eye glint, rounding, pose offsets. 1 for 32 px, 2 for 64 px. */
  k: number;
  /** Multiplier of the shading shifts (crescent width). */
  shadeK: number;
  /** Skull ellipse, pixels. */
  headW: number;
  headH: number;
  torsoW: number;
  torsoH: number;
  legW: number;
  /** Legs including boots; boots are the lower `bootH` rows. */
  legH: number;
  bootH: number;
  armW: number;
  armH: number;
  eyeW: number;
  eyeH: number;
  /** Width of each bang point and of the side tufts. */
  bangW: number;
  tuftW: number;
}

const BASE_32 = {
  canvas: 32,
  k: 1,
  shadeK: 1,
  legW: 4,
  armW: 3,
  eyeW: 2,
  eyeH: 3,
  bangW: 2,
  tuftW: 2,
};

export const CHIBI_ROUND: BodyParams = {
  ...BASE_32,
  headW: 14,
  headH: 12,
  torsoW: 8,
  torsoH: 7,
  legH: 5,
  bootH: 3,
  armH: 5,
};
export const CHIBI_CLASSIC: BodyParams = {
  ...BASE_32,
  headW: 14,
  headH: 13,
  torsoW: 8,
  torsoH: 8,
  legH: 7,
  bootH: 3,
  armH: 6,
};
export const CHIBI_TALL: BodyParams = {
  ...BASE_32,
  headW: 13,
  headH: 12,
  torsoW: 8,
  torsoH: 9,
  legH: 9,
  bootH: 4,
  armH: 7,
};

/** The same figure at 48 px: 1.5× shapes, 2-px shading steps, 3×4 eyes. */
export const CHIBI_48: BodyParams = {
  canvas: 48,
  k: 1,
  shadeK: 2,
  headW: 21,
  headH: 19,
  torsoW: 12,
  torsoH: 12,
  legW: 6,
  legH: 10,
  bootH: 4,
  armW: 4,
  armH: 9,
  eyeW: 3,
  eyeH: 4,
  bangW: 3,
  tuftW: 3,
};

/** The same figure at 64 px: every unit doubled. */
export const CHIBI_64: BodyParams = {
  canvas: 64,
  k: 2,
  shadeK: 2,
  headW: 28,
  headH: 26,
  torsoW: 16,
  torsoH: 16,
  legW: 8,
  legH: 14,
  bootH: 6,
  armW: 6,
  armH: 12,
  eyeW: 4,
  eyeH: 6,
  bangW: 4,
  tuftW: 4,
};

const feetRow = (p: BodyParams) => p.canvas - 4;
const center = (p: BodyParams) => p.canvas / 2;

type Side = 'left' | 'right';
type Vec = [number, number];
const toward = (p: BodyParams, side: Side): Vec =>
  side === 'right' ? [-p.shadeK, -p.shadeK] : [p.shadeK, -p.shadeK];
const mul = (v: Vec, k: number): Vec => [v[0] * k, v[1] * k];

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

/** Cells of `skull` inside the box, as a mask. */
function boxMask(skull: Sprite, x0: number, y0: number, x1: number, y1: number): Sprite {
  const m = blank(skull.w, skull.h);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) if (inMask(skull, x, y)) set(m, x, y, 0);
  return m;
}

/** Paints a face region (flat skin, chin crescent) and the fringe's cast shadow rows. */
function paintFace(p: BodyParams, out: Sprite, face: Sprite, hair: Sprite): void {
  stamp(out, shadeShape(face, 'skin', { base: [-p.shadeK, -p.shadeK], noHighlight: true }), 0, 0);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      if (!inMask(face, x, y)) continue;
      for (let d = 1; d <= p.k; d++) if (inMask(hair, x, y - d)) set(out, x, y, cellOf('skin', 0));
    }
}

/** Eye block with a k×k glint in the top-left corner. */
function eye(p: BodyParams, out: Sprite, x: number, y: number): void {
  fillRect(out, x, y, x + p.eyeW - 1, y + p.eyeH - 1, cellOf('eye', 1));
  fillRect(out, x, y, x + p.k - 1, y + p.k - 1, cellOf('white', 1));
}

const capShade = (p: BodyParams): ShadeArgs => ({
  base: [-p.shadeK, 0],
  light: mul([-4, -3], p.shadeK),
});
const massShade = (p: BodyParams): ShadeArgs => ({
  base: [-p.shadeK, -p.shadeK],
  noHighlight: true,
});
const flat: ShadeArgs = { base: [0, 0], noHighlight: true };
const dark: ShadeArgs = { base: [99, 99], noHighlight: true };
type ShadeArgs = Parameters<typeof shadeShape>[2];

/** Front head: egg, hair cap with three bang points and side tufts, two eyes. */
export function buildHeadS(p: BodyParams): Sprite {
  const w = p.headW;
  const h = p.headH;
  const skull = egg(w, h);
  const { cap, rows } = capOf(skull, h);
  const cx = w / 2;
  const k = p.k;
  const bangs = blank(w, h);
  for (const px of [Math.floor(cx) - 5 * k, Math.floor(cx) - k, Math.ceil(cx) + 3 * k])
    for (let x = px; x < px + p.bangW; x++) if (inMask(skull, x, rows)) set(bangs, x, rows, 0);
  const tuftL = boxMask(skull, 0, rows, p.tuftW - 1, rows + 3 * k - 1);
  const tuftR = boxMask(skull, w - p.tuftW, rows, w - 1, rows + 3 * k - 1);
  const hair = union(w, h, [cap, bangs, tuftL, tuftR]);
  const face = subtract(skull, hair);
  const out = blank(w, h);
  paintFace(p, out, face, hair);
  stamp(out, shadeShape(cap, 'hair', capShade(p)), 0, 0);
  stamp(out, shadeShape(bangs, 'hair', flat), 0, 0);
  stamp(out, shadeShape(tuftL, 'hair', flat), 0, 0);
  stamp(out, shadeShape(tuftR, 'hair', dark), 0, 0);
  eye(p, out, Math.floor(cx) - 3 * k, rows + 3 * k);
  eye(p, out, Math.ceil(cx) + k, rows + 3 * k);
  return out;
}

/** Three-quarter head: face on the left two thirds, hair mass behind, two eyes. */
export function buildHeadSW(p: BodyParams): Sprite {
  const w = p.headW - p.k;
  const h = p.headH;
  const k = p.k;
  const skull = egg(w, h);
  const { cap, rows } = capOf(skull, h);
  const faceW = Math.round(w * 0.68);
  const back = boxMask(skull, faceW, 0, w - 1, h - 1);
  const bangs = blank(w, h);
  for (const px of [k, 5 * k])
    for (let x = px; x < px + p.bangW; x++) if (inMask(skull, x, rows)) set(bangs, x, rows, 0);
  const tuft = boxMask(skull, 0, rows, k - 1, rows + 3 * k - 1);
  const hair = union(w, h, [cap, back, bangs, tuft]);
  const face = subtract(skull, hair);
  const out = blank(w, h);
  paintFace(p, out, face, hair);
  stamp(out, shadeShape(back, 'hair', massShade(p)), 0, 0);
  stamp(out, shadeShape(cap, 'hair', capShade(p)), 0, 0);
  stamp(out, shadeShape(bangs, 'hair', flat), 0, 0);
  stamp(out, shadeShape(tuft, 'hair', flat), 0, 0);
  eye(p, out, 2 * k, rows + 3 * k);
  eye(p, out, 6 * k, rows + 3 * k);
  return out;
}

/** Side head: face on the front third, one eye, hair cap and back mass. */
export function buildHeadW(p: BodyParams): Sprite {
  const w = p.headW - 2 * p.k;
  const h = p.headH;
  const k = p.k;
  const skull = egg(w, h);
  const { cap, rows } = capOf(skull, h);
  const back = boxMask(skull, 5 * k, 0, w - 1, h - 1);
  const bangs = blank(w, h);
  for (let x = k; x < k + p.bangW; x++) if (inMask(skull, x, rows)) set(bangs, x, rows, 0);
  const hair = union(w, h, [cap, back, bangs]);
  const face = subtract(skull, hair);
  const out = blank(w, h);
  paintFace(p, out, face, hair);
  stamp(out, shadeShape(back, 'hair', massShade(p)), 0, 0);
  stamp(out, shadeShape(cap, 'hair', capShade(p)), 0, 0);
  stamp(out, shadeShape(bangs, 'hair', flat), 0, 0);
  eye(p, out, k, rows + 3 * k);
  return out;
}

/** Three-quarter back head: all hair but a sliver of cheek on the left. */
export function buildHeadNW(p: BodyParams): Sprite {
  const w = p.headW - p.k;
  const h = p.headH;
  const k = p.k;
  const skull = egg(w, h);
  const { rows } = capOf(skull, h);
  const face = boxMask(skull, 0, rows + 2 * k, 2 * k - 1, rows + 6 * k - 1);
  const hair = subtract(skull, face);
  const out = blank(w, h);
  paintFace(p, out, face, hair);
  stamp(
    out,
    shadeShape(hair, 'hair', { base: [-p.shadeK, -p.shadeK], light: mul([-4, -3], p.shadeK) }),
    0,
    0,
  );
  return out;
}

/** Back head: all hair, lit from the top-left. */
export function buildHeadN(p: BodyParams): Sprite {
  return shadeShape(egg(p.headW, p.headH), 'hair', {
    base: [-p.shadeK, -p.shadeK],
    light: mul([-4, -3], p.shadeK),
  });
}

function beltRows(p: BodyParams, w: number, buckleX: number | null): string[] {
  const k = p.k;
  const cells: string[] = Array.from({ length: w }, (_, x) =>
    x < k ? '|' : x >= w - 2 * k ? 'L' : 'l',
  );
  if (buckleX !== null) for (let x = buckleX; x < buckleX + 2 * k && x < w; x++) cells[x] = 'a';
  const row = cells.join('');
  return Array.from({ length: k }, () => row);
}

/** Tunic: flat shoulder line, one unit in from the belt down, belt with an optional buckle. */
export function buildTorso(p: BodyParams, w: number, buckleX: number | null): Sprite {
  const h = p.torsoH;
  const k = p.k;
  const mask = blank(w, h);
  const waist = Math.max(3 * k, Math.floor(h / 2));
  fillRect(mask, 0, 0, w - 1, waist - 1, 0);
  fillRoundRect(mask, k, waist - 1, w - 1 - k, h - 1, Math.min(3, k), 0);
  const out = shadeShape(mask, 'cloth', {
    base: [-p.shadeK, -p.shadeK],
    light: mul([-3, -2], p.shadeK),
  });
  putRows(out, k, h - 3 * k, beltRows(p, w - 2 * k, buckleX === null ? null : buckleX - k));
  return out;
}

/** Arm stub with a hand: rounded cloth sleeve, hand rows at the end. */
export function buildArm(p: BodyParams, side: Side): Sprite {
  const h = p.armH;
  const mask = blank(p.armW, h);
  fillRoundRect(mask, 0, 0, p.armW - 1, h - 1, Math.min(3, p.k), 0);
  const out = shadeShape(mask, 'cloth', { base: toward(p, side), light: mul([-3, -2], p.shadeK) });
  const hand = blank(p.armW, 2 * p.k);
  fillRect(hand, 0, 0, p.armW - 1, 2 * p.k - 1, 0);
  stamp(
    out,
    shadeShape(hand, 'skin', { base: toward(p, side), noHighlight: true }),
    0,
    h - 2 * p.k,
  );
  return out;
}

/** Arm raised straight up: hand at the top, sleeve long enough to keep covering the shoulder. */
export function buildArmUp(p: BodyParams, side: Side): Sprite {
  const h = p.armH + 2 * p.k;
  const mask = blank(p.armW, h);
  fillRoundRect(mask, 0, 0, p.armW - 1, h - 1, Math.min(3, p.k), 0);
  const out = shadeShape(mask, 'cloth', { base: toward(p, side), light: mul([-3, -2], p.shadeK) });
  const hand = blank(p.armW, 2 * p.k);
  fillRect(hand, 0, 0, p.armW - 1, 2 * p.k - 1, 0);
  stamp(out, shadeShape(hand, 'skin', { base: toward(p, side), noHighlight: true }), 0, 0);
  return out;
}

/** Arm extended forward (screen-left), hand at the left end. */
export function buildArmForward(p: BodyParams): Sprite {
  const k = p.k;
  const mask = blank(7 * k, p.armW);
  fillRoundRect(mask, 0, 0, 7 * k - 1, p.armW - 1, Math.min(3, k), 0);
  const out = shadeShape(mask, 'cloth', {
    base: [-p.shadeK, -p.shadeK],
    light: mul([-3, -2], p.shadeK),
  });
  const hand = blank(2 * k, p.armW);
  fillRoundRect(hand, 0, 0, 2 * k - 1, p.armW - 1, Math.min(3, k), 0);
  stamp(out, shadeShape(hand, 'skin', { base: [-p.shadeK, -p.shadeK], noHighlight: true }), 0, 0);
  return out;
}

/** Leg with a boot; the outer bottom corner is cut so the foot reads as a shoe. */
export function buildLeg(p: BodyParams, side: Side): Sprite {
  const w = p.legW;
  const h = p.legH;
  const pants = blank(w, h);
  fillRect(pants, 0, 0, w - 1, h - p.bootH - 1, 0);
  const boot = blank(w, h);
  fillRect(boot, 0, h - p.bootH, w - 1, h - 1, 0);
  for (let i = 0; i < p.k; i++) set(boot, side === 'right' ? i : w - 1 - i, h - 1, -1);
  const out = blank(w, h);
  stamp(out, shadeShape(pants, 'pants', { base: toward(p, side), noHighlight: true }), 0, 0);
  stamp(out, shadeShape(boot, 'boots', { base: toward(p, side), noHighlight: true }), 0, 0);
  return out;
}

/** Lying on the back, head to the left, eyes closed (32 px set); outlines come from compose. */
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

type Part = { sprite: Sprite; x: number; y: number; z: number };

function assemble(
  p: BodyParams,
  head: Sprite,
  place: Placement,
  layout: 'front' | 'side' | 'quarter',
): BodyView {
  const k = p.k;
  const C = center(p);
  const legTop = feetRow(p) - p.legH + 1;
  const torsoTop = legTop - p.torsoH + 1;
  const headTop = torsoTop - p.headH + 1;
  const torsoX = C - Math.floor(place.torsoW / 2);
  const armTop = torsoTop + k;
  const h = trim(head);
  const nearId = place.nearIsRight ? 'armR' : 'armL';
  const farId = place.nearIsRight ? 'armL' : 'armR';
  const nearLeg = place.nearIsRight ? 'legR' : 'legL';
  const farLeg = place.nearIsRight ? 'legL' : 'legR';
  const handY = armTop + p.armH - 2 * k;

  let arms: Record<string, Part>;
  let legs: Record<string, Part>;
  let hands: { near: { x: number; y: number }; far: { x: number; y: number } };
  if (layout === 'front') {
    arms = {
      [nearId]: { sprite: buildArm(p, 'right'), x: torsoX - p.armW, y: armTop, z: 30 },
      [farId]: { sprite: buildArm(p, 'left'), x: torsoX + place.torsoW, y: armTop, z: 30 },
    };
    legs = {
      [nearLeg]: { sprite: buildLeg(p, 'right'), x: C - p.legW, y: legTop, z: 11 },
      [farLeg]: { sprite: buildLeg(p, 'left'), x: C, y: legTop, z: 10 },
    };
    hands = {
      near: { x: torsoX - p.armW + k, y: handY },
      far: { x: torsoX + place.torsoW + k, y: handY },
    };
  } else if (layout === 'quarter') {
    arms = {
      [nearId]: { sprite: buildArm(p, 'right'), x: torsoX - p.armW, y: armTop, z: 30 },
      [farId]: { sprite: buildArm(p, 'left'), x: torsoX + place.torsoW - k, y: armTop, z: 15 },
    };
    legs = {
      [nearLeg]: { sprite: buildLeg(p, 'right'), x: C - p.legW, y: legTop, z: 12 },
      [farLeg]: { sprite: buildLeg(p, 'left'), x: C, y: legTop - k, z: 10 },
    };
    hands = {
      near: { x: torsoX - p.armW + k, y: handY },
      far: { x: torsoX + place.torsoW, y: handY },
    };
  } else {
    arms = {
      [nearId]: { sprite: buildArm(p, 'right'), x: torsoX + k, y: armTop, z: 30 },
      [farId]: { sprite: buildArm(p, 'left'), x: torsoX + place.torsoW - 2 * k, y: armTop, z: 15 },
    };
    legs = {
      [nearLeg]: { sprite: buildLeg(p, 'right'), x: C - p.legW + k, y: legTop, z: 12 },
      [farLeg]: { sprite: buildLeg(p, 'left'), x: C, y: legTop, z: 10 },
    };
    hands = {
      near: { x: torsoX + 2 * k, y: handY },
      far: { x: torsoX + place.torsoW - k, y: handY },
    };
  }
  const parts = {
    ...legs,
    torso: { sprite: buildTorso(p, place.torsoW, place.buckleX), x: torsoX, y: torsoTop, z: 20 },
    ...arms,
    head: { sprite: h.sprite, x: place.headX + h.dx, y: headTop + h.dy, z: 40 },
  } as BodyView['parts'];
  return {
    parts,
    anchors: {
      head: { x: place.headX, y: headTop },
      hand_right: place.nearIsRight ? hands.near : hands.far,
      hand_left: place.nearIsRight ? hands.far : hands.near,
      back: { x: C, y: torsoTop + k },
    },
  };
}

/** Every authored view of the body for one parameter set. */
export function buildBody(p: BodyParams): Record<View, BodyView> {
  const k = p.k;
  const C = center(p);
  const wide = p.torsoW;
  const mid = p.torsoW - k;
  const narrow = p.torsoW - 2 * k;
  const headX = C - Math.floor(p.headW / 2);
  return {
    S: assemble(
      p,
      buildHeadS(p),
      { headX, torsoW: wide, buckleX: wide / 2 - k, nearIsRight: true },
      'front',
    ),
    SW: assemble(
      p,
      buildHeadSW(p),
      { headX, torsoW: mid, buckleX: 2 * k, nearIsRight: true },
      'quarter',
    ),
    W: assemble(
      p,
      buildHeadW(p),
      {
        headX: C - Math.floor((p.headW - 2 * k) / 2),
        torsoW: narrow,
        buckleX: k,
        nearIsRight: true,
      },
      'side',
    ),
    NW: assemble(
      p,
      buildHeadNW(p),
      { headX, torsoW: mid, buckleX: null, nearIsRight: false },
      'quarter',
    ),
    N: assemble(
      p,
      buildHeadN(p),
      { headX, torsoW: wide, buckleX: null, nearIsRight: false },
      'front',
    ),
  };
}

/** Pose drawings used by the clips, matching the body parameters. */
export function buildPoses(p: BodyParams) {
  return {
    armUpR: buildArmUp(p, 'right'),
    armUpL: buildArmUp(p, 'left'),
    armForward: buildArmForward(p),
    lying: LYING,
  };
}
