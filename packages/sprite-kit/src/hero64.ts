/**
 * Hand-drawn 64 px "hero" base body (mannequin), transcribed cell by cell from
 * the user's reference sheet after fitting its pixel grid (the sheet is a
 * ~2.3× resample, so the figure is 17×40 with its outline, not the 21×48 the
 * first study assumed). Unlike the shape-built bodies, these templates carry
 * their own outline: the reference draws lines where a silhouette outline
 * cannot (chin line over the shoulders, ear notch, double line between the
 * forearm and the torso, fist knuckles), so `compose` is used with no `edge`
 * and no `outline`. Shading follows the reference too: a front light with the
 * highlight on the forehead, the chest and the outer edge of each arm and leg,
 * and shadow only on the far side of the face, the shoulders, the inner arm
 * column, the neck well and the pelvis.
 *
 * Views: S (front), N (back) and W (left side); E is the mirror of W. Each
 * view has three frames: two walk steps around the standing pose
 * (hero64.frames.ts, generated from the sheet).
 */
import type { BodyView } from './body32.js';
import { blank } from './draw.js';
import { parseSprite, sprite, toAscii, type Sprite } from './format.js';
import { HERO_FRAME_DATA, type HeroFrameData } from './hero64.frames.js';
import { HERO_NW_FIGURE, HERO_SW_FIGURE } from './hero64.views.js';

export const HERO_CANVAS = 64;
export const HERO_PIVOT = { x: 32, y: 62 } as const;
/** Row of the standing figure's sole line on the canvas. */
export const HERO_GROUND = 60;
export const HERO_FIGURE_W = 17;
export const HERO_FIGURE_H = 40;

/**
 * Front view, 17×40 with the outline, read from the sheet's large clean copy.
 * Rows: skull 0–7, eyes 8–11 (brow line; the iris is one column, navy on its
 * two upper cells and blue below, with the white reflection beside it only on
 * the two lower rows, as the reference draws it), chin 12–14, shoulders 15–18, torso 19–29 (pecs 21, navel 28,
 * crotch 29), legs 30–39 (calf 34–35, foot 36–39). The ears sit at columns
 * 1–3 and 13–15 on rows 8–10.
 */
export const HERO_S_FIGURE = sprite`
  ......ooooo......
  ....ooSsssSoo....
  ...oSS$$$$$SSo...
  ...os$$$$$$$so...
  ..oss$$$$$$$sso..
  ..osss$$$$$ssso..
  ..ossssssssssso..
  ..oSsssssssssSo..
  .osSSoosssooSSso.
  .osSSsEsssEsSSso.
  ..oSSxEsssExSSo..
  ...oSxe$$$exSo...
  ....os$$$$$so....
  .....os$$$so.....
  ....osoooooso....
  ...ossssssssso...
  ..os$$SSsSSssso..
  ..os$$$SsSsssso..
  .oSS$$$ssssssSSo.
  .osso$$sssssosso.
  .osso$$sssssosso.
  o$sSo$$ssSSSoSs$o
  o$sSossssSSSoSs$o
  o$soossssSSSoos$o
  o$soossssSSSoos$o
  osssosssssssossso
  osososssssSSososo
  ossoossssSSSoooso
  .osoosSSsSSsoosso
  ..ooossooossoooo.
  ...oSsso.ossSo...
  ...o$sSo.oSs$o...
  ...o$$So.oS$$o...
  ...o$$so.os$$o...
  ..osssso.osssso..
  ..osssso.osssso..
  ..ooosso.ossooo..
  .o$$$sso.oss$$$o.
  .ossssso.ossssso.
  .ooooooo.ooooooo.
`;

