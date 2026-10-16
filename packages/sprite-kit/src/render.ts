/**
 * Policy layer: turns the user's CharacterConfig + ProjectStyle into painted
 * frames. Everything below this file is mechanism (templates, composition,
 * palette); everything above it (UI, export, Claude) only ever touches configs.
 */
import {
  colorHistogram,
  REFERENCE_RAMP_OPTIONS,
  scaleNearest,
  type RGBAImage,
  type Rgb8,
} from '@pixiso/pixel-core';
import {
  PART_NONE,
  type CharacterConfig,
  type ColorName,
  type Direction,
  type ProjectStyle,
} from '@pixiso/shared';
import { CLIPS, type Clip } from './anim.js';
import { buildClip, partById, type CharacterSpec } from './character.js';
import {
  buildPalette,
  paint,
  type MaterialColors,
  type PaintOptions,
  type Palette,
} from './paint.js';
import { bodyById, COLOR_TARGETS, REFERENCE_BODY, SLOT_IDS } from './registry.js';

export type ColorTable = ReadonlyMap<ColorName, Rgb8>;

export function hexToRgb8(hex: string): Rgb8 {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Named colours → base sRGB, from the catalog's colour list. */
export function colorTableFrom(colors: readonly { id: ColorName; hex: string }[]): ColorTable {
  return new Map(colors.map((c) => [c.id, hexToRgb8(c.hex)]));
}

/** Parts of a config in slot order; "none" and unknown ids are skipped (normalizeConfig guards the latter). */
export function specFromConfig(config: CharacterConfig): CharacterSpec {
  const parts: string[] = [];
  for (const slot of SLOT_IDS) {
    const id = config.parts[slot];
    if (!id || id === PART_NONE) continue;
    const def = partById(id);
    if (def && def.slot === slot) parts.push(id);
  }
  return { body: bodyById(config.baseCharacter) ? config.baseCharacter : REFERENCE_BODY, parts };
}

/** Colour assignments → material base colours ("original" keeps the default). */
export function materialColorsFor(config: CharacterConfig, table: ColorTable): MaterialColors {
  const out: MaterialColors = {};
  for (const { target, color } of config.colors) {
    if (color === 'original') continue;
    const def = COLOR_TARGETS.find((t) => t.id === target);
    const rgb = table.get(color);
    if (def && rgb) out[def.material] = rgb;
  }
  return out;
}

/** Warm dark grey outline of the "soft" preset (#2e2428, PIXEL_STYLE_REFERENCE.md §2.4). */
export const SOFT_LINE: Rgb8 = [46, 36, 40];

export function paintSetupFor(
  style: ProjectStyle,
  materials: MaterialColors,
): { palette: Palette; options: PaintOptions } {
  switch (style.outline) {
    case 'soft':
      return {
        palette: buildPalette({ ...materials, line: SOFT_LINE }, REFERENCE_RAMP_OPTIONS),
        options: { lineStyle: 'flat', selout: false },
      };
    case 'none':
      return {
        palette: buildPalette(materials, REFERENCE_RAMP_OPTIONS),
        options: { lineStyle: 'none', selout: false },
      };
    default:
      return {
        palette: buildPalette(materials, REFERENCE_RAMP_OPTIONS),
        options: { lineStyle: 'tinted', selout: false },
      };
  }
}

/** Integer output scale: 32 px → 1, 64 px → 2. */
export function outputScale(style: ProjectStyle, canvasH: number): number {
  return Math.max(1, Math.round(style.characterHeightPx / canvasH));
}

/** Per-frame duration in ms: the clip's own, or a fixed fps rounded to 10 ms. */
export function frameDurationMs(clip: Clip, fps: ProjectStyle['fps']): number {
  if (fps === 'fromClip') return clip.frameMs;
  return Math.max(10, Math.round(1000 / fps / 10) * 10);
}

export interface RenderedClip {
  frames: RGBAImage[];
  frameMs: number;
  loop: boolean;
  /** Colours actually used, most frequent first. */
  palette: Rgb8[];
  scale: number;
  cell: { w: number; h: number };
  pivot: { x: number; y: number };
}

/** Colours present in the frames, most frequent first. */
export function usedColors(frames: RGBAImage[]): Rgb8[] {
  const hist = colorHistogram(frames);
  return [...hist.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([k]) => [(k >> 16) & 255, (k >> 8) & 255, k & 255] as Rgb8);
}

/** Renders one animation in one direction for a config. Pure and deterministic. */
export function renderClip(
  config: CharacterConfig,
  style: ProjectStyle,
  animationId: string,
  direction: Direction,
  table: ColorTable,
  clips: readonly Clip[] = CLIPS,
): RenderedClip {
  const clip = clips.find((c) => c.id === animationId);
  if (!clip) throw new Error(`unknown animation "${animationId}"`);
  const spec = specFromConfig(config);
  const body = bodyById(spec.body ?? REFERENCE_BODY)!;
  const { palette, options } = paintSetupFor(style, materialColorsFor(config, table));
  const scale = outputScale(style, body.canvas.h);
  const frames = buildClip(spec, direction, clip).map((s) => {
    const img = paint(s, palette, options);
    return scale === 1 ? img : scaleNearest(img, scale);
  });
  return {
    frames,
    frameMs: frameDurationMs(clip, style.fps),
    loop: clip.loop,
    palette: usedColors(frames),
    scale,
    cell: { w: body.canvas.w * scale, h: body.canvas.h * scale },
    pivot: { x: body.pivot.x * scale, y: body.pivot.y * scale },
  };
}
