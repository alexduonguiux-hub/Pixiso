import { srgb8ToOklab, type Lab, type Rgb8 } from './oklab.js';
import type { OutlineMode } from './outline.js';
import { buildPaletteMedianCut, createPaletteMapper, type AxisWeights } from './palette.js';
import { buildLineColor, buildRamp, DEFAULT_RAMP_OPTIONS, type RampOptions } from './ramps.js';
import { rgbKey } from './stats.js';
import { createImage, type RGBAImage } from './types.js';

/** Structured palette: one hue-shifted ramp per base colour plus a line colour. */
export interface RampPalette {
  bases: Rgb8[];
  basesLab: Lab[];
  /** ramps[baseIndex][band], darkest first; always 3 entries (missing shades repeat the mid). */
  ramps: Rgb8[][];
  line: Rgb8;
  /** Every distinct colour (ramps + line). */
  colors: Rgb8[];
  steps: number;
}

/**
 * Number of base materials for a palette budget: about half the budget, so the
 * large materials can afford 3 shades while small accents keep a single colour.
 */
export function baseCountFor(maxColors: number): number {
  return Math.max(2, Math.floor((maxColors - 1) * 0.55));
}

/**
 * Materials are told apart by hue and chroma; lightness differences inside one
 * material (the atlas gradient strips, the lighting) are what the ramp is for.
 * Used both to split the median-cut boxes and to assign texels to bases, so a
 * gradient strip never straddles two materials.
 */
export const BASE_AXIS_WEIGHTS: AxisWeights = [0.5, 2, 2];

/**
 * Spends the palette budget the way a pixel artist does (PIXEL_RULES §3): every
 * material gets its mid colour; full ramps go to the largest forms first, then
 * shadow shades; accents below `minFormShare` of the area stay flat.
 */
export function allocateShades(
  shares: number[],
  maxColors: number,
  steps: number,
  minFormShare = 0.03,
): number[] {
  const k = shares.length;
  const counts = new Array<number>(k).fill(1);
  let budget = Math.max(0, maxColors - 1 - k); // one colour reserved for the line
  const total = shares.reduce((a, b) => a + b, 0) || 1;
  const forms = shares
    .map((share, i) => ({ share: share / total, i }))
    .filter((f) => f.share >= minFormShare)
    .sort((a, b) => b.share - a.share || a.i - b.i);
  const extra = steps - 1;
  for (const { i } of forms) {
    if (budget < extra) break;
    counts[i] = steps;
    budget -= extra;
  }
  for (const { i } of forms) {
    if (budget <= 0) break;
    if (counts[i]! < 2) {
      counts[i] = 2;
      budget--;
    }
  }
  return counts;
}

/**
 * Builds the ramp palette from the albedo (unlit colour) of every frame at once.
 */
export function buildRampPalette(
  albedoFrames: RGBAImage[],
  maxColors: number,
  ramp: RampOptions = DEFAULT_RAMP_OPTIONS,
): RampPalette {
  const k = baseCountFor(maxColors);
  const bases = buildPaletteMedianCut(albedoFrames, k, 0.6, 'mode', BASE_AXIS_WEIGHTS);
  const basesLab = bases.map((c) => srgb8ToOklab(...c));
  const nearest = createPaletteMapper(bases, BASE_AXIS_WEIGHTS);
  const shares = new Array<number>(bases.length).fill(0);
  for (const img of albedoFrames) {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] !== 255) continue;
      shares[nearest(d[i]!, d[i + 1]!, d[i + 2]!)]!++;
    }
  }
  const shades = allocateShades(shares, maxColors, ramp.steps);
  const ramps = basesLab.map((lab, i) => {
    const full = buildRamp(lab, ramp);
    const mid = full[1]!;
    const n = shades[i]!;
    return [n >= 2 ? full[0]! : mid, mid, n >= 3 && full.length > 2 ? full[2]! : mid];
  });
  const line = buildLineColor(
    ramps.map((r) => srgb8ToOklab(...r[0]!)),
    ramp,
  );
  const seen = new Map<number, Rgb8>();
  for (const r of ramps) for (const c of r) seen.set(rgbKey(...c), c);
  seen.set(rgbKey(...line), line);
  return { bases, basesLab, ramps, line, colors: [...seen.values()], steps: 3 };
}

