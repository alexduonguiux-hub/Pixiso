import { alphaThreshold } from './alpha.js';
import { cleanupClusters } from './clusters.js';
import { removeIslands } from './islands.js';
import {
  addInnerLines,
  addRampOutline,
  buildRampPalette,
  composeFrame,
  smoothBands,
  type BandSmoothOptions,
  type RampPalette,
} from './compose.js';
import { addOutline, type OutlineMode } from './outline.js';
import type { Rgb8 } from './oklab.js';
import { mapToPalette } from './palette.js';
import { DEFAULT_RAMP_OPTIONS, type RampOptions } from './ramps.js';
import { cloneImage, type RGBAImage } from './types.js';

/** One frame as rendered by the GPU data passes at `supersample`× resolution. */
export interface PassFrame {
  /** Unlit colour (texture × recolour). Alpha is the coverage mask. */
  albedo: RGBAImage;
  /** Toon light band as a linear grey (see `bandValues`). */
  light: RGBAImage;
  /** Optional 16-bit depth (R high, G low) across the pixel camera's near..far. */
  depth?: RGBAImage;
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
  /** Band smoothing inside one material. */
  bands: BandSmoothOptions;
  /** Depth step (0..1 of the pixel camera's depth range) that counts as an occlusion edge; 0 disables inner lines. */
  innerLineDepth: number;
  /** Clusters smaller than this are merged (0 disables). */
  minCluster: number;
  /** Disconnected opaque islands smaller than this are erased (0 disables). */
  minIsland: number;
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
  bands: { iterations: 2, minIsland: 4 },
  innerLineDepth: 0.012, // 12 cm of a 10 m depth range
  minCluster: 3,
  minIsland: 6,
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
 * clip, coverage + majority downsampling, band masses, outline, inner lines,
 * cluster cleanup. Deterministic; never dithers; never averages colours.
 */
export function processPasses(frames: PassFrame[], opts: LookOptions): LookResult {
  const albedos = frames.map((f) => alphaThreshold(cloneImage(f.albedo)));
  const rampPalette = buildRampPalette(albedos, opts.maxColors, opts.ramp);
  const out: RGBAImage[] = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]!;
    const composed = composeFrame(
      albedos[i]!,
      f.light,
      rampPalette,
      opts.supersample,
      opts.bandValues,
      opts.coverage,
      f.depth ?? null,
    );
    smoothBands(composed, opts.bands);
    let mask: Uint8Array;
    if (opts.fixedPalette) {
      mapToPalette(composed.image, opts.fixedPalette);
      mask = addOutline(composed.image, opts.outline, opts.fixedPalette).mask;
    } else {
      mask = addRampOutline(composed, rampPalette, opts.outline);
      if (opts.innerLineDepth > 0)
        addInnerLines(composed, rampPalette, opts.outline, opts.innerLineDepth, mask);
    }
    if (opts.minCluster > 1) {
      cleanupClusters(composed.image, {
        minSize: opts.minCluster,
        contrastKeep: opts.contrastKeep,
        protect: mask,
      });
    }
    removeIslands(composed.image, opts.minIsland);
    out.push(composed.image);
  }
  return { frames: out, palette: opts.fixedPalette ?? rampPalette.colors, rampPalette };
}
