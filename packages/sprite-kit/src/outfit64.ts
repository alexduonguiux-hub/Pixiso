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
import { combHair } from './hair64.js';
import { blank } from './draw.js';
import type { Box, HeroView } from './hero64.js';
import type { FormSpec, HeadMap } from './heroforms.js';
import { tailor, type Garment } from './tailor64.js';

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
  /** Hair clipped to the skull (a buzz cut): combed as a crop, three tones in masses, no locks. */
  crop?: boolean;
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
  /** Garments reshaded as cloth after the remaps (tailor64). */
  garments?: readonly Garment[];
  /** Cells forced to the line material (hems, seams, hat brims). */
  lines?: readonly Seam[];
  overlays?: readonly Overlay[];
  colors: MaterialColors;
  /** The drawn view the outfit is for; hair is combed by it (default S). */
  view?: HeroView;
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
const LINE_MATERIAL = MATERIALS.indexOf('line');
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
        if (from.includes(Math.floor(v / 8))) put(fx, fy, to * 8 + (v % 8));
      }
  }
  for (const g of outfit.garments ?? []) tailor(out, g, mapper(g.space));
  // Seams are line cells; where one would complete a 2x2 block of line in the finished sprite (a hem meeting
  // the trousers' outline) it becomes the covered material's deep shade instead, so the hem stays dark but
  // thin. Decided after the overlays, which may cover the lines that would have formed the block.
  const seamCells = new Map<number, number>();
  const overlayCorners = new Set<number>();
  const cropCells = new Set<number>();
  for (const seam of outfit.lines ?? []) {
    const map = mapper(seam.space);
    const [x0, y0, x1, y1] = seam.box;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const [fx, fy] = map(x, y);
        if (fx < 0 || fy < 0 || fx >= out.w || fy >= out.h) continue;
        const v = get(fx, fy);
        if (v >= 0 && Math.floor(v / 8) !== LINE_MATERIAL && !seamCells.has(fy * out.w + fx))
          seamCells.set(fy * out.w + fx, v);
        put(fx, fy, LINE);
      }
  }
  // The dressed body before any overlay: what the front cells go back to.
  const front = outfit.form?.front;
  const bare = front ? Int16Array.from(out.cells) : undefined;
  for (const o of outfit.overlays ?? []) {
    const map = shift(rigidMap(o, o.space === 'head' ? headMap : IDENTITY));
    for (let y = 0; y < o.sprite.h; y++)
      for (let x = 0; x < o.sprite.w; x++) {
        const v = o.sprite.cells[y * o.sprite.w + x]!;
        if (v === EMPTY) continue;
        const [fx, fy] = map(o.x + x, o.y + y);
        if (o.under && get(fx, fy) !== EMPTY) continue;
        put(fx, fy, v);
        if (o.crop && Math.floor(v / 8) === HAIR_MATERIAL) cropCells.add(fy * out.w + fx);
        else cropCells.delete(fy * out.w + fx);
        // An overlay's outline cell resting on the body's outline (hair on the shoulders, a bag on the
        // hem) is judged like a seam below: remember the overlay's own material next to it.
        if (v === LINE && !seamCells.has(fy * out.w + fx)) {
          const near = [
            [0, -1],
            [-1, 0],
            [1, 0],
            [0, 1],
          ]
            .map(([ax, ay]) => o.sprite.cells[(y + ay!) * o.sprite.w + x + ax!])
            .find((c) => c !== undefined && c !== EMPTY && Math.floor(c / 8) !== LINE_MATERIAL);
          if (near !== undefined) {
            seamCells.set(fy * out.w + fx, near);
            overlayCorners.add(fy * out.w + fx);
          }
        }
      }
  }
  if (front && bare)
    for (let y = 0; y < front.h; y++)
      for (let x = 0; x < front.w; x++) {
        if (front.cells[y * front.w + x] === EMPTY) continue;
        const i = (y + top) * out.w + x + left;
        out.cells[i] = bare[i]!;
      }
  const isLine = (x: number, y: number) => {
    const v = get(x, y);
    return v >= 0 && Math.floor(v / 8) === LINE_MATERIAL;
  };
  const doubles = (x: number, y: number) =>
    [-1, 0].some((ax) =>
      [-1, 1].some((ay) => {
        const X = x + ax;
        const Y = y + ay;
        return isLine(X, Y) && isLine(X + 1, Y) && isLine(X, y) && isLine(X + 1, y);
      }),
    );
  // Sequential: a cell turned deep no longer completes a block for its neighbour.
  const turned: number[] = [];
  for (const [i, v] of seamCells) {
    const x = i % out.w;
    const y = Math.floor(i / out.w);
    if (out.cells[i] === LINE && doubles(x, y)) {
      out.cells[i] = Math.floor(v / 8) * 8 + 3;
      turned.push(i);
    }
  }
  // A deep cell of skin or of a mark material with no like neighbour is a stray dot in another colour (a
  // collar corner on bare skin reads as a green hole, a pouch corner as a red one): a seam's grows one cell
  // into its own material (a shadow cell first, then the base: the shadow under a collar edge), an overlay's
  // corner goes back to line (growing would eat the pouch's lit corner), and where a seam has nothing to grow
  // into the line stays too, a doubled outline where two parts meet being the lesser flaw. A garment's own
  // deep corner against the outline is dark on dark and stays.
  for (const i of turned) {
    const v = out.cells[i]!;
    if (GARMENT_MATERIALS.has(Math.floor(v / 8)) || Math.floor(v / 8) === HAIR_MATERIAL) continue;
    const x = i % out.w;
    const y = Math.floor(i / out.w);
    if (N8.some(([ax, ay]) => get(x + ax, y + ay) === v)) continue;
    const own = (n: number) => n >= 0 && Math.floor(n / 8) === Math.floor(v / 8);
    const into = overlayCorners.has(i)
      ? undefined
      : (N4.find(([ax, ay]) => own(get(x + ax, y + ay)) && get(x + ax, y + ay) % 8 === 0) ??
        N4.find(([ax, ay]) => own(get(x + ax, y + ay))));
    if (into) put(x + into[0], y + into[1], v);
    else out.cells[i] = LINE;
  }
  coverLoneSkin(out);
  combHair(out, outfit.view ?? 'S', cropCells);
  fixLoneCells(out);
  return out;
}

