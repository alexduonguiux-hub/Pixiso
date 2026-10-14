import { srgb8ToOklab } from './oklab.js';
import { rgbKey } from './stats.js';
import type { RGBAImage } from './types.js';

export interface ClusterCleanupOptions {
  /** Components smaller than this (in pixels) are merged into their surroundings. */
  minSize: number;
  /** Keep a small component anyway when its lightness differs from the replacement by more than this (eyes, buckles). */
  contrastKeep: number;
  /** 1 = never touch (outline pixels). */
  protect?: Uint8Array;
  /** Extra passes, since merging can create new small clusters. */
  passes?: number;
}

const N4 = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const;

interface Component {
  id: number;
  key: number;
  members: number[];
}

/**
 * Cluster cleanup (PIXEL_RULES §2): pixel art is made of deliberate clusters,
 * not scattered specks. Every 4-connected run of one colour smaller than
 * `minSize` is merged into the neighbouring component it touches most, provided
 * that neighbour is bigger (or equal in size with a lower colour key, so two
 * specks never swap colours), unless the replacement differs strongly in
 * lightness (a deliberate detail). Isolated specks with no opaque neighbour are
 * erased. Each pass works on a snapshot. Returns the number of pixels changed.
 */
export function cleanupClusters(img: RGBAImage, opts: ClusterCleanupOptions): number {
  const { width, height, data } = img;
  const passes = Math.max(1, opts.passes ?? 2);
  const lightness = new Map<number, number>();
  const L = (key: number) => {
    let v = lightness.get(key);
    if (v === undefined) {
      v = srgb8ToOklab((key >> 16) & 255, (key >> 8) & 255, key & 255)[0];
      lightness.set(key, v);
    }
    return v;
  };
  let total = 0;

  for (let pass = 0; pass < passes; pass++) {
    const src = new Uint8ClampedArray(data);
    const keyAt = (p: number) =>
      src[p * 4 + 3] === 255 ? rgbKey(src[p * 4]!, src[p * 4 + 1]!, src[p * 4 + 2]!) : -1;
    const label = new Int32Array(width * height).fill(-1);
    const components: Component[] = [];
    const stack: number[] = [];

    // 1. label every unprotected opaque component
    for (let start = 0; start < width * height; start++) {
      if (label[start] !== -1 || opts.protect?.[start]) continue;
      const key = keyAt(start);
      if (key < 0) continue;
      const comp: Component = { id: components.length, key, members: [] };
      components.push(comp);
      stack.length = 0;
      stack.push(start);
      label[start] = comp.id;
      while (stack.length) {
        const p = stack.pop()!;
        comp.members.push(p);
        const x = p % width;
        const y = (p - x) / width;
        for (const [dx, dy] of N4) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (label[q] !== -1 || opts.protect?.[q] || keyAt(q) !== key) continue;
          label[q] = comp.id;
          stack.push(q);
        }
      }
    }

    // 2. merge small components
    let changed = 0;
    for (const comp of components) {
      const size = comp.members.length;
      if (size >= opts.minSize) continue;
      const contact = new Map<number, number>(); // neighbour component id -> shared border length
      let opaqueNeighbours = 0;
      for (const p of comp.members) {
        const x = p % width;
        const y = (p - x) / width;
        for (const [dx, dy] of N4) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (keyAt(q) < 0) continue;
          opaqueNeighbours++;
          const other = label[q]!;
          if (other < 0 || other === comp.id) continue; // protected or self
          contact.set(other, (contact.get(other) ?? 0) + 1);
        }
      }
      if (opaqueNeighbours === 0) {
        for (const p of comp.members)
          data[p * 4] = data[p * 4 + 1] = data[p * 4 + 2] = data[p * 4 + 3] = 0;
        changed += size;
        continue;
      }
      let target: Component | null = null;
      let targetContact = 0;
      for (const [id, n] of contact) {
        const other = components[id]!;
        const otherSize = other.members.length;
        const eligible = otherSize > size || (otherSize === size && other.key < comp.key);
        if (!eligible) continue;
        const better =
          n > targetContact ||
          (n === targetContact &&
            target !== null &&
            (otherSize > target.members.length ||
              (otherSize === target.members.length && other.key < target.key)));
        if (target === null || better) {
          target = other;
          targetContact = n;
        }
      }
      if (!target) continue;
      if (Math.abs(L(target.key) - L(comp.key)) > opts.contrastKeep) continue; // deliberate detail
      const k = target.key;
      for (const p of comp.members) {
        data[p * 4] = (k >> 16) & 255;
        data[p * 4 + 1] = (k >> 8) & 255;
        data[p * 4 + 2] = k & 255;
      }
      changed += size;
    }
    total += changed;
    if (changed === 0) break;
  }
  return total;
}
