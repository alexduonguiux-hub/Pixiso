/**
 * Walk sheet of the posed cast whose stances step (D-101): one row per look,
 * and for each of the eight directions the cycle step A, standing, step B,
 * standing. SCALE (default 4), BG=r,g,b, ONLY=id,id. Also writes the derived
 * step figures (bodies before dressing) as ASCII JSON to
 * test-output/posedwalk/figures.json for scripts/research/pixel_lint.py.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { scaleNearest, type RGBAImage } from '@pixiso/pixel-core';
import {
  buildOutfit,
  buildPalette,
  compose,
  dress,
  flipX,
  HERO_CANVAS,
  HERO_GROUND,
  HERO_PIVOT,
  HERO_RAMPS,
  HERO_VIEWS,
  paint,
  POSED_BODIES,
  POSED_LOOKS,
  posedBodySteps,
  posedStep,
  poseInView,
  toAscii,
  type HeroView,
} from '@pixiso/sprite-kit';
import { TEST_OUTPUT_DIR } from './lib/paths.js';

const OUT = path.join(TEST_OUTPUT_DIR, 'posedwalk');
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
const CYCLE = [0, 1, 2, 1] as const;

const looks = POSED_LOOKS.filter(
  (l) =>
    (!ONLY || ONLY.includes(l.id)) && posedBodySteps(POSED_BODIES.find((b) => b.id === l.pose.id)!),
);
const cols = DIRECTIONS.length * CYCLE.length;
const sheet: RGBAImage = {
  width: HERO_CANVAS * cols,
  height: HERO_CANVAS * looks.length,
  data: new Uint8ClampedArray(HERO_CANVAS * cols * HERO_CANVAS * looks.length * 4),
};
for (let i = 0; i < sheet.data.length; i += 4) sheet.data.set([...BG, 255], i);
looks.forEach((l, r) => {
  const body = POSED_BODIES.find((b) => b.id === l.pose.id)!;
  DIRECTIONS.forEach((dir, d) => {
    const { view, mirror } = SOURCE[dir];
    const stand = poseInView(body.pose, view)!;
    const poses = [posedStep(body, view, 0)!, stand, posedStep(body, view, 1)!];
    CYCLE.forEach((k, c) => {
      const pose = poses[k]!;
      const outfit = buildOutfit(l.id, l.label, pose, l.look, view);
      const s = dress(pose.form.figure!, outfit);
      const standFig = stand.form.figure!;
      const ground = HERO_GROUND + (view === 'W' ? 1 : 0);
      let cell = compose(
        [
          {
            id: 'body',
            sprite: s,
            x: HERO_PIVOT.x - Math.floor(standFig.w / 2) - s.ox,
            y: ground - (standFig.h - 1) - s.oy,
            z: 0,
          },
        ],
        HERO_CANVAS,
        HERO_CANVAS,
      );
      if (mirror) cell = flipX(cell);
      const img = paint(cell, buildPalette(outfit.colors, HERO_RAMPS), {
        lineStyle: 'tinted',
        selout: false,
      });
      const col = d * CYCLE.length + c;
      for (let y = 0; y < HERO_CANVAS; y++)
        for (let x = 0; x < HERO_CANVAS; x++) {
          const si = (y * HERO_CANVAS + x) * 4;
          if (img.data[si + 3] === 0) continue;
          sheet.data.set(
            img.data.subarray(si, si + 4),
            ((r * HERO_CANVAS + y) * sheet.width + col * HERO_CANVAS + x) * 4,
          );
        }
    });
  });
});
const big = scaleNearest(sheet, SCALE);
const png = new PNG({ width: big.width, height: big.height });
png.data = Buffer.from(big.data.buffer, big.data.byteOffset, big.data.byteLength);
const name = ONLY ? `posed_walk_${ONLY.join('_')}_x${SCALE}.png` : `posed_walk_x${SCALE}.png`;
fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));

// The derived step bodies for the pixel lint: the seam band only (three rows above the hem to three below),
// where the composition can create steps; the stance above and the hero's step legs below are linted on
// their own (the legs' sole blocks are the reference's, D-095).
const figures: Record<string, string[]> = {};
for (const body of POSED_BODIES.filter(posedBodySteps))
  for (const view of HERO_VIEWS)
    for (const step of [0, 1] as const) {
      const pose = posedStep(body, view, step);
      if (pose)
        figures[`${body.id}_${view}${step}`] = toAscii(pose.form.figure!).slice(
          pose.hem[1] - 3,
          pose.hem[1] + 4,
        );
    }
fs.writeFileSync(path.join(OUT, 'figures.json'), JSON.stringify(figures));
console.log(
  `-> test-output/posedwalk/${name} (${looks.length} rows), figures.json (${Object.keys(figures).length} step bodies)`,
);
