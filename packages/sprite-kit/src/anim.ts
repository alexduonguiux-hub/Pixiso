/**
 * Animation as offset tables: every frame moves whole limb layers by a pixel or
 * two, the way pixel artists animate small sprites (bob, swing, step). A frame
 * may also swap a limb drawing (raised arm), ask attached parts for a pose
 * (swung sword), hide limbs or add a bespoke drawing (lying body). One table
 * per authored view (registry.ts VIEWS).
 */
import { ARM_FWD_W, ARM_UP_R, ARM_UP_S, ARM_UP_W, LYING } from './body32.js';
import type { Sprite } from './format.js';
import type { SlotId, View } from './registry.js';

export type LimbId = 'head' | 'torso' | 'armR' | 'armL' | 'legR' | 'legL';

export interface FrameOffsets {
  /** dx/dy per limb; missing limbs do not move. */
  limbs: Partial<Record<LimbId, [number, number]>>;
  /** Replace a limb's drawing for this frame (same layer position and z). */
  limbSprites?: Partial<Record<LimbId, Sprite>>;
  /** Limbs not drawn in this frame. */
  hideLimbs?: readonly LimbId[];
  /** Extra displacement of a slot anchor on top of its limb's offset (e.g. the hand of a raised arm). */
  anchors?: Partial<Record<SlotId, [number, number]>>;
  /** Pose id attached parts may answer with a variant (parts32 PartView.poses). */
  pose?: string;
  /** Draw no attached parts (dropped gear). */
  hideParts?: boolean;
  /** Parts in these slots are not drawn (weapon let go before the body falls). */
  hideSlots?: readonly SlotId[];
  /** Extra layer in canvas coordinates (bespoke frames such as the lying body). */
  extra?: { sprite: Sprite; x: number; y: number; z: number };
}

export interface Clip {
  id: string;
  loop: boolean;
  /** Milliseconds per frame. */
  frameMs: number;
  frames: Record<View, FrameOffsets[]>;
}

type Limbs = Partial<Record<LimbId, [number, number]>>;
type Vec = [number, number];

const UPPER: readonly LimbId[] = ['head', 'torso', 'armR', 'armL'];
const ALL: readonly LimbId[] = ['head', 'torso', 'armR', 'armL', 'legR', 'legL'];

const move = (ids: readonly LimbId[], [dx, dy]: Vec): Limbs =>
  Object.fromEntries(ids.map((id) => [id, [dx, dy]])) as Limbs;
const bob = (dy: number): Limbs => move(UPPER, [0, dy]);
const add = (a: Limbs, b: Limbs): Limbs => {
  const out: Limbs = { ...a };
  for (const [id, [dx, dy]] of Object.entries(b) as [LimbId, Vec][]) {
    const [ax, ay] = out[id] ?? [0, 0];
    out[id] = [ax + dx, ay + dy];
  }
  return out;
};

const same = (frames: FrameOffsets[]): Record<View, FrameOffsets[]> => ({
  S: frames,
  SW: frames,
  W: frames,
  NW: frames,
  N: frames,
});

/** Screen-space "forward" of each view; knock-backs use its opposite. */
const FORWARD: Record<View, Vec> = {
  S: [0, 1],
  SW: [-1, 1],
  W: [-1, 0],
  NW: [-1, -1],
  N: [0, -1],
};
const back = (v: View, k = 1): Vec => [-FORWARD[v][0] * k, -FORWARD[v][1] * k];

// ---------------------------------------------------------------------------

const IDLE: FrameOffsets[] = [
  { limbs: {} },
  { limbs: { head: [0, 1], armR: [0, 1], armL: [0, 1] } },
];

/** Front/back walk: contact, pass (one leg lifted, body up), contact, pass. */
const WALK_FRONT: FrameOffsets[] = [
  { limbs: { armR: [0, 1], armL: [0, -1] } },
  { limbs: { ...bob(-1), legR: [0, -1] } },
  { limbs: { armR: [0, -1], armL: [0, 1] } },
  { limbs: { ...bob(-1), legL: [0, -1] } },
];

/** Side walk with a horizontal stride of `step` px: near leg forward, pass, near leg back, pass. */
const walkSide = (step: number): FrameOffsets[] => [
  { limbs: { legR: [-step, 0], legL: [step, 0], armR: [step, 0], armL: [-step, 0] } },
  { limbs: { ...bob(-1), legR: [0, -1] } },
  { limbs: { legR: [step, 0], legL: [-step, 0], armR: [-step, 0], armL: [step, 0] } },
  { limbs: { ...bob(-1), legL: [0, -1] } },
];

/** Flight pose: torso and arms up 2 px, head up 1 (it starts on row 1 and may not leave the canvas). */
const FLIGHT: Limbs = { ...bob(-2), head: [0, -1] };

