import type { Clip, FrameOffsets, LimbId } from './anim.js';
import { BODY_S, BODY_W, CANVAS_H, CANVAS_W, type BodyView } from './body32.js';
import { compose, type Layer } from './compose.js';
import { flipX, type Sprite } from './format.js';
import { PARTS, type PartDef } from './parts32.js';

export type View = 'S' | 'W';
export type Facing = 'S' | 'W' | 'E';

export interface CharacterSpec {
  parts: string[];
}

function bodyFor(view: View): BodyView {
  return view === 'S' ? BODY_S : BODY_W;
}

/** Which limb an anchor follows, so attached parts move with the animation. */
const ANCHOR_LIMB: Record<PartDef['slot'], LimbId> = {
  head: 'head',
  handR: 'armR',
  handL: 'armL',
  back: 'torso',
};

/** Builds one frame: body limbs plus attached parts, all offset by the clip frame. */
export function buildFrame(spec: CharacterSpec, view: View, offsets: FrameOffsets): Sprite {
  const body = bodyFor(view);
  const layers: Layer[] = [];
  for (const [id, part] of Object.entries(body.parts) as [LimbId, BodyView['parts'][LimbId]][]) {
    const [dx, dy] = offsets.limbs[id] ?? [0, 0];
    layers.push({ id, sprite: part.sprite, x: part.x + dx, y: part.y + dy, z: part.z });
  }
  for (const partId of spec.parts) {
    const def = PARTS.find((p) => p.id === partId);
    if (!def) throw new Error(`unknown part "${partId}"`);
    const pv = def.views[view];
    const anchor = body.anchors[def.slot];
    const [dx, dy] = offsets.limbs[ANCHOR_LIMB[def.slot]] ?? [0, 0];
    layers.push({
      id: `part:${partId}`,
      sprite: pv.sprite,
      x: anchor.x + pv.dx + dx,
      y: anchor.y + pv.dy + dy,
      z: pv.z,
    });
  }
  return compose(layers, CANVAS_W, CANVAS_H);
}

/** All frames of a clip for a facing; E is the mirror of W. */
export function buildClip(spec: CharacterSpec, facing: Facing, clip: Clip): Sprite[] {
  const view: View = facing === 'S' ? 'S' : 'W';
  const frames = clip.frames[view].map((f) => buildFrame(spec, view, f));
  return facing === 'E' ? frames.map(flipX) : frames;
}
