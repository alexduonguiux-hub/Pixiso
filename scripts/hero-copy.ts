/** Hand-drawn hero S mannequin next to nothing but itself at ×6 (the reference is composited by the review script). */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { REFERENCE_RAMP_OPTIONS, scaleNearest, type RGBAImage } from '@pixiso/pixel-core';
import {
  buildPalette,
  compose,
  HERO_CANVAS,
  heroViewS,
  paint,
  REFERENCE_PAINT_OPTIONS,
  toAscii,
  type Layer,
  type LimbId,
} from '@pixiso/sprite-kit';
import { TEST_OUTPUT_DIR } from './lib/paths.js';

const OUT = path.join(TEST_OUTPUT_DIR, 'variants');
fs.mkdirSync(OUT, { recursive: true });
function writePng(file: string, img: RGBAImage): void {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  fs.writeFileSync(file, PNG.sync.write(png));
}
const body = heroViewS();
const layers: Layer[] = (Object.entries(body.parts) as [LimbId, (typeof body.parts)[LimbId]][]).map(
  ([id, part]) => ({ id, sprite: part.sprite, x: part.x, y: part.y, z: part.z, edge: true }),
);
const frame = compose(layers, HERO_CANVAS, HERO_CANVAS, { outline: true });
const img = paint(frame, buildPalette({}, REFERENCE_RAMP_OPTIONS), REFERENCE_PAINT_OPTIONS);
writePng(path.join(OUT, 'hero_copy_S_x1.png'), img);
writePng(path.join(OUT, 'hero_copy_S_x6.png'), scaleNearest(img, 6));
console.log(toAscii(frame).slice(12, 64).join('\n'));
