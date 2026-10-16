import { EMPTY, LEGEND, packCell, type Sprite } from './format.js';

export interface Layer {
  id: string;
  sprite: Sprite;
  /** Top-left position of the sprite on the canvas. */
  x: number;
  y: number;
  /** Higher draws on top. */
  z: number;
  /**
   * Selective inner outline: where this layer covers something drawn below it,
   * the covered cells just outside its silhouette become line cells, so an arm
   * over a torso or a helmet over a face reads as a separate form. Off by default
   * (hand-typed templates carry their own lines); shape-built bodies turn it on.
   */
  edge?: boolean;
}

export interface ComposeOptions {
  /** Add the closed 1-px outline around the whole silhouette (shape-built bodies). */
  outline?: boolean;
}

const LINE = packCell(LEGEND.o!);
const N4 = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const;

/**
 * Composites layers by z order; higher layers overwrite lower ones where
 * opaque. Layers with `edge` cut a 1-px line into whatever they cover; with
 * `outline` the finished silhouette gets a closed outer line.
 */
export function compose(layers: Layer[], w: number, h: number, o: ComposeOptions = {}): Sprite {
  const out = new Int16Array(w * h).fill(EMPTY);
  const sorted = [...layers].sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));
  for (const layer of sorted) {
    const s = layer.sprite;
    const covers = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < s.w && y < s.h && s.cells[y * s.w + x]! >= 0;
    if (layer.edge) {
      // Where the layer overlaps something already drawn, the covered cells just
      // outside the overlap become line: forms touching side by side stay clean.
      const overlaps = (x: number, y: number) => {
        if (!covers(x, y)) return false;
        const tx = layer.x + x;
        const ty = layer.y + y;
        return tx >= 0 && ty >= 0 && tx < w && ty < h && out[ty * w + tx]! >= 0;
      };
      for (let y = -1; y <= s.h; y++) {
        for (let x = -1; x <= s.w; x++) {
          if (covers(x, y)) continue;
          if (!N4.some(([dx, dy]) => overlaps(x + dx, y + dy))) continue;
          const tx = layer.x + x;
          const ty = layer.y + y;
          if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
          if (out[ty * w + tx]! >= 0) out[ty * w + tx] = LINE;
        }
      }
    }
    for (let y = 0; y < s.h; y++) {
      const ty = layer.y + y;
      if (ty < 0 || ty >= h) continue;
      for (let x = 0; x < s.w; x++) {
        const v = s.cells[y * s.w + x]!;
        if (v < 0) continue;
        const tx = layer.x + x;
        if (tx < 0 || tx >= w) continue;
        out[ty * w + tx] = v;
      }
    }
  }
  const composed = { w, h, cells: out };
  return o.outline ? outline(composed, LINE) : composed;
}

/** Adds a 1-px line around every opaque region that is not already a line cell (outside only). */
export function outline(s: Sprite, lineValue: number): Sprite {
  const out = Int16Array.from(s.cells);
  const N4 = [
    [0, -1],
    [-1, 0],
    [1, 0],
    [0, 1],
  ] as const;
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      if (s.cells[y * s.w + x]! >= 0) continue;
      let touch = false;
      for (const [dx, dy] of N4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h) continue;
        if (s.cells[ny * s.w + nx]! >= 0) {
          touch = true;
          break;
        }
      }
      if (touch) out[y * s.w + x] = lineValue;
    }
  }
  return { w: s.w, h: s.h, cells: out };
}
