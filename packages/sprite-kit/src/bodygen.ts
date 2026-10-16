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
import type { Sprite } from './format.js';

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

/** Skull egg with the hair cap, bangs, side tufts, shaded face and eyes. */
export function buildHeadS(p: BodyParams): Sprite {
  const w = p.headW;
  const h = p.headH;
  const skull = blank(w, h);
  fillEllipse(skull, 0, 0, w - 1, h - 1, 0);
  const inSkull = (x: number, y: number) =>
    x >= 0 && x < w && y >= 0 && y < h && skull.cells[y * w + x]! >= 0;
  // Hair cap: the upper ~40 % of the skull.
  const cap = Math.round(h * 0.42);
  const capMask = blank(w, h);
  for (let y = 0; y < cap; y++)
    for (let x = 0; x < w; x++) if (inSkull(x, y)) set(capMask, x, y, 0);
  // Bangs: three 2-px points on the row under the cap; side tufts: two columns down to eye level.
  const cx = w / 2;
  const bangs = blank(w, h);
  for (const px of [Math.floor(cx) - 5, Math.floor(cx) - 1, Math.ceil(cx) + 3])
    for (let x = px; x < px + 2; x++) if (inSkull(x, cap)) set(bangs, x, cap, 0);
  const tuftL = blank(w, h);
  const tuftR = blank(w, h);
  for (let y = cap; y < cap + 3; y++) {
    for (const x of [0, 1]) if (inSkull(x, y)) set(tuftL, x, y, 0);
    for (const x of [w - 2, w - 1]) if (inSkull(x, y)) set(tuftR, x, y, 0);
  }
  const hair = blank(w, h);
  for (const m of [capMask, bangs, tuftL, tuftR]) stamp(hair, m, 0, 0);
  const face = subtract(skull, hair);

  const out = blank(w, h);
  // Face: flat skin with a shadow crescent at the chin and the shaded side; no highlight.
  stamp(out, shadeShape(face, 'skin', { base: [-1, -1], noHighlight: true }), 0, 0);
  // Cast shadow of the fringe: one skin-shadow row under every hair cell.
  for (let y = 1; y < h; y++)
    for (let x = 0; x < w; x++)
      if (hair.cells[(y - 1) * w + x]! >= 0 && face.cells[y * w + x]! >= 0)
        set(out, x, y, cellOf('skin', 0));
  // Hair: crescent-shaded cap, bangs in the base tone, lit tuft left, shadowed tuft right.
  stamp(out, shadeShape(capMask, 'hair', { base: [-1, 0], light: [-4, -3] }), 0, 0);
  stamp(out, shadeShape(bangs, 'hair', { base: [0, 0], noHighlight: true }), 0, 0);
  stamp(out, shadeShape(tuftL, 'hair', { base: [0, 0], noHighlight: true }), 0, 0);
  stamp(out, shadeShape(tuftR, 'hair', { base: [5, 5], noHighlight: true }), 0, 0);
  // Eyes 2×3 with a glint: a forehead row between the fringe shadow and the eyes, chin rows below.
  const eyeTop = cap + 3;
  const left = Math.floor(cx) - 3;
  const right = Math.ceil(cx) + 1;
  putRows(out, left, eyeTop, ['xe', 'ee', 'ee']);
  putRows(out, right, eyeTop, ['xe', 'ee', 'ee']);
  return out;
}

/** Tapered tunic: full width at the shoulders, one pixel in from the belt down, belt with a buckle. */
export function buildTorsoS(p: BodyParams): Sprite {
  const w = p.torsoW;
  const h = p.torsoH;
  const mask = blank(w, h);
  const waist = Math.max(3, Math.floor(h / 2));
  // Flat shoulder line (the chin sits on it; a rounded top would leave notches beside the neck).
  fillRect(mask, 0, 0, w - 1, waist - 1, 0);
  fillRoundRect(mask, 1, waist - 1, w - 2, h - 1, 1, 0);
  const out = shadeShape(mask, 'cloth', { base: [-1, -1], light: [-3, -2] });
  const belt = h - 3;
  const row = '|' + 'l'.repeat(Math.max(0, w - 6)) + 'aa' + 'L'.repeat(2);
  putRows(out, 1, belt, [row.slice(0, w - 2)]);
  return out;
}

/** Arm stub with a hand: rounded cloth sleeve, two skin rows at the end. */
export function buildArmS(p: BodyParams, side: 'left' | 'right'): Sprite {
  const h = p.armH;
  const mask = blank(3, h);
  fillRoundRect(mask, 0, 0, 2, h - 1, 1, 0);
  const toward: [number, number] = side === 'right' ? [-1, -1] : [1, -1];
  const out = shadeShape(mask, 'cloth', { base: toward, light: [-3, -2] });
  const hand = blank(3, 2);
  fillRect(hand, 0, 0, 2, 1, 0);
  stamp(out, shadeShape(hand, 'skin', { base: toward, noHighlight: true }), 0, h - 2);
  return out;
}

/** Leg with a boot; the outer bottom corner is cut so the foot reads as a shoe. */
export function buildLegS(p: BodyParams, side: 'left' | 'right'): Sprite {
  const w = 4;
  const h = p.legH;
  const pants = blank(w, h);
  fillRoundRect(pants, 0, 0, w - 1, h - p.bootH - 1, 0, 0);
  const boot = blank(w, h);
  fillRoundRect(boot, 0, h - p.bootH, w - 1, h - 1, 0, 0);
  set(boot, side === 'right' ? 0 : w - 1, h - 1, -1);
  const out = blank(w, h);
  stamp(
    out,
    shadeShape(pants, 'pants', { base: side === 'right' ? [-1, -1] : [1, -1], noHighlight: true }),
    0,
    0,
  );
  stamp(
    out,
    shadeShape(boot, 'boots', { base: side === 'right' ? [-1, -1] : [1, -1], noHighlight: true }),
    0,
    0,
  );
  return out;
}

/** Assembles the S view for a parameter set. Anchors follow the hands, head box and back. */
export function buildBodyS(p: BodyParams): BodyView {
  const legTop = FEET_ROW - p.legH + 1;
  const torsoBottom = legTop; // hem over the top leg row
  const torsoTop = torsoBottom - p.torsoH + 1;
  const headBottom = torsoTop;
  const headTop = headBottom - p.headH + 1;
  const headX = CENTER - Math.floor(p.headW / 2);
  const torsoX = CENTER - p.torsoW / 2;
  const armTop = torsoTop + 1;
  const head = trim(buildHeadS(p));
  return {
    parts: {
      legR: { sprite: buildLegS(p, 'right'), x: CENTER - 4, y: legTop, z: 10 },
      legL: { sprite: buildLegS(p, 'left'), x: CENTER, y: legTop, z: 11 },
      torso: { sprite: buildTorsoS(p), x: torsoX, y: torsoTop, z: 20 },
      armR: { sprite: buildArmS(p, 'right'), x: torsoX - 3, y: armTop, z: 30 },
      armL: { sprite: buildArmS(p, 'left'), x: torsoX + p.torsoW, y: armTop, z: 30 },
      head: { sprite: head.sprite, x: headX + head.dx, y: headTop + head.dy, z: 40 },
    },
    anchors: {
      head: { x: headX, y: headTop },
      hand_right: { x: torsoX - 2, y: armTop + p.armH - 2 },
      hand_left: { x: torsoX + p.torsoW + 1, y: armTop + p.armH - 2 },
      back: { x: CENTER, y: torsoTop + 1 },
    },
  };
}
