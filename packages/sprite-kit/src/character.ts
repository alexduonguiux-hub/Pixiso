import type { Direction } from '@pixiso/shared';
import type { Clip, FrameOffsets, LimbId } from './anim.js';
import type { BodyView } from './body32.js';
import { compose, type Layer } from './compose.js';
import { flipX, type Sprite } from './format.js';
import { PARTS, type PartDef } from './parts32.js';
import { bodyById, FACING_SOURCE, REFERENCE_BODY, type SlotId, type View } from './registry.js';

export interface CharacterSpec {
  /** Body id from the registry; defaults to the reference body. */
  body?: string;
  parts: string[];
}

function viewFor(bodyId: string, view: View): { body: BodyView; w: number; h: number } {
  const def = bodyById(bodyId);
  if (!def) throw new Error(`unknown body "${bodyId}"`);
  if (!def.views) throw new Error(`body "${bodyId}" is drawn whole, not by limbs`);
  return { body: def.views[view], w: def.canvas.w, h: def.canvas.h };
}

/** Which limb an anchor follows, so attached parts move with the animation. */
const ANCHOR_LIMB: Record<SlotId, LimbId> = {
  head: 'head',
  hand_right: 'armR',
  hand_left: 'armL',
  back: 'torso',
};

export function partById(id: string): PartDef | undefined {
  return PARTS.find((p) => p.id === id);
}

/**
 * Builds one frame: body limbs plus attached parts, all offset by the clip
 * frame, which may also swap limb drawings, hide limbs or parts, nudge anchors,
 * request a part pose and add a bespoke layer (anim.ts FrameOffsets).
 */
export function buildFrame(spec: CharacterSpec, view: View, frame: FrameOffsets): Sprite {
  const { body, w, h } = viewFor(spec.body ?? REFERENCE_BODY, view);
  const layers: Layer[] = [];
  for (const [id, part] of Object.entries(body.parts) as [LimbId, BodyView['parts'][LimbId]][]) {
    if (frame.hideLimbs?.includes(id)) continue;
    const [dx, dy] = frame.limbs[id] ?? [0, 0];
    const sprite = frame.limbSprites?.[id] ?? part.sprite;
    layers.push({ id, sprite, x: part.x + dx, y: part.y + dy, z: part.z, edge: true });
  }
  for (const partId of spec.parts) {
    const def = partById(partId);
    if (!def) throw new Error(`unknown part "${partId}"`);
    if (frame.hideParts || frame.hideSlots?.includes(def.slot)) continue;
    const base = def.views[view];
    const pv = (frame.pose && base.poses?.[frame.pose]) || base;
    const anchor = body.anchors[def.slot];
    const [dx, dy] = frame.limbs[ANCHOR_LIMB[def.slot]] ?? [0, 0];
    const [ax, ay] = frame.anchors?.[def.slot] ?? [0, 0];
    layers.push({
      id: `part:${partId}`,
      sprite: pv.sprite,
      x: anchor.x + pv.dx + dx + ax,
      y: anchor.y + pv.dy + dy + ay,
      z: pv.z,
      edge: true,
    });
  }
  if (frame.extra) layers.push({ id: 'extra', ...frame.extra, edge: true });
  return compose(layers, w, h, { outline: true });
}

/** All frames of a clip for a direction; mirrored directions flip the authored view. */
export function buildClip(spec: CharacterSpec, direction: Direction, clip: Clip): Sprite[] {
  const src = FACING_SOURCE[direction];
  if (!src) throw new Error(`direction "${direction}" has no drawn view yet`);
  const frames = clip.frames[src.view].map((f) => buildFrame(spec, src.view, f));
  return src.flip ? frames.map(flipX) : frames;
}
