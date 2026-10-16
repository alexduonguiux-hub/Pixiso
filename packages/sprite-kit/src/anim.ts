/**
 * Animation as offset tables: every frame moves whole limb layers by a pixel or
 * two, the way pixel artists animate small sprites (bob, swing, step), so a clip
 * needs no extra drawings. One table per authored view (registry.ts VIEWS).
 */
import type { View } from './registry.js';

export type LimbId = 'head' | 'torso' | 'armR' | 'armL' | 'legR' | 'legL';

export interface FrameOffsets {
  /** dx/dy per limb; missing limbs do not move. */
  limbs: Partial<Record<LimbId, [number, number]>>;
}

export interface Clip {
  id: string;
  loop: boolean;
  /** Milliseconds per frame. */
  frameMs: number;
  frames: Record<View, FrameOffsets[]>;
}

type Limbs = Partial<Record<LimbId, [number, number]>>;

const bob = (dy: number): Limbs => ({
  head: [0, dy],
  torso: [0, dy],
  armR: [0, dy],
  armL: [0, dy],
});

const same = (frames: FrameOffsets[]): Record<View, FrameOffsets[]> => ({
  S: frames,
  SW: frames,
  W: frames,
  NW: frames,
  N: frames,
});

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

export const CLIPS: Clip[] = [
  { id: 'idle', loop: true, frameMs: 500, frames: same(IDLE) },
  {
    id: 'walk',
    loop: true,
    frameMs: 140,
    frames: { S: WALK_FRONT, SW: walkSide(1), W: walkSide(2), NW: walkSide(1), N: WALK_FRONT },
  },
];
