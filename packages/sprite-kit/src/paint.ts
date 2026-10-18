import {
  buildTintedLine,
  createImage,
  DEFAULT_RAMP_OPTIONS,
  srgb8ToOklab,
  type RampOptions,
  type Rgb8,
  type RGBAImage,
  oklabToOklch,
  oklchToOklab,
  oklabToSrgb8,
  buildRamp5,
  HERO_RAMP_OPTIONS,
  HERO_CLOTH_RAMP_OPTIONS,
} from '@pixiso/pixel-core';
import { MATERIALS, unpackCell, type Material, type Sprite } from './format.js';

/** Base colour per material; shades come from hue-shifted ramps (PIXEL_RULES §3). */
export type MaterialColors = Partial<Record<Material, Rgb8>>;

export const DEFAULT_MATERIAL_COLORS: Record<Material, Rgb8> = {
  skin: [232, 180, 140],
  hair: [120, 76, 48],
  cloth: [62, 110, 170],
  cloth2: [170, 60, 60],
  pants: [70, 62, 80],
  boots: [92, 62, 44],
  metal: [150, 158, 170],
  leather: [120, 80, 48],
  wood: [130, 90, 50],
  accent: [220, 170, 60],
  white: [240, 240, 236],
  eye: [28, 24, 36],
  line: [28, 24, 36],
};

export interface Palette {
  /** ramps[materialIndex][shade] */
  ramps: Rgb8[][];
  line: Rgb8;
  /** Per-material outline colour (near black, tinted by the material); lines[materialIndex]. */
  lines: Rgb8[];
  colors: Rgb8[];
}

export interface PaintOptions {
  /**
   * 'flat': every line cell uses palette.line. 'tinted': the outline takes the tint of
   * the material it borders. 'none': line cells become the bordering material's shadow.
   */
  lineStyle: 'flat' | 'tinted' | 'none';
  /** Selective outline: line cells on the lit (top/left) silhouette edge use the bordering material's shadow shade. */
  selout: boolean;
}

export const DEFAULT_PAINT_OPTIONS: PaintOptions = { lineStyle: 'flat', selout: false };

/**
 * Paint options matching the reference art (docs/PIXEL_STYLE_REFERENCE.md §2.4): a closed
 * 1-px outline, near black, tinted by the material it borders; no selective outline.
 */
export const REFERENCE_PAINT_OPTIONS: PaintOptions = { lineStyle: 'tinted', selout: false };

/** Ramp options per material for the 64 px hero: skin as measured on the mannequin, everything else with the wider cloth steps. */
export const HERO_RAMPS = (m: Material): RampOptions =>
  m === 'skin' ? HERO_RAMP_OPTIONS : HERO_CLOTH_RAMP_OPTIONS;

/**
 * Builds the concrete palette for a material colour set: five shades per
 * material ([shadow, mid, highlight, deep, bright], the cell format's order);
 * fixed-tone materials get flat ramps. `ramp` may be one option set or a
 * function of the material.
 */
export function buildPalette(
  colors: MaterialColors = {},
  ramp: RampOptions | ((m: Material) => RampOptions) = DEFAULT_RAMP_OPTIONS,
): Palette {
  const ramps: Rgb8[][] = [];
  const lines: Rgb8[] = [];
  const line = colors.line ?? DEFAULT_MATERIAL_COLORS.line;
  const optionsFor = (m: Material): RampOptions => (typeof ramp === 'function' ? ramp(m) : ramp);
  for (const m of MATERIALS) {
    const base = colors[m] ?? DEFAULT_MATERIAL_COLORS[m];
    if (m === 'line' || m === 'white') {
      ramps.push([base, base, base, base, base]);
      lines.push(line);
      continue;
    }
    if (m === 'eye') {
      // Iris: shade 0 is the dark upper part (navy over blue on the reference), the rest the base colour.
      const [L, C, h] = oklabToOklch(...srgb8ToOklab(...base));
      const dark = oklabToSrgb8(
        ...oklchToOklab(Math.max(0.1, L - 0.12), Math.min(0.3, C * 1.1), h),
      );
      ramps.push([dark, base, base, dark, base]);
      lines.push(line);
      continue;
    }
    const o = optionsFor(m);
    const r = buildRamp5(srgb8ToOklab(...base), o);
    ramps.push(r);
    // The outline is derived from the deep shade so it stays a step darker than every tone of the material.
    lines.push(buildTintedLine(srgb8ToOklab(...r[3]!), o));
  }
  const seen = new Map<string, Rgb8>();
  for (const r of ramps) for (const c of r) seen.set(c.join(','), c);
  return { ramps, line, lines, colors: [...seen.values()] };
}

const LINE_INDEX = MATERIALS.indexOf('line');

function cellAt(s: Sprite, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= s.w || y >= s.h) return -1;
  return s.cells[y * s.w + x]!;
}

/**
 * Most frequent non-line material among the 8 neighbours (ties: lower material index); a line cell
 * touching only line cells (the corner of a sole, where two outlines meet) looks one ring further
 * out, so it takes the tint of the part it belongs to instead of the untinted default. -1 when
 * nothing is found within two cells.
 */
function borderingMaterial(s: Sprite, x: number, y: number): number {
  for (const r of [1, 2]) {
    const counts = new Array<number>(MATERIALS.length).fill(0);
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const v = cellAt(s, x + dx, y + dy);
        if (v < 0) continue;
        const m = v >> 3;
        if (m !== LINE_INDEX) counts[m]!++;
      }
    let best = -1;
    for (let m = 0; m < counts.length; m++)
      if (counts[m]! > (best < 0 ? 0 : counts[best]!)) best = m;
    if (best >= 0) return best;
  }
  return -1;
}

/** True for a line cell on the lit silhouette edge: open above or to the left, closed below and to the right. */
function onLitEdge(s: Sprite, x: number, y: number): boolean {
  const openTop = cellAt(s, x, y - 1) < 0 || cellAt(s, x - 1, y) < 0;
  const openBottom = cellAt(s, x, y + 1) < 0 || cellAt(s, x + 1, y) < 0;
  return openTop && !openBottom;
}

function lineColor(s: Sprite, x: number, y: number, palette: Palette, opts: PaintOptions): Rgb8 {
  if (opts.lineStyle === 'flat' && !opts.selout) return palette.line;
  const m = borderingMaterial(s, x, y);
  if (m < 0) return palette.line;
  if (opts.lineStyle === 'none') return palette.ramps[m]![0]!;
  if (opts.selout && onLitEdge(s, x, y)) return palette.ramps[m]![0]!;
  return opts.lineStyle === 'tinted' ? palette.lines[m]! : palette.line;
}

export function paint(
  s: Sprite,
  palette: Palette,
  opts: PaintOptions = DEFAULT_PAINT_OPTIONS,
): RGBAImage {
  const img = createImage(s.w, s.h);
  for (let i = 0; i < s.cells.length; i++) {
    const v = s.cells[i]!;
    if (v < 0) continue;
    const cell = unpackCell(v);
    const c =
      cell.material === 'line'
        ? lineColor(s, i % s.w, Math.floor(i / s.w), palette, opts)
        : palette.ramps[MATERIALS.indexOf(cell.material)]![cell.shade]!;
    img.data[i * 4] = c[0];
    img.data[i * 4 + 1] = c[1];
    img.data[i * 4 + 2] = c[2];
    img.data[i * 4 + 3] = 255;
  }
  return img;
}
