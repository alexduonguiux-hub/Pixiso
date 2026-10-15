/**
 * Animation as offset tables: every frame moves whole limb layers by a pixel or
 * two, the way pixel artists animate small sprites (bob, swing, step), so a clip
 * needs no extra drawings.
 */
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
  frames: { S: FrameOffsets[]; W: FrameOffsets[] };
}

const bob = (dy: number): Partial<Record<LimbId, [number, number]>> => ({
  head: [0, dy],
  torso: [0, dy],
  armR: [0, dy],
  armL: [0, dy],
});

export const CLIPS: Clip[] = [
  {
    id: 'idle',
    loop: true,
    frameMs: 500,
    frames: {
      S: [{ limbs: {} }, { limbs: { head: [0, 1], armR: [0, 1], armL: [0, 1] } }],
      W: [{ limbs: {} }, { limbs: { head: [0, 1], armR: [0, 1], armL: [0, 1] } }],
    },
  },
  {
    id: 'walk',
    loop: true,
    frameMs: 140,
    frames: {
      // Front view: contact, pass (right leg lifted, body up), contact, pass (left leg lifted).
      S: [
        { limbs: { armR: [0, 1], armL: [0, -1] } },
        { limbs: { ...bob(-1), legR: [0, -1] } },
        { limbs: { armR: [0, -1], armL: [0, 1] } },
        { limbs: { ...bob(-1), legL: [0, -1] } },
      ],
      // Side view: stride (near leg forward), pass, stride (near leg back), pass.
      W: [
        { limbs: { legR: [-2, 0], legL: [2, 0], armR: [2, 0], armL: [-2, 0] } },
        { limbs: { ...bob(-1), legR: [0, -1] } },
        { limbs: { legR: [2, 0], legL: [-2, 0], armR: [-2, 0], armL: [2, 0] } },
        { limbs: { ...bob(-1), legL: [0, -1] } },
      ],
    },
  },
];
