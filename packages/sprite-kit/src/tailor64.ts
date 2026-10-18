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

export type GarmentKind = 'torso' | 'sleeve' | 'pants' | 'boots' | 'hair';

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
  /** Sleeve: columns let out past the arm's outline (a coat sleeve); the outline moves outward with it. */
  letOut?: number;
  /** Torso: two breast-pocket dashes. */
  pockets?: boolean;
  /** Coordinate space of the boxes (default figure; 'head' for a buzz cut's skull box). */
  space?: 'figure' | 'head';
}

const LINE = packCell(LEGEND.o!);
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

/**
 * Reshades the garment's cells in place. `map` takes a box coordinate (figure or head space) to the canvas;
 * the shading geometry runs in box space, so a sheared head still gets straight locks.
 */
export function tailor(
  out: Sprite,
  g: Garment,
  map: (x: number, y: number) => readonly [number, number] = (x, y) => [x, y],
): void {
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
        const [X, Y] = map(x, y);
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
    const [X, Y] = map(x, y);
    out.cells[Y * out.w + X] = v;
    index.delete(`${x},${y}`);
  };
  // Row extents of the garment (its own silhouette, lines excluded).
  const rowMin = new Map<number, number>();
  const rowMax = new Map<number, number>();
  for (const c of cells) {
    rowMin.set(c.y, Math.min(rowMin.get(c.y) ?? Infinity, c.x));
    rowMax.set(c.y, Math.max(rowMax.get(c.y) ?? -Infinity, c.x));
  }

  // 1. Cloth is mostly mid: drop the skin highlights; keep the body's own contact shadows (shadow cells that
  // touch something outside the garment: a line, the neck, an arm), not its interior shadow masses (the side
  // view's whole back half), which the garment's own terminator redraws below.
  for (const c of cells) {
    const contact =
      c.shade === SHADOW &&
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([ax, ay]) => !has(c.x + ax!, c.y + ay!));
    if (!contact) c.shade = MID;
  }

  if (g.kind === 'hair') {
    // A buzz cut: the skull remapped to hair, then combed like every other hairstyle (scripts/research/
    // lock_paint.py, same numbers): locks three cells wide radiating from the parting with a 0.5 cell/row
    // sweep, two body columns and an upper-left edge, read along their length: a light crown, a light edge
    // over a mid body, lower down a light edge over a shadow body, on a tall mass a mid edge over a deep
    // body, and a bottom row of mid edge, shadow body and one deep cell; each pair one tone darker on the shadow side of the sphere; two bright
    // cells left of the parting.
    const top = y0;
    const topRow = cells.filter((c) => c.y === top + 1);
    const cx =
      topRow.length > 0
        ? (Math.min(...topRow.map((c) => c.x)) + Math.max(...topRow.map((c) => c.x))) / 2
        : x0 + (w - 1) / 2;
    const R = Math.max(1, ...cells.map((c) => Math.abs(c.x - cx)));
    const W = 3;
    const SEG_LIT: [number, number][] = [
      [LIGHT, MID],
      [LIGHT, SHADOW],
      [MID, DEEP],
    ];
    const SEG_SHADOW: [number, number][] = [
      [MID, SHADOW],
      [MID, DEEP],
      [DEEP, SHADOW],
    ];
    const seg = (t: number) => (t >= 9 ? 2 : t >= 5 ? 1 : 0);
    for (const c of cells) {
      const t = c.y - top;
      const u = Math.floor((c.x < cx ? cx - c.x - 0.5 : c.x - cx) + 0.5 * t);
      // p counts from the parting outward; the upper-left edge is the outer column on the left side and
      // the inner one on the right side
      const p = c.x < cx ? u % W : W - 1 - (u % W);
      const edge = p === W - 1;
      const lit = (c.x - cx) / R + (0.5 * t) / h <= 0.6;
      // The bottom row sits on the brow line: a mid edge, a shadow body and one deep cell where the locks
      // meet, never a deep row that merges with the outline.
      if (t === h - 1 && t >= 2) c.shade = edge ? MID : p === 1 ? SHADOW : DEEP;
      else if (t < 2) c.shade = lit ? (p === 0 ? MID : LIGHT) : p === 0 ? SHADOW : MID;
      else {
        const [e, b] = (lit ? SEG_LIT : SEG_SHADOW)[seg(t)]!;
        c.shade = edge ? e : b;
      }
      // A cell against the outline is never a dark stripe hugging it (dark hair: shadow and deep next to the
      // line read as a thick or broken outline).
      if (c.x === rowMin.get(c.y) || c.x === rowMax.get(c.y)) {
        if (lit && (c.shade === SHADOW || c.shade === DEEP)) c.shade = MID;
        else if (!lit && c.shade === DEEP) c.shade = SHADOW;
      }
    }
    for (const x of [Math.floor(cx) - 2, Math.floor(cx) - 1]) set(x, top + 1, BRIGHT);
  } else if (g.kind === 'torso') {
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
    // Creases that cross the whole lit side (under the chest, at the waist): a fold line is what breaks a
    // shirt front into the patches of the reference (no same-tone patch wider than ~20 cells), so each runs
    // from the lit edge to the terminator, catching light on its first cell and continuing deeper into the
    // shadow mass. One fold on the shadow side, and the far edge of the shadow mass turns deeper.
    // A crease catches light on its first two cells (one cell alone reads as a stray dot), then shadows.
    const crease = (y: number) => {
      const c = cut(y);
      const lit = rowMin.get(y) ?? x0;
      for (let x = x0; x < c; x++) set(x, y, x <= lit + 1 ? LIGHT : SHADOW);
      for (let x = c + 1; x < x1; x++) set(x, y, DEEP);
    };
    crease(y0 + 6);
    crease(y0 + Math.round(h * 0.68));
    set(x1 - 3, y0 + 8, DEEP);
    set(x1 - 2, y0 + 8, DEEP);
    const farEdge = x0 + Math.round(w * 0.85);
    for (const c of cells)
      if (
        c.x >= farEdge + (Math.floor((c.y - y0) / 2) % 2) && // steps every two rows: no lone deep cell
        c.y >= y0 + 3 &&
        c.y <= y1 - 2 &&
        (c.y - y0) % 4 !== 3 && // a shadow cell every fourth row keeps the band from forming one long patch
        c.shade === SHADOW
      )
        c.shade = DEEP;
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
    // A long sleeve folds at the elbow: a crease across the lit sleeve, a deeper one across the far sleeve.
    if (g.cuff && h >= 6) {
      const ey = y0 + Math.round(h * 0.55);
      for (const c of cells)
        if (c.y === ey && c.x !== (lit ? rowMin.get(ey) : rowMax.get(ey)))
          c.shade = lit ? SHADOW : DEEP;
    }
    // A coat sleeve let out past the arm: row by row the arm's outline moves outward by one column and the
    // freed column takes the outer cell's tone; the new column is closed above and below where nothing is
    // drawn (the shoulder step, a hand narrower than the sleeve). Only where the outline faces empty canvas,
    // so an arm hanging across the torso in a side view stays as drawn.
    for (let n = 0; n < (g.letOut ?? 0); n++) {
      const step = lit ? -1 : 1;
      const read = (x: number, y: number) => {
        const [X, Y] = map(x, y);
        return X < 0 || Y < 0 || X >= out.w || Y >= out.h ? undefined : out.cells[Y * out.w + X]!;
      };
      const write = (x: number, y: number, v: number) => {
        const [X, Y] = map(x, y);
        if (X >= 0 && Y >= 0 && X < out.w && Y < out.h) out.cells[Y * out.w + X] = v;
      };
      const isLine = (x: number, y: number) => read(x, y) === LINE;
      // Would a line at (x, y) complete a 2x2 block of line cells (a doubled outline)?
      const doubles = (x: number, y: number) =>
        [-1, 0].some((ax) =>
          [-1, 0].some((ay) =>
            [
              [x + ax, y + ay],
              [x + ax + 1, y + ay],
              [x + ax, y + ay + 1],
              [x + ax + 1, y + ay + 1],
            ].every(([X, Y]) => (X === x && Y === y) || isLine(X!, Y!)),
          ),
        );
      for (let y = y0; y <= y1; y++) {
        const outer = lit ? rowMin.get(y) : rowMax.get(y);
        if (outer === undefined) continue;
        const n1 = outer + step * (n + 1);
        const n2 = outer + step * (n + 2);
        if (read(n1, y) !== LINE || read(n2, y) !== EMPTY) continue;
        const closeTop = read(n1, y - 1) === EMPTY;
        const closeBottom = read(n1, y + 1) === EMPTY;
        // The first row keeps the arm's own outline when nothing is drawn above the freed column: closing it
        // there would put a one-row step on the shoulder slope (a 1-2-1 stair). A closing line that would
        // double an existing outline (the collar meeting the shoulder) also leaves the row as drawn.
        if (closeTop && (y === y0 || doubles(n1, y - 1))) continue;
        if (closeBottom && doubles(n1, y + 1)) continue;
        const shade = cells[index.get(`${outer},${y}`)!]!.shade;
        write(n1, y, mat * 8 + shade);
        write(n2, y, LINE);
        if (closeTop) write(n1, y - 1, LINE);
        if (closeBottom) write(n1, y + 1, LINE);
      }
    }
  } else if (g.kind === 'pants') {
    // Two legs, each read as a cylinder: the near (left) leg lit on top of the thigh with a contact shadow
    // down its inner side, the far (right) leg turned away with its outer column in shadow; a crease across
    // each thigh, a deep knee band, a deep hem over the shoe. Every patch stays under ~10 cells.
    const mid = x0 + (w - 1) / 2;
    const knee = y0 + Math.round(h * 0.55);
    const thigh = y0 + 2;
    const legMin = new Map<string, number>();
    const legMax = new Map<string, number>();
    for (const c of cells) {
      const k = `${c.x < mid ? 'L' : 'R'}${c.y}`;
      legMin.set(k, Math.min(legMin.get(k) ?? Infinity, c.x));
      legMax.set(k, Math.max(legMax.get(k) ?? -Infinity, c.x));
    }
    for (const c of cells) {
      const leftLeg = c.x < mid;
      const k = `${leftLeg ? 'L' : 'R'}${c.y}`;
      const lo = legMin.get(k)!;
      const hi = legMax.get(k)!;
      const outer = leftLeg ? lo : hi;
      const inner = leftLeg ? hi : lo;
      const legW = hi - lo + 1;
      const short = h <= 6; // shorts: no room for a thigh crease above the knee band
      if (leftLeg) {
        if (legW >= 3 && c.x === inner && c.y > y0 && c.y < y1) c.shade = SHADOW;
        if (c.y === knee && c.x !== outer) c.shade = SHADOW;
        if (!short && c.y === thigh && c.x !== outer && c.x !== inner) c.shade = SHADOW;
      } else {
        if (c.x === outer) c.shade = SHADOW;
        if (legW >= 3 && c.x === outer - 1 && c.y > knee && c.y < y1) c.shade = SHADOW;
        if ((c.y === knee || (!short && c.y === thigh)) && c.x !== outer) c.shade = DEEP;
      }
      if (c.y === y1) c.shade = !leftLeg && c.x === outer ? SHADOW : DEEP; // hem; the far leg's outer cell stays shadow
      if (c.y === y0 && h >= 8) c.shade = DEEP; // waistband under the hem seam (long trousers only)
    }
    // Light on the top of the near thigh.
    for (let y = y0 + (h >= 8 ? 1 : 0); y <= y0 + (h >= 8 ? 2 : 1); y++) {
      const lx = legMin.get(`L${y}`);
      if (lx !== undefined) {
        set(lx, y, LIGHT);
        set(lx + 1, y, LIGHT);
      }
    }
  } else if (g.kind === 'boots') {
    for (const c of cells) {
      if (c.y === y1)
        c.shade = c.x === rowMin.get(c.y) ? SHADOW : DEEP; // sole, its toe end a step lighter
      else if (c.x >= (rowMax.get(c.y) ?? x1) - 1 && h >= 3) c.shade = SHADOW; // heel turns away
      if (c.y === y0 && c.x <= (rowMin.get(c.y) ?? x0) + 2) c.shade = LIGHT; // toe cap
    }
  }
  for (const [key, i] of index) {
    const c = cells[i]!;
    void key;
    const [X, Y] = map(c.x, c.y);
    out.cells[Y * out.w + X] = mat * 8 + c.shade;
  }
}
