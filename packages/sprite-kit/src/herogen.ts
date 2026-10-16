/**
 * "Hero" body at 64×64: realistic proportions (about three heads tall, as in
 * the user's base-body reference: 21×48 px figure, head 16 of 48, shoulders 16
 * wide, hands at mid-thigh), built from shapes like bodygen.ts. The mannequin
 * is skin-only; outfits are meant to be parts layered over it (paper-doll).
 */
import type { BodyView } from './body32.js';
import {
  blank,
  cellOf,
  fillEllipse,
  fillRect,
  fillRoundRect,
  set,
  shadeShape,
  stamp,
  subtract,
  trim,
} from './draw.js';
import type { Material, Sprite } from './format.js';
import type { View } from './registry.js';

export interface HeroParams {
  canvas: number;
  headW: number;
  headH: number;
  neckW: number;
  neckH: number;
  shoulderW: number;
  waistW: number;
  torsoH: number;
  armW: number;
  armH: number;
  handH: number;
  legW: number;
  legH: number;
  footW: number;
  footH: number;
  eyeW: number;
  eyeH: number;
  /** Shading step in pixels (2 at 64 px). */
  shadeK: number;
}

export const HERO_64: HeroParams = {
  canvas: 64,
  headW: 14,
  headH: 16,
  neckW: 4,
  neckH: 2,
  shoulderW: 16,
  waistW: 12,
  torsoH: 16,
  armW: 4,
  armH: 16,
  handH: 4,
  legW: 6,
  legH: 16,
  footW: 7,
  footH: 3,
  eyeW: 2,
  eyeH: 3,
  shadeK: 2,
};

/** Slimmer and taller: about four heads, longer legs, narrower shoulders. */
export const HERO_64_TALL: HeroParams = {
  ...HERO_64,
  headW: 12,
  headH: 14,
  shoulderW: 14,
  waistW: 10,
  torsoH: 17,
  armW: 3,
  armH: 17,
  handH: 3,
  legW: 5,
  legH: 20,
  footW: 6,
  footH: 3,
};

/** Which material each region wears; the mannequin is all skin. */
export interface HeroGenOutfit {
  torso: Material;
  arms: Material;
  legs: Material;
  feet: Material;
}
export const MANNEQUIN: HeroGenOutfit = { torso: 'skin', arms: 'skin', legs: 'skin', feet: 'skin' };
export const DRESSED: HeroGenOutfit = { torso: 'cloth', arms: 'cloth', legs: 'pants', feet: 'boots' };

type Side = 'left' | 'right';
type Vec = [number, number];
const feetRow = (p: HeroParams) => p.canvas - 4;
const center = (p: HeroParams) => p.canvas / 2;
const toward = (p: HeroParams, side: Side): Vec =>
  side === 'right' ? [-p.shadeK, -p.shadeK] : [p.shadeK, -p.shadeK];

function inMask(m: Sprite, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < m.w && y < m.h && m.cells[y * m.w + x]! >= 0;
}

/** Front head: egg, two eyes set low with a glint, a nose shadow; bald (hair is a part). */
export function heroHeadS(p: HeroParams): Sprite {
  const w = p.headW;
  const h = p.headH;
  const skull = blank(w, h);
  fillEllipse(skull, 0, 0, w - 1, h - 1, 0);
  const out = shadeShape(skull, 'skin', { base: [-p.shadeK, -p.shadeK], rimLight: [2, 2] });
  const cx = w / 2;
  const eyeY = Math.round(h * 0.6);
  const eye = (x: number) => {
    fillRect(out, x, eyeY, x + p.eyeW - 1, eyeY + p.eyeH - 1, cellOf('eye', 1));
    set(out, x, eyeY, cellOf('white', 1));
  };
  eye(Math.floor(cx) - 3);
  eye(Math.ceil(cx) + 1);
  // brow shadow above each eye and a nose shadow between them
  for (const x of [Math.floor(cx) - 3, Math.floor(cx) - 2, Math.ceil(cx) + 1, Math.ceil(cx) + 2])
    if (inMask(skull, x, eyeY - 1)) set(out, x, eyeY - 1, cellOf('skin', 0));
  set(out, Math.floor(cx), eyeY + p.eyeH - 1, cellOf('skin', 0));
  // chin: one darker row under the mouth line
  return out;
}