/** Drawn views; SE, E and NE come from mirroring SW, W and NW (plain flip, D-042). */
export type HeroView = 'S' | 'SW' | 'W' | 'NW' | 'N';
/** A walk step of a drawn view (D-095): the view letter and the step, 0 for A and 1 for B. */
export type WalkKey = `${'S' | 'N' | 'W'}${0 | 1}`;
export const HERO_VIEWS: readonly HeroView[] = ['S', 'SW', 'W', 'NW', 'N'];
/** Views with transcribed walk frames; SW and NW have the standing frame only so far. */
export type HeroWalkView = 'S' | 'N' | 'W';

/** One frame placed on the 64×64 canvas: `x`, `y` is the sprite's top-left. */
export interface HeroFrame {
  sprite: Sprite;
  x: number;
  y: number;
}

function place(d: HeroFrameData, name: string): HeroFrame {
  const s = parseSprite(d.rows, name);
  // The sheet aligns the heads of a view's frames at the cell top; the standing
  // figure's soles sit on HERO_GROUND, walk steps may reach two rows lower.
  const standTop = HERO_GROUND - (HERO_FIGURE_H - 1);
  return { sprite: s, x: HERO_PIVOT.x - Math.floor(s.w / 2), y: standTop + d.dtop };
}

/** Rows of the head above the chin line (the chin line is row 14, HEAD_ROWS - 1 + 1). */
const HEAD_ROWS = 14;

/**
 * A walk step wearing the standing frame's head (D-095): the steps were transcribed before the base
 * head was corrected (eyes, ears, nape) and their heads drifted a column with the sheet's cropping;
 * the head must not change along a cycle. Rows 0-13 come from the standing frame, shifted so the
 * skull sits on the same columns; row 14 (chin line, trapezius) too, except where the step's body
 * below needs its own cell (a shoulder swung a column out); the body from row 15 is the step's own.
 * The step moves on the canvas so its head lands where the standing head is.
 */
function withStandingHead(step: HeroFrame, stand: HeroFrame, name: string): HeroFrame {
  const sRows = toAscii(stand.sprite);
  const fRows = toAscii(step.sprite);
  const skullCol = (rows: string[]) => rows[2]!.indexOf('o');
  const shift = skullCol(fRows) - skullCol(sRows);
  const w = step.sprite.w;
  const shifted = (row: string): string => {
    const cells = row.split('');
    const out = Array<string>(w).fill('.');
    cells.forEach((c, x) => {
      if (c === '.') return;
      const nx = x + shift;
      if (nx < 0 || nx >= w)
        throw new Error(`${name}: head cell (${x}) falls off the step's canvas`);
      out[nx] = c;
    });
    return out.join('');
  };
  const rows: string[] = [];
  for (let y = 0; y < HEAD_ROWS; y++) rows.push(shifted(sRows[y]!));
  // the chin row: the standing one, plus the step's own cells where its shoulders reach further out
  const chin = shifted(sRows[HEAD_ROWS]!).split('');
  const own = fRows[HEAD_ROWS]!;
  const below = fRows[HEAD_ROWS + 1]!;
  for (let x = 0; x < w; x++)
    if (chin[x] === '.' && own[x] !== '.' && below[x] !== undefined && below[x] !== '.')
      chin[x] = own[x]!;
  rows.push(chin.join(''));
  for (let y = HEAD_ROWS + 1; y < fRows.length; y++) rows.push(fRows[y]!);
  return {
    sprite: parseSprite(rows, name),
    x: stand.x + skullCol(sRows) - skullCol(fRows),
    y: step.y,
  };
}

/** The three frames of a view: [step A, standing, step B]. */
export function heroFrames(view: HeroView): [HeroFrame, HeroFrame, HeroFrame] {
  if (view === 'SW' || view === 'NW') {
    const fig = view === 'SW' ? HERO_SW_FIGURE : HERO_NW_FIGURE;
    const stand: HeroFrame = {
      sprite: fig,
      x: HERO_PIVOT.x - Math.floor(fig.w / 2),
      y: HERO_GROUND - (HERO_FIGURE_H - 1),
    };
    return [stand, stand, stand];
  }
  const d = HERO_FRAME_DATA[view];
  const stand = place(d[1], `${view}1`);
  // Step A is the one with the person's left leg forward in every view (D-095): the reference sheet's front
  // row has its steps the other way round from its back and side rows, so S takes them in reverse.
  const [a, b] = view === 'S' ? [d[2], d[0]] : [d[0], d[2]];
  return [
    withStandingHead(place(a, `${view}0`), stand, `${view}0`),
    stand,
    withStandingHead(place(b, `${view}2`), stand, `${view}2`),
  ];
}

