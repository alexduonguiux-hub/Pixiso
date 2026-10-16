/** Hero 64 px body (mannequin and dressed), S and W, ×4, for the proportion review. */
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
  buildPalette,
  compose,
  DRESSED,
  HERO_64,
  HERO_64_TALL,
  heroBody,
  MANNEQUIN,
  paint,
  REFERENCE_PAINT_OPTIONS,
  toAscii,
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
const pal = buildPalette({}, REFERENCE_RAMP_OPTIONS);
function frame(view: View, outfit = MANNEQUIN, params = HERO_64) {
  const body = heroBody(params, outfit)[view]!;
  const layers: Layer[] = (
    Object.entries(body.parts) as [LimbId, (typeof body.parts)[LimbId]][]
  ).map(([id, part]) => ({ id, sprite: part.sprite, x: part.x, y: part.y, z: part.z, edge: true }));
  return compose(layers, HERO_64.canvas, HERO_64.canvas, { outline: true });
}
const frames = [
  frame('S'),
  frame('W'),
  frame('S', DRESSED),
  frame('W', DRESSED),
  frame('S', MANNEQUIN, HERO_64_TALL),
  frame('W', MANNEQUIN, HERO_64_TALL),
  frame('S', DRESSED, HERO_64_TALL),
  frame('W', DRESSED, HERO_64_TALL),
];
const Z = 4;
const PAD = 16;
const sheet = createImage(PAD + frames.length * (64 * Z + PAD), PAD * 2 + 64 * Z);
for (let i = 0; i < sheet.data.length; i += 4) {
  const px = (i / 4) % sheet.width;
  const py = Math.floor(i / 4 / sheet.width);
  const v = (Math.floor(px / 16) + Math.floor(py / 16)) % 2 === 0 ? 0x2a : 0x22;
  sheet.data[i] = v;
  sheet.data[i + 1] = v;
  sheet.data[i + 2] = v + 6;
  sheet.data[i + 3] = 255;
}
frames.forEach((f, i) => {
  const img = scaleNearest(paint(f, pal, REFERENCE_PAINT_OPTIONS), Z);
  const x0 = PAD + i * (64 * Z + PAD);
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      const si = (y * img.width + x) * 4;
      if (img.data[si + 3] !== 255) continue;
      const di = ((PAD + y) * sheet.width + (x0 + x)) * 4;
      sheet.data[di] = img.data[si]!;
      sheet.data[di + 1] = img.data[si + 1]!;
      sheet.data[di + 2] = img.data[si + 2]!;
      sheet.data[di + 3] = 255;
    }
});
writePng(path.join(OUT, 'hero64_x4.png'), sheet);
console.log(toAscii(frames[0]!).join('\n'));
console.log(`-> ${path.relative(process.cwd(), OUT)}/hero64_x4.png`);
