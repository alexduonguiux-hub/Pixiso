/**
 * Sheet of the rat pack (D-099): one row per direction (S, SW, W, NW, N, NE,
 * E, SE), columns idle 0–1 then walk 0–3, scaled (SCALE, default 6) on a grey
 * background, to test-output/rats/rats_x{SCALE}.png. Also writes the rat units
 * (every view and pose) as ASCII JSON to test-output/rats/figures.json for
 * scripts/research/pixel_lint.py, and the composed frames to
 * test-output/rats/frames.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { scaleNearest, type RGBAImage } from '@pixiso/pixel-core';
import {
  buildPalette,
  flipX,
  HERO_RAMPS,
  HERO_VIEWS,
  paint,
  RAT_UNITS,
  ratClip,
  RATS_CANVAS,
  RATS_DEFAULT_COLORS,
  toAscii,
  type HeroView,
} from '@pixiso/sprite-kit';
import { TEST_OUTPUT_DIR } from './lib/paths.js';

const OUT = path.join(TEST_OUTPUT_DIR, 'rats');
fs.mkdirSync(OUT, { recursive: true });
const SCALE = Number(process.env.SCALE ?? 6);
const BG = (process.env.BG ?? '110,106,100').split(',').map(Number) as [number, number, number];

const DIRECTIONS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'] as const;
const SOURCE: Record<(typeof DIRECTIONS)[number], { view: HeroView; mirror: boolean }> = {
  S: { view: 'S', mirror: false },
  SW: { view: 'SW', mirror: false },
  W: { view: 'W', mirror: false },
  NW: { view: 'NW', mirror: false },
  N: { view: 'N', mirror: false },
  NE: { view: 'NW', mirror: true },
  E: { view: 'W', mirror: true },
  SE: { view: 'SW', mirror: true },
};

const palette = buildPalette(RATS_DEFAULT_COLORS, HERO_RAMPS);
const cols = 6;
const sheet: RGBAImage = {
  width: RATS_CANVAS * cols,
  height: RATS_CANVAS * DIRECTIONS.length,
  data: new Uint8ClampedArray(RATS_CANVAS * cols * RATS_CANVAS * DIRECTIONS.length * 4),
};
for (let i = 0; i < sheet.data.length; i += 4) sheet.data.set([...BG, 255], i);
const frames: Record<string, string[]> = {};
DIRECTIONS.forEach((dir, r) => {
  const { view, mirror } = SOURCE[dir];
  const cells = [...ratClip(view, 'idle'), ...ratClip(view, 'walk')];
  cells.forEach((cell, c) => {
    const s = mirror ? flipX(cell) : cell;
    frames[`${dir}_${c < 2 ? `idle${c}` : `walk${c - 2}`}`] = toAscii(s);
    const img = paint(s, palette, { lineStyle: 'tinted', selout: false });
    for (let y = 0; y < RATS_CANVAS; y++)
      for (let x = 0; x < RATS_CANVAS; x++) {
        const si = (y * RATS_CANVAS + x) * 4;
        if (img.data[si + 3] === 0) continue;
        sheet.data.set(
          img.data.subarray(si, si + 4),
          ((r * RATS_CANVAS + y) * sheet.width + c * RATS_CANVAS + x) * 4,
        );
      }
  });
});
const big = scaleNearest(sheet, SCALE);
const png = new PNG({ width: big.width, height: big.height });
png.data = Buffer.from(big.data.buffer, big.data.byteOffset, big.data.byteLength);
fs.writeFileSync(path.join(OUT, `rats_x${SCALE}.png`), PNG.sync.write(png));

const units: Record<string, string[]> = {};
for (const v of HERO_VIEWS)
  for (const pose of ['idle', 'a', 'b'] as const)
    units[`rat_${v}_${pose}`] = toAscii(RAT_UNITS[v][pose]);
fs.writeFileSync(path.join(OUT, 'figures.json'), JSON.stringify(units));
fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify(frames));
console.log(
  `-> test-output/rats/rats_x${SCALE}.png, figures.json (${Object.keys(units).length} units), frames.json`,
);
