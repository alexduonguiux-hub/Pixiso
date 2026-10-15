import { EMPTY, type Sprite } from './format.js';

export interface Layer {
  id: string;
  sprite: Sprite;
  /** Top-left position of the sprite on the canvas. */
  x: number;
  y: number;
  /** Higher draws on top. */
  z: number;
}

/** Composites layers by z order; later/higher layers overwrite earlier ones where they are opaque. */
export function compose(layers: Layer[], w: number, h: number): Sprite {
  const out = new Int16Array(w * h).fill(EMPTY);
  const sorted = [...layers].sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));
  for (const layer of sorted) {
    const s = layer.sprite;
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
  return { w, h, cells: out };
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
