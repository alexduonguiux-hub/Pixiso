/**
 * The registry is what the catalog is generated from (scripts/build-catalog.ts)
 * and what the renderer looks things up in: bodies, slots, colour targets and
 * the directions that can be drawn today. Labels live in
 * scripts/catalog-labels.yaml, never here.
 */
import { DIRECTIONS_8, type Direction } from '@pixiso/shared';
import { CANVAS_H, CANVAS_W, PIVOT, type BodyView } from './body32.js';
import { buildBody, CHIBI_CLASSIC } from './bodygen.js';
import type { Material } from './format.js';
import { HERO_CANVAS, HERO_PIVOT } from './hero64.js';

export const SLOT_IDS = ['head', 'hand_right', 'hand_left', 'back'] as const;
export type SlotId = (typeof SLOT_IDS)[number];

/** Authored views (PIVOT.md decision 2). SE, E and NE are horizontal mirrors of SW, W and NW. */
export type View = 'S' | 'SW' | 'W' | 'NW' | 'N';
export const VIEWS: readonly View[] = ['S', 'SW', 'W', 'NW', 'N'];

/** How each renderable direction is produced from an authored view. */
export const FACING_SOURCE: Partial<Record<Direction, { view: View; flip: boolean }>> = {
  S: { view: 'S', flip: false },
  SW: { view: 'SW', flip: false },
  W: { view: 'W', flip: false },
  NW: { view: 'NW', flip: false },
  N: { view: 'N', flip: false },
  NE: { view: 'NW', flip: true },
  E: { view: 'W', flip: true },
  SE: { view: 'SW', flip: true },
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
  /** Limb drawings of a 32 px body; the 64 px hero is drawn whole (hero64.registry.ts) and has none. */
  views?: Record<View, BodyView>;
}

export const REFERENCE_BODY = 'human';
/** The 64 px hero mannequin (hero64.ts): the Vùng Xanh cast's body, dressed from Look patches (D-096). */
export const HERO_BODY_ID = 'hero';

export const BODIES: readonly BodyDef[] = [
  {
    id: REFERENCE_BODY,
    canvas: { w: CANVAS_W, h: CANVAS_H },
    pivot: { x: PIVOT.x, y: PIVOT.y },
    views: buildBody(CHIBI_CLASSIC),
  },
  {
    id: HERO_BODY_ID,
    canvas: { w: HERO_CANVAS, h: HERO_CANVAS },
    pivot: { x: HERO_PIVOT.x, y: HERO_PIVOT.y },
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
  // the hero's eyes and whites (D-096): every colour of the cast is a target, so a preset is a plain config
  { id: 'eyes', material: 'eye' },
  { id: 'white', material: 'white' },
];
