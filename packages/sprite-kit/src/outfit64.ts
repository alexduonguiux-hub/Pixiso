/**
 * Dressing a hero figure. Tight clothes are a material change: skin cells in
 * a region become cloth, pants or boots with the same shade, so the body's
 * own shading, outline and interior lines carry over (a T-shirt is the torso
 * and upper arms recoloured, trousers are the legs). Anything with its own
 * silhouette (hair, hats, bags, glasses, a shell) is an overlay template with
 * its own outline, stamped over the figure. Regions and overlay positions are
 * in figure coordinates of the standing front figure (17×40); forms with a
 * different size place them relative to the head top and the centre column.
 */
import type { MaterialColors } from './paint.js';
import { EMPTY, LEGEND, MATERIALS, packCell, type Material, type Sprite } from './format.js';
import { blank } from './draw.js';
import type { Box } from './hero64.js';
import type { FormSpec } from './heroforms.js';

export interface Remap {
  /** Inclusive box in figure coordinates. */
  box: Box;
  /** Materials replaced (default: skin only). */
  from?: readonly Material[];
  to: Material;
  /** Boxes left untouched inside `box` (a neck opening). */
  except?: readonly Box[];
}

export interface Overlay {
  sprite: Sprite;
  /** Top-left in figure coordinates. */
  x: number;
  y: number;
}

export interface Outfit {
  id: string;
  label: string;
  /** Body form the outfit is drawn for (default: the base figure). */
  form?: FormSpec;
  remaps?: readonly Remap[];
  /** Cells forced to the line material (hems, seams), as inclusive boxes. */
  lines?: readonly Box[];
  overlays?: readonly Overlay[];
  colors: MaterialColors;
}

const LINE = packCell(LEGEND.o!);

/** Applies remaps, seams and overlays to a figure; returns a new sprite of the same size. */
export function dress(figure: Sprite, outfit: Outfit): Sprite {
  const out = blank(figure.w, figure.h);
  out.cells.set(figure.cells);
  const inBox = (x: number, y: number, [x0, y0, x1, y1]: Box) =>
    x >= x0 && x <= x1 && y >= y0 && y <= y1;
  for (const r of outfit.remaps ?? []) {
    const from = (r.from ?? ['skin']).map((m) => MATERIALS.indexOf(m));
    const to = MATERIALS.indexOf(r.to);
    for (let y = 0; y < out.h; y++)
      for (let x = 0; x < out.w; x++) {
        const v = out.cells[y * out.w + x]!;
        if (v < 0 || !inBox(x, y, r.box)) continue;
        if (r.except?.some((b) => inBox(x, y, b))) continue;
        const m = Math.floor(v / 4);
        if (from.includes(m)) out.cells[y * out.w + x] = to * 4 + (v % 4);
      }
  }
  for (const box of outfit.lines ?? [])
    for (let y = box[1]; y <= box[3]; y++)
      for (let x = box[0]; x <= box[2]; x++)
        if (x >= 0 && y >= 0 && x < out.w && y < out.h) out.cells[y * out.w + x] = LINE;
  for (const o of outfit.overlays ?? [])
    for (let y = 0; y < o.sprite.h; y++)
      for (let x = 0; x < o.sprite.w; x++) {
        const v = o.sprite.cells[y * o.sprite.w + x]!;
        if (v === EMPTY) continue;
        const tx = o.x + x;
        const ty = o.y + y;
        if (tx >= 0 && ty >= 0 && tx < out.w && ty < out.h) out.cells[ty * out.w + tx] = v;
      }
  return out;
}
