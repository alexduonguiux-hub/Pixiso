/**
 * Shape-based drawing on the semantic grid. Templates built from ellipses and
 * rounded boxes read as volumes (docs/PIXEL_STYLE_REFERENCE.md §2.6: masses,
 * not boxes); the shifted-shape recipe shades any convex blob with a crescent
 * of shadow on the lower-right and a highlight on the upper-left, never a
 * pillow. Nothing here draws outlines: compose.ts adds the closed outer line
 * and the selective inner lines where forms overlap.
 */
import {
  EMPTY,
  LEGEND,
  MATERIALS,
  packCell,
  type Material,
  type Shade,
  type Sprite,
} from './format.js';

export function blank(w: number, h: number): Sprite {
  return { w, h, cells: new Int16Array(w * h).fill(EMPTY) };
}

export function cellOf(material: Material, shade: Shade): number {
  return MATERIALS.indexOf(material) * 4 + shade;
}

export function get(s: Sprite, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= s.w || y >= s.h) return EMPTY;
  return s.cells[y * s.w + x]!;
}

export function set(s: Sprite, x: number, y: number, v: number): void {
  if (x < 0 || y < 0 || x >= s.w || y >= s.h) return;
  s.cells[y * s.w + x] = v;
}

/** Fills the pixel ellipse inscribed in the inclusive box [x0..x1]×[y0..y1]. */
export function fillEllipse(
  s: Sprite,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  v: number,
): void {
  const cx = (x0 + x1 + 1) / 2;
  const cy = (y0 + y1 + 1) / 2;
  const rx = (x1 - x0 + 1) / 2;
  const ry = (y1 - y0 + 1) / 2;
  for (let y = y0; y <= y1; y++) {
    const ny = (y + 0.5 - cy) / ry;
    const ext = rx * Math.sqrt(Math.max(0, 1 - ny * ny));
    for (let x = x0; x <= x1; x++) {
      if (Math.abs(x + 0.5 - cx) <= ext + 1e-9) set(s, x, y, v);
    }
  }
}

export function fillRect(
  s: Sprite,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  v: number,
): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(s, x, y, v);
}

/** Rectangle with `r` pixels knocked off each corner in a quarter-circle step pattern (r ≤ 3). */
export function fillRoundRect(
  s: Sprite,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  v: number,
): void {
  // Corner cut per row distance from the edge: r=1 → [1], r=2 → [2,1], r=3 → [3,1,1].
  const cut = r <= 0 ? [] : r === 1 ? [1] : r === 2 ? [2, 1] : [3, 1, 1];
  for (let y = y0; y <= y1; y++) {
    const d = Math.min(y - y0, y1 - y);
    const c = d < cut.length ? cut[d]! : 0;
    for (let x = x0 + c; x <= x1 - c; x++) set(s, x, y, v);
  }
}

/** Overlays ASCII rows (LEGEND glyphs, '.' = leave as is) with the top-left at (x, y). */
export function putRows(s: Sprite, x: number, y: number, rows: readonly string[]): void {
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const g = row[dx]!;
      if (g === '.' || g === ' ') continue;
      const cell = LEGEND[g];
      if (!cell) throw new Error(`putRows: unknown glyph "${g}"`);
      set(s, x + dx, y + dy, packCell(cell));
    }
  });
}

/** Opaque mask of a sprite (1 = opaque). */
export function maskOf(s: Sprite): Uint8Array {
  const m = new Uint8Array(s.w * s.h);
  for (let i = 0; i < m.length; i++) m[i] = s.cells[i]! >= 0 ? 1 : 0;
  return m;
}

export interface ShadeOptions {
  /** Offset of the base-tone copy of the shape (toward the light). */
  base?: [number, number];
  /** Offset of the highlight copy; a larger shift gives a smaller highlight. */
  light?: [number, number];
  /** Omit the highlight band (matte materials, tiny shapes). */
  noHighlight?: boolean;
}

