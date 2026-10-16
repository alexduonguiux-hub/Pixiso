import { describe, expect, it } from 'vitest';
import { REFERENCE_RAMP_OPTIONS, type RGBAImage, type Rgb8 } from '@pixiso/pixel-core';
import { MATERIALS, parseSprite } from './format.js';
import { buildPalette, paint, REFERENCE_PAINT_OPTIONS } from './paint.js';

function px(img: RGBAImage, x: number, y: number): Rgb8 {
  const o = (y * img.width + x) * 4;
  return [img.data[o]!, img.data[o + 1]!, img.data[o + 2]!];
}

describe('paint outline styles', () => {
  const s = parseSprite(['ooo', 'oco', 'ooo']);
  const pal = buildPalette({}, REFERENCE_RAMP_OPTIONS);
  const cloth = MATERIALS.indexOf('cloth');

  it('flat style paints every line cell with palette.line', () => {
    const img = paint(s, pal);
    expect(px(img, 0, 0)).toEqual(pal.line);
    expect(px(img, 1, 2)).toEqual(pal.line);
  });

  it('tinted style takes the line colour of the bordering material', () => {
    const img = paint(s, pal, REFERENCE_PAINT_OPTIONS);
    expect(px(img, 0, 0)).toEqual(pal.lines[cloth]);
    expect(px(img, 1, 2)).toEqual(pal.lines[cloth]);
    expect(pal.lines[cloth]).not.toEqual(pal.line);
    expect(px(img, 1, 1)).toEqual(pal.ramps[cloth]![1]);
  });

  it('selout replaces only the lit (top/left) edge with the material shadow', () => {
    const img = paint(s, pal, { lineStyle: 'tinted', selout: true });
    expect(px(img, 1, 0)).toEqual(pal.ramps[cloth]![0]);
    expect(px(img, 0, 1)).toEqual(pal.ramps[cloth]![0]);
    expect(px(img, 1, 2)).toEqual(pal.lines[cloth]);
    expect(px(img, 2, 1)).toEqual(pal.lines[cloth]);
  });

  it('every tinted line is darker than every shade of a shaded material', () => {
    const shaded = MATERIALS.map((_m, i) => i).filter(
      (i) => !['line', 'eye', 'white'].includes(MATERIALS[i]!),
    );
    const minShade = Math.min(
      ...shaded.flatMap((i) => pal.ramps[i]!.map((c) => c[0] + c[1] + c[2])),
    );
    for (const i of shaded) {
      const l = pal.lines[i]!;
      expect(l[0] + l[1] + l[2]).toBeLessThan(minShade);
    }
  });
});
