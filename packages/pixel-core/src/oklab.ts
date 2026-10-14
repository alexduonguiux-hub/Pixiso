/**
 * OKLab / OKLCh conversions (Björn Ottosson, public domain reference values).
 * sRGB components are 0..255 unless noted; linear components and OKLab are floats.
 */

export type Lab = [L: number, a: number, b: number];
export type Lch = [L: number, C: number, h: number];
export type Rgb8 = [r: number, g: number, b: number];

/** sRGB electro-optical transfer function, input 0..1. */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Inverse of {@link srgbToLinear}, input 0..1, output 0..1 (unclamped). */
export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function linearRgbToOklab(r: number, g: number, b: number): Lab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const SRGB8_TO_LINEAR = new Float64Array(256);
for (let i = 0; i < 256; i++) SRGB8_TO_LINEAR[i] = srgbToLinear(i / 255);

export function srgb8ToOklab(r: number, g: number, b: number): Lab {
  return linearRgbToOklab(SRGB8_TO_LINEAR[r]!, SRGB8_TO_LINEAR[g]!, SRGB8_TO_LINEAR[b]!);
}

function to8(c: number): number {
  const v = Math.round(linearToSrgb(Math.min(1, Math.max(0, c))) * 255);
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/** Gamut-clamped conversion back to 8-bit sRGB. */
export function oklabToSrgb8(L: number, a: number, b: number): Rgb8 {
  const [r, g, bl] = oklabToLinearRgb(L, a, b);
  return [to8(r), to8(g), to8(bl)];
}

export function oklabToOklch(L: number, a: number, b: number): Lch {
  return [L, Math.hypot(a, b), Math.atan2(b, a)];
}

export function oklchToOklab(L: number, C: number, h: number): Lab {
  return [L, C * Math.cos(h), C * Math.sin(h)];
}

export function oklabDistanceSq(x: Lab, y: Lab): number {
  const dL = x[0] - y[0];
  const da = x[1] - y[1];
  const db = x[2] - y[2];
  return dL * dL + da * da + db * db;
}

export function hexToRgb8(hex: string): Rgb8 {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`invalid hex colour "${hex}"`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgb8ToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}