/**
 * The shifted-shape recipe: every opaque cell of `shape` starts as the shadow
 * tone; cells that are still inside the shape when it is shifted toward the
 * light become the base tone; cells inside a further shift become highlight.
 * The result keeps `shape`'s silhouette exactly.
 */
export function shadeShape(shape: Sprite, material: Material, o: ShadeOptions = {}): Sprite {
  const [bx, by] = o.base ?? [-1, -1];
  const [lx, ly] = o.light ?? [-3, -2];
  const m = maskOf(shape);
  const out = blank(shape.w, shape.h);
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < shape.w && y < shape.h && m[y * shape.w + x] === 1;
  for (let y = 0; y < shape.h; y++) {
    for (let x = 0; x < shape.w; x++) {
      if (!inside(x, y)) continue;
      let shade: Shade = 0;
      if (inside(x - bx, y - by)) shade = 1;
      if (!o.noHighlight && shade === 1 && inside(x - lx, y - ly)) shade = 2;
      set(out, x, y, cellOf(material, shade));
    }
  }
  return out;
}

/** Copies every opaque cell of `src` onto `dst` at (x, y). */
export function stamp(dst: Sprite, src: Sprite, x: number, y: number): void {
  for (let sy = 0; sy < src.h; sy++)
    for (let sx = 0; sx < src.w; sx++) {
      const v = src.cells[sy * src.w + sx]!;
      if (v >= 0) set(dst, x + sx, y + sy, v);
    }
}

/** Keeps only the cells of `s` where `mask` is opaque. */
export function clip(s: Sprite, mask: Sprite): Sprite {
  const out = blank(s.w, s.h);
  for (let i = 0; i < s.cells.length; i++) if (mask.cells[i]! >= 0) out.cells[i] = s.cells[i]!;
  return out;
}

/** Removes the cells of `s` where `mask` is opaque. */
export function subtract(s: Sprite, mask: Sprite): Sprite {
  const out = { w: s.w, h: s.h, cells: Int16Array.from(s.cells) };
  for (let i = 0; i < s.cells.length; i++) if (mask.cells[i]! >= 0) out.cells[i] = EMPTY;
  return out;
}

/** Replaces every cell of one material with the given shade of another material (or the same). */
export function recolor(s: Sprite, from: Material, to: Material, shade?: Shade): Sprite {
  const out = { w: s.w, h: s.h, cells: Int16Array.from(s.cells) };
  const fi = MATERIALS.indexOf(from);
  for (let i = 0; i < out.cells.length; i++) {
    const v = out.cells[i]!;
    if (v >= 0 && Math.floor(v / 4) === fi) out.cells[i] = cellOf(to, shade ?? ((v % 4) as Shade));
  }
  return out;
}

/** Trims transparent rows/columns, returning the sprite and the offset of its new origin. */
export function trim(s: Sprite): { sprite: Sprite; dx: number; dy: number } {
  let x0 = s.w;
  let y0 = s.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++)
      if (s.cells[y * s.w + x]! >= 0) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0) return { sprite: blank(0, 0), dx: 0, dy: 0 };
  const out = blank(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) out.cells[(y - y0) * out.w + (x - x0)] = s.cells[y * s.w + x]!;
  return { sprite: out, dx: x0, dy: y0 };
}

/**
 * Removes the hand-drawn outer outline of a template (line cells that touch
 * transparency or the sprite border) so compose.ts can draw the single shared
 * outline instead. Interior line cells (visor slits, panel seams) stay.
 */
export function stripOuterLines(s: Sprite): Sprite {
  const line = cellOf('line', 1);
  const out = { w: s.w, h: s.h, cells: Int16Array.from(s.cells) };
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      if (s.cells[y * s.w + x] !== line) continue;
      const exposed =
        x === 0 ||
        y === 0 ||
        x === s.w - 1 ||
        y === s.h - 1 ||
        get(s, x - 1, y) === EMPTY ||
        get(s, x + 1, y) === EMPTY ||
        get(s, x, y - 1) === EMPTY ||
        get(s, x, y + 1) === EMPTY;
      if (exposed) out.cells[y * s.w + x] = EMPTY;
    }
  }
  return out;
}
