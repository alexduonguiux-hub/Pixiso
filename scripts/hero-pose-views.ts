/**
 * Zombie poses in every direction: one row per posed look (POSED_LOOKS),
 * columns S, SW, W, NW, N, NE, E, SE; a direction whose pose is not drawn
 * yet stays empty. SCALE (default 4), BG=r,g,b, ONLY=id,id.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { scaleNearest, type RGBAImage } from '@pixiso/pixel-core';
import {
  buildPalette,
  compose,
  dress,
  flipX,
  HERO_CANVAS,
  HERO_GROUND,
  HERO_PIVOT,
  paint,
  POSED_LOOKS,
  posedInView,
  type HeroView,
  HERO_RAMPS,
} from '@pixiso/sprite-kit';
import { TEST_OUTPUT_DIR } from './lib/paths.js';

const OUT = path.join(TEST_OUTPUT_DIR, 'variants');
fs.mkdirSync(OUT, { recursive: true });
const SCALE = Number(process.env.SCALE ?? 4);
const BG = (process.env.BG ?? '110,106,100').split(',').map(Number) as [number, number, number];
const ONLY = process.env.ONLY?.split(',').filter(Boolean);
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
const ids = POSED_LOOKS.map((z) => z.id).filter((id) => !ONLY || ONLY.includes(id));
const byView = new Map<HeroView, Map<string, ReturnType<typeof posedInView>[number]>>();
for (const view of ['S', 'SW', 'W', 'NW', 'N'] as const)
  byView.set(view, new Map(posedInView(view).map((o) => [o.id, o])));
const sheet: RGBAImage = {
  width: HERO_CANVAS * DIRECTIONS.length,
  height: HERO_CANVAS * ids.length,
  data: new Uint8ClampedArray(HERO_CANVAS * DIRECTIONS.length * HERO_CANVAS * ids.length * 4),
};
for (let i = 0; i < sheet.data.length; i += 4) sheet.data.set([...BG, 255], i);
ids.forEach((id, r) => {
  DIRECTIONS.forEach((dir, c) => {
    const { view, mirror } = SOURCE[dir];
    const outfit = byView.get(view)?.get(id);
    if (!outfit) return;
    const figure = outfit.form!.figure!;
    const s = dress(figure, outfit);
    // The side view's soles sit one row lower than the others (as the reference frames do).
    const ground = HERO_GROUND + (view === 'W' ? 1 : 0);
    const x = HERO_PIVOT.x - Math.floor(figure.w / 2) - s.ox;
    const y = ground - (figure.h - 1) - s.oy;
    let cell = compose([{ id: 'body', sprite: s, x, y, z: 0 }], HERO_CANVAS, HERO_CANVAS);
    if (mirror) cell = flipX(cell);
    const img = paint(cell, buildPalette(outfit.colors, HERO_RAMPS), {
      lineStyle: 'tinted',
      selout: false,
    });
    for (let yy = 0; yy < HERO_CANVAS; yy++)
      for (let xx = 0; xx < HERO_CANVAS; xx++) {
        const si = (yy * HERO_CANVAS + xx) * 4;
        if (img.data[si + 3] === 0) continue;
        sheet.data.set(
          img.data.subarray(si, si + 4),
          ((r * HERO_CANVAS + yy) * sheet.width + c * HERO_CANVAS + xx) * 4,
        );
      }
  });
});
const big = scaleNearest(sheet, SCALE);
const png = new PNG({ width: big.width, height: big.height });
png.data = Buffer.from(big.data.buffer, big.data.byteOffset, big.data.byteLength);
const name = ONLY
  ? `hero_pose_views_${ONLY.join('_')}_x${SCALE}.png`
  : `hero_pose_views_x${SCALE}.png`;
fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
console.log(`-> test-output/variants/${name} (${ids.length} rows)`);
