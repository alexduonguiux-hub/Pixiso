import { sprite, type Sprite } from './format.js';

/**
 * Base body, 32 px tall chibi, authored directly on the pixel grid.
 * Each view is a set of limb layers positioned on a 24×32 canvas so animation
 * is a table of per-layer offsets. Canvas origin (pivot) is the bottom centre: (12, 30).
 *
 * Shading follows docs/PIXEL_STYLE_REFERENCE.md §3: one light from the top-left,
 * three tones per material (highlight on the upper-left masses, shadow on the
 * lower-right), a closed 1-px outline, 2×3 eyes with one white glint. Templates
 * are authored at full width (no mirroring) so the light can be asymmetric.
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
// Front view (S)
// ---------------------------------------------------------------------------

/** 14×14: hair cap rows 1–6 with a spiky fringe, face rows 7–12, neck gap in the chin outline. */
const HEAD_S = sprite`
  ....oooooo....
  ..o######hho..
  .o#######hhHo.
  o###hhhhhhhHHo
  o##hhhhhhhhHHo
  o#hhhhhhhhHHHo
  ohhhhhhhhhHHHo
  ohSShSSSShSSHo
  oh$ssssssssSHo
  oh$seesseesSHo
  ohssxessxesSHo
  ohsseesseesSHo
  oSsssssssssSSo
  ..ooooSSoooo..
`;

/** 10×8: collar with the neck, shoulders, belt with a buckle, shadow hem. */
const TORSO_S = sprite`
  .o^^SScCo.
  o^cccccCCo
  o^cccccCCo
  occccccCCo
  occccccCCo
  o|llaalLLo
  occccccCCo
  oCCCCCCCCo
`;

/** Right arm (screen-left, lit side). Inner column in shadow so it reads apart from the torso. */
const ARM_R_S = sprite`
  o^C
  o^C
  ocC
  ocC
  osS
  .oo
`;

/** Left arm (screen-right, shadow side). */
const ARM_L_S = sprite`
  cCo
  cCo
  cCo
  cCo
  SSo
  oo.
`;

/** Right leg (screen-left). Row 0 hides under the tunic. */
const LEG_R_S = sprite`
  o+pPo
  o+pPo
  oppPo
  oPPPo
  o!bBo
  obbBo
  oBBBo
  ooooo
`;

const LEG_L_S = sprite`
  opPPo
  opPPo
  opPPo
  oPPPo
  obBBo
  obBBo
  oBBBo
  ooooo
`;

