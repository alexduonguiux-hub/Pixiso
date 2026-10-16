/**
 * Sheet of every hero mannequin frame (S, N, W rows and the mirrored E row,
 * three frames each) on the 64×64 canvas, hero palette, ×4. The review
 * composite next to the reference is made by scripts/research.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { HERO_RAMP_OPTIONS, scaleNearest, type RGBAImage } from '@pixiso/pixel-core';
import {
  buildPalette,
  compose,
  flipX,
  HERO_CANVAS,
  HERO_VIEWS,
  heroFrames,
  paint,
} from '@pixiso/sprite-kit';
import { TEST_OUTPUT_DIR } from './lib/paths.js';

const OUT = path.join(TEST_OUTPUT_DIR, 'variants');
fs.mkdirSync(OUT, { recursive: true });
const SCALE = Number(process.env.SCALE ?? 4);
const palette = buildPalette(
  { skin: [249, 209, 173], eye: [40, 95, 110], white: [212, 230, 238] },
  HERO_RAMP_OPTIONS,
);
const rows = [...HERO_VIEWS, 'E' as const];
const sheet: RGBAImage = {
  width: HERO_CANVAS * 3,
  height: HERO_CANVAS * rows.length,
  data: new Uint8ClampedArray(HERO_CANVAS * 3 * HERO_CANVAS * rows.length * 4),
};
for (let i = 0; i < sheet.data.length; i += 4) sheet.data.set([232, 228, 220, 255], i);
rows.forEach((view, r) => {
  const frames = heroFrames(view === 'E' ? 'W' : view);
  frames.forEach((f, c) => {
    let cell = compose(
      [{ id: 'body', sprite: f.sprite, x: f.x, y: f.y, z: 0 }],
      HERO_CANVAS,
      HERO_CANVAS,
    );
    if (view === 'E') cell = flipX(cell);
    const img = paint(cell, palette, { lineStyle: 'tinted', selout: false });
    for (let y = 0; y < HERO_CANVAS; y++)
      for (let x = 0; x < HERO_CANVAS; x++) {
        const si = (y * HERO_CANVAS + x) * 4;
        if (img.data[si + 3] === 0) continue;
        sheet.data.set(
          img.data.subarray(si, si + 4),
          ((r * HERO_CANVAS + y) * sheet.width + c * HERO_CANVAS + x) * 4,
        );
      }
  });
});
const big = scaleNearest(sheet, SCALE);
const png = new PNG({ width: big.width, height: big.height });
png.data = Buffer.from(big.data.buffer, big.data.byteOffset, big.data.byteLength);
fs.writeFileSync(path.join(OUT, `hero_frames_x${SCALE}.png`), PNG.sync.write(png));
const one = new PNG({ width: sheet.width, height: sheet.height });
one.data = Buffer.from(sheet.data.buffer, sheet.data.byteOffset, sheet.data.byteLength);
fs.writeFileSync(path.join(OUT, 'hero_frames_x1.png'), PNG.sync.write(one));
console.log(`-> test-output/variants/hero_frames_x${SCALE}.png`);
