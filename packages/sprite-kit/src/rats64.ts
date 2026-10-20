/**
 * Bầy Chuột Đỏ (D-099): the game's rat pack, the one actor that is not a
 * person. A pack is three rats on the hero's 64×64 canvas and ground line, so
 * it stands on the same grid as everyone else. Each rat is a hand-drawn unit
 * per drawn view (S, SW, W, NW, N; the mirrored directions flip the canvas):
 * a 1-px outlined body in the cloth material (fur: light `^`, base `c`,
 * shadow `C`, deep `v`), skin for the ears and nose (two cells each, the
 * smallest detail D-073 allows), one eye cell where the face shows, and a
 * tail drawn as a 1-px line of outline cells. Legs are not drawn at this size
 * (the game's rats have none either): the scurry is a one-pixel bob of
 * alternate rats and a tail swing, which is how small pixel animals are
 * animated.
 */
import type { CharacterConfig } from '@pixiso/shared';
import { compose, type Layer } from './compose.js';
import { parseSprite, type Sprite } from './format.js';
import { HERO_CANVAS, HERO_GROUND, HERO_PIVOT, type HeroView } from './hero64.js';
import type { MaterialColors } from './paint.js';

export const RATS_BODY_ID = 'rats';
/** The game's rats: dark red-brown fur, pink ears and noses, near-black eyes. */
export const RATS_DEFAULT_COLORS: MaterialColors = {
  cloth: [122, 52, 40],
  skin: [194, 114, 88],
  eye: [40, 14, 14],
};
export const RATS_CANVAS = HERO_CANVAS;
export const RATS_PIVOT = HERO_PIVOT;
/** Clips the pack has frames for. */
export const RATS_CLIP_IDS = ['idle', 'walk'] as const;

export type RatPose = 'idle' | 'a' | 'b';
export interface RatUnit {
  idle: Sprite;
  /** Tail swung one way (and the frame the rat bobs up on in the scurry). */
  a: Sprite;
  /** Tail swung the other way. */
  b: Sprite;
}

const unit = (name: string, idle: string[], a: string[], b: string[]): RatUnit => ({
  idle: parseSprite(idle, `${name}.idle`),
  a: parseSprite(a, `${name}.a`),
  b: parseSprite(b, `${name}.b`),
});

/* Profile, heading left (W): snout and eye at the left, ear on the head, rump and tail at the right. */
const RAT_W = unit(
  'rat_W',
  [
    '...oo...........',
    '..ossooooo......',
    '.o^^^ccccco.....',
    'oEcccccccCCo....',
    'oSsccccCCCCvoo..',
    '.ooooooooooo..oo',
  ],
  [
    '...oo...........',
    '..ossooooo......',
    '.o^^^ccccco....o',
    'oEcccccccCCo.oo.',
    'oSsccccCCCCvo...',
    '.ooooooooooo....',
  ],
  [
    '...oo...........',
    '..ossooooo......',
    '.o^^^ccccco.....',
    'oEcccccccCCo....',
    'oSsccccCCCCvo...',
    '.ooooooooooo.ooo',
  ],
);

/* Front, heading down the screen (S): the rump behind and above, the head in front with both ears, eyes and nose, the tail up behind. */
const RAT_S = unit(
  'rat_S',
  [
    '.....oo....',
    '......o....',
    '...ooooo...',
    '..o^cccCo..',
    '.o^ccccCCo.',
    'oso^cccCoso',
    'osocEcECoso',
    '.ooccccCoo.',
    '..ocsscCo..',
    '...ooooo...',
  ],
  [
    '......oo...',
    '......o....',
    '...ooooo...',
    '..o^cccCo..',
    '.o^ccccCCo.',
    'oso^cccCoso',
    'osocEcECoso',
    '.ooccccCoo.',
    '..ocsscCo..',
    '...ooooo...',
  ],
  [
    '...oo......',
    '....o......',
    '...ooooo...',
    '..o^cccCo..',
    '.o^ccccCCo.',
    'oso^cccCoso',
    'osocEcECoso',
    '.ooccccCoo.',
    '..ocsscCo..',
    '...ooooo...',
  ],
);

/* Back, heading up the screen (N): the head far at the top with both ears, the rump near at the bottom, the tail hanging toward the viewer. */
const RAT_N = unit(
  'rat_N',
  [
    '..o.....o..',
    '.osoooooso.',
    '.os^cccCso.',
    '.o^ccccCCo.',
    'o^ccccccCCo',
    'occccccCCvo',
    'occcccCCCvo',
    '.oCccCCCvo.',
    '..ooooooo..',
    '.....o.....',
    '......oo...',
  ],
  [
    '..o.....o..',
    '.osoooooso.',
    '.os^cccCso.',
    '.o^ccccCCo.',
    'o^ccccccCCo',
    'occccccCCvo',
    'occcccCCCvo',
    '.oCccCCCvo.',
    '..ooooooo..',
    '.....o.....',
    '...oo......',
  ],
  [
    '..o.....o..',
    '.osoooooso.',
    '.os^cccCso.',
    '.o^ccccCCo.',
    'o^ccccccCCo',
    'occccccCCvo',
    'occcccCCCvo',
    '.oCccCCCvo.',
    '..ooooooo..',
    '.....o.....',
    '.....o.....',
  ],
);

