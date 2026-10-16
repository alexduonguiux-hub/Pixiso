import { sprite, type Sprite } from './format.js';
import type { SlotId, View } from './registry.js';

/** A part: a sprite per authored view plus where it sits relative to its anchor. */
export interface PartView {
  sprite: Sprite;
  /** Offset of the sprite's top-left from the anchor point. */
  dx: number;
  dy: number;
  /** Draw order relative to the body (body layers use 10–40). */
  z: number;
}

export interface PartDef {
  id: string;
  slot: SlotId;
  views: Record<View, PartView>;
}

/** Great helm: highlight on the upper-left dome, visor slit, shadow under the rim. */
const HELMET_S = sprite`
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
`;

const HELMET_W = sprite`
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
`;

/** 13-wide three-quarter helm with the visor slit on the face side. */
const HELMET_SW = sprite`
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
`;

/** 13-wide helm seen from the three-quarter back: no slit, a seam down the back. */
const HELMET_NW = sprite`
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
`;

/** Back of the great helm. */
const HELMET_N = sprite`
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
`;

/** Upright sword, lit edge on the left of the blade. */
const SWORD = sprite`
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
`;

/** Lowered sword for the side view: grip at the hand, blade toward the ground. */
const SWORD_DOWN = sprite`
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
`;

/** Round shield: wood ring lit at the top-left, metal boss with a specular pixel. */
const SHIELD = sprite`
  ...ooo...
  .oo%dDoo.
  .o%dddDo.
  o%dmmmdDo
  odDmwmDDo
  oDdmmmDDo
  .oDdddDo.
  .ooDDDoo.
  ...ooo...
`;

/** Back of the round shield: planks and a strap, no boss. */
const SHIELD_BACK = sprite`
  ...ooo...
  .oo%dDoo.
  .o%dddDo.
  o%ddlddDo
  oddDlDdDo
  oDdddddDo
  .oDdddDo.
  .ooDDDoo.
  ...ooo...
`;

/** Cape seen from the front: only the edges show beside the body. */
const CAPE_S = sprite`
  .o&kkkkkkKo.
  o&kkkkkkkKKo
  o&kkkkkkkKKo
  okkkkkkkkKKo
  okkkkkkkkKKo
  okkkkkkkkKKo
  okkkkkkkkKKo
  okkkkkkkKKKo
  oKkkkkkkKKKo
  oKKkkkkKKKKo
  oKKKKKKKKKKo
  .oooooooooo.
`;

const CAPE_W = sprite`
  .o&kko
  o&kkKo
  okkkKo
  okkkKo
  okkkKo
  okkkKo
  okkkKo
  okkKKo
  oKKKKo
  oKKKKo
  .oooo.
`;

/** Cape in the three-quarter view: a strip behind the far side of the body. */
const CAPE_SW = sprite`
  .o&kkkkKo.
  o&kkkkkKKo
  okkkkkkKKo
  okkkkkkKKo
  okkkkkkKKo
  okkkkkkKKo
  okkkkkkKKo
  okkkkkKKKo
  oKkkkkKKKo
  oKKKKKKKKo
  .oooooooo.
`;

/** Cape covering the back (N and NW): drawn over torso and arms, under the head. */
const CAPE_N = sprite`
  .o&kkkkkkKo.
  o&&kkkkkkKKo
  o&kkkkkkkKKo
  o&kkkkkkkKKo
  okkkkkkkkKKo
  okkkkkkkkKKo
  okkkkkkkkKKo
  okkkkkkkkKKo
  okkkkkkkKKKo
  oKkkkkkkKKKo
  oKKkkkkKKKKo
  oKKKKKKKKKKo
  .oooooooooo.
`;

const CAPE_NW = sprite`
  .o&kkkkkKo.
  o&&kkkkkKKo
  o&kkkkkkKKo
  okkkkkkkKKo
  okkkkkkkKKo
  okkkkkkkKKo
  okkkkkkkKKo
  okkkkkkKKKo
  oKkkkkkKKKo
  oKKkkkKKKKo
  oKKKKKKKKKo
  .ooooooooo.
`;

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
      S: { sprite: SWORD, dx: -4, dy: -11, z: 50 },
      SW: { sprite: SWORD, dx: -4, dy: -11, z: 50 },
      W: { sprite: SWORD_DOWN, dx: -2, dy: -2, z: 50 },
      // Far hand: upright beside the body, behind the arm.
      NW: { sprite: SWORD, dx: 0, dy: -11, z: 5 },
      N: { sprite: SWORD, dx: 1, dy: -11, z: 50 },
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
      S: { sprite: CAPE_S, dx: -6, dy: -1, z: 1 },
      SW: { sprite: CAPE_SW, dx: -3, dy: -1, z: 1 },
      W: { sprite: CAPE_W, dx: -2, dy: -1, z: 1 },
      NW: { sprite: CAPE_NW, dx: -5, dy: -1, z: 35 },
      N: { sprite: CAPE_N, dx: -6, dy: -1, z: 35 },
    },
  },
];
