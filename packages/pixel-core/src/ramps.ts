import {
  linearToSrgb,
  oklabToLinearRgb,
  oklabToOklch,
  oklchToOklab,
  type Lab,
  type Rgb8,
} from './oklab.js';

/**
 * Colour ramps the way pixel artists build them (docs/PIXEL_RULES.md §3):
 * one base colour per material, a fixed number of shades, darker shades
 * shifted toward a cool hue and more saturated, lighter shades shifted toward a
 * warm hue and less saturated. Never a plain darken/lighten.
 */
export interface RampOptions {
  /** Shades per ramp: 2 (shadow, lit) or 3 (shadow, mid, highlight). */
  steps: 2 | 3;
  /** OKLab lightness delta for the shadow shade (negative). */
  shadowL: number;
  /** OKLab lightness delta for the highlight shade (positive). */
  highlightL: number;
  /** Hue (degrees, OKLCh) shadows drift toward. 264 ≈ blue. */
  shadowHueDeg: number;
  /** Hue (degrees) highlights drift toward. 110 ≈ yellow. */
  highlightHueDeg: number;
  /** Maximum hue rotation per step, degrees. */
  maxHueShiftDeg: number;
  /** Chroma multipliers. */
  shadowChroma: number;
  highlightChroma: number;
  /** Below this chroma the base is treated as grey and gets a tint instead of a rotation. */
  minChromaForShift: number;
  /** Chroma of the tint applied to grey shadows/highlights. */
  tintChroma: number;
  /**
   * When true the shadow hue rotates away from the highlight hue (the direction
   * the highlight does not take) instead of along the shorter arc toward
   * `shadowHueDeg`. Yellows then shade toward orange, not green, as in reference art.
   */
  shadowAwayFromHighlight?: boolean;
  /**
   * Lightness of the tinted outline. Unset: near black (L 0.12, the 32 px
   * reference style). The 64 px reference draws brown lines at about L 0.38 that
   * keep the material's shadow hue.
   */
  lineL?: number;
}

export const DEFAULT_RAMP_OPTIONS: RampOptions = {
  steps: 3,
  shadowL: -0.16,
  highlightL: 0.08,
  shadowHueDeg: 264,
  highlightHueDeg: 110,
  maxHueShiftDeg: 20,
  shadowChroma: 1.15,
  highlightChroma: 0.85,
  minChromaForShift: 0.025,
  tintChroma: 0.02,
};

/**
 * Ramp measured on reference pixel art (docs/PIXEL_STYLE_REFERENCE.md §2.3):
 * steps of about 0.13 L, 10–18° of hue per step, shadows slightly desaturated,
 * highlights keep their chroma, warm hues shade toward orange rather than green.
 */
export const REFERENCE_RAMP_OPTIONS: RampOptions = {
  steps: 3,
  shadowL: -0.14,
  highlightL: 0.13,
  shadowHueDeg: 264,
  highlightHueDeg: 100,
  maxHueShiftDeg: 16,
  shadowChroma: 0.85,
  highlightChroma: 1.0,
  minChromaForShift: 0.025,
  tintChroma: 0.02,
  shadowAwayFromHighlight: true,
};

const DEG = Math.PI / 180;

/** Rotates hue `h` toward `towardDeg` along the shorter arc, by at most `maxDeg`. */
export function shiftHue(hRad: number, towardDeg: number, maxDeg: number): number {
  const target = towardDeg * DEG;
  let delta = target - hRad;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const maxRad = maxDeg * DEG;
  const step = Math.max(-maxRad, Math.min(maxRad, delta));
  return hRad + step;
}

function inGamut(rgb: [number, number, number]): boolean {
  return rgb.every((c) => c >= -0.0005 && c <= 1.0005);
}

/** Converts OKLab to 8-bit sRGB, reducing chroma (keeping L and hue) until the colour fits. */
export function clampToGamut(lab: Lab): Rgb8 {
  const L = Math.max(0, Math.min(1, lab[0]));
  const [, C, h] = oklabToOklch(L, lab[1], lab[2]);
  let lo = 0;
  let hi = 1;
  let best = oklchToOklab(L, 0, h);
  if (inGamut(oklabToLinearRgb(L, lab[1], lab[2]))) {
    best = [L, lab[1], lab[2]];
  } else {
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      const candidate = oklchToOklab(L, C * mid, h);
      if (inGamut(oklabToLinearRgb(...candidate))) {
        lo = mid;
        best = candidate;
      } else hi = mid;
    }
  }
  const [r, g, b] = oklabToLinearRgb(...best);
  const to8 = (c: number) =>
    Math.max(0, Math.min(255, Math.round(linearToSrgb(Math.max(0, Math.min(1, c))) * 255)));
  return [to8(r), to8(g), to8(b)];
}