/** Side head: face on the front third, one eye, a nose bump. */
export function heroHeadW(p: HeroParams): Sprite {
  const w = p.headW - 2;
  const h = p.headH;
  const skull = blank(w, h);
  fillEllipse(skull, 0, 0, w - 1, h - 1, 0);
  const eyeY = Math.round(h * 0.6);
  // nose: one pixel proud of the face at eye height + 2
  set(skull, -1, eyeY + 2, 0);
  const nose = blank(w + 1, h);
  stamp(nose, skull, 1, 0);
  set(nose, 0, eyeY + 2, 0);
  set(nose, 0, eyeY + 3, 0);
  const out = shadeShape(nose, 'skin', { base: [-p.shadeK, -p.shadeK], rimLight: [2, 2] });
  fillRect(out, 2, eyeY, 2 + p.eyeW - 1, eyeY + p.eyeH - 1, cellOf('eye', 1));
  set(out, 2, eyeY, cellOf('white', 1));
  for (let x = 2; x < 4; x++) set(out, x, eyeY - 1, cellOf('skin', 0));
  return out;
}

export function heroHeadN(p: HeroParams): Sprite {
  const skull = blank(p.headW, p.headH);
  fillEllipse(skull, 0, 0, p.headW - 1, p.headH - 1, 0);
  return shadeShape(skull, 'skin', { base: [-p.shadeK, -p.shadeK], rimLight: [2, 2] });
}

function neck(p: HeroParams): Sprite {
  const m = blank(p.neckW, p.neckH + 2);
  fillRect(m, 0, 0, p.neckW - 1, p.neckH + 1, 0);
  return shadeShape(m, 'skin', { base: [99, 99], noHighlight: true });
}

/** Torso: rounded shoulders, tapering to the waist; shaded as one mass. */
function torso(p: HeroParams, w: number, material: Material): Sprite {
  const h = p.torsoH;
  const m = blank(w, h);
  const waist = Math.max(4, w - (p.shoulderW - p.waistW));
  for (let y = 0; y < h; y++) {
    const t = Math.min(1, y / (h - 1));
    const rowW = Math.round(w - (w - waist) * t);
    const x0 = Math.floor((w - rowW) / 2);
    fillRect(m, x0, y, x0 + rowW - 1, y, 0);
  }
  // round the shoulders by one pixel
  set(m, 0, 0, -1);
  set(m, w - 1, 0, -1);
  const out = shadeShape(m, material, { base: [-p.shadeK, -p.shadeK], rimLight: [2, 2] });
  if (material !== 'skin') {
    // belt
    const row = h - 4;
    for (let x = 0; x < w; x++)
      if (inMask(m, x, row)) set(out, x, row, cellOf('leather', x < 2 ? 2 : x > w - 4 ? 0 : 1));
    set(out, Math.floor(w / 2) - 1, row, cellOf('accent', 1));
    set(out, Math.floor(w / 2), row, cellOf('accent', 1));
  }
  return out;
}

function arm(p: HeroParams, side: Side, material: Material): Sprite {
  const m = blank(p.armW, p.armH);
  fillRoundRect(m, 0, 0, p.armW - 1, p.armH - 1, 1, 0);
  const out = shadeShape(m, material, { base: toward(p, side), rimLight: [1, 2] });
  const hand = blank(p.armW, p.handH);
  fillRoundRect(hand, 0, 0, p.armW - 1, p.handH - 1, 1, 0);
  stamp(
    out,
    shadeShape(hand, 'skin', { base: toward(p, side), noHighlight: true }),
    0,
    p.armH - p.handH,
  );
  return out;
}

function leg(p: HeroParams, side: Side, legMat: Material, footMat: Material): Sprite {
  const w = p.footW;
  const h = p.legH;
  const out = blank(w, h);
  const thigh = blank(w, h);
  const x0 = side === 'right' ? w - p.legW : 0;
  fillRect(thigh, x0, 0, x0 + p.legW - 1, h - p.footH - 1, 0);
  stamp(out, shadeShape(thigh, legMat, { base: toward(p, side), noHighlight: true }), 0, 0);
  const foot = blank(w, h);
  fillRoundRect(foot, 0, h - p.footH, w - 1, h - 1, 1, 0);
  stamp(out, shadeShape(foot, footMat, { base: toward(p, side), noHighlight: true }), 0, 0);
  return out;
}

