/** The hand-drawn hero with a brown outline and blue eyes, closer to the reference's palette. */
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
  type Layer,
  type LimbId,
} from '@pixiso/sprite-kit';
import { TEST_OUTPUT_DIR } from './lib/paths.js';

const OUT = path.join(TEST_OUTPUT_DIR, 'variants');
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
const pal = buildPalette(
  { skin: [240, 196, 160], eye: [60, 120, 190], line: [78, 44, 30] },
  REFERENCE_RAMP_OPTIONS,
);
const img = paint(frame, pal, { lineStyle: 'flat', selout: false });
writePng(path.join(OUT, 'hero_copy_S_warm_x6.png'), scaleNearest(img, 6));
