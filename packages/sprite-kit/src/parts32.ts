import { blank, fillRoundRect, set, shadeShape, stripOuterLines } from './draw.js';
import { EMPTY, flipX, LEGEND, packCell, rotateCW, sprite, type Sprite } from './format.js';
import type { SlotId, View } from './registry.js';

/** A part: a sprite per authored view plus where it sits relative to its anchor. */
export interface PartView {
  sprite: Sprite;
  /** Offset of the sprite's top-left from the anchor point. */
  dx: number;
  dy: number;
  /** Draw order relative to the body (body layers use 10–40). */
  z: number;
  /** Variants a clip frame can ask for by pose id (anim.ts FrameOffsets.pose). */
  poses?: Record<string, Omit<PartView, 'poses'>>;
}

export interface PartDef {
  id: string;
  slot: SlotId;
  views: Record<View, PartView>;
}

/** Great helm: highlight on the upper-left dome, visor slit, shadow under the rim. */
const HELMET_S = stripOuterLines(sprite`
  ....oooooo....
  ..owwwwwmmmo..
  .owwwwmmmmmMo.
  owwwmmmmmmmMMo
  owwmmmmmmmmMMo
  owmmmmmmmmMMMo
  ommmmmmmmmMMMo
  oMMMMMMMMMMMMo
  ommooooooooMMo
  ommooooooooMMo
  ommmmmmmmmMMMo
  .oMMMMMMMMMMo.
  ..oooooooooo..
`);

const HELMET_W = stripOuterLines(sprite`
  ...oooooo...
  ..owwwwmmmo.
  .owwwwmmmmMo
  owwwmmmmmmMo
  owwmmmmmmMMo
  owmmmmmmmMMo
  ommmmmmmmMMo
  oMMMMMMMMMMo
  ooooommmmMMo
  ooooommmmMMo
  ommmmmmmmMMo
  .oMMMMMMMMo.
  ..oooooooo..
`);

/** 13-wide three-quarter helm with the visor slit on the face side. */
const HELMET_SW = stripOuterLines(sprite`
  ...oooooo....
  ..owwwwmmmo..
  .owwwwmmmmMo.
  owwwmmmmmmMMo
  owwmmmmmmmMMo
  owmmmmmmmmMMo
  ommmmmmmmmMMo
  oMMMMMMMMMMMo
  ommoooooommMo
  ommoooooommMo
  ommmmmmmmmMMo
  .oMMMMMMMMMo.
  ..ooooooooo..
`);

/** 13-wide helm seen from the three-quarter back: no slit, a seam down the back. */
const HELMET_NW = stripOuterLines(sprite`
  ...oooooo....
  ..owwwwmmmo..
  .owwwwmmmmMo.
  owwwmmmmmmMMo
  owwmmmmmmmMMo
  owmmmmmmmmMMo
  ommmmmmmmmMMo
  oMMMMMMMMMMMo
  ommmmmmmmmMMo
  ommmmmmmmmMMo
  ommmmmmmmmMMo
  .oMMMMMMMMMo.
  ..ooooooooo..
`);

/** Back of the great helm. */
const HELMET_N = stripOuterLines(sprite`
  ....oooooo....
  ..owwwwwmmmo..
  .owwwwmmmmmMo.
  owwwmmmmmmmMMo
  owwmmmmmmmmMMo
  owmmmmmmmmMMMo
  ommmmmmmmmMMMo
  oMMMMMMMMMMMMo
  ommmmmmmmmMMMo
  ommmmmmmmmMMMo
  ommmmmmmmmMMMo
  .oMMMMMMMMMMo.
  ..oooooooooo..
`);

/** Upright sword, lit edge on the left of the blade. */
const SWORD = stripOuterLines(sprite`
  ..o..
  .owo.
  .owmo
  .owmo
  .owmo
  .owmo
  .owmo
  .owmo
  .owmo
  .owmo
  o*aAo
  .olo.
  .oLo.
  .oao.
  ..o..
`);

/** Lowered sword for the side view: grip at the hand, blade toward the ground. */
const SWORD_DOWN = stripOuterLines(sprite`
  ..o..
  .oao.
  .olo.
  .oLo.
  o*aAo
  .owmo
  .owmo
  .owmo
  .owmo
  .owmo
  .owo.
  ..o..
`);

/** Horizontal sword, tip to the right: the upright blade turned a quarter turn (lossless). */
const SWORD_H_R = rotateCW(SWORD);

/**
 * A 45° sword with the tip at the bottom-left and the pommel at the top-right,
 * drawn on the anti-diagonal of a 12×12 box: 7 blade steps (2 px thick), a
 * guard, 2 grip steps and a pommel, then a 1-px outline.
 */
function diagonalSword(): Sprite {
  const n = 12;
  const cells = new Int16Array(n * n).fill(EMPTY);
  const put = (x: number, y: number, g: string) => {
    if (x >= 0 && y >= 0 && x < n && y < n) cells[y * n + x] = packCell(LEGEND[g]!);
  };
  for (let i = 0; i <= 6; i++) {
    put(i, n - 1 - i - 1, 'w');
    put(i + 1, n - 1 - i - 1, 'm');
  }
  put(7, 3, 'a');
  put(6, 2, 'a');
  put(8, 4, 'a');
  put(8, 2, 'l');
  put(9, 1, 'L');
  put(10, 0, 'a');
  return { w: n, h: n, cells };
}
const SWORD_DIAG_DL = diagonalSword();
const SWORD_DIAG_DR = flipX(SWORD_DIAG_DL);