function shade(base: Lab, dL: number, hueDeg: number, chromaMul: number, o: RampOptions): Lab {
  const [L, C, h] = oklabToOklch(...base);
  const L2 = Math.max(0.06, Math.min(0.98, L + dL));
  if (C < o.minChromaForShift) {
    // Greys: a faint cool/warm tint instead of a rotation.
    return oklchToOklab(L2, o.tintChroma, hueDeg * DEG);
  }
  if (dL < 0 && o.shadowAwayFromHighlight) {
    // Rotate opposite to the highlight's direction; a hue sitting on the highlight hue goes warm (orange).
    const towardHighlight = shiftHue(h, o.highlightHueDeg, o.maxHueShiftDeg) - h;
    const sign = towardHighlight > 1e-9 ? -1 : 1;
    return oklchToOklab(L2, C * chromaMul, h + sign * o.maxHueShiftDeg * DEG);
  }
  return oklchToOklab(L2, C * chromaMul, shiftHue(h, hueDeg, o.maxHueShiftDeg));
}

/** Shades for one base colour, darkest first: [shadow, mid] or [shadow, mid, highlight]. */
export function buildRamp(base: Lab, o: RampOptions = DEFAULT_RAMP_OPTIONS): Rgb8[] {
  const shadow = shade(base, o.shadowL, o.shadowHueDeg, o.shadowChroma, o);
  const mid: Lab = [Math.max(0.06, Math.min(0.98, base[0])), base[1], base[2]];
  const out = [clampToGamut(shadow), clampToGamut(mid)];
  if (o.steps === 3)
    out.push(clampToGamut(shade(base, o.highlightL, o.highlightHueDeg, o.highlightChroma, o)));
  return out;
}

/**
 * Reference-style outline for one material: near black (L ≈ 0.12) with a faint
 * cool tint of the material's hue (docs/PIXEL_STYLE_REFERENCE.md §2.4).
 */
export function buildTintedLine(shadow: Lab, o: RampOptions = DEFAULT_RAMP_OPTIONS): Rgb8 {
  const [, C, h] = oklabToOklch(...shadow);
  if (o.lineL !== undefined) {
    // Mid-dark line in the shadow's own hue (the 64 px reference: brown on
    // skin); on a dark material it stays a step darker than the shadow.
    const chroma = Math.min(0.08, Math.max(o.tintChroma, C * 0.8));
    return clampToGamut(oklchToOklab(Math.min(o.lineL, shadow[0] - 0.12), chroma, h));
  }
  const tint = Math.min(0.05, Math.max(o.tintChroma, C * 0.5));
  return clampToGamut(oklchToOklab(0.12, tint, shiftHue(h, o.shadowHueDeg, 20)));
}

/**
 * Ramp measured on the 64 px base-body reference (skin: shadow 200,143,111 /
 * base 249,209,173 / light 253,233,200; outline 93,54,33): a deep, more
 * saturated shadow a step toward red, a faint highlight a step toward yellow,
 * and a brown outline instead of a near-black one.
 */
export const HERO_RAMP_OPTIONS: RampOptions = {
  steps: 3,
  shadowL: -0.19,
  highlightL: 0.06,
  shadowHueDeg: 264,
  highlightHueDeg: 100,
  maxHueShiftDeg: 15,
  shadowChroma: 1.25,
  highlightChroma: 0.75,
  minChromaForShift: 0.025,
  tintChroma: 0.02,
  shadowAwayFromHighlight: true,
  lineL: 0.38,
};

/** A line colour darker and cooler than the darkest shadow in the set. */
export function buildLineColor(shadows: Lab[], o: RampOptions = DEFAULT_RAMP_OPTIONS): Rgb8 {
  let darkest: Lab = shadows[0] ?? [0.3, 0, 0];
  for (const s of shadows) if (s[0] < darkest[0]) darkest = s;
  const [L, C, h] = oklabToOklch(...darkest);
  const line = oklchToOklab(
    Math.max(0.05, L - 0.1),
    Math.max(C * 0.6, o.tintChroma),
    shiftHue(h, o.shadowHueDeg, 15),
  );
  return clampToGamut(line);
}