export const BODY_S: BodyView = {
  parts: {
    legR: { sprite: LEG_R_S, x: 8, y: 22, z: 10 },
    legL: { sprite: LEG_L_S, x: 12, y: 22, z: 11 },
    torso: { sprite: TORSO_S, x: 7, y: 15, z: 20 },
    armR: { sprite: ARM_R_S, x: 4, y: 16, z: 30 },
    armL: { sprite: ARM_L_S, x: 17, y: 16, z: 30 },
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
// Side view (W, facing screen-left). E is the horizontal mirror of the result;
// its light then comes from the top-right, which is the accepted cost of mirroring.
// ---------------------------------------------------------------------------

/** 12×14: face on the left, hair mass behind; highlight on the front of the crown. */
const HEAD_W = sprite`
  ...oooooo...
  ..o####hhho.
  .o#####hhhHo
  o###hhhhhhHo
  o##hhhhhhHHo
  o#hhhhhhhHHo
  ohhhhhhhhHHo
  oSsshHhhhHHo
  o$sssHhhhHHo
  o$eesHhhhHHo
  osxesHhhhHHo
  oseesHHhhHHo
  oSssSHHhHHHo
  ..ooooSSooo.
`;

/** 8×8 side torso: lit front edge, shadow back edge. */
const TORSO_W = sprite`
  .o^SScCo
  o^ccccCo
  o^ccccCo
  occcccCo
  occcccCo
  ollaalLo
  occccCCo
  oCCCCCCo
`;

/** Near arm (front). */
const ARM_NEAR_W = sprite`
  o^co
  o^co
  occo
  ocCo
  osSo
  .oo.
`;

/** Far arm, mostly behind the torso. */
const ARM_FAR_W = sprite`
  oCCo
  oCCo
  oCCo
  oCCo
  oSSo
  .oo.
`;

const LEG_NEAR_W = sprite`
  .o+po
  .o+po
  .oppo
  .oPPo
  .o!bo
  obbbo
  oBBBo
  ooooo
`;

const LEG_FAR_W = sprite`
  .oPPo
  .oPPo
  .oPPo
  .oPPo
  .oBBo
  oBBBo
  oBBBo
  ooooo
`;

export const BODY_W: BodyView = {
  parts: {
    legL: { sprite: LEG_FAR_W, x: 11, y: 22, z: 10 }, // far leg
    legR: { sprite: LEG_NEAR_W, x: 8, y: 22, z: 12 }, // near leg
    torso: { sprite: TORSO_W, x: 8, y: 15, z: 20 },
    armL: { sprite: ARM_FAR_W, x: 12, y: 16, z: 15 }, // far arm, behind the torso
    armR: { sprite: ARM_NEAR_W, x: 9, y: 16, z: 30 }, // near arm
    head: { sprite: HEAD_W, x: 5, y: 1, z: 40 },
  },
  anchors: {
    head: { x: 5, y: 1 },
    hand_right: { x: 10, y: 20 },
    hand_left: { x: 13, y: 20 },
    back: { x: 15, y: 16 },
  },
};

// ---------------------------------------------------------------------------
// Three-quarter front view (SW, facing screen-left and toward the camera).
// Face takes the left two thirds of the head, the far arm and leg sit behind.
// ---------------------------------------------------------------------------

const HEAD_SW = sprite`
  ...oooooo....
  ..o#####hho..
  .o######hhHo.
  o###hhhhhhHHo
  o##hhhhhhhHHo
  o#hhhhhhhhHHo
  ohhhhhhhhhHHo
  oSShSSShhHHHo
  o$sssssshHHHo
  o$eesseehHHHo
  osxessxehHHHo
  oseesseehHHHo
  oSsssssSHHHHo
  ..oooSSooooo.
`;

const TORSO_SW = sprite`
  .o^SScCCo
  o^ccccCCo
  o^ccccCCo
  occcccCCo
  occcccCCo
  o|laalLLo
  occcccCCo
  oCCCCCCCo
`;

export const BODY_SW: BodyView = {
  parts: {
    legL: { sprite: LEG_L_S, x: 12, y: 21, z: 10 }, // far leg, a step back and up
    legR: { sprite: LEG_R_S, x: 8, y: 22, z: 12 }, // near leg
    torso: { sprite: TORSO_SW, x: 7, y: 15, z: 20 },
    armL: { sprite: ARM_L_S, x: 15, y: 16, z: 15 }, // far arm, behind the torso
    armR: { sprite: ARM_R_S, x: 4, y: 16, z: 30 }, // near arm
    head: { sprite: HEAD_SW, x: 5, y: 1, z: 40 },
  },
  anchors: {
    head: { x: 5, y: 1 },
    hand_right: { x: 5, y: 20 },
    hand_left: { x: 16, y: 20 },
    back: { x: 12, y: 16 },
  },
};

// ---------------------------------------------------------------------------
// Three-quarter back view (NW, facing screen-left and away). A sliver of cheek
// shows on the left; the character's left arm and leg are the near ones.
// ---------------------------------------------------------------------------

const HEAD_NW = sprite`
  ...oooooo....
  ..o#####hho..
  .o######hhHo.
  o###hhhhhhHHo
  o##hhhhhhhHHo
  o#hhhhhhhhHHo
  ohhhhhhhhhHHo
  ohhhhhhhhhHHo
  oshhhhhhhhHHo
  osHhhhhhhhHHo
  oSHhhhhhhHHHo
  oSHHhhhhHHHHo
  oHHHHHHHHHHHo
  ..oooSSooooo.
`;

const TORSO_NW = sprite`
  .o^SScCCo
  o^ccccCCo
  o^ccccCCo
  occcccCCo
  occcccCCo
  o|llllLLo
  occcccCCo
  oCCCCCCCo
`;

export const BODY_NW: BodyView = {
  parts: {
    legR: { sprite: LEG_L_S, x: 12, y: 21, z: 10 }, // far leg (character's right)
    legL: { sprite: LEG_R_S, x: 8, y: 22, z: 12 }, // near leg (character's left)
    torso: { sprite: TORSO_NW, x: 7, y: 15, z: 20 },
    armR: { sprite: ARM_L_S, x: 15, y: 16, z: 15 }, // far arm
    armL: { sprite: ARM_R_S, x: 4, y: 16, z: 30 }, // near arm
    head: { sprite: HEAD_NW, x: 5, y: 1, z: 40 },
  },
  anchors: {
    head: { x: 5, y: 1 },
    hand_right: { x: 16, y: 20 },
    hand_left: { x: 5, y: 20 },
    back: { x: 12, y: 16 },
  },
};

// ---------------------------------------------------------------------------
// Back view (N). Screen-left limbs are the character's left ones; the light
// still comes from the top-left of the screen.
// ---------------------------------------------------------------------------

const HEAD_N = sprite`
  ....oooooo....
  ..o######hho..
  .o#######hhHo.
  o###hhhhhhhHHo
  o##hhhhhhhhHHo
  o#hhhhhhhhHHHo
  ohhhhhhhhhHHHo
  ohhhhhhhhhHHHo
  ohhhhhhhhhHHHo
  oHhhhhhhhhHHHo
  oHhhhhhhhHHHHo
  oHHhhhhhhHHHHo
  oHHHHHHHHHHHHo
  ..ooooSSoooo..
`;

const TORSO_N = sprite`
  .o^cSScCo.
  o^cccccCCo
  o^cccccCCo
  occccccCCo
  occccccCCo
  o|llllLLLo
  occccccCCo
  oCCCCCCCCo
`;

export const BODY_N: BodyView = {
  parts: {
    legL: { sprite: LEG_R_S, x: 8, y: 22, z: 10 },
    legR: { sprite: LEG_L_S, x: 12, y: 22, z: 11 },
    torso: { sprite: TORSO_N, x: 7, y: 15, z: 20 },
    armL: { sprite: ARM_R_S, x: 4, y: 16, z: 30 },
    armR: { sprite: ARM_L_S, x: 17, y: 16, z: 30 },
    head: { sprite: HEAD_N, x: 5, y: 1, z: 40 },
  },
  anchors: {
    head: { x: 5, y: 1 },
    hand_right: { x: 18, y: 20 },
    hand_left: { x: 5, y: 20 },
    back: { x: 12, y: 16 },
  },
};