/**
 * No skin cell stands alone once dressed (the 1x yardstick, D-088): a one-cell
 * sliver of ear or temple left beside the hair or a hat, with no skin among its
 * eight neighbours, reads as a dropped pixel at game size. Such a cell takes the
 * cell of a neighbour that covers it: hair first, then whatever is drawn over
 * the body, 4-neighbours before the ring; walled in by lines on all four sides
 * it closes with the line. A lone skin cell with none of these (between lines,
 * eyes or whites) is the body's to fix and stays.
 */
function coverLoneSkin(out: Sprite): void {
  const get = (x: number, y: number) =>
    x < 0 || y < 0 || x >= out.w || y >= out.h ? EMPTY : out.cells[y * out.w + x]!;
  const material = (v: number) => (v < 0 ? -1 : Math.floor(v / 8));
  const changes: [number, number][] = [];
  for (let i = 0; i < out.cells.length; i++) {
    if (material(out.cells[i]!) !== SKIN_MATERIAL) continue;
    const x = i % out.w;
    const y = Math.floor(i / out.w);
    const around = N4.map(([ax, ay]) => get(x + ax, y + ay));
    const ring = N8.map(([ax, ay]) => get(x + ax, y + ay));
    // a cell touching skin even corner to corner is part of the body (a thumb, a jaw corner under a collar)
    if (ring.some((v) => material(v) === SKIN_MATERIAL)) continue;
    // walled in by lines on every side: a gap in a seam or a pocket under a brim, closed with the line
    const walled = around.every((v) => v >= 0 && material(v) === LINE_MATERIAL);
    // anything drawn over the body may take the cell: a garment, a stain, a pustule, a strap
    const covers = (v: number) => {
      const m = material(v);
      return m >= 0 && m !== SKIN_MATERIAL && m !== LINE_MATERIAL && !FACE_MATERIALS.has(m);
    };
    // a line here would make a 2x2 line block (the doubles lint) where a diagonal quad is already three lines:
    // then whatever the ring offers covers the cell first, the line only as the last resort
    const isLine = (v: number) => v >= 0 && material(v) === LINE_MATERIAL;
    const wouldBlock = [-1, 1].some((dx) =>
      [-1, 1].some(
        (dy) => isLine(get(x + dx, y)) && isLine(get(x, y + dy)) && isLine(get(x + dx, y + dy)),
      ),
    );
    const cover =
      walled && !wouldBlock
        ? LINE
        : (around.find((v) => material(v) === HAIR_MATERIAL) ??
          around.find(covers) ??
          ring.find((v) => material(v) === HAIR_MATERIAL) ??
          ring.find(covers) ??
          (walled ? LINE : undefined));
    if (cover !== undefined) changes.push([i, cover]);
  }
  for (const [i, v] of changes) out.cells[i] = v;
}

