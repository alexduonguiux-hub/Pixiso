import {
  DEFAULT_LOOK,
  paletteFromHex,
  processFrames,
  processPasses,
  type LookOptions,
  type OutlineMode,
  type PaletteSpec,
  type PassFrame,
  type RGBAImage,
  type Rgb8,
} from '@pixiso/pixel-core';
import type { Catalog, CatalogAnimation, Direction, ProjectStyle } from '@pixiso/shared';
import type { CharacterRig } from '../scene/CharacterRig.js';
import type { PixelFrustum } from '../scene/IsoCameraRig.js';
import type { PixelRenderer } from './PixelRenderer.js';
import { computePpm, frameDurationMs, sampleTimes, workingFrustum } from './pixelMath.js';

/** 'ramp' (default): PIXEL_RULES pipeline. 'composite': Phase 2 baseline (shaded render → median cut). */
export type LookMode = 'ramp' | 'composite';

export interface ClipRenderRequest {
  animation: CatalogAnimation;
  direction: Direction;
  /** Frames to sample; defaults to the catalog's defaultFrames. */
  frames?: number;
  style: ProjectStyle;
  /** Override the working frustum (Phase 3 uses the shared cell). */
  frustum?: PixelFrustum;
  /** Skip post-processing and return raw shaded renders only. */
  rawOnly?: boolean;
  /** Reuse a palette instead of building one (e.g. project-locked palette). */
  palette?: Rgb8[];
  look?: LookMode;
  /** Overrides for the ramp look (supersample, bands, cleanup…). */
  lookOptions?: Partial<Omit<LookOptions, 'maxColors' | 'outline' | 'fixedPalette'>>;
}

export interface ClipRenderResult {
  /** Shaded 1× renders (composite look / rawOnly); empty for the ramp look. */
  raw: RGBAImage[];
  /** Supersampled albedo/light passes (ramp look); empty otherwise. */
  passes: PassFrame[];
  frames: RGBAImage[];
  palette: Rgb8[];
  times: number[];
  frameDurationMs: number;
  frustum: PixelFrustum;
  ppm: number;
  look: LookMode;
}

/**
 * Samples one clip in one direction through the pixel renderer and runs the
 * pixel-core pipeline. Synchronous once assets are loaded, so the live viewer
 * never sees an intermediate pose; the rig's clip time and direction are restored.
 */
export function renderClip(
  rig: CharacterRig,
  pixel: PixelRenderer,
  catalog: Catalog,
  req: ClipRenderRequest,
): ClipRenderResult {
  const ppm = computePpm(req.style.characterHeightPx, catalog);
  const frustum = req.frustum ?? workingFrustum(req.style.characterHeightPx, ppm);
  const n = req.frames ?? req.animation.defaultFrames;
  const times = sampleTimes(req.animation.durationS, n, req.animation.loop);
  const look: LookMode = req.rawOnly ? 'composite' : (req.look ?? 'ramp');
  const lookOpts = { ...DEFAULT_LOOK, ...req.lookOptions };

  const prevDirection = rig.direction;
  const prevTime = rig.currentTime;
  const prevAnimation = rig.currentAnimation;

  rig.setDirection(req.direction);
  rig.setAnimation(req.animation, 0);
  const raw: RGBAImage[] = [];
  const passes: PassFrame[] = [];
  for (const t of times) {
    rig.setTime(t);
    if (look === 'ramp') passes.push(pixel.renderPasses(frustum, lookOpts.supersample));
    else raw.push(pixel.render(frustum));
  }

  if (prevAnimation) rig.setAnimation(prevAnimation, prevTime);
  rig.setDirection(prevDirection);

  const outline: OutlineMode = req.style.outline;
  const spec: PaletteSpec = req.style.palette;
  let frames: RGBAImage[] = [];
  let palette: Rgb8[] = req.palette ?? [];
  if (look === 'ramp') {
    const fixed = req.palette ?? (spec.mode === 'fixed' ? paletteFromHex(spec.hex) : undefined);
    const processed = processPasses(passes, {
      ...lookOpts,
      maxColors: spec.mode === 'auto' ? spec.colors : 256,
      outline,
      ...(fixed ? { fixedPalette: fixed } : {}),
    });
    frames = processed.frames;
    palette = processed.palette;
  } else if (!req.rawOnly) {
    const processed = req.palette
      ? processFrames(raw, { mode: 'fixed', hex: req.palette.map(hex) }, outline)
      : processFrames(raw, spec, outline);
    frames = processed.frames;
    palette = processed.palette;
  }
  return {
    raw,
    passes,
    frames,
    palette,
    times,
    frameDurationMs: frameDurationMs(req.animation.durationS, n, req.style.fps),
    frustum,
    ppm,
    look,
  };
}

function hex(c: Rgb8): string {
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
