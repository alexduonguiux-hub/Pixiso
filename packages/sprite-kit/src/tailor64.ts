/**
 * Tailoring: once a region of the body has become cloth, pants or boots
 * (outfit64 remaps), its cells still carry the body's shading, which is a
 * skin pattern (a bright chest and belly, little shadow). The reference sheet
 * shades its clothes the other way round, as measured in docs/QUALITY_BAR.md:
 * a jacket is about 40 % shadow, 50 % mid and 10 % light, the light sits on
 * the top-left shoulder, the shadow is a mass on the right and under the
 * chest and arms, creases and a placket break the mid tone, sleeves end in a
 * cuff. `tailor` reshades one garment by those rules, deterministically, from
 * the garment's own box, so every pose and view gets the same construction.
 */
import { EMPTY, MATERIALS, packCell, LEGEND, type Material, type Sprite } from './format.js';
import type { Box } from './hero64.js';

export type GarmentKind = 'torso' | 'sleeve' | 'pants' | 'boots';

export interface Garment {
  kind: GarmentKind;
  /** Inclusive box(es) in figure space; only cells of `material` inside are touched. */
  box: Box | readonly Box[];
  material: Material;
  /** Sleeves: the viewer's left arm is the lit one. */
  side?: 'L' | 'R';
  except?: readonly Box[];
  /** Torso: buttons down the middle (white cells) or nothing. */
  placket?: 'buttons' | 'none';
  /** Sleeve: dark band on the last row. */
  cuff?: boolean;
  /** Torso: two breast-pocket dashes. */
  pockets?: boolean;
}

const SHADOW = 0;
const MID = 1;
const LIGHT = 2;
const DEEP = 3;
const BRIGHT = 4;
const WHITE = packCell(LEGEND.x!);

interface Cell {
  x: number;
  y: number;
  shade: number;
}

