import { mirrorFromLeft, sprite, type Sprite } from './format.js';
import type { SlotId } from './registry.js';

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
  views: { S: PartView; W: PartView };
}

const HELMET_S = mirrorFromLeft(
  sprite`
    ...oooo.......
    ..ommmmm......
    .ommmmmm......
    ommmmmww......
    ommmmmww......
    ommmmmmm......
    oMMMMMMM......
    ommmmmmm......
    ommooooo......
    ommooooo......
    ommmmmmm......
    .oMMMMMM......
    ..oooooo......
  `,
);

const HELMET_W = sprite`
  ...oooooo...
  ..ommmmmmmo.
  .ommmmmmmmmo
  ommmwwmmmmmo
  ommmmmmmmmmo
  ommmmmmmmmmo
  oMMMMMMMMMMo
  ommmmmmmmmmo
  ooooommmmmmo
  ommmmmmmmmmo
  ommmmmmmmmmo
  .oMMMMMMMMo.
  ..oooooooo..
`;

const SWORD = sprite`
  ..o..
  .omo.
  .omwo
  .omwo
  .omwo
  .omwo
  .omwo
  .omwo
  .omwo
  .omwo
  oaaao
  .olo.
  .olo.
  .oao.
  ..o..
`;

/** Lowered sword for the side view: grip at the hand, blade toward the ground. */
const SWORD_DOWN = sprite`
  ..o..
  .oao.
  .olo.
  .olo.
  oaaao
  .omwo
  .omwo
  .omwo
  .omwo
  .omwo
  .omo.
  ..o..
`;

const SHIELD = sprite`
  ...ooo...
  .ooDdDoo.
  .oDdddDo.
  oDdmmmdDo
  odDmwmDdo
  oDdmmmdDo
  .oDdddDo.
  .ooDdDoo.
  ...ooo...
`;

const CAPE_S = sprite`
  .okkkkkkkko.
  okkkkkkkkkko
  okkkkkkkkkko
  okkkkkkkkkko
  okkkkkkkkkko
  okkkkkkkkkko
  okkkkkkkkkko
  okkkkkkkkkko
  oKkkkkkkkkKo
  oKKkkkkkkKKo
  oKKKKKKKKKKo
  .oooooooooo.
`;

const CAPE_W = sprite`
  .okkko
  okkkko
  okkkko
  okkkko
  okkkko
  okkkko
  okkkko
  okkkko
  okkkKo
  oKKKKo
  .oooo.
`;

export const PARTS: PartDef[] = [
  {
    id: 'knight_helmet',
    slot: 'head',
    views: {
      S: { sprite: HELMET_S, dx: 0, dy: 0, z: 45 },
      W: { sprite: HELMET_W, dx: 0, dy: 0, z: 45 },
    },
  },
  {
    id: 'sword_1handed',
    slot: 'hand_right',
    views: {
      // S: blade stands beside the arm, grip row 11 at the hand. W: lowered, grip row 2 at the hand.
      S: { sprite: SWORD, dx: -4, dy: -11, z: 50 },
      W: { sprite: SWORD_DOWN, dx: -2, dy: -2, z: 50 },
    },
  },
  {
    id: 'shield_round',
    slot: 'hand_left',
    views: {
      S: { sprite: SHIELD, dx: -3, dy: -5, z: 50 },
      W: { sprite: SHIELD, dx: -1, dy: -5, z: 5 }, // on the far arm, behind the body
    },
  },
  {
    id: 'cape',
    slot: 'back',
    views: {
      S: { sprite: CAPE_S, dx: -6, dy: -1, z: 1 },
      W: { sprite: CAPE_W, dx: -2, dy: -1, z: 1 },
    },
  },
];
