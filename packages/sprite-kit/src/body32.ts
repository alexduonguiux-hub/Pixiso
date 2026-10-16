/**
 * Frame geometry shared by every body: a 32×32 canvas with the pivot (foot
 * anchor) at (16, 30). Bodies are generated from shapes in bodygen.ts.
 */
import type { Sprite } from './format.js';

export const CANVAS_W = 32;
export const CANVAS_H = 32;
export const PIVOT = { x: 16, y: 30 } as const;

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