const N4: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const N8: readonly (readonly [number, number])[] = [...N4, [-1, -1], [1, -1], [-1, 1], [1, 1]];
const MID = 1;
const LIGHT = 2;
const BRIGHT = 4;
const SKIN_MATERIAL = MATERIALS.indexOf('skin');
const FACE_MATERIALS = new Set([MATERIALS.indexOf('eye'), MATERIALS.indexOf('white')]);
const HAIR_MATERIAL = MATERIALS.indexOf('hair');
/** Materials a garment is made of (what the camouflage and seam rules below act on). */
const GARMENT_MATERIALS = new Set(
  (['cloth', 'cloth2', 'pants', 'boots', 'leather'] as const).map((m) => MATERIALS.indexOf(m)),
);
/** Materials a body or garment is made of; the rest (wood, accent, metal, white) draw deliberate marks. */
const BODY_MATERIALS = new Set(
  (['skin', 'cloth', 'cloth2', 'pants', 'boots', 'leather'] as const).map((m) =>
    MATERIALS.indexOf(m),
  ),
);

/**
 * Two stray-cell cases the garment rules cannot see, decided on the finished sprite: a cell of a garment
 * material with no cell of its material around it, boxed in by one other garment material (a camouflage dot
 * left on its own, a deep cloth cell among blotches), takes the tone most of that material's cells around it
 * have (skin is never adopted or adopting: skin through a garment is a neck opening or a torn hole);
 * a bright cell with no like neighbour (a rim cut off by a seam) steps down to light, or to mid when no light
 * cell of its material touches it. Marks of other materials (a sore, a nail) and the body's own one-cell
 * shading steps stay as drawn.
 */
function fixLoneCells(s: Sprite): void {
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < s.w && y < s.h ? s.cells[y * s.w + x]! : EMPTY;
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const v = s.cells[y * s.w + x]!;
      if (v < 0) continue;
      const m = Math.floor(v / 8);
      if (!BODY_MATERIALS.has(m)) continue;
      const ring = N8.map(([ax, ay]) => at(x + ax, y + ay));
      if (ring.some((n) => n === v)) continue;
      if (ring.some((n) => n >= 0 && Math.floor(n / 8) === m)) {
        if (v % 8 !== BRIGHT) continue;
        const light = ring.some((n) => n === m * 8 + LIGHT);
        s.cells[y * s.w + x] = m * 8 + (light ? LIGHT : MID);
        continue;
      }
      if (m === SKIN_MATERIAL) continue;
      const around = N4.map(([ax, ay]) => at(x + ax, y + ay));
      const byMaterial = new Map<number, number[]>();
      for (const n of around)
        if (n >= 0 && BODY_MATERIALS.has(Math.floor(n / 8)) && Math.floor(n / 8) !== SKIN_MATERIAL)
          byMaterial.set(Math.floor(n / 8), [...(byMaterial.get(Math.floor(n / 8)) ?? []), n]);
      const host = [...byMaterial.entries()].find(([, ns]) => ns.length >= 3);
      if (!host) continue;
      const tally = new Map<number, number>();
      for (const n of host[1]) tally.set(n, (tally.get(n) ?? 0) + 1);
      s.cells[y * s.w + x] = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
    }
}
