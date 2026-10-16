/**
 * Renders the hand-drawn hero S mannequin at ×1 and ×6 in two palettes: the
 * project's ink outline, and the reference's brown outline with its skin and
 * eye colours. The review composite next to the reference is made separately.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import {
  HERO_RAMP_OPTIONS,
  REFERENCE_RAMP_OPTIONS,
  scaleNearest,
  type RGBAImage,
} from '@pixiso/pixel-core';
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
// The hero templates carry their own outline: no edge lines, no silhouette outline.
const layers: Layer[] = (Object.entries(body.parts) as [LimbId, (typeof body.parts)[LimbId]][]).map(
  ([id, part]) => ({ id, sprite: part.sprite, x: part.x, y: part.y, z: part.z }),
);
const frame = compose(layers, HERO_CANVAS, HERO_CANVAS);

const ink = paint(frame, buildPalette({}, REFERENCE_RAMP_OPTIONS), REFERENCE_PAINT_OPTIONS);
writePng(path.join(OUT, 'hero_copy_S_x1.png'), ink);
writePng(path.join(OUT, 'hero_copy_S_x6.png'), scaleNearest(ink, 6));

const warmPalette = buildPalette(
  { skin: [249, 209, 173], eye: [40, 95, 110], white: [212, 230, 238] },
  HERO_RAMP_OPTIONS,
);
const warm = paint(frame, warmPalette, { lineStyle: 'tinted', selout: false });
writePng(path.join(OUT, 'hero_copy_S_warm_x1.png'), warm);
writePng(path.join(OUT, 'hero_copy_S_warm_x6.png'), scaleNearest(warm, 6));

console.log(toAscii(frame).slice(20, 62).join('\n'));
console.log('skin ramp', warmPalette.ramps[0], 'line', warmPalette.lines[0]);
