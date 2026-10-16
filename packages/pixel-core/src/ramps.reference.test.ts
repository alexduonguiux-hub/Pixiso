import { describe, expect, it } from 'vitest';
import { oklabToOklch, srgb8ToOklab } from './oklab.js';
import {
  buildRamp,
  buildTintedLine,
  DEFAULT_RAMP_OPTIONS,
  REFERENCE_RAMP_OPTIONS,
} from './ramps.js';

const DEG = 180 / Math.PI;

function hueOf(rgb: readonly [number, number, number]): number {
  return oklabToOklch(...srgb8ToOklab(...rgb))[2] * DEG;
}

/** Signed shortest arc from a to b in degrees. */
function arc(a: number, b: number): number {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

describe('reference ramp (docs/PIXEL_STYLE_REFERENCE.md §2.3)', () => {
  const yellow = srgb8ToOklab(254, 226, 103); // bird feathers, h ≈ 97°
  const green = srgb8ToOklab(111, 180, 91); // foliage, h ≈ 139°
  const blue = srgb8ToOklab(63, 114, 165); // water, h ≈ 250°

  it('shades yellow toward orange, not green', () => {
    const base = hueOf([254, 226, 103]);
    const [shadow] = buildRamp(yellow, REFERENCE_RAMP_OPTIONS);
    expect(arc(base, hueOf(shadow!))).toBeLessThan(-5);
    // The default preset pulls yellow shadows the wrong way (toward green).
    const [oldShadow] = buildRamp(yellow, DEFAULT_RAMP_OPTIONS);
    expect(arc(base, hueOf(oldShadow!))).toBeGreaterThan(0);
  });

  it('shades green toward cyan and blue toward purple, highlights toward yellow', () => {
    const g = buildRamp(green, REFERENCE_RAMP_OPTIONS);
    const gb = hueOf([111, 180, 91]);
    expect(arc(gb, hueOf(g[0]!))).toBeGreaterThan(5);
    expect(arc(gb, hueOf(g[2]!))).toBeLessThan(-5);
    const b = buildRamp(blue, REFERENCE_RAMP_OPTIONS);
    const bb = hueOf([63, 114, 165]);
    expect(arc(bb, hueOf(b[0]!))).toBeGreaterThan(5);
    expect(arc(bb, hueOf(b[2]!))).toBeLessThan(-5);
  });

  it('uses the measured lightness steps', () => {
    const [shadow, mid, light] = buildRamp(green, REFERENCE_RAMP_OPTIONS);
    const L = (c: readonly [number, number, number]) => srgb8ToOklab(...c)[0];
    expect(L(mid!) - L(shadow!)).toBeCloseTo(0.14, 1);
    expect(L(light!) - L(mid!)).toBeCloseTo(0.13, 1);
  });

  it('builds a near-black tinted outline', () => {
    const [shadow] = buildRamp(green, REFERENCE_RAMP_OPTIONS);
    const line = buildTintedLine(srgb8ToOklab(...shadow!), REFERENCE_RAMP_OPTIONS);
    const [L, C] = oklabToOklch(...srgb8ToOklab(...line));
    expect(L).toBeGreaterThan(0.09);
    expect(L).toBeLessThan(0.15);
    expect(C).toBeLessThanOrEqual(0.051);
  });
});
