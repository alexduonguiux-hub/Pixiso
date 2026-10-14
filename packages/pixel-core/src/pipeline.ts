import { alphaThreshold } from './alpha.js';
import { cleanupOrphans } from './cleanup.js';
import { addOutline, type OutlineMode } from './outline.js';
import type { Rgb8 } from './oklab.js';
import { buildPalette, mapToPalette, type PaletteSpec } from './palette.js';
import { cloneImage, type RGBAImage } from './types.js';

export interface ProcessOptions {
  palette: Rgb8[];
  outline: OutlineMode;
  cleanup: boolean;
}

/**
 * Full per-frame post-process in the order fixed by HANDOFF §6.5:
 * alpha threshold → palette → outline → orphan cleanup. Never dithers.
 * Returns a new image; the input is left untouched.
 */
export function processFrame(input: RGBAImage, opts: ProcessOptions): RGBAImage {
  const img = cloneImage(input);
  alphaThreshold(img);
  mapToPalette(img, opts.palette);
  const { mask } = addOutline(img, opts.outline, opts.palette);
  if (opts.cleanup) cleanupOrphans(img, mask);
  return img;
}

export interface ProcessedClip {
  frames: RGBAImage[];
  palette: Rgb8[];
}

/**
 * Builds one palette from every frame (auto mode) and processes all of them with it,
 * so colours never flicker between frames.
 */
export function processFrames(
  raw: RGBAImage[],
  spec: PaletteSpec,
  outline: OutlineMode,
  cleanup = true,
): ProcessedClip {
  const thresholded = raw.map((f) => alphaThreshold(cloneImage(f)));
  const palette = buildPalette(thresholded, spec);
  const frames = thresholded.map((f) => processFrame(f, { palette, outline, cleanup }));
  return { frames, palette };
}
