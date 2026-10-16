import { flipX, mirrorFromLeft, sprite, type Sprite } from './format.js';

/**
 * Base body, 32 px tall chibi, authored directly on the pixel grid.
 * Each view is a set of limb layers positioned on a 24×32 canvas so animation
 * is a table of per-layer offsets (PIXEL_RULES: large masses, deliberate clusters).
 * Canvas origin (pivot) is the bottom centre: (12, 30).
 */

export const CANVAS_W = 24;
export const CANVAS_H = 32;
export const PIVOT = { x: 12, y: 30 } as const;

export interface BodyPart {
  sprite: Sprite;
  x: number;
  y: number;
  z: number;
}

/** One anchor per slot (see registry.ts SLOT_IDS). */
export interface Anchors {
  /** Top-left of the head box (hats/helmets are drawn relative to it). */
  head: { x: number; y: number };
  /** Right hand of the character (screen-left when facing S). */
  hand_right: { x: number; y: number };
  hand_left: { x: number; y: number };
  /** Point behind the shoulders for capes. */
  back: { x: number; y: number };
}

export interface BodyView {
  parts: Record<'head' | 'torso' | 'armR' | 'armL' | 'legR' | 'legL', BodyPart>;
  anchors: Anchors;
}

// ---------------------------------------------------------------------------
// Front view (S): symmetric, so the head and torso are authored as a left half
// and mirrored; arms and legs are single limbs reused on both sides.
// ---------------------------------------------------------------------------

const HEAD_S = mirrorFromLeft(
  sprite`
    ...oooo.......
    ..ohhhhh......
    .ohhhhhh......
    ohhhhhhh......
    ohhhhhhh......
    ohhhhhhh......
    oHHhhhhh......
    oHHHssss......
    oHssssss......
    oHseesss......
    oHseesss......
    oSssssss......
    .oSsssss......
    ..ooooSS......
  `,
);

const TORSO_S = mirrorFromLeft(
  sprite`
    .occS.....
    occcc.....
    occcc.....
    occcc.....
    occcc.....
    ollla.....
    occcc.....
    oCCCC.....
  `,
);

/** Right arm as seen on screen-left; the other arm is its mirror. Inner column in shadow so it reads apart from the torso. */
const ARM_S = sprite`
  ocC
  ocC
  ocC
  ocC
  oSs
  .oo
`;

/** One leg; the other is its mirror. Row 0 hides under the tunic. */
const LEG_S = sprite`
  opppo
  opppo
  opppo
  oPPPo
  obbbo
  obbbo
  oBBBo
  ooooo
`;

export const BODY_S: BodyView = {
  parts: {
    legR: { sprite: LEG_S, x: 8, y: 22, z: 10 },
    legL: { sprite: flipX(LEG_S), x: 12, y: 22, z: 11 },
    torso: { sprite: TORSO_S, x: 7, y: 15, z: 20 },
    armR: { sprite: ARM_S, x: 4, y: 16, z: 30 },
    armL: { sprite: flipX(ARM_S), x: 17, y: 16, z: 30 },
    head: { sprite: HEAD_S, x: 5, y: 1, z: 40 },
  },
  anchors: {
    head: { x: 5, y: 1 },
    hand_right: { x: 5, y: 20 },
    hand_left: { x: 18, y: 20 },
    back: { x: 12, y: 16 },
  },
};

// ---------------------------------------------------------------------------
// Side view (W, facing screen-left). E is the horizontal mirror of the result.
// ---------------------------------------------------------------------------

const HEAD_W = sprite`
  ...oooooo...
  ..ohhhhhhho.
  .ohhhhhhhhho
  ohhhhhhhhhho
  ohhhhhhhhhho
  oHhhhhhhhhho
  oHHHhhhhhhho
  ossssHhhhhho
  ossssHhhhhho
  oseesHhhhhho
  oseesHhhhhho
  osssSHHhhhho
  .oSssSHhhho.
  ..ooSSooooo.
`;

const TORSO_W = sprite`
  .ocSScco
  occcccco
  occcccco
  occcccco
  occcccco
  ollaallo
  occcccco
  oCCCCCCo
`;

const ARM_W = sprite`
  occo
  occo
  occo
  occo
  osso
  .oo.
`;

const LEG_W = sprite`
  .oppo
  .oppo
  .oppo
  .oPPo
  .obbo
  obbbo
  oBBBo
  ooooo
`;

export const BODY_W: BodyView = {
  parts: {
    legL: { sprite: LEG_W, x: 11, y: 22, z: 10 }, // far leg
    legR: { sprite: LEG_W, x: 8, y: 22, z: 12 }, // near leg
    torso: { sprite: TORSO_W, x: 8, y: 15, z: 20 },
    armL: { sprite: ARM_W, x: 12, y: 16, z: 15 }, // far arm, behind the torso
    armR: { sprite: ARM_W, x: 9, y: 16, z: 30 }, // near arm
    head: { sprite: HEAD_W, x: 5, y: 1, z: 40 },
  },
  anchors: {
    head: { x: 5, y: 1 },
    hand_right: { x: 10, y: 20 },
    hand_left: { x: 13, y: 20 },
    back: { x: 15, y: 16 },
  },
};
