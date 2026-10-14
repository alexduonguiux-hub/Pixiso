import { alphaThreshold } from './alpha.js';
import { cleanupClusters } from './clusters.js';
import { addRampOutline, buildRampPalette, composeFrame, type RampPalette } from './compose.js';
import { addOutline, type OutlineMode } from './outline.js';
import type { Rgb8 } from './oklab.js';
import { mapToPalette } from './palette.js';
import { DEFAULT_RAMP_OPTIONS, type RampOptions } from './ramps.js';
import { cloneImage, type RGBAImage } from './types.js';

/** One frame as rendered by the two GPU passes at `supersample`× resolution. */
export interface PassFrame {
  /** Unlit colour (texture × recolour). Alpha is the coverage mask. */
  albedo: RGBAImage;
  /** Toon light band encoded as grey (see `bandValues`). */
  light: RGBAImage;
}

export interface LookOptions {
  /** Palette budget including the line colour. */
  maxColors: number;
  /** Supersampling factor of the passes. */
  supersample: number;
  /** Fraction of a block that must be opaque for the pixel to exist. */
  coverage: number;
  /** Linear grey values the light pass uses for shadow / mid / highlight. */
  bandValues: number[];
  outline: OutlineMode;
  /** Clusters smaller than this are merged (0 disables). */
  minCluster: number;
  /** Lightness difference that marks a small cluster as a deliberate detail. */
  contrastKeep: number;
  ramp: RampOptions;
  /** When set, final colours snap to this palette instead of the generated ramps. */
  fixedPalette?: Rgb8[];
}

export const DEFAULT_LOOK: Omit<LookOptions, 'maxColors' | 'outline'> = {
  supersample: 4,
  coverage: 0.5,
  bandValues: [0.35, 0.7, 1.0],
  minCluster: 3,
  contrastKeep: 0.3,
  ramp: DEFAULT_RAMP_OPTIONS,
};

export interface LookResult {
  frames: RGBAImage[];
  palette: Rgb8[];
  rampPalette: RampPalette;
}

/**
 * The pixel-look pipeline (PIXEL_RULES.md): one ramp palette for the whole
 * clip, coverage + majority downsampling, ramp outline, cluster cleanup.
 * Deterministic; never dithers; never averages colours.
 */
export function processPasses(frames: PassFrame[], opts: LookOptions): LookResult {
  const albedos = frames.map((f) => alphaThreshold(cloneImage(f.albedo)));
  const rampPalette = buildRampPalette(albedos, opts.maxColors, opts.ramp);
  const out: RGBAImage[] = [];
  for (let i = 0; i < frames.length; i++) {
    const composed = composeFrame(
      albedos[i]!,
      frames[i]!.light,
      rampPalette,
      opts.supersample,
      opts.bandValues,
      opts.coverage,
    );
    let mask: Uint8Array;
    if (opts.fixedPalette) {
      mapToPalette(composed.image, opts.fixedPalette);
      mask = addOutline(composed.image, opts.outline, opts.fixedPalette).mask;
    } else {
      mask = addRampOutline(composed, rampPalette, opts.outline);
    }
    if (opts.minCluster > 1) {
      cleanupClusters(composed.image, {
        minSize: opts.minCluster,
        contrastKeep: opts.contrastKeep,
        protect: mask,
      });
    }
    out.push(composed.image);
  }
  return { frames: out, palette: opts.fixedPalette ?? rampPalette.colors, rampPalette };
}