/** Light band index from the (linear) light-pass byte: nearest of the band values. */
export function classifyBand(lightByte: number, bandValues: number[], steps = 3): number {
  const v = lightByte / 255;
  let best = 0;
  let bestD = Infinity;
  bandValues.forEach((b, i) => {
    const d = Math.abs(b - v);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return Math.min(best, steps - 1);
}

/** Depth encoded by the depth pass as 16 bits across R (high) and G (low), 0..1 across near..far. */
export function decodeDepth(r: number, g: number): number {
  return (r + g / 255) / 255;
}

export interface ComposeResult {
  image: RGBAImage;
  /** base*steps + band per pixel, -1 where transparent. */
  index: Int16Array;
  /** Nearest depth (0..1, near..far) per pixel, or NaN; only when a depth pass was given. */
  depth: Float32Array | null;
  pal: RampPalette;
}

/**
 * Turns supersampled passes into one pixel-art frame: coverage decides alpha
 * (≥ `coverage` of the k×k block opaque), the most common (base, band) pair in
 * the block decides the colour (never an average), the ramp supplies the shade,
 * and the block keeps its nearest depth for the inner-line pass.
 */
export function composeFrame(
  albedo: RGBAImage,
  light: RGBAImage,
  pal: RampPalette,
  k: number,
  bandValues: number[],
  coverage = 0.5,
  depthPass: RGBAImage | null = null,
  bridgeCoverage = 0.3,
): ComposeResult {
  if (albedo.width !== light.width || albedo.height !== light.height) {
    throw new Error('albedo and light passes differ in size');
  }
  const W = Math.floor(albedo.width / k);
  const H = Math.floor(albedo.height / k);
  const out = createImage(W, H);
  const index = new Int16Array(W * H).fill(-1);
  const depth = depthPass ? new Float32Array(W * H).fill(NaN) : null;
  const nearestBase = createPaletteMapper(pal.bases, BASE_AXIS_WEIGHTS);
  const keys = pal.bases.length * pal.steps;
  const blockKey = new Int16Array(W * H).fill(-1); // majority key of every block with any geometry
  const blockCoverage = new Float32Array(W * H);
  const counts = new Int32Array(keys);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      counts.fill(0);
      let opaque = 0;
      let nearest = Infinity;
      for (let sy = 0; sy < k; sy++) {
        for (let sx = 0; sx < k; sx++) {
          const i = ((y * k + sy) * albedo.width + (x * k + sx)) * 4;
          if (albedo.data[i + 3] !== 255) continue;
          opaque++;
          const base = nearestBase(albedo.data[i]!, albedo.data[i + 1]!, albedo.data[i + 2]!);
          const band = classifyBand(light.data[i]!, bandValues, pal.steps);
          const key = base * pal.steps + band;
          counts[key] = counts[key]! + 1;
          if (depthPass) {
            const d = decodeDepth(depthPass.data[i]!, depthPass.data[i + 1]!);
            if (d < nearest) nearest = d;
          }
        }
      }
      const p = y * W + x;
      blockCoverage[p] = opaque / (k * k);
      if (opaque === 0) continue;
      let bestKey = 0;
      let bestN = -1;
      for (let key = 0; key < keys; key++) {
        if (counts[key]! > bestN) {
          bestN = counts[key]!;
          bestKey = key;
        }
      }
      blockKey[p] = bestKey;
      if (depth) depth[p] = nearest;
    }
  }

  // A pixel exists where the block is at least `coverage` covered, or where a thinner
  // sliver (≥ bridgeCoverage) connects two solid blocks across it, so thin fins,
  // blades and staffs stay continuous instead of breaking into crumbs.
  const solid = (p: number) => blockCoverage[p]! >= coverage;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (blockKey[p]! < 0) continue;
      let keep = solid(p);
      if (!keep && blockCoverage[p]! >= bridgeCoverage) {
        const h = x > 0 && x < W - 1 && solid(p - 1) && solid(p + 1);
        const v = y > 0 && y < H - 1 && solid(p - W) && solid(p + W);
        keep = h || v;
      }
      if (keep) index[p] = blockKey[p]!;
      else if (depth) depth[p] = NaN;
    }
  }
  const res: ComposeResult = { image: out, index, depth, pal };
  paintFromIndex(res);
  return res;
}

/** Rewrites the image colours from the index map (after band smoothing). */
export function paintFromIndex(res: ComposeResult): void {
  const { image, index, pal } = res;
  const { width, height, data } = image;
  for (let p = 0; p < width * height; p++) {
    const key = index[p]!;
    const o = p * 4;
    if (key < 0) {
      data[o] = data[o + 1] = data[o + 2] = data[o + 3] = 0;
      continue;
    }
    const c = pal.ramps[Math.floor(key / pal.steps)]![key % pal.steps]!;
    data[o] = c[0];
    data[o + 1] = c[1];
    data[o + 2] = c[2];
    data[o + 3] = 255;
  }
}

const N4 = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const;
const N8 = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

export interface BandSmoothOptions {
  /** Mode-filter passes over the band within one material. */
  iterations: number;
  /** Band islands (same material, 4-connected) smaller than this join the surrounding band. */
  minIsland: number;
}

/**
 * Shading in pixel art comes in large masses (PIXEL_RULES §2, §5). Within one
 * material, a pixel whose band disagrees with the clear majority of its
 * same-material neighbours takes the majority band, and small band islands are
 * absorbed. Material boundaries are never crossed. Works on a snapshot per pass.
 * Returns the number of pixels changed.
 */
