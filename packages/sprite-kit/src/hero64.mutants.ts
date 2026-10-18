/**
 * Mutant bodies that are more than an outfit: the brute is the ×1.5 giant
 * with a mutated, oversized left arm ending in claws and bone spikes on the
 * right shoulder, set on a wider canvas so the arm has room.
 */
import { blank } from './draw.js';
import { sprite, type Sprite } from './format.js';
import { HERO_GIANT15_S } from './hero64.giant.js';
import type { FormSpec } from './heroforms.js';

export const BRUTE_W = 31;
export const BRUTE_H = 60;
/** Column of the giant inside the brute canvas. */
export const BRUTE_GIANT_X = 4;

/** Mutated left arm: thick upper arm, thicker forearm, a hand of three claws. Replaces the giant's left arm. */
const BRUTE_ARM = sprite`
  ...oooooo
  ..o$sssSo
  .o$ssssSo
  .o$ssssSo
  .o$ssssSo
  .osssssso
  .osssssso
  .osssssso
  .osssssso
  o$sssssSo
  o$sssssSo
  ossssssso
  ossssssso
  oSsssssSo
  ooSsssSoo
  .oSsssSo.
  .oSoSoSo.
  .oSoSoSo.
  ..o.o.o..
`;

/** Two bone spikes (white material) growing out of the right shoulder. */
const BRUTE_SPIKES = sprite`
  ..o....
  .oxo.o.
  .oxooxo
  oxxxoxo
  oxxxxxo
`;

function stamp(
  dst: Sprite,
  src: Sprite,
  x0: number,
  y0: number,
  clear?: [number, number, number, number],
): void {
  if (clear) {
    const [cx0, cy0, cx1, cy1] = clear;
    for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) dst.cells[y * dst.w + x] = -1;
  }
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const v = src.cells[y * src.w + x]!;
      if (v >= 0) dst.cells[(y0 + y) * dst.w + x0 + x] = v;
    }
}

export function buildBruteFigure(): Sprite {
  const out = blank(BRUTE_W, BRUTE_H);
  stamp(out, HERO_GIANT15_S, BRUTE_GIANT_X, 0);
  // The giant's left arm occupies its columns 0–4 on rows 26–44; the mutated arm takes columns 0–8 from row 28.
  stamp(out, BRUTE_ARM, 0, 28, [BRUTE_GIANT_X, 29, BRUTE_GIANT_X + 3, 44]);
  stamp(out, BRUTE_SPIKES, 22, 22);
  return out;
}

export const HERO_BRUTE_S: Sprite = buildBruteFigure();

export const FORM_BRUTE: FormSpec = {
  id: 'brute',
  label: 'Đột biến khổng lồ',
  figure: HERO_BRUTE_S,
};