/* Three-quarter front, heading down-left (SW): head low at the left, body rising to the right, tail off the rump at the top right. */
const RAT_SW = unit(
  'rat_SW',
  [
    '........oooo...o',
    '......oo^ccCooo.',
    '....oo^ccccCCo..',
    '..oo^cccccCCo...',
    '.os^ccccccCo....',
    '.oscccccCCo.....',
    'oEcccccCCo......',
    'oSscccCCo.......',
    '.oooooooo.......',
  ],
  [
    '........oooo....',
    '......oo^ccCoooo',
    '....oo^ccccCCo..',
    '..oo^cccccCCo...',
    '.os^ccccccCo....',
    '.oscccccCCo.....',
    'oEcccccCCo......',
    'oSscccCCo.......',
    '.oooooooo.......',
  ],
  [
    '........oooo....',
    '......oo^ccCoo..',
    '....oo^ccccCCoo.',
    '..oo^cccccCCo..o',
    '.os^ccccccCo....',
    '.oscccccCCo.....',
    'oEcccccCCo......',
    'oSscccCCo.......',
    '.oooooooo.......',
  ],
);

/* Three-quarter back, heading up-left (NW): head far at the top left with its ears, rump near at the bottom right, tail trailing right. */
const RAT_NW = unit(
  'rat_NW',
  [
    '..oooo..........',
    '.os^ccoo........',
    '.oscccccoo......',
    '..o^cccccCoo....',
    '...o^ccccCCCoo..',
    '....occcccCCvo..',
    '.....occccCCvoo.',
    '......oCcCCvo..o',
    '.......oooooo...',
    '................',
  ],
  [
    '..oooo..........',
    '.os^ccoo........',
    '.oscccccoo......',
    '..o^cccccCoo....',
    '...o^ccccCCCoo.o',
    '....occcccCCvoo.',
    '.....occccCCvo..',
    '......oCcCCvo...',
    '.......oooooo...',
    '................',
  ],
  [
    '..oooo..........',
    '.os^ccoo........',
    '.oscccccoo......',
    '..o^cccccCoo....',
    '...o^ccccCCCoo..',
    '....occcccCCvo..',
    '.....occccCCvo..',
    '......oCcCCvoo..',
    '.......oooooo.o.',
    '...............o',
  ],
);

export const RAT_UNITS: Record<HeroView, RatUnit> = {
  S: RAT_S,
  SW: RAT_SW,
  W: RAT_W,
  NW: RAT_NW,
  N: RAT_N,
};

/**
 * Where the three rats sit on the canvas per view: top-left of each unit,
 * back to front (the nearest rat, lowest on the screen, is drawn last). The
 * front rat's bottom outline sits on the hero's ground row; the others stand a
 * few rows higher and to the sides, so the pack reads as a loose cluster and
 * no outline touches another's.
 */
export const RAT_PACK: Record<HeroView, readonly { x: number; y: number }[]> = {
  S: [
    { x: 10, y: 43 },
    { x: 38, y: 45 },
    { x: 24, y: 51 },
  ],
  SW: [
    { x: 30, y: 42 },
    { x: 4, y: 46 },
    { x: 20, y: 52 },
  ],
  W: [
    { x: 30, y: 46 },
    { x: 6, y: 47 },
    { x: 18, y: 55 },
  ],
  NW: [
    { x: 24, y: 40 },
    { x: 40, y: 45 },
    { x: 8, y: 52 },
  ],
  N: [
    { x: 24, y: 40 },
    { x: 40, y: 45 },
    { x: 10, y: 50 },
  ],
};

/** One pack frame: a pose and a vertical bob per rat (back to front), composed on the canvas. */
export function ratPack(
  view: HeroView,
  poses: readonly [RatPose, RatPose, RatPose],
  bob: readonly [number, number, number] = [0, 0, 0],
): Sprite {
  const layers: Layer[] = RAT_PACK[view].map((at, i) => ({
    id: `rat${i}`,
    sprite: RAT_UNITS[view][poses[i]!],
    x: at.x,
    y: at.y - bob[i]!,
    z: i,
  }));
  return compose(layers, RATS_CANVAS, RATS_CANVAS);
}

/**
 * Frames of a clip in a drawn view. Idle: the pack at rest, then the front
 * rat flicks its tail. Walk: contact, rest, contact, rest like the hero's
 * cycle, the rats bobbing up on alternate frames with their tails swung.
 */
export function ratClip(view: HeroView, clipId: string): Sprite[] {
  switch (clipId) {
    case 'idle':
      return [ratPack(view, ['idle', 'idle', 'idle']), ratPack(view, ['idle', 'b', 'a'])];
    case 'walk':
      return [
        ratPack(view, ['a', 'b', 'a'], [1, 0, 1]),
        ratPack(view, ['idle', 'idle', 'idle']),
        ratPack(view, ['b', 'a', 'b'], [0, 1, 0]),
        ratPack(view, ['idle', 'idle', 'idle']),
      ];
    default:
      throw new Error(`animation "${clipId}" has no rat frames`);
  }
}

/** Ground row of the pack: the front rat's bottom outline, the hero's sole row. */
export const RATS_GROUND = HERO_GROUND;

/** The pack as a catalog preset: no parts, its own colours on the shared targets. */
export const RATS_PRESETS: readonly { id: string; config: CharacterConfig }[] = [
  {
    id: 'bay_chuot_do',
    config: {
      version: 1,
      baseCharacter: RATS_BODY_ID,
      parts: {},
      colors: [
        { target: 'body', color: '#7a3428' },
        { target: 'skin', color: '#c27258' },
        { target: 'eyes', color: '#280e0e' },
      ],
      animations: [...RATS_CLIP_IDS],
    },
  },
];
