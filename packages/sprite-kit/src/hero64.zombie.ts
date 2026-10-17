/**
 * Zombie stance, front view: the base body (19×40 canvas) with the head of
 * the base figure drooped onto the chest and tilted. The torso, arms and
 * legs are the base template cell for cell (torso seven cells wide, legs
 * eleven rows from the crotch); the pose is in what moves: the left shoulder
 * rises two rows into a hump beside the jaw, the right arm hangs two rows
 * lower and its fist falls in front of the hip, the right foot is turned out
 * (a column longer). Same vocabulary as hero64.ts: 1-px outline, front light.
 */
import { blank } from './draw.js';
import { sprite, type Sprite } from './format.js';
import { cut, HERO_S_FIGURE } from './hero64.js';

export const ZOMBIE_FIGURE_W = 19;
export const ZOMBIE_FIGURE_H = 40;

/** Everything below the head. Rows 0–13 are left for the head stamp. */
export const ZOMBIE_BODY = sprite`
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...................
  ...ooooo...........
  ..osssss...........
  .osssssss....so....
  .oSsssssSSsSSso....
  .osso$$$sSsssso....
  o$sSo$$$s$$$sso....
  o$sSo$$$s$$$SsSo...
  o$sooSSsssSSosso...
  o$sooosssssssosso..
  osssos$$$$$soSs$o..
  osososs$$$ssoSs$o..
  osooos$$$$$soos$o..
  .osooss$$$ssoos$o..
  ..ooosssssssossso..
  ....osSSsSSsososo..
  ...oossooossoooso..
  ...oSsso.ossoosso..
  ...o$sSo.oSsoooo...
  ...o$$So.oS$$o.....
  ...o$sSo.oSs$o.....
  ..osssso.osssso....
  ..osssso.osssso....
  ..oooSso.osSooooo..
  .o$$$sso.osss$$$o..
  .ossssso.osssssso..
  .ooooooo.oooooooo..
`;

/** Head top row on the zombie canvas. */
export const ZOMBIE_HEAD_TOP = 2;
/**
 * Column shift of each head row: the tilt (top rows 0, middle +1, chin +2),
 * which lands the chin over the base torso's right edge, where the dropped
 * shoulder slopes away under it. Steps sit on rows 5 and 9, where both sides
 * of the base skull run vertical, so the outline stays 8-connected after the
 * shear.
 */
export function zombieHeadShift(headRow: number): number {
  return headRow < 5 ? 0 : headRow < 9 ? 1 : 2;
}

/** The base head (with its chin line only on the last row) drooped and tilted onto the body. */
export function buildZombieFigure(): Sprite {
  const out = blank(ZOMBIE_FIGURE_W, ZOMBIE_FIGURE_H);
  out.cells.set(ZOMBIE_BODY.cells);
  const head = cut(
    HERO_S_FIGURE,
    [1, 0, 15, 14],
    [
      [1, 14, 5, 14],
      [11, 14, 15, 14],
    ],
  );
  for (let k = 0; k < head.h; k++) {
    const x0 = 1 + zombieHeadShift(k);
    const y = ZOMBIE_HEAD_TOP + k;
    for (let j = 0; j < head.w; j++) {
      const v = head.cells[k * head.w + j]!;
      if (v >= 0) out.cells[y * out.w + x0 + j] = v;
    }
  }
  return out;
}

export const HERO_ZOMBIE_S: Sprite = buildZombieFigure();
