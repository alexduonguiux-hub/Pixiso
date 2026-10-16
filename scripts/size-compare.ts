/** The same chibi at 32, 48 and 64 px native, shown at equal display height and at true ×2. */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import {
  createImage,
  REFERENCE_RAMP_OPTIONS,
  scaleNearest,
  type RGBAImage,
} from '@pixiso/pixel-core';
import {
  buildBody,
  buildPalette,
  CHIBI_48,
  CHIBI_64,
  CHIBI_CLASSIC,
  compose,
  paint,
  REFERENCE_PAINT_OPTIONS,
  type BodyParams,
  type Layer,
  type LimbId,
  type View,
} from '@pixiso/sprite-kit';
import { TEST_OUTPUT_DIR } from './lib/paths.js';

const OUT = path.join(TEST_OUTPUT_DIR, 'variants');
fs.mkdirSync(OUT, { recursive: true });

function writePng(file: string, img: RGBAImage): void {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  fs.writeFileSync(file, PNG.sync.write(png));
}

function frame(p: BodyParams, view: View): RGBAImage {
  const body = buildBody(p)[view];
  const layers: Layer[] = (
    Object.entries(body.parts) as [LimbId, (typeof body.parts)[LimbId]][]
  ).map(([id, part]) => ({ id, sprite: part.sprite, x: part.x, y: part.y, z: part.z, edge: true }));
  const s = compose(layers, p.canvas, p.canvas, { outline: true });
  return paint(s, buildPalette({}, REFERENCE_RAMP_OPTIONS), REFERENCE_PAINT_OPTIONS);
}

const SETS: [string, BodyParams, number][] = [
  ['32 px (x6)', CHIBI_CLASSIC, 6],
  ['48 px (x4)', CHIBI_48, 4],
  ['64 px (x3)', CHIBI_64, 3],
];
const PAD = 16;
const views: View[] = ['S', 'SW', 'W', 'N'];
const cell = 192;
const sheet = createImage(
  PAD + SETS.length * views.length * (cell + PAD) + 2 * PAD,
  PAD + (cell + PAD) + (128 + PAD) + PAD,
);
for (let i = 0; i < sheet.data.length; i += 4) {
  const px = (i / 4) % sheet.width;
  const py = Math.floor(i / 4 / sheet.width);
  const v = (Math.floor(px / 16) + Math.floor(py / 16)) % 2 === 0 ? 0x2a : 0x22;
  sheet.data[i] = v;
  sheet.data[i + 1] = v;
  sheet.data[i + 2] = v + 6;
  sheet.data[i + 3] = 255;
}
function blit(img: RGBAImage, x: number, y: number) {
  for (let sy = 0; sy < img.height; sy++)
    for (let sx = 0; sx < img.width; sx++) {
      const si = (sy * img.width + sx) * 4;
      if (img.data[si + 3] !== 255) continue;
      const di = ((y + sy) * sheet.width + (x + sx)) * 4;
      sheet.data[di] = img.data[si]!;
      sheet.data[di + 1] = img.data[si + 1]!;
      sheet.data[di + 2] = img.data[si + 2]!;
      sheet.data[di + 3] = 255;
    }
}
let x = PAD;
SETS.forEach(([name, p, zoom]) => {
  for (const v of views) {
    const f = frame(p, v);
    blit(scaleNearest(f, zoom), x, PAD);
    // true export size (×2) underneath, bottom-aligned
    const two = scaleNearest(f, 2);
    blit(two, x, PAD + cell + PAD + (128 - two.height));
    x += cell + PAD;
  }
  console.log(`${name}: frame ${p.canvas}×${p.canvas}`);
  x += PAD;
});
writePng(path.join(OUT, 'size_compare.png'), sheet);
console.log(`-> ${path.relative(process.cwd(), OUT)}/size_compare.png`);
