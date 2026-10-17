/**
 * A zombie pose seen from a view other than S.
 *
 * - W is hand-drawn per pose (hero64.poses.views.ts, generated).
 * - N is derived from the pose's S body: flipped, the chest highlights
 *   flattened into a back, the N head stamped where the S head was (tilt
 *   mirrored); the collar becomes a straight line and front-only details
 *   (tie, badge, belt) drop out.
 * - SW and NW take the S or N body with that view's three-quarter head: the
 *   turn of the head carries the direction at this size; the bodies are not
 *   redrawn yet.
 *
 * Mirrored poses (`*_m`) share the base pose's W drawing.
 */
import { blank } from './draw.js';
import { flipX, MATERIALS, parseSprite, type Sprite } from './format.js';
import { cut, heroStand, type Box, type HeroView } from './hero64.js';
import { POSE_BODIES, type HeadShift, type ZombiePose } from './hero64.poses.js';
import { POSE_VIEW_DATA } from './hero64.poses.views.js';
import { HERO_NW_FIGURE, HERO_SW_FIGURE } from './hero64.views.js';
import { ZOMBIE_BODY, ZOMBIE_HEAD_TOP, zombieHeadShift } from './hero64.zombie.js';
import type { HeadMap } from './heroforms.js';
import { STAND_VIEWS } from './views64.js';

type PoseRegions = Omit<ZombiePose, 'id' | 'form' | 'w'>;
interface BodyData {
  body: Sprite;
  headX: number;
  headTop: number;
  shift: HeadShift;
}
const BODIES: Record<string, BodyData> = {
  droop: { body: ZOMBIE_BODY, headX: 1, headTop: ZOMBIE_HEAD_TOP, shift: zombieHeadShift },
  ...POSE_BODIES,
};

/** The view's base head on the 17-column head grid (rows 0–14; chin corners erased on SW). */
function viewHead(view: 'SW' | 'N' | 'NW'): Sprite {
  if (view === 'SW')
    return cut(
      HERO_SW_FIGURE,
      [0, 0, 16, 14],
      [
        [0, 14, 4, 14],
        [12, 14, 16, 14],
      ],
    );
  return cut(view === 'N' ? heroStand('N').sprite : HERO_NW_FIGURE, [0, 0, 16, 13]);
}

function stamp(body: Sprite, head: Sprite, hx: number, hy: number, shift: HeadShift): Sprite {
  const out = blank(body.w, body.h);
  out.cells.set(body.cells);
  for (let k = 0; k < head.h; k++)
    for (let j = 0; j < head.w; j++) {
      const v = head.cells[k * head.w + j]!;
      if (v < 0) continue;
      const x = hx + shift(k) + j;
      const y = hy + k;
      if (x >= 0 && x < out.w && y >= 0 && y < out.h) out.cells[y * out.w + x] = v;
    }
  return out;
}

/** Seen from behind: the chest highlights inside the torso box become plain skin. */
function backify(s: Sprite, [x0, y0, x1, y1]: Box): Sprite {
  const out = { ...s, cells: Int16Array.from(s.cells) };
  const skin = MATERIALS.indexOf('skin');
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * s.w + x;
      if (out.cells[i] === skin * 4 + 2) out.cells[i] = skin * 4 + 1;
    }
  return out;
}

function regionsOf(p: ZombiePose): PoseRegions {
  const { id: _id, form: _form, w: _w, ...rest } = p;
  void _id;
  void _form;
  void _w;
  return rest;
}

