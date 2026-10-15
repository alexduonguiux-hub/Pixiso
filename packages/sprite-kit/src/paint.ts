import {
  buildRamp,
  createImage,
  DEFAULT_RAMP_OPTIONS,
  srgb8ToOklab,
  type RampOptions,
  type Rgb8,
  type RGBAImage,
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
  colors: Rgb8[];
}

/** Builds the concrete palette for a material colour set. Fixed-tone materials get flat ramps. */
export function buildPalette(
  colors: MaterialColors = {},
  ramp: RampOptions = DEFAULT_RAMP_OPTIONS,
): Palette {
  const ramps: Rgb8[][] = [];
  const line = colors.line ?? DEFAULT_MATERIAL_COLORS.line;
  for (const m of MATERIALS) {
    const base = colors[m] ?? DEFAULT_MATERIAL_COLORS[m];
    if (m === 'line' || m === 'eye' || m === 'white') {
      ramps.push([base, base, base]);
      continue;
    }
    const r = buildRamp(srgb8ToOklab(...base), ramp);
    ramps.push([r[0]!, r[1]!, r[2] ?? r[1]!]);
  }
  const seen = new Map<string, Rgb8>();
  for (const r of ramps) for (const c of r) seen.set(c.join(','), c);
  return { ramps, line, colors: [...seen.values()] };
}

export function paint(s: Sprite, palette: Palette): RGBAImage {
  const img = createImage(s.w, s.h);
  for (let i = 0; i < s.cells.length; i++) {
    const v = s.cells[i]!;
    if (v < 0) continue;
    const cell = unpackCell(v);
    const c = palette.ramps[MATERIALS.indexOf(cell.material)]![cell.shade]!;
    img.data[i * 4] = c[0];
    img.data[i * 4 + 1] = c[1];
    img.data[i * 4 + 2] = c[2];
    img.data[i * 4 + 3] = 255;
  }
  return img;
}
