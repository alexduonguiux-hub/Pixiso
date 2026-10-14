import { srgb8ToOklab, srgbToLinear, type Lab, type Rgb8 } from './oklab.js';
import type { OutlineMode } from './outline.js';
import { buildPaletteMedianCut, createPaletteMapper } from './palette.js';
import { rgbKey } from './stats.js';
import { buildLineColor, buildRamp, DEFAULT_RAMP_OPTIONS, type RampOptions } from './ramps.js';
import { createImage, type RGBAImage } from './types.js';

/** Structured palette: one hue-shifted ramp per base colour plus a line colour. */
export interface RampPalette {
  bases: Rgb8[];
  basesLab: Lab[];
  /** ramps[baseIndex][band], darkest first. */
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
 * material are what the ramp is for. So base selection weights a/b up and L down.
 */
export const BASE_AXIS_WEIGHTS: [number, number, number] = [0.5, 2, 2];

/**
 * Spends the palette budget the way a pixel artist does (PIXEL_RULES §3): every
 * material gets its mid colour; the extra shades go to the largest materials first
 * (shadow, then highlight), so eyes and trims keep their identity while the big
 * forms get full ramps. Returns shade counts per base (1..3), same order as `shares`.
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
  // only "forms" (materials covering a meaningful area) get shading; accents stay flat
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
 * Builds the ramp palette from the albedo (unlit colour) of every frame at once:
 * median-cut picks the base materials (small materials weighted up so eyes and
 * trims survive), `allocateShades` decides who gets a full ramp, `buildRamp`
 * produces the shades. A base with fewer shades reuses its mid colour for the
 * missing bands, so `ramps[i]` always has 3 entries.
 */
export function buildRampPalette(
  albedoFrames: RGBAImage[],
  maxColors: number,
  ramp: RampOptions = DEFAULT_RAMP_OPTIONS,
): RampPalette {
  const k = baseCountFor(maxColors);
  const bases = buildPaletteMedianCut(albedoFrames, k, 0.6, 'mode', BASE_AXIS_WEIGHTS);
  const basesLab = bases.map((c) => srgb8ToOklab(...c));
  const nearest = createPaletteMapper(bases);
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

/** Light band index from the light-pass byte: nearest of the (linear) band values. */
export function classifyBand(lightByte: number, bandValues: number[], steps = 3): number {
  const v = srgbToLinear(lightByte / 255);
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

export interface ComposeResult {
  image: RGBAImage;
  /** base*steps + band per pixel, -1 where transparent. */
  index: Int16Array;
}

/**
 * Turns a supersampled albedo + light pair into one pixel-art frame:
 * coverage decides alpha (≥ `coverage` of the k×k block opaque), the most
 * common (base, band) pair in the block decides the colour (never an average,
 * so no new colours appear), and the ramp supplies the final shade.
 */
export function composeFrame(
  albedo: RGBAImage,
  light: RGBAImage,
  pal: RampPalette,
  k: number,
  bandValues: number[],
  coverage = 0.5,
): ComposeResult {
  if (albedo.width !== light.width || albedo.height !== light.height) {
    throw new Error('albedo and light passes differ in size');
  }
  const W = Math.floor(albedo.width / k);
  const H = Math.floor(albedo.height / k);
  const out = createImage(W, H);
  const index = new Int16Array(W * H).fill(-1);
  const nearestBase = createPaletteMapper(pal.bases);
  const keys = pal.bases.length * pal.steps;
  const counts = new Int32Array(keys);
  const need = Math.ceil(k * k * coverage);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      counts.fill(0);
      let opaque = 0;
      for (let sy = 0; sy < k; sy++) {
        for (let sx = 0; sx < k; sx++) {
          const i = ((y * k + sy) * albedo.width + (x * k + sx)) * 4;
          if (albedo.data[i + 3] !== 255) continue;
          opaque++;
          const base = nearestBase(albedo.data[i]!, albedo.data[i + 1]!, albedo.data[i + 2]!);
          const band = classifyBand(light.data[i]!, bandValues, pal.steps);
          const key = base * pal.steps + band;
          counts[key] = counts[key]! + 1;
        }
      }
      if (opaque < need) continue;
      let bestKey = 0;
      let bestN = -1;
      for (let key = 0; key < keys; key++) {
        if (counts[key]! > bestN) {
          bestN = counts[key]!;
          bestKey = key;
        }
      }
      const base = Math.floor(bestKey / pal.steps);
      const band = bestKey % pal.steps;
      const c = pal.ramps[base]![band]!;
      const o = (y * W + x) * 4;
      out.data[o] = c[0];
      out.data[o + 1] = c[1];
      out.data[o + 2] = c[2];
      out.data[o + 3] = 255;
      index[y * W + x] = bestKey;
    }
  }
  return { image: out, index };
}

const N4 = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const;

/**
 * Outline for ramp frames (PIXEL_RULES §4): `dark` paints the line colour;
 * `selective` paints the neighbour's own shadow shade where the neighbour is lit,
 * and the line colour where the neighbour is already in shadow, so the line
 * reads as part of the form instead of a black sticker. Mutates `res.image`.
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
  const src = Int16Array.from(index);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (src[p]! >= 0) continue;
      let pick: number = -1;
      let pickBand = 99;
      for (const [dx, dy] of N4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const key = src[ny * width + nx]!;
        if (key < 0) continue;
        const band = key % pal.steps;
        // prefer the darkest neighbour so the line follows the shadow side
        if (band < pickBand || (band === pickBand && key < pick)) {
          pick = key;
          pickBand = band;
        }
      }
      if (pick < 0) continue;
      let color = pal.line;
      if (mode === 'selective' && pickBand > 0) {
        const r = pal.ramps[Math.floor(pick / pal.steps)]!;
        const shadow = r[0]!;
        const shadowL = srgb8ToOklab(...shadow)[0];
        const neighbourL = srgb8ToOklab(...r[pickBand]!)[0];
        // the line must read as a line: clearly darker than the fill it borders
        if (shadowL <= neighbourL - 0.12 && shadowL < 0.55) color = shadow;
      }
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
