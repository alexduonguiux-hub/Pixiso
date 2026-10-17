/**
 * Line-up of outfits on the hero mannequin (front view), ×SCALE.
 * SET=cast (default) renders the Vùng Xanh cast, SET=zombies the zombie
 * variants, SET=mutants the mutants, SET=all everything in one row.
 * BG=r,g,b sets the background (default a mid grey).
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { HERO_RAMP_OPTIONS, scaleNearest, type RGBAImage } from '@pixiso/pixel-core';
import {
  buildForm,
  buildPalette,
  CAST,
  dress,
  FORM_BASE,
  paint,
  MUTANTS,
  ZOMBIES,
} from '@pixiso/sprite-kit';
import { TEST_OUTPUT_DIR } from './lib/paths.js';

const OUT = path.join(TEST_OUTPUT_DIR, 'variants');
fs.mkdirSync(OUT, { recursive: true });
const SCALE = Number(process.env.SCALE ?? 5);
const SET = process.env.SET ?? 'cast';
/** Review background (mid grey, close to the game's scenes); BG=r,g,b overrides. */
const BG = (process.env.BG ?? '110,106,100').split(',').map(Number) as [number, number, number];
const outfits =
  SET === 'zombies'
    ? ZOMBIES
    : SET === 'mutants'
      ? MUTANTS
      : SET === 'all'
        ? [...CAST, ...ZOMBIES, ...MUTANTS]
        : CAST;
const figures = outfits.map((outfit) => {
  const figure = dress(buildForm(outfit.form ?? FORM_BASE), outfit);
  const palette = buildPalette(outfit.colors, HERO_RAMP_OPTIONS);
  return { outfit, img: paint(figure, palette, { lineStyle: 'tinted', selout: false }) };
});
const gap = 8;
const h = Math.max(...figures.map((f) => f.img.height)) + 2;
const w = figures.reduce((a, f) => a + f.img.width + gap, gap);
const sheet: RGBAImage = { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
for (let i = 0; i < sheet.data.length; i += 4) sheet.data.set([...BG, 255], i);
let x = gap;
for (const f of figures) {
  const y = h - 1 - f.img.height;
  for (let yy = 0; yy < f.img.height; yy++)
    for (let xx = 0; xx < f.img.width; xx++) {
      const si = (yy * f.img.width + xx) * 4;
      if (f.img.data[si + 3] === 0) continue;
      sheet.data.set(f.img.data.subarray(si, si + 4), ((y + yy) * w + x + xx) * 4);
    }
  console.log(`${f.outfit.id}: ${f.img.width}×${f.img.height}`);
  x += f.img.width + gap;
}
const big = scaleNearest(sheet, SCALE);
const png = new PNG({ width: big.width, height: big.height });
png.data = Buffer.from(big.data.buffer, big.data.byteOffset, big.data.byteLength);
const name = SET === 'cast' ? 'hero_cast' : `hero_${SET}`;
fs.writeFileSync(path.join(OUT, `${name}_x${SCALE}.png`), PNG.sync.write(png));
console.log(`-> test-output/variants/${name}_x${SCALE}.png`);
