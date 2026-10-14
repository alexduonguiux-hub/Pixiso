import { describe, expect, it } from 'vitest';
import {
  addRampOutline,
  allocateShades,
  baseCountFor,
  buildRampPalette,
  classifyBand,
  composeFrame,
} from './compose.js';
import { imageFromAscii } from './fixtures.test-util.js';
import { linearToSrgb } from './oklab.js';
import { countColors } from './stats.js';
import { createImage, type RGBAImage } from './types.js';

const RED: [number, number, number] = [200, 50, 50];
const BLUE: [number, number, number] = [50, 60, 200];

/** k× albedo/light pair for a 2×2 block layout described as ASCII (one char per 1× pixel). */
function passes(
  rows: string[],
  k: number,
  bands: Record<string, number>,
  coverage: Record<string, number> = {},
) {
  const W = rows[0]!.length;
  const H = rows.length;
  const albedo = createImage(W * k, H * k);
  const light = createImage(W * k, H * k);
  const bandByte = (b: number) => Math.round(linearToSrgb([0.35, 0.7, 1.0][b]!) * 255);
  rows.forEach((row, y) => {
    for (let x = 0; x < W; x++) {
      const ch = row[x]!;
      if (ch === '.') continue;
      const color = ch === 'R' || ch === 'r' ? RED : BLUE;
      const band = bands[ch] ?? 1;
      const cov = coverage[ch] ?? 1;
      let n = 0;
      for (let sy = 0; sy < k; sy++) {
        for (let sx = 0; sx < k; sx++) {
          if (n++ >= cov * k * k) continue;
          const i = ((y * k + sy) * (W * k) + (x * k + sx)) * 4;
          albedo.data.set([...color, 255], i);
          light.data.set([bandByte(band), bandByte(band), bandByte(band), 255], i);
        }
      }
    }
  });
  return { albedo, light };
}

describe('compose', () => {
  it('reserves one colour for the line and gives extra shades to the largest materials', () => {
    expect(baseCountFor(16)).toBe(8);
    expect(baseCountFor(8)).toBe(3);
    expect(baseCountFor(32)).toBe(17);
    // 7 bases, budget 15: 7 mids + 8 extra -> the 4 largest get 3 shades
    expect(allocateShades([50, 20, 10, 8, 5, 4, 3], 16, 3)).toEqual([3, 3, 3, 3, 1, 1, 1]);
    // 8 bases, budget 15: 8 mids + 7 extra -> 3 full ramps + one 2-shade; tiny accents stay flat
    expect(allocateShades([40, 20, 15, 10, 6, 5, 3, 1], 16, 3)).toEqual([3, 3, 3, 2, 1, 1, 1, 1]);
    // 3 bases, budget 7: 3 mids + 4 extra -> two full ramps, one single colour
    expect(allocateShades([5, 50, 20], 8, 3)).toEqual([1, 3, 3]);
    // tight budget: nothing beyond mids
    expect(allocateShades([1, 1, 1], 4, 3)).toEqual([1, 1, 1]);
  });

  it('classifies light bytes into bands', () => {
    const bands = [0.35, 0.7, 1.0];
    expect(classifyBand(Math.round(linearToSrgb(0.35) * 255), bands, 3)).toBe(0);
    expect(classifyBand(Math.round(linearToSrgb(0.7) * 255), bands, 3)).toBe(1);
    expect(classifyBand(255, bands, 3)).toBe(2);
    expect(classifyBand(255, bands, 2)).toBe(1);
  });

  it('builds ramps from albedo and composes with majority vote and coverage', () => {
    const k = 4;
    const { albedo, light } = passes(['RB', 'Rr'], k, { R: 1, B: 1, r: 0 }, { r: 0.25 });
    const pal = buildRampPalette([albedo], 7);
    expect(pal.bases.length).toBe(2);
    expect(pal.colors.length).toBeLessThanOrEqual(7);
    const res = composeFrame(albedo, light, pal, k, [0.35, 0.7, 1.0], 0.5);
    expect(res.image.width).toBe(2);
    expect(res.index[0]).toBeGreaterThanOrEqual(0);
    expect(res.index[1]).toBeGreaterThanOrEqual(0);
    expect(res.index[3]).toBe(-1); // only 25 % covered -> transparent
    // pixel (0,0) is red mid band, (1,0) blue mid band -> different bases
    expect(Math.floor(res.index[0]! / 3)).not.toBe(Math.floor(res.index[1]! / 3));
    expect(countColors(res.image)).toBeLessThanOrEqual(pal.colors.length);
  });

  it('never invents colours outside the ramp palette', () => {
    const k = 2;
    const { albedo, light } = passes(['RRBB', 'RBRB'], k, { R: 2, B: 0 });
    const pal = buildRampPalette([albedo], 7);
    const res = composeFrame(albedo, light, pal, k, [0.35, 0.7, 1.0]);
    const allowed = new Set(pal.colors.map((c) => c.join(',')));
    for (let i = 0; i < res.image.data.length; i += 4) {
      if (res.image.data[i + 3] !== 255) continue;
      expect(
        allowed.has(`${res.image.data[i]},${res.image.data[i + 1]},${res.image.data[i + 2]}`),
      ).toBe(true);
    }
  });

  it('selective outline uses the shadow shade next to lit pixels and the line colour next to shadow', () => {
    const k = 1;
    const { albedo, light } = passes(['....', '.RR.', '.Rr.', '....'], k, { R: 2, r: 0 });
    const pal = buildRampPalette([albedo], 4);
    const res = composeFrame(albedo, light, pal, k, [0.35, 0.7, 1.0]);
    const mask = addRampOutline(res, pal, 'selective');
    const px = (x: number, y: number): [number, number, number] => {
      const i = (y * 4 + x) * 4;
      return [res.image.data[i]!, res.image.data[i + 1]!, res.image.data[i + 2]!];
    };
    expect(mask[1 * 4 + 0]).toBe(1);
    expect(px(0, 1)).toEqual(pal.ramps[0]![0]); // left of a highlighted red pixel -> red shadow shade
    expect(px(2, 3)).toEqual(pal.line); // below the shadowed pixel -> line colour
    expect(mask.reduce((a, b) => a + b, 0)).toBe(8);
  });

  it('dark outline uses only the line colour', () => {
    const img: RGBAImage = imageFromAscii(['.'], { R: [1, 2, 3] });
    void img;
    const { albedo, light } = passes(['.R.'], 1, { R: 1 });
    const pal = buildRampPalette([albedo], 4);
    const res = composeFrame(albedo, light, pal, 1, [0.35, 0.7, 1.0]);
    addRampOutline(res, pal, 'dark');
    expect([res.image.data[0], res.image.data[1], res.image.data[2]]).toEqual(pal.line);
  });
});
