/**
 * Zombie stance, front view: a hand-drawn body (19×40) with the head of the
 * base figure drooped onto the chest and tilted. The raised left shoulder
 * starts two rows above the dropped right one, the right arm hangs two rows
 * lower than the left, both hands are open with spread fingers instead of
 * fists, the legs are shorter (knees bent) and the right foot is turned out
 * as if dragged. Same vocabulary as hero64.ts: 1-px outline, front light.
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
  .osssssss.....so...
  .oSssssssSSsSSsso..
  .osso$$$sSsssssso..
  o$sSo$$$s$$$sssSSo.
  o$sSo$$$s$$$ssoSs$o
  o$sSoSSsssSSssoSs$o
  o$sSosssssssssoSs$o
  o$soos$$$$$sssoSs$o
  o$sooss$$$sssSoSsso
  osssos$$$$$ssSoosso
  osSsos$$$$$ssSoosso
  ososossSSsSSssossso
  osososssssssssosSso
  osososssssssssosSso
  ooooosssssssssososo
  ....osssooosssososo
  ....oSsso.osssooooo
  ....o$sSo.oSs$o....
  ....o$sSo..oSs$o...
  ...osssso..osssso..
  ...osssso..osssso..
  ...oooSso..osSoooo.
  ..o$$$sso..ossss$$o
  ..ooooooo..oooooooo
`;

/** Head top row on the zombie canvas. */
export const ZOMBIE_HEAD_TOP = 2;
/**
 * Column shift of each head row: the tilt (top rows +1, middle +2, chin +3).
 * Steps sit on rows 5 and 9, where both sides of the base skull run vertical,
 * so the outline stays 8-connected after the shear.
 */
export function zombieHeadShift(headRow: number): number {
  return headRow < 5 ? 1 : headRow < 9 ? 2 : 3;
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
