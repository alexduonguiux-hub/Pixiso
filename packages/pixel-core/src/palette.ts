import { hexToRgb8, oklabToSrgb8, srgb8ToOklab, type Lab, type Rgb8 } from './oklab.js';
import { colorHistogram, rgbKey } from './stats.js';
import type { RGBAImage } from './types.js';

export type PaletteSpec = { mode: 'auto'; colors: number } | { mode: 'fixed'; hex: string[] };

interface Entry {
  key: number;
  lab: Lab;
  /** weight used for splitting (may be flattened) */
  count: number;
  /** real pixel count */
  raw: number;
}

interface Box {
  entries: Entry[];
  min: Lab;
  max: Lab;
}

function boxOf(entries: Entry[]): Box {
  const min: Lab = [Infinity, Infinity, Infinity];
  const max: Lab = [-Infinity, -Infinity, -Infinity];
  for (const e of entries) {
    for (let i = 0; i < 3; i++) {
      if (e.lab[i]! < min[i]!) min[i] = e.lab[i]!;
      if (e.lab[i]! > max[i]!) max[i] = e.lab[i]!;
    }
  }
  return { entries, min, max };
}

/** Relative importance of L, a, b when deciding which box/axis to split. */
export type AxisWeights = [number, number, number];

function widestAxis(b: Box, w: AxisWeights = [1, 1, 1]): { axis: number; range: number } {
  let axis = 0;
  let range = -1;
  for (let i = 0; i < 3; i++) {
    const r = (b.max[i]! - b.min[i]!) * w[i]!;
    if (r > range) {
      range = r;
      axis = i;
    }
  }
  return { axis, range };
}

const sortLab = (a: Lab, b: Lab): number => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/**
 * Median-cut in OKLab over the fully opaque pixels of all images at once, so a
 * character's frames share one palette (HANDOFF §6.5). Deterministic: entries
 * are sorted by colour key, boxes split at the weighted median, ties resolved
 * by index. Returns at most `maxColors` colours sorted by (L, a, b).
 */
export type PaletteRepresentative = 'mean' | 'mode';

export function buildPaletteMedianCut(
  images: RGBAImage[],
  maxColors: number,
  weightPower = 1,
  representative: PaletteRepresentative = 'mean',
  axisWeights: AxisWeights = [1, 1, 1],
): Rgb8[] {
  const hist = colorHistogram(images);
  const entries: Entry[] = [...hist.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, count]) => ({
      key,
      raw: count,
      // weightPower < 1 flattens the population so small but distinct materials keep a box
      count:
        weightPower === 1 ? count : Math.max(1, Math.round(Math.pow(count, weightPower) * 1000)),
      lab: srgb8ToOklab((key >> 16) & 255, (key >> 8) & 255, key & 255),
    }));
  if (entries.length === 0) return [];
  if (entries.length <= maxColors) {
    return entries
      .map((e) => [(e.key >> 16) & 255, (e.key >> 8) & 255, e.key & 255] as Rgb8)
      .sort((a, b) => sortLab(srgb8ToOklab(...a), srgb8ToOklab(...b)));
  }

  const boxes: Box[] = [boxOf(entries)];
  while (boxes.length < maxColors) {
    let best = -1;
    let bestRange = 0;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i]!;
      if (b.entries.length < 2) continue;
      const { range } = widestAxis(b, axisWeights);
      if (range > bestRange) {
        bestRange = range;
        best = i;
      }
    }
    if (best < 0) break;
    const box = boxes[best]!;
    const { axis } = widestAxis(box, axisWeights);
    const sorted = [...box.entries].sort((a, b) => a.lab[axis]! - b.lab[axis]! || a.key - b.key);
    const total = sorted.reduce((s, e) => s + e.count, 0);
    let acc = 0;
    let cut = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      acc += sorted[i]!.count;
      cut = i + 1;
      if (acc * 2 >= total) break;
    }
    boxes.splice(best, 1, boxOf(sorted.slice(0, cut)), boxOf(sorted.slice(cut)));
  }

  const out = new Map<number, Rgb8>();
  for (const b of boxes) {
    if (representative === 'mode') {
      // the material's actual colour: the most common texel in the box (ties: lowest key)
      let best = b.entries[0]!;
      for (const e of b.entries)
        if (e.raw > best.raw || (e.raw === best.raw && e.key < best.key)) best = e;
      out.set(best.key, [(best.key >> 16) & 255, (best.key >> 8) & 255, best.key & 255]);
      continue;
    }
    let L = 0,
      a = 0,
      bb = 0,
      n = 0;
    for (const e of b.entries) {
      L += e.lab[0] * e.count;
      a += e.lab[1] * e.count;
      bb += e.lab[2] * e.count;
      n += e.count;
    }
    const rgb = oklabToSrgb8(L / n, a / n, bb / n);
    out.set(rgbKey(...rgb), rgb);
  }
  return [...out.values()].sort((x, y) => sortLab(srgb8ToOklab(...x), srgb8ToOklab(...y)));
}

export function paletteFromHex(hex: string[]): Rgb8[] {
  const out = new Map<number, Rgb8>();
  for (const h of hex) {
    const rgb = hexToRgb8(h);
    out.set(rgbKey(...rgb), rgb);
  }
  return [...out.values()];
}

export function buildPalette(images: RGBAImage[], spec: PaletteSpec): Rgb8[] {
  return spec.mode === 'fixed'
    ? paletteFromHex(spec.hex)
    : buildPaletteMedianCut(images, spec.colors);
}

/** Nearest palette index in OKLab, memoised per input colour. */
export function createPaletteMapper(
  palette: Rgb8[],
  weights: AxisWeights = [1, 1, 1],
): (r: number, g: number, b: number) => number {
  const labs = palette.map((c) => srgb8ToOklab(...c));
  const [wL, wa, wb] = weights;
  const cache = new Map<number, number>();
  return (r, g, b) => {
    const key = rgbKey(r, g, b);
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const lab = srgb8ToOklab(r, g, b);
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < labs.length; i++) {
      const p = labs[i]!;
      const dL = (lab[0] - p[0]) * wL;
      const da = (lab[1] - p[1]) * wa;
      const db = (lab[2] - p[2]) * wb;
      const d = dL * dL + da * da + db * db;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    cache.set(key, best);
    return best;
  };
}

/** Replaces every opaque pixel with its nearest palette colour. Mutates and returns `img`. */
export function mapToPalette(img: RGBAImage, palette: Rgb8[]): RGBAImage {
  if (palette.length === 0) return img;
  const nearest = createPaletteMapper(palette);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] !== 255) continue;
    const c = palette[nearest(d[i]!, d[i + 1]!, d[i + 2]!)]!;
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
  }
  return img;
}

export function darkestIndex(palette: Rgb8[]): number {
  let best = 0;
  let bestL = Infinity;
  palette.forEach((c, i) => {
    const L = srgb8ToOklab(...c)[0];
    if (L < bestL) {
      bestL = L;
      best = i;
    }
  });
  return best;
}
