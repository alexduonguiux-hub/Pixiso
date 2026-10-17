/**
 * Dressing a hero figure. Tight clothes are a material change: skin cells in
 * a region become cloth, pants or boots with the same shade, so the body's
 * own shading, outline and interior lines carry over (a T-shirt is the torso
 * and upper arms recoloured, trousers are the legs). Anything with its own
 * silhouette (hair, hats, bags, glasses, a shell) is an overlay template with
 * its own outline, stamped over the figure.
 *
 * Coordinates come in two spaces. `figure` space is the form's own grid.
 * `head` space is the base head's grid (the standing 17×40 figure, rows
 * 0–16): a form maps it onto its own head through `FormSpec.headMap`, so one
 * hair, hat or face drawing serves every form, including the zombie's tilted,
 * drooped head.
 */
import type { MaterialColors } from './paint.js';
import { EMPTY, LEGEND, MATERIALS, packCell, type Material, type Sprite } from './format.js';
import { blank } from './draw.js';
import type { Box, HeroView } from './hero64.js';
import type { FormSpec, HeadMap } from './heroforms.js';

export type Space = 'figure' | 'head';

export interface Remap {
  /** Inclusive box. */
  box: Box;
  /** Materials replaced (default: skin only). */
  from?: readonly Material[];
  to: Material;
  /** Boxes left untouched inside `box` (a neck opening). */
  except?: readonly Box[];
  space?: Space;
}

export interface Overlay {
  sprite: Sprite;
  /** Top-left. */
  x: number;
  y: number;
  space?: Space;
  /**
   * Head-space item that must not be sheared with a tilted head (a hat): the
   * whole drawing is translated as one piece, horizontally by the eye row's
   * shift (so it sits centred on the face, not on the sheared dome) and
   * vertically by its bottom row's.
   */
  rigid?: boolean;
  /** Stamped only where the figure is still transparent (a shell behind the body). */
  under?: boolean;
}

export interface Seam {
  box: Box;
  space?: Space;
}

export interface Outfit {
  id: string;
  label: string;
  /** Body form the outfit is drawn for (default: the base figure). */
  form?: FormSpec;
  remaps?: readonly Remap[];
  /** Cells forced to the line material (hems, seams, hat brims). */
  lines?: readonly Seam[];
  overlays?: readonly Overlay[];
  colors: MaterialColors;
}

/** A dressed figure: the canvas grew by `ox` columns on the left and `oy` rows on the top when overlays reached past the figure. */
export interface DressedSprite extends Sprite {
  ox: number;
  oy: number;
}

/** What one item adds in one view: drawings, material changes, seam lines. */
export interface ViewLayer {
  overlays?: Overlay[];
  remaps?: Remap[];
  lines?: Seam[];
}
/**
 * An item drawn per view (hair, hat, glasses, bag...). S is required; a view
 * that is missing simply leaves the item out (glasses seen from behind).
 */
export type ViewItem = { S: ViewLayer } & Partial<Record<HeroView, ViewLayer>>;

const LINE = packCell(LEGEND.o!);
/** Row of the eyes in head space (base head rows 9–11; the middle one). */
const HEAD_EYE_ROW = 10;
const IDENTITY: HeadMap = (x, y) => [x, y];

/**
 * Applies remaps, seams and overlays to a figure. The result is at least the
 * figure's size; when an overlay reaches past it (hair above the skull, a hat
 * wider than a side view) the canvas grows to hold every drawn cell, and
 * `ox`/`oy` say by how much the figure moved right and down.
 */
export function dress(figure: Sprite, outfit: Outfit): DressedSprite {
  const headMap = outfit.form?.headMap ?? IDENTITY;
  const rigidMap = (o: Overlay, map: HeadMap): HeadMap => {
    if (!o.rigid) return map;
    const ax = o.x;
    const ay = o.y + o.sprite.h - 1;
    const dx = map(ax, HEAD_EYE_ROW)[0] - ax;
    const dy = map(ax, ay)[1] - ay;
    return (x, y) => [x + dx, y + dy];
  };
  // Bounds of every drawn overlay cell, in figure coordinates.
  let minX = 0;
  let minY = 0;
  let maxX = figure.w - 1;
  let maxY = figure.h - 1;
  for (const ov of outfit.overlays ?? []) {
    const map = rigidMap(ov, ov.space === 'head' ? headMap : IDENTITY);
    for (let y = 0; y < ov.sprite.h; y++)
      for (let x = 0; x < ov.sprite.w; x++) {
        if (ov.sprite.cells[y * ov.sprite.w + x] === EMPTY) continue;
        const [fx, fy] = map(ov.x + x, ov.y + y);
        minX = Math.min(minX, fx);
        minY = Math.min(minY, fy);
        maxX = Math.max(maxX, fx);
        maxY = Math.max(maxY, fy);
      }
  }
  const left = -minX;
  const top = -minY;
  const out: DressedSprite = {
    ...blank(maxX - minX + 1, maxY - minY + 1),
    ox: left,
    oy: top,
  };
  for (let y = 0; y < figure.h; y++)
    for (let x = 0; x < figure.w; x++)
      out.cells[(y + top) * out.w + x + left] = figure.cells[y * figure.w + x]!;
  const shift =
    (m: HeadMap): HeadMap =>
    (x, y) => {
      const [fx, fy] = m(x, y);
      return [fx + left, fy + top];
    };
  const mapper = (space: Space | undefined): HeadMap =>
    shift(space === 'head' ? headMap : IDENTITY);
  const inBox = (x: number, y: number, [x0, y0, x1, y1]: Box) =>
    x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const put = (x: number, y: number, v: number) => {
    if (x >= 0 && y >= 0 && x < out.w && y < out.h) out.cells[y * out.w + x] = v;
  };
  const get = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < out.w && y < out.h ? out.cells[y * out.w + x]! : EMPTY;

  for (const r of outfit.remaps ?? []) {
    const from = (r.from ?? ['skin']).map((m) => MATERIALS.indexOf(m));
    const to = MATERIALS.indexOf(r.to);
    const map = mapper(r.space);
    const [x0, y0, x1, y1] = r.box;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        if (r.except?.some((b) => inBox(x, y, b))) continue;
        const [fx, fy] = map(x, y);
        const v = get(fx, fy);
        if (v < 0) continue;
        if (from.includes(Math.floor(v / 4))) put(fx, fy, to * 4 + (v % 4));
      }
  }
  for (const seam of outfit.lines ?? []) {
    const map = mapper(seam.space);
    const [x0, y0, x1, y1] = seam.box;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const [fx, fy] = map(x, y);
        put(fx, fy, LINE);
      }
  }
  for (const o of outfit.overlays ?? []) {
    const map = shift(rigidMap(o, o.space === 'head' ? headMap : IDENTITY));
    for (let y = 0; y < o.sprite.h; y++)
      for (let x = 0; x < o.sprite.w; x++) {
        const v = o.sprite.cells[y * o.sprite.w + x]!;
        if (v === EMPTY) continue;
        const [fx, fy] = map(o.x + x, o.y + y);
        if (o.under && get(fx, fy) !== EMPTY) continue;
        put(fx, fy, v);
      }
  }
  return out;
}
