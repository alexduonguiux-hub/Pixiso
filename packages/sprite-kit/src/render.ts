/**
 * Policy layer: turns the user's CharacterConfig + ProjectStyle into painted
 * frames. Everything below this file is mechanism (templates, composition,
 * palette); everything above it (UI, export, Claude) only ever touches configs.
 */
import {
  colorHistogram,
  REFERENCE_RAMP_OPTIONS,
  scaleNearest,
  type RampOptions,
  type RGBAImage,
  type Rgb8,
} from '@pixiso/pixel-core';
import {
  isHexColor,
  PART_NONE,
  type CharacterConfig,
  type ColorName,
  type Direction,
  type ProjectStyle,
} from '@pixiso/shared';
import { CLIPS, type Clip } from './anim.js';
import { wearView, wearWalk } from './cast64.js';
import { buildClip, partById, type CharacterSpec } from './character.js';
import { compose } from './compose.js';
import { flipX, type Material, type Sprite } from './format.js';
import { HERO_CANVAS, HERO_WALK_CYCLE, heroFrames, type HeroView } from './hero64.js';
import { HERO_CLIP_IDS, heroLook } from './hero64.registry.js';
import { dress } from './outfit64.js';
import {
  buildPalette,
  HERO_RAMPS,
  paint,
  type MaterialColors,
  type PaintOptions,
  type Palette,
} from './paint.js';
import {
  bodyById,
  COLOR_TARGETS,
  FACING_SOURCE,
  HERO_BODY_ID,
  REFERENCE_BODY,
  SLOT_IDS,
} from './registry.js';
import { STAND_VIEWS } from './views64.js';
import { WALK_VIEWS } from './walk64.js';

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

/** Colour assignments → material base colours ("original" keeps the default; a `#rrggbb` is used as is). */
export function materialColorsFor(config: CharacterConfig, table: ColorTable): MaterialColors {
  const out: MaterialColors = {};
  for (const { target, color } of config.colors) {
    if (color === 'original') continue;
    const def = COLOR_TARGETS.find((t) => t.id === target);
    const rgb = isHexColor(color) ? hexToRgb8(color) : table.get(color);
    if (def && rgb) out[def.material] = rgb;
  }
  return out;
}

/** Warm dark grey outline of the "soft" preset (#2e2428, PIXEL_STYLE_REFERENCE.md §2.4). */
export const SOFT_LINE: Rgb8 = [46, 36, 40];

/** Palette and line options for a style; `ramp` is the 32 px reference's unless a body brings its own. */
export function paintSetupFor(
  style: ProjectStyle,
  materials: MaterialColors,
  ramp: RampOptions | ((m: Material) => RampOptions) = REFERENCE_RAMP_OPTIONS,
): { palette: Palette; options: PaintOptions } {
  switch (style.outline) {
    case 'soft':
      return {
        palette: buildPalette({ ...materials, line: SOFT_LINE }, ramp),
        options: { lineStyle: 'flat', selout: false },
      };
    case 'none':
      return {
        palette: buildPalette(materials, ramp),
        options: { lineStyle: 'none', selout: false },
      };
    default:
      return {
        palette: buildPalette(materials, ramp),
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
  if (config.baseCharacter === HERO_BODY_ID)
    return renderHeroClip(config, style, clip, direction, table);
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

/**
 * The 64 px hero (D-096): the config's parts become a Look (hero64.registry.ts)
 * dressed on the standing figure of the direction's drawn view and, for the
 * walk, on its step figures; each dressed sprite lands on the 64×64 canvas
 * where heroFrames puts that frame, a mirrored direction flips the canvas, and
 * the cast's ramps paint it. Idle is the standing frame held for two frames.
 */
function renderHeroClip(
  config: CharacterConfig,
  style: ProjectStyle,
  clip: Clip,
  direction: Direction,
  table: ColorTable,
): RenderedClip {
  if (!(HERO_CLIP_IDS as readonly string[]).includes(clip.id))
    throw new Error(`animation "${clip.id}" has no hero frames`);
  const src = FACING_SOURCE[direction];
  if (!src) throw new Error(`direction "${direction}" has no drawn view yet`);
  const view: HeroView = src.view;
  const look = heroLook(config.parts, materialColorsFor(config, table));
  const placed = heroFrames(view);
  const steps = WALK_VIEWS[view];
  const cellOf = (i: 0 | 1 | 2): Sprite => {
    const standing = i === 1 || !steps;
    const step = i === 0 ? 0 : 1;
    const outfit = standing
      ? wearView(HERO_BODY_ID, HERO_BODY_ID, look, view)
      : wearWalk(HERO_BODY_ID, HERO_BODY_ID, look, view, step);
    const figure = standing ? STAND_VIEWS[view].form.figure! : steps![step].form.figure!;
    const s = dress(figure, outfit);
    const at = placed[i];
    const cell = compose(
      [{ id: 'body', sprite: s, x: at.x - s.ox, y: at.y - s.oy, z: 0 }],
      HERO_CANVAS,
      HERO_CANVAS,
    );
    return src.flip ? flipX(cell) : cell;
  };
  const indices: readonly (0 | 1 | 2)[] = clip.id === 'walk' ? HERO_WALK_CYCLE : [1, 1];
  const cells = new Map<number, Sprite>();
  const { palette, options } = paintSetupFor(style, look.colors, HERO_RAMPS);
  const scale = outputScale(style, HERO_CANVAS);
  const frames = indices.map((i) => {
    let cell = cells.get(i);
    if (!cell) {
      cell = cellOf(i);
      cells.set(i, cell);
    }
    const img = paint(cell, palette, options);
    return scale === 1 ? img : scaleNearest(img, scale);
  });
  const body = bodyById(HERO_BODY_ID)!;
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
