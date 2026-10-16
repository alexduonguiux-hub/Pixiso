/**
 * The registry is what the catalog is generated from (scripts/build-catalog.ts)
 * and what the renderer looks things up in: bodies, slots, colour targets and
 * the directions that can be drawn today. Labels live in
 * scripts/catalog-labels.yaml, never here.
 */
import { DIRECTIONS_8, type Direction } from '@pixiso/shared';
import { BODY_S, BODY_W, CANVAS_H, CANVAS_W, PIVOT, type BodyView } from './body32.js';
import type { Material } from './format.js';

export const SLOT_IDS = ['head', 'hand_right', 'hand_left', 'back'] as const;
export type SlotId = (typeof SLOT_IDS)[number];

/** Authored views. Every other direction is a mirror of one of these. */
export type View = 'S' | 'W';
export const VIEWS: readonly View[] = ['S', 'W'];

/** How each renderable direction is produced from an authored view. */
export const FACING_SOURCE: Partial<Record<Direction, { view: View; flip: boolean }>> = {
  S: { view: 'S', flip: false },
  W: { view: 'W', flip: false },
  E: { view: 'W', flip: true },
};

/** Directions that render today, in sprite-sheet row order. */
export const AVAILABLE_DIRECTIONS: readonly Direction[] = DIRECTIONS_8.filter(
  (d) => FACING_SOURCE[d] !== undefined,
);

export interface BodyDef {
  id: string;
  canvas: { w: number; h: number };
  /** Foot anchor, pixel coordinates from the top-left of the canvas. */
  pivot: { x: number; y: number };
  views: Record<View, BodyView>;
}

export const REFERENCE_BODY = 'human';

export const BODIES: readonly BodyDef[] = [
  {
    id: REFERENCE_BODY,
    canvas: { w: CANVAS_W, h: CANVAS_H },
    pivot: { x: PIVOT.x, y: PIVOT.y },
    views: { S: BODY_S, W: BODY_W },
  },
];

export function bodyById(id: string): BodyDef | undefined {
  return BODIES.find((b) => b.id === id);
}

/** A recolourable region as the user sees it, bound to one material. */
export interface ColorTargetDef {
  id: string;
  material: Material;
}

export const COLOR_TARGETS: readonly ColorTargetDef[] = [
  { id: 'skin', material: 'skin' },
  { id: 'hair', material: 'hair' },
  { id: 'body', material: 'cloth' },
  { id: 'legs', material: 'pants' },
  { id: 'boots', material: 'boots' },
  { id: 'cape', material: 'cloth2' },
  { id: 'metal', material: 'metal' },
  { id: 'leather', material: 'leather' },
  { id: 'wood', material: 'wood' },
  { id: 'accent', material: 'accent' },
];
