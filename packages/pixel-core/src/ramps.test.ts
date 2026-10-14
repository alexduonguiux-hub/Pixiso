import { describe, expect, it } from 'vitest';
import { oklabToOklch, srgb8ToOklab } from './oklab.js';
import {
  buildLineColor,
  buildRamp,
  clampToGamut,
  DEFAULT_RAMP_OPTIONS,
  shiftHue,
} from './ramps.js';

const deg = (rad: number) => ((rad * 180) / Math.PI + 360) % 360;

describe('ramps', () => {
  it('shifts hue toward the target along the shorter arc, capped', () => {
    expect(deg(shiftHue(0, 90, 20))).toBeCloseTo(20, 6);
    expect(deg(shiftHue((350 * Math.PI) / 180, 10, 20))).toBeCloseTo(10, 6); // crosses 0°
    expect(deg(shiftHue((100 * Math.PI) / 180, 110, 20))).toBeCloseTo(110, 6); // closer than cap
  });

  it('builds a 3-step ramp: darker+cooler shadow, lighter+warmer highlight', () => {
    const base = srgb8ToOklab(200, 60, 60); // red cloth
    const [shadow, mid, highlight] = buildRamp(base, DEFAULT_RAMP_OPTIONS);
    const [Ls, Cs, hs] = oklabToOklch(...srgb8ToOklab(...shadow!));
    const [Lm, , hm] = oklabToOklch(...srgb8ToOklab(...mid!));
    const [Lh, Ch, hh] = oklabToOklch(...srgb8ToOklab(...highlight!));
    expect(Ls).toBeLessThan(Lm);
    expect(Lh).toBeGreaterThan(Lm);
    // red hue ≈ 25°; shadow moves toward 264° (via 0/360 side => hue decreases), highlight toward 110°
    expect(deg(hs)).toBeLessThan(deg(hm));
    expect(deg(hh)).toBeGreaterThan(deg(hm));
    expect(Cs).toBeGreaterThan(Ch);
  });

  it('tints greys instead of rotating them', () => {
    const [shadow, , highlight] = buildRamp(srgb8ToOklab(128, 128, 128));
    const [, Cs, hs] = oklabToOklch(...srgb8ToOklab(...shadow!));
    const [, Ch, hh] = oklabToOklch(...srgb8ToOklab(...highlight!));
    expect(Cs).toBeGreaterThan(0.005);
    expect(Ch).toBeGreaterThan(0.005);
    expect(Math.abs(deg(hs) - 264)).toBeLessThan(15);
    expect(Math.abs(deg(hh) - 110)).toBeLessThan(15);
  });

  it('keeps every shade inside the sRGB gamut and distinct', () => {
    for (const rgb of [
      [255, 255, 0],
      [0, 0, 255],
      [10, 10, 10],
      [250, 250, 250],
      [0, 200, 255],
    ] as [number, number, number][]) {
      const ramp = buildRamp(srgb8ToOklab(...rgb));
      for (const c of ramp) for (const ch of c) expect(ch).toBeGreaterThanOrEqual(0);
      expect(new Set(ramp.map((c) => c.join(','))).size).toBeGreaterThanOrEqual(2);
    }
    expect(clampToGamut([0.5, 0.6, 0.6]).every((c) => c >= 0 && c <= 255)).toBe(true);
  });

  it('line colour is darker than the darkest shadow', () => {
    const shadows = [srgb8ToOklab(80, 20, 20), srgb8ToOklab(30, 30, 60)];
    const line = srgb8ToOklab(...buildLineColor(shadows));
    expect(line[0]).toBeLessThan(Math.min(shadows[0]![0], shadows[1]![0]));
  });

  it('is deterministic', () => {
    const base = srgb8ToOklab(90, 140, 60);
    expect(buildRamp(base)).toEqual(buildRamp(base));
  });
});