/** Front/back run: longer arm swing, a leg lifted on each contact, a flight frame between. */
const RUN_FRONT: FrameOffsets[] = [
  { limbs: { armR: [0, 2], armL: [0, -2], legL: [0, -2] } },
  { limbs: FLIGHT },
  { limbs: { armR: [0, -2], armL: [0, 2], legR: [0, -2] } },
  { limbs: FLIGHT },
];

/** Side run: lean forward 1 px, stride `step`, flight frames with the legs tucked. */
const runSide = (step: number): FrameOffsets[] => {
  const lean = move(UPPER, [-1, 0]);
  return [
    { limbs: add(lean, { legR: [-step, 0], legL: [step, 0], armR: [step, 0], armL: [-step, 0] }) },
    { limbs: add(add(lean, FLIGHT), { legR: [-1, -2], legL: [1, -1] }) },
    { limbs: add(lean, { legR: [step, 0], legL: [-step, 0], armR: [-step, 0], armL: [step, 0] }) },
    { limbs: add(add(lean, FLIGHT), { legR: [1, -1], legL: [-1, -2] }) },
  ];
};

/** Wind-up (arm raised, sword up), swing (pose "swing"), recover. */
const ATTACK: Record<View, FrameOffsets[]> = {
  S: [
    { limbs: { armR: [0, -4] }, limbSprites: { armR: ARM_UP_S }, anchors: { hand_right: [0, -4] } },
    { limbs: { armR: [1, 1], head: [1, 1], torso: [0, 1] }, pose: 'swing' },
    { limbs: { armR: [0, 1] } },
  ],
  SW: [
    { limbs: { armR: [0, -4] }, limbSprites: { armR: ARM_UP_S }, anchors: { hand_right: [0, -4] } },
    { limbs: { armR: [1, 1], head: [0, 1], torso: [0, 1] }, pose: 'swing' },
    { limbs: { armR: [0, 1] } },
  ],
  W: [
    {
      limbs: { armR: [0, -4] },
      limbSprites: { armR: ARM_UP_W },
      anchors: { hand_right: [0, -4] },
      pose: 'up',
    },
    {
      limbs: { armR: [-4, 2], head: [-1, 0], torso: [-1, 0] },
      limbSprites: { armR: ARM_FWD_W },
      anchors: { hand_right: [0, -3] },
      pose: 'swing',
    },
    { limbs: { armR: [-1, 0] } },
  ],
  NW: [
    { limbs: { armR: [0, -4] }, limbSprites: { armR: ARM_UP_R }, anchors: { hand_right: [0, -4] } },
    { limbs: { armR: [0, 1], head: [-1, 0], torso: [-1, 0] }, pose: 'swing' },
    { limbs: { armR: [0, 1] } },
  ],
  N: [
    { limbs: { armR: [0, -4] }, limbSprites: { armR: ARM_UP_R }, anchors: { hand_right: [0, -4] } },
    { limbs: { armR: [-1, 1], head: [-1, 1], torso: [0, 1] }, pose: 'swing' },
    { limbs: { armR: [0, 1] } },
  ],
};

/** Knock-back: upper body jolts away from the facing, head twice as far, then half way back. */
const hit = (v: View): FrameOffsets[] => [
  { limbs: add(move(UPPER, back(v)), { head: back(v) }) },
  { limbs: { head: back(v) } },
];

/** Jolt, collapse (weapon and shield dropped, legs hidden, body down), lie down, hold. */
const death = (v: View): FrameOffsets[] => {
  const lie: FrameOffsets = {
    limbs: {},
    hideLimbs: ALL,
    hideParts: true,
    extra: { sprite: LYING, x: 1, y: 19, z: 20 },
  };
  return [
    hit(v)[0]!,
    {
      limbs: add(move(UPPER, [0, 3]), { head: back(v) }),
      hideLimbs: ['legR', 'legL'],
      hideSlots: ['hand_right', 'hand_left'],
    },
    lie,
    lie,
  ];
};

const perView = (f: (v: View) => FrameOffsets[]): Record<View, FrameOffsets[]> => ({
  S: f('S'),
  SW: f('SW'),
  W: f('W'),
  NW: f('NW'),
  N: f('N'),
});

export const CLIPS: Clip[] = [
  { id: 'idle', loop: true, frameMs: 500, frames: same(IDLE) },
  {
    id: 'walk',
    loop: true,
    frameMs: 140,
    frames: { S: WALK_FRONT, SW: walkSide(1), W: walkSide(2), NW: walkSide(1), N: WALK_FRONT },
  },
  {
    id: 'run',
    loop: true,
    frameMs: 100,
    frames: { S: RUN_FRONT, SW: runSide(2), W: runSide(3), NW: runSide(2), N: RUN_FRONT },
  },
  { id: 'attack', loop: false, frameMs: 120, frames: ATTACK },
  { id: 'hit', loop: false, frameMs: 120, frames: perView(hit) },
  { id: 'death', loop: false, frameMs: 160, frames: perView(death) },
];