export function poseInView(pose: ZombiePose, view: HeroView): ZombiePose | undefined {
  if (view === 'S') return pose;
  if (pose.id === 'stand') return STAND_VIEWS[view];
  const mirrored = pose.id.endsWith('_m');
  const baseId = mirrored ? pose.id.slice(0, -2) : pose.id;
  const label = (suffix: string) => `${pose.form.label} (${suffix})`;
  const make = (figure: Sprite, headMap: HeadMap, regions: PoseRegions): ZombiePose => ({
    id: `${pose.id}_${view}`,
    form: { id: `${pose.id}_${view}`, label: label(view), figure, headMap },
    w: figure.w,
    ...regions,
  });

  if (view === 'W') {
    const d = POSE_VIEW_DATA[baseId]?.W;
    if (!d) return undefined;
    const figure = parseSprite(d.rows, `${baseId}_W`);
    return make(
      figure,
      (x, y) => [x + d.headX + (d.shift[y] ?? 0), y + d.headY],
      d.regions as unknown as PoseRegions,
    );
  }

  const base = BODIES[baseId];
  if (!base) return undefined;
  const W = base.body.w;
  // The pose's own body (S view, no head) and where its 17-column head grid sits.
  const own = mirrored
    ? { body: flipX(base.body), hx: W - 16 - base.headX, shift: (k: number) => -base.shift(k) }
    : { body: base.body, hx: base.headX - 1, shift: base.shift };
  const hy = base.headTop;
  const regions = regionsOf(pose);

  if (view === 'SW') {
    const figure = stamp(own.body, viewHead('SW'), own.hx, hy, own.shift);
    return make(figure, (x, y) => [x + own.hx + own.shift(y), y + hy], regions);
  }
  // N / NW: the body from behind.
  const back = mirrorRegions(regions, W);
  const hx = W - 17 - own.hx;
  const shift = (k: number) => -own.shift(k);
  const body = backify(flipX(own.body), back.torso);
  const figure = stamp(body, viewHead(view), hx, hy, shift);
  const xs = back.collar.flatMap((b) => [b[0], b[2]]);
  const collarRow = Math.min(...back.collar.map((b) => b[1]));
  const { tie: _tie, chest: _chest, belt: _belt, ...rest } = back;
  void _tie;
  void _chest;
  void _belt;
  return make(figure, (x, y) => [x + hx + shift(y), y + hy], {
    ...rest,
    collar: [[Math.min(...xs), collarRow, Math.max(...xs), collarRow]],
  });
}

function mirrorRegions(r: PoseRegions, W: number): PoseRegions {
  const mb = ([x0, y0, x1, y1]: Box): Box => [W - 1 - x1, y0, W - 1 - x0, y1];
  const mp = (p: [number, number], w: number): [number, number] => [W - w - p[0], p[1]];
  const rows = (d: { x: number; y: number; rows: string[] }) => ({
    x: W - d.rows[0]!.length - d.x,
    y: d.y,
    rows: d.rows.map((s) => [...s].reverse().join('')),
  });
  const sleeves = (s: ZombiePose['sleeveL']): ZombiePose['sleeveL'] => ({
    short: mb(s.short),
    long: mb(s.long),
    ...(s.torn ? { torn: mb(s.torn) } : {}),
  });
  return {
    torso: mb(r.torso),
    neck: r.neck.map(mb),
    shoulders: r.shoulders.map(mb),
    sleeveL: sleeves(r.sleeveR),
    sleeveR: sleeves(r.sleeveL),
    pants: r.pants.map(mb),
    shorts: r.shorts.map(mb),
    shoeL: mb(r.shoeR),
    shoeR: mb(r.shoeL),
    flats: r.flats.map(mb),
    collar: r.collar.map(mb),
    hem: mb(r.hem),
    frayedXs: r.frayedXs.map((x) => W - 1 - x),
    ...(r.chest ? { chest: mp(r.chest, 1) } : {}),
    ...(r.number ? { number: mp(r.number, 3) } : {}),
    ...(r.tie ? { tie: mp(r.tie, 1) } : {}),
    ...(r.belt ? { belt: mp(r.belt, 1) } : {}),
    ...(r.stains ? { stains: mp(r.stains, 7) } : {}),
    ...(r.gash ? { gash: mp(r.gash, 1) } : {}),
    skirt: rows(r.skirt),
    ...(r.dress ? { dress: rows(r.dress) } : {}),
  };
}