/** Round shield: wood ring lit at the top-left, metal boss with a specular pixel. */
const SHIELD = stripOuterLines(sprite`
  ...ooo...
  .oo%dDoo.
  .o%dddDo.
  o%dmmmdDo
  odDmwmDDo
  oDdmmmDDo
  .oDdddDo.
  .ooDDDoo.
  ...ooo...
`);

/** Back of the round shield: planks and a strap, no boss. */
const SHIELD_BACK = stripOuterLines(sprite`
  ...ooo...
  .oo%dDoo.
  .o%dddDo.
  o%ddlddDo
  oddDlDdDo
  oDdddddDo
  .oDdddDo.
  .ooDDDoo.
  ...ooo...
`);

/**
 * Cape: a cloth2 sheet with a straight top, rounded hem and the shifted-shape
 * shading; wider than the body in front views so its edges show beside it,
 * narrower behind the body in back views so the arms stay visible.
 */
function cape(w: number, h: number): Sprite {
  const mask = blank(w, h);
  fillRoundRect(mask, 0, 0, w - 1, h - 1, 2, 0);
  for (let x = 1; x < w - 1; x++) set(mask, x, 0, 0); // straight shoulder line
  return shadeShape(mask, 'cloth2', { base: [-1, -1], light: [-4, -3] });
}
const CAPE_S = cape(18, 12);
const CAPE_SW = cape(10, 12);
const CAPE_W = cape(6, 12);
const CAPE_NW = cape(11, 12);
const CAPE_N = cape(12, 12);

export const PARTS: PartDef[] = [
  {
    id: 'knight_helmet',
    slot: 'head',
    views: {
      S: { sprite: HELMET_S, dx: 0, dy: 0, z: 45 },
      SW: { sprite: HELMET_SW, dx: 0, dy: 0, z: 45 },
      W: { sprite: HELMET_W, dx: 0, dy: 0, z: 45 },
      NW: { sprite: HELMET_NW, dx: 0, dy: 0, z: 45 },
      N: { sprite: HELMET_N, dx: 0, dy: 0, z: 45 },
    },
  },
  {
    id: 'sword_1handed',
    slot: 'hand_right',
    views: {
      // S: blade stands beside the arm, grip row 11 at the hand. W: lowered, grip row 2 at the hand.
      S: {
        sprite: SWORD,
        dx: -4,
        dy: -11,
        z: 50,
        poses: { swing: { sprite: SWORD_H_R, dx: -1, dy: -2, z: 55 } },
      },
      SW: {
        sprite: SWORD,
        dx: -4,
        dy: -11,
        z: 50,
        poses: { swing: { sprite: SWORD_DIAG_DL, dx: -9, dy: -4, z: 55 } },
      },
      W: {
        sprite: SWORD_DOWN,
        dx: -2,
        dy: -2,
        z: 50,
        poses: {
          up: { sprite: SWORD, dx: -2, dy: -11, z: 50 },
          swing: { sprite: SWORD_DIAG_DL, dx: -9, dy: -1, z: 55 },
        },
      },
      // Far hand: upright beside the body, behind the arm.
      NW: {
        sprite: SWORD,
        dx: 0,
        dy: -11,
        z: 5,
        poses: { swing: { sprite: SWORD_DIAG_DR, dx: -4, dy: -4, z: 5 } },
      },
      N: {
        sprite: SWORD,
        dx: 1,
        dy: -11,
        z: 50,
        // Mid-swing the blade is on the far side; the down-right diagonal keeps it visible beside the body.
        poses: { swing: { sprite: SWORD_DIAG_DR, dx: -3, dy: -4, z: 5 } },
      },
    },
  },
  {
    id: 'shield_round',
    slot: 'hand_left',
    views: {
      S: { sprite: SHIELD, dx: -3, dy: -5, z: 50 },
      SW: { sprite: SHIELD, dx: -2, dy: -5, z: 5 }, // far arm, peeks out behind the body
      W: { sprite: SHIELD, dx: -1, dy: -5, z: 5 }, // on the far arm, behind the body
      NW: { sprite: SHIELD_BACK, dx: -3, dy: -5, z: 50 }, // near arm, back of the shield
      N: { sprite: SHIELD_BACK, dx: -3, dy: -5, z: 50 },
    },
  },
  {
    id: 'cape',
    slot: 'back',
    views: {
      S: { sprite: CAPE_S, dx: -9, dy: -1, z: 1 },
      SW: { sprite: CAPE_SW, dx: -3, dy: -1, z: 1 },
      W: { sprite: CAPE_W, dx: 0, dy: -1, z: 1 },
      NW: { sprite: CAPE_NW, dx: -5, dy: -1, z: 35 },
      N: { sprite: CAPE_N, dx: -6, dy: -1, z: 35 },
    },
  },
];
