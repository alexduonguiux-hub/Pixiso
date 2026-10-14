import type { Catalog, CharacterHeightPx } from '@pixiso/shared';
import type { PixelFrustum } from '../scene/IsoCameraRig.js';

/**
 * Pixels per metre in the camera's image plane, fixed per project from the
 * reference character's projected rest-pose height (D-018). Every character
 * shares it, so bigger characters come out bigger.
 */
export function computePpm(
  characterHeightPx: CharacterHeightPx | number,
  catalog: Catalog,
): number {
  const ref = catalog.characters.find((c) => c.id === catalog.referenceCharacter)!;
  return characterHeightPx / ref.projected.heightM;
}

/**
 * A generous working canvas for single-frame renders: wide enough for two-handed
 * weapons and capes, tall enough for hats, with the pivot (character feet) a bit
 * above the bottom. Phase 3 crops all frames to their union afterwards.
 */
export function workingFrustum(characterHeightPx: number, ppm: number): PixelFrustum {
  const widthPx = Math.ceil(characterHeightPx * 3);
  const heightPx = Math.ceil(characterHeightPx * 2.5);
  return {
    widthPx,
    heightPx,
    ppm,
    pivotX: Math.floor(widthPx / 2),
    pivotY: heightPx - Math.ceil(characterHeightPx * 0.6),
  };
}

/** Sample times (HANDOFF §6.6): loops `i·D/N`, one-shots `i·D/(N−1)`. */
export function sampleTimes(durationS: number, frames: number, loop: boolean): number[] {
  const n = Math.max(1, Math.floor(frames));
  if (n === 1) return [0];
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(loop ? (i * durationS) / n : (i * durationS) / (n - 1));
  return out;
}

/** Per-frame duration in ms, rounded to 10 ms, or from a fixed fps. */
export function frameDurationMs(
  durationS: number,
  frames: number,
  fps: number | 'fromClip',
): number {
  if (fps !== 'fromClip') return Math.max(10, Math.round(1000 / fps / 10) * 10);
  const n = Math.max(1, frames);
  return Math.max(10, Math.round((durationS * 1000) / n / 10) * 10);
}
