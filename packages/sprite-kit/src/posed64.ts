/**
 * The posed bodies of the catalog (D-100): every zombie stance and large
 * build the cast is drawn on is a character of its own, drawn in five views by
 * poseInView and dressed by the same Look rules as the standing hero. They
 * have the standing frame only (idle) until their steps are drawn (D-101).
 */
import {
  POSE_CRAWL,
  POSE_DRAG,
  POSE_DRAG_M,
  POSE_DROOP,
  POSE_DROOP_M,
  POSE_HUNCH,
  POSE_REACH,
  POSE_TWIST,
  POSE_TWIST_M,
  type ZombiePose,
} from './hero64.poses.js';
import { STAND_BRUTE, STAND_FAT, STAND_HEAVY } from './views64.js';

export interface PosedBodyDef {
  /** Catalog character id; the pose's own id. */
  id: string;
  pose: ZombiePose;
  /** Look fields the body forces: a bloated head has no room for the two-cell mouth. */
  look?: { mouth: false };
  /** Whether head-space parts (hair, hats, faces) fit: the giant's head is its own drawing, not the base grid. */
  head: boolean;
}

export const POSED_BODIES: readonly PosedBodyDef[] = [
  { id: 'droop', pose: POSE_DROOP, head: true },
  { id: 'droop_m', pose: POSE_DROOP_M, head: true },
  { id: 'twist', pose: POSE_TWIST, head: true },
  { id: 'twist_m', pose: POSE_TWIST_M, head: true },
  { id: 'reach', pose: POSE_REACH, head: true },
  { id: 'drag', pose: POSE_DRAG, head: true },
  { id: 'drag_m', pose: POSE_DRAG_M, head: true },
  { id: 'hunch', pose: POSE_HUNCH, head: true },
  { id: 'crawl', pose: POSE_CRAWL, head: true },
  { id: 'heavy', pose: STAND_HEAVY, head: true },
  { id: 'fat', pose: STAND_FAT, look: { mouth: false }, head: true },
  { id: 'brute', pose: STAND_BRUTE, head: false },
];

export function posedBodyById(id: string): PosedBodyDef | undefined {
  return POSED_BODIES.find((b) => b.id === id);
}