/** Reshades the garment's cells in place; `dx`/`dy` move figure space onto the (possibly grown) canvas. */
export function tailor(out: Sprite, g: Garment, dx = 0, dy = 0): void {
  const mat = MATERIALS.indexOf(g.material);
  // A Box is itself an array: a list of boxes is an array whose first element is an array.
  const boxes = (Array.isArray(g.box[0]) ? g.box : [g.box]) as readonly Box[];
  const inBox = (x: number, y: number, [x0, y0, x1, y1]: Box) =>
    x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const cells: Cell[] = [];
  const index = new Map<string, number>();
  for (const b of boxes)
    for (let y = b[1]; y <= b[3]; y++)
      for (let x = b[0]; x <= b[2]; x++) {
        if (g.except?.some((e) => inBox(x, y, e))) continue;
        const X = x + dx;
        const Y = y + dy;
        if (X < 0 || Y < 0 || X >= out.w || Y >= out.h) continue;
        const v = out.cells[Y * out.w + X]!;
        if (v === EMPTY || Math.floor(v / 8) !== mat) continue;
        if (index.has(`${x},${y}`)) continue;
        index.set(`${x},${y}`, cells.length);
        cells.push({ x, y, shade: v % 8 });
      }
  if (!cells.length) return;
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const has = (x: number, y: number) => index.has(`${x},${y}`);
  const set = (x: number, y: number, shade: number) => {
    const i = index.get(`${x},${y}`);
    if (i !== undefined) cells[i]!.shade = shade;
  };
  const setCell = (x: number, y: number, v: number) => {
    if (!has(x, y)) return;
    out.cells[(y + dy) * out.w + x + dx] = v;
    index.delete(`${x},${y}`);
  };
  // Row extents of the garment (its own silhouette, lines excluded).
  const rowMin = new Map<number, number>();
  const rowMax = new Map<number, number>();
  for (const c of cells) {
    rowMin.set(c.y, Math.min(rowMin.get(c.y) ?? Infinity, c.x));
    rowMax.set(c.y, Math.max(rowMax.get(c.y) ?? -Infinity, c.x));
  }

  // 1. Cloth is mostly mid: drop the skin highlights; keep the body's own contact shadows.
  for (const c of cells) if (c.shade !== SHADOW) c.shade = MID;

  if (g.kind === 'torso') {
    // The shadow is a shape, not a column: narrow on the chest, wider over the ribs and the belly
    // (the terminator steps left as the torso turns away), then the two hem rows.
    const cut = (y: number) =>
      y < y0 + 2
        ? x1
        : y <= y0 + 5
          ? x0 + Math.round(w * 0.75)
          : y <= y0 + 8
            ? x0 + Math.round(w * 0.64)
            : x0 + Math.round(w * 0.55);
    for (const c of cells) {
      if (c.x >= cut(c.y)) c.shade = SHADOW;
      if (c.y >= y1 - 1 && c.x >= x0 + Math.round(w * 0.4)) c.shade = SHADOW;
    }
    // Light on the upper-left chest and shoulder, a bright rim on top of it.
    for (let y = y0 + 2; y <= y0 + 4; y++) for (let x = x0; x <= x0 + 2; x++) set(x, y, LIGHT);
    set(x0 + 1, y0 + 1, BRIGHT);
    set(x0 + 2, y0 + 1, BRIGHT);
    // Deep shadow under the far arm and in the hem corner.
    for (let y = y0 + 4; y <= y0 + 5; y++) set(rowMax.get(y) ?? x1, y, DEEP);
    set(x1, y1 - 1, DEEP);
    set(x1 - 1, y1, DEEP);
    // Creases: under the chest on the lit side, a short diagonal at the waist, one fold on the shadow side.
    set(x0 + 2, y0 + 6, SHADOW);
    set(x0 + 3, y0 + 6, SHADOW);
    set(x0 + 1, y1 - 3, SHADOW);
    set(x0 + 2, y1 - 3, SHADOW);
    set(x0 + 3, y1 - 4, SHADOW);
    set(x1 - 3, y0 + 8, DEEP);
    set(x1 - 2, y0 + 8, DEEP);
    if (g.pockets) {
      const py = y0 + 6;
      set(x0 + 1, py, DEEP);
      set(x0 + 2, py, DEEP);
      set(x1 - 2, py, DEEP);
      set(x1 - 1, py, DEEP);
    }
    if (g.placket === 'buttons') {
      const cx = x0 + Math.floor(w / 2);
      for (let y = y0 + 4; y <= y1 - 2; y += 3) setCell(cx, y, WHITE);
    }
  } else if (g.kind === 'sleeve') {
    const lit = (g.side ?? 'L') === 'L';
    for (const c of cells) {
      const outer = lit ? rowMin.get(c.y) : rowMax.get(c.y);
      const inner = lit ? rowMax.get(c.y) : rowMin.get(c.y);
      if (!lit) {
        // The far arm turns away from the light: the whole sleeve in shadow, a mid rim on its top row.
        c.shade = c.y <= y0 + 1 && c.x !== outer ? MID : SHADOW;
      } else {
        if (c.x === outer && c.y <= y0 + 1) c.shade = LIGHT; // top of the lit upper arm
        if (c.x === inner && c.y >= y0 + 2 && c.y <= y0 + 3) c.shade = SHADOW; // contact shadow against the torso
      }
      if (g.cuff && c.y === y1) c.shade = DEEP;
    }
    if (lit) set(rowMin.get(y0) ?? x0, y0, BRIGHT);
  } else if (g.kind === 'pants') {
    const mid = x0 + (w - 1) / 2;
    const knee = y0 + Math.round(h * 0.55);
    for (const c of cells) {
      const leftLeg = c.x < mid;
      const outer = leftLeg ? rowMin.get(c.y) : rowMax.get(c.y);
      // The far (right) leg turns away: its outer two columns in shadow; both legs get a knee band.
      if (!leftLeg && outer !== undefined && c.x >= outer - 1) c.shade = SHADOW;
      if (c.y === knee && c.x !== (rowMin.get(c.y) ?? x0)) c.shade = SHADOW;
      if (c.y === y1 && !leftLeg) c.shade = DEEP;
    }
    // Light on the top of the near thigh.
    for (let y = y0 + 1; y <= y0 + 2; y++) {
      const lx = rowMin.get(y);
      if (lx !== undefined) {
        set(lx, y, LIGHT);
        set(lx + 1, y, LIGHT);
      }
    }
  } else if (g.kind === 'boots') {
    for (const c of cells) {
      if (c.y === y1) c.shade = DEEP; // sole
      if (c.y === y0 && c.x <= (rowMin.get(c.y) ?? x0) + 2) c.shade = LIGHT; // toe cap
    }
  }
  for (const [key, i] of index) {
    const c = cells[i]!;
    void key;
    out.cells[(c.y + dy) * out.w + c.x + dx] = mat * 8 + c.shade;
  }
}