/** Standing frame of a view. */
export function heroStand(view: HeroView): HeroFrame {
  return heroFrames(view)[1];
}

/** Walk cycle as frame indices into `heroFrames`: contact, pass, contact, pass. */
export const HERO_WALK_CYCLE: readonly (0 | 1 | 2)[] = [0, 1, 2, 1];

/** Inclusive cell box in figure coordinates. */
export type Box = readonly [x0: number, y0: number, x1: number, y1: number];

/** Copies the inclusive box [x0..x1]×[y0..y1] of `s` into a new sprite. */
export function slice(s: Sprite, x0: number, y0: number, x1: number, y1: number): Sprite {
  const out = blank(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const v = s.cells[y * s.w + x]!;
      if (v >= 0) out.cells[(y - y0) * out.w + (x - x0)] = v;
    }
  return out;
}

/** `slice` followed by clearing every cell inside the `erase` boxes (figure coordinates). */
export function cut(s: Sprite, box: Box, erase: readonly Box[] = []): Sprite {
  const [x0, y0, x1, y1] = box;
  const out = slice(s, x0, y0, x1, y1);
  for (const [ex0, ey0, ex1, ey1] of erase)
    for (let y = Math.max(ey0, y0); y <= Math.min(ey1, y1); y++)
      for (let x = Math.max(ex0, x0); x <= Math.min(ex1, x1); x++)
        out.cells[(y - y0) * out.w + (x - x0)] = -1;
  return out;
}

/**
 * Splits the standing front figure into limb layers so the offset-table clips
 * can move them. Every part keeps its own outline. Where a part leaves in a
 * pose, the part underneath already has pixels there: the torso keeps a
 * shoulder cap behind the upper arm (rows 19–20) and a pelvis behind the top of
 * each leg (rows 30–31), and the lines shared by two touching parts belong to
 * both. Positions put the feet on HERO_GROUND and the centre column on x 32.
 */
export function heroViewS(): BodyView {
  const f = HERO_S_FIGURE;
  const X = HERO_PIVOT.x - 8; // centre column 8 of the 17-wide figure on x 32
  const Y = HERO_GROUND - (f.h - 1);
  const at = (box: Box, z: number, erase: readonly Box[] = []) => ({
    sprite: cut(f, box, erase),
    x: X + box[0],
    y: Y + box[1],
    z,
  });
  const ARM_R: Box = [0, 18, 4, 29];
  const ARM_L: Box = [12, 18, 16, 29];
  return {
    parts: {
      torso: at([1, 14, 15, 31], 20, [
        [0, 21, 3, 29], // arm R from the elbow line down (rows 19–20 stay as the shoulder cap)
        [13, 21, 16, 29], // arm L
        [6, 14, 10, 14], // the chin line belongs to the head; the trapezius tops stay
      ]),
      armR: at(ARM_R, 30),
      armL: at(ARM_L, 30),
      legR: at([1, 30, 7, 39], 25),
      legL: at([9, 30, 15, 39], 25),
      head: at([1, 0, 15, 14], 40, [
        [1, 14, 5, 14], // keep only the chin line on row 14
        [11, 14, 15, 14],
      ]),
    },
    anchors: {
      head: { x: X + 1, y: Y },
      hand_right: { x: X + 1, y: Y + 25 },
      hand_left: { x: X + 13, y: Y + 25 },
      back: { x: X + 5, y: Y + 15 },
    },
  };
}