export function smoothBands(
  res: ComposeResult,
  opts: BandSmoothOptions = { iterations: 2, minIsland: 4 },
): number {
  const { index, pal } = res;
  const { width, height } = res.image;
  const steps = pal.steps;
  let changed = 0;

  for (let it = 0; it < opts.iterations; it++) {
    const src = Int16Array.from(index);
    let passChanged = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        const key = src[p]!;
        if (key < 0) continue;
        const base = Math.floor(key / steps);
        const band = key % steps;
        const votes = [0, 0, 0];
        let same = 0;
        for (const [dx, dy] of N8) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nk = src[ny * width + nx]!;
          if (nk < 0 || Math.floor(nk / steps) !== base) continue;
          same++;
          votes[nk % steps]!++;
        }
        if (same < 4) continue;
        let best = band;
        for (let b = 0; b < steps; b++) if (votes[b]! > votes[best]!) best = b;
        // a clear majority: more than half of the same-material neighbours, and more than own band
        if (best !== band && votes[best]! * 2 > same && votes[best]! > votes[band]! + 1) {
          index[p] = base * steps + best;
          passChanged++;
        }
      }
    }
    changed += passChanged;
    if (passChanged === 0) break;
  }

  if (opts.minIsland > 1) {
    const src = Int16Array.from(index);
    const seen = new Uint8Array(width * height);
    const stack: number[] = [];
    for (let start = 0; start < width * height; start++) {
      if (seen[start] || src[start]! < 0) continue;
      const key = src[start]!;
      const base = Math.floor(key / steps);
      const members: number[] = [];
      stack.length = 0;
      stack.push(start);
      seen[start] = 1;
      while (stack.length) {
        const p = stack.pop()!;
        members.push(p);
        const x = p % width;
        const y = (p - x) / width;
        for (const [dx, dy] of N4) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (seen[q] || src[q] !== key) continue;
          seen[q] = 1;
          stack.push(q);
        }
      }
      if (members.length >= opts.minIsland) continue;
      const votes = [0, 0, 0];
      let any = 0;
      for (const p of members) {
        const x = p % width;
        const y = (p - x) / width;
        for (const [dx, dy] of N4) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nk = src[ny * width + nx]!;
          if (nk < 0 || nk === key || Math.floor(nk / steps) !== base) continue;
          votes[nk % steps]!++;
          any++;
        }
      }
      if (any === 0) continue;
      let best = 0;
      for (let b = 1; b < steps; b++) if (votes[b]! > votes[best]!) best = b;
      for (const p of members) index[p] = base * steps + best;
      changed += members.length;
    }
  }
  paintFromIndex(res);
  return changed;
}

/** Colour of a line next to a pixel of ramp key `key`: its own shadow if that reads as a line, else the line colour. */
function lineColorFor(pal: RampPalette, key: number, mode: OutlineMode): Rgb8 {
  if (mode === 'dark') return pal.line;
  const r = pal.ramps[Math.floor(key / pal.steps)]!;
  const band = key % pal.steps;
  if (band === 0) return pal.line;
  const shadow = r[0]!;
  const shadowL = srgb8ToOklab(...shadow)[0];
  const neighbourL = srgb8ToOklab(...r[band]!)[0];
  return shadowL <= neighbourL - 0.12 && shadowL < 0.45 ? shadow : pal.line;
}

/**
 * Outline for ramp frames (PIXEL_RULES §4): every transparent pixel with an
 * opaque 4-neighbour becomes outline, coloured by `lineColorFor` of its darkest
 * neighbour. Mutates `res.image`; returns the protection mask.
 */
export function addRampOutline(
  res: ComposeResult,
  pal: RampPalette,
  mode: OutlineMode,
): Uint8Array {
  const { image, index } = res;
  const { width, height, data } = image;
  const mask = new Uint8Array(width * height);
  if (mode === 'none') return mask;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (index[p]! >= 0) continue;
      let pick = -1;
      let pickBand = 99;
      for (const [dx, dy] of N4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const key = index[ny * width + nx]!;
        if (key < 0) continue;
        const band = key % pal.steps;
        if (band < pickBand || (band === pickBand && key < pick)) {
          pick = key;
          pickBand = band;
        }
      }
      if (pick < 0) continue;
      const color = lineColorFor(pal, pick, mode);
      const i = p * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = 255;
      mask[p] = 1;
    }
  }
  return mask;
}

/**
 * Inner lines (PIXEL_RULES §4, §6): where a nearer surface overlaps a farther
 * one by more than `threshold` (0..1 of the depth range), the far pixel along the
 * edge takes the line colour of its own material, so arms separate from torso and
 * head from shoulders with a single-pixel line on the shadow side. Pixels in
 * `mask` are skipped and the new line pixels are added to it.
 */
export function addInnerLines(
  res: ComposeResult,
  pal: RampPalette,
  mode: OutlineMode,
  threshold: number,
  mask: Uint8Array,
): number {
  const { image, index, depth } = res;
  if (!depth || mode === 'none') return 0;
  const { width, height, data } = image;
  const src = Int16Array.from(index);
  let n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (src[p]! < 0 || mask[p]) continue;
      const d = depth[p]!;
      let occluded = false;
      for (const [dx, dy] of N4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const q = ny * width + nx;
        if (src[q]! < 0) continue;
        if (depth[q]! < d - threshold) {
          occluded = true;
          break;
        }
      }
      if (!occluded) continue;
      const color = lineColorFor(pal, src[p]!, mode);
      const i = p * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      mask[p] = 1;
      n++;
    }
  }
  return n;
}