/** The S view: head over neck over torso, arms hanging beside it, legs with a one-pixel gap. */
export function heroBodyS(p: HeroParams, outfit: HeroGenOutfit = MANNEQUIN): BodyView {
  const C = center(p);
  const legTop = feetRow(p) - p.legH + 1;
  const torsoTop = legTop - p.torsoH + 2; // hips overlap the leg tops by two rows
  const headBottom = torsoTop - p.neckH;
  const headTop = headBottom - p.headH + 1;
  const torsoX = C - p.shoulderW / 2;
  const head = trim(heroHeadS(p));
  const armTop = torsoTop;
  const handY = armTop + p.armH - p.handH;
  return {
    parts: {
      legR: {
        sprite: leg(p, 'right', outfit.legs, outfit.feet),
        x: C - 1 - p.footW,
        y: legTop,
        z: 10,
      },
      legL: { sprite: leg(p, 'left', outfit.legs, outfit.feet), x: C, y: legTop, z: 10 },
      torso: {
        sprite: stackNeck(p, torso(p, p.shoulderW, outfit.torso)),
        x: torsoX,
        y: torsoTop - p.neckH,
        z: 20,
      },
      armR: { sprite: arm(p, 'right', outfit.arms), x: torsoX - p.armW + 1, y: armTop, z: 30 },
      armL: { sprite: arm(p, 'left', outfit.arms), x: torsoX + p.shoulderW - 1, y: armTop, z: 30 },
      head: { sprite: head.sprite, x: C - p.headW / 2 + head.dx, y: headTop + head.dy, z: 40 },
    },
    anchors: {
      head: { x: C - p.headW / 2, y: headTop },
      hand_right: { x: torsoX - p.armW + 2, y: handY },
      hand_left: { x: torsoX + p.shoulderW, y: handY },
      back: { x: C, y: torsoTop + 1 },
    },
  };
}

/** Puts the neck on top of the torso sprite (one layer, so the chin line is cut by the head halo only). */
function stackNeck(p: HeroParams, t: Sprite): Sprite {
  const out = blank(t.w, t.h + p.neckH);
  stamp(out, neck(p), Math.floor((t.w - p.neckW) / 2), 0);
  stamp(out, t, 0, p.neckH);
  return out;
}

/** Side view: narrow torso, near arm in front, far arm behind, legs overlapping. */
export function heroBodyW(p: HeroParams, outfit: HeroGenOutfit = MANNEQUIN): BodyView {
  const C = center(p);
  const legTop = feetRow(p) - p.legH + 1;
  const torsoTop = legTop - p.torsoH + 2;
  const headBottom = torsoTop - p.neckH;
  const headTop = headBottom - p.headH + 1;
  const tw = p.waistW - 2;
  const torsoX = C - Math.floor(tw / 2);
  const head = trim(heroHeadW(p));
  const armTop = torsoTop;
  const handY = armTop + p.armH - p.handH;
  const t = torsoSide(p, tw, outfit.torso);
  return {
    parts: {
      legL: { sprite: leg(p, 'left', outfit.legs, outfit.feet), x: C - 1, y: legTop, z: 10 },
      legR: {
        sprite: leg(p, 'right', outfit.legs, outfit.feet),
        x: C - p.footW + 1,
        y: legTop,
        z: 12,
      },
      torso: { sprite: stackNeck(p, t), x: torsoX, y: torsoTop - p.neckH, z: 20 },
      armL: { sprite: arm(p, 'left', outfit.arms), x: torsoX + tw - p.armW + 1, y: armTop, z: 15 },
      armR: { sprite: arm(p, 'right', outfit.arms), x: torsoX + 1, y: armTop, z: 30 },
      head: {
        sprite: head.sprite,
        x: C - Math.floor(head.sprite.w / 2) - 1,
        y: headTop + head.dy,
        z: 40,
      },
    },
    anchors: {
      head: { x: C - Math.floor(head.sprite.w / 2) - 1, y: headTop },
      hand_right: { x: torsoX + 2, y: handY },
      hand_left: { x: torsoX + tw - p.armW + 2, y: handY },
      back: { x: torsoX + tw, y: torsoTop + 1 },
    },
  };
}

function torsoSide(p: HeroParams, w: number, material: Material): Sprite {
  const h = p.torsoH;
  const m = blank(w, h);
  fillRoundRect(m, 0, 0, w - 1, h - 1, 2, 0);
  const out = shadeShape(m, material, { base: [-p.shadeK, -p.shadeK], rimLight: [2, 2] });
  if (material !== 'skin') {
    const row = h - 4;
    for (let x = 0; x < w; x++)
      if (inMask(m, x, row)) set(out, x, row, cellOf('leather', x < 2 ? 2 : x > w - 3 ? 0 : 1));
    set(out, 1, row, cellOf('accent', 1));
    set(out, 2, row, cellOf('accent', 1));
  }
  return out;
}

export function heroBody(
  p: HeroParams,
  outfit: HeroGenOutfit = MANNEQUIN,
): Partial<Record<View, BodyView>> {
  return { S: heroBodyS(p, outfit), W: heroBodyW(p, outfit) };
}

void subtract;
