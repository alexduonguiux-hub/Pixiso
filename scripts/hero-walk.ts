/**
 * Walk sheet of the standing cast (D-095): one row per character (the bare
 * mannequin first, then BASE_LOOKS), and for each of S, W, E, N the cycle
 * step A, standing, step B, standing (HERO_WALK_CYCLE). E mirrors W (D-042).
 * SCALE (default 4), BG=r,g,b, ONLY=id,id to pick characters. Also writes the
 * dressed step frames at 1x to test-output/walk/sprites/<id>__<view><step>.png
 * and test-output/walk/sprites.json (the score dump's shape, views `S0`, `S1`,
 * `N0`, `N1`, `W0`, `W1`) for the research scripts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { scaleNearest, type RGBAImage } from '@pixiso/pixel-core';
import {
  BASE_LOOKS,
  buildPalette,
  compose,
  dress,
  flipX,
  HERO_CANVAS,
  HERO_RAMPS,
  HERO_WALK_CYCLE,
  heroFrames,
  paint,
  STAND_VIEWS,
  toAscii,
  WALK_VIEWS,
  WALK_VIEWS_DRAWN,
  wearView,
  wearWalk,
  type DressedSprite,
  type HeroView,
  type MaterialColors,
  type WalkView,
} from '@pixiso/sprite-kit';
import { TEST_OUTPUT_DIR } from './lib/paths.js';

const OUT = path.join(TEST_OUTPUT_DIR, 'walk');
const SPRITES = path.join(OUT, 'sprites');
fs.mkdirSync(SPRITES, { recursive: true });
const SCALE = Number(process.env.SCALE ?? 4);
const BG = (process.env.BG ?? '110,106,100').split(',').map(Number) as [number, number, number];
const ONLY = process.env.ONLY?.split(',').filter(Boolean);

const DIRECTIONS = ['S', 'W', 'E', 'N'] as const;
const SOURCE: Record<(typeof DIRECTIONS)[number], { view: WalkView; mirror: boolean }> = {
  S: { view: 'S', mirror: false },
  W: { view: 'W', mirror: false },
  E: { view: 'W', mirror: true },
  N: { view: 'N', mirror: false },
};
const MANNEQUIN: MaterialColors = {
  skin: [249, 209, 173],
  eye: [40, 95, 110],
  white: [212, 230, 238],
};

/** A dressed frame: index 0 step A, 1 standing, 2 step B (heroFrames order). */
type Cell = { sprite: DressedSprite; colors: MaterialColors };
const rows: { id: string; cell: (view: WalkView, frame: 0 | 1 | 2) => Cell }[] = [
  {
    id: 'mannequin',
    cell: (view, frame) => ({
      sprite: { ...heroFrames(view)[frame].sprite, ox: 0, oy: 0 },
      colors: MANNEQUIN,
    }),
  },
  ...BASE_LOOKS.filter((c) => !ONLY || ONLY.includes(c.id)).map((c) => ({
    id: c.id,
    cell: (view: WalkView, frame: 0 | 1 | 2): Cell => {
      if (frame === 1) {
        const outfit = wearView(c.id, c.label, c.look, view);
        return { sprite: dress(STAND_VIEWS[view].form.figure!, outfit), colors: outfit.colors };
      }
      const step = frame === 0 ? 0 : 1;
      const outfit = wearWalk(c.id, c.label, c.look, view, step);
      return { sprite: dress(WALK_VIEWS[view][step].form.figure!, outfit), colors: outfit.colors };
    },
  })),
];
if (ONLY) rows.splice(0, 1);

function writePng(file: string, img: RGBAImage): void {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  fs.writeFileSync(file, PNG.sync.write(png));
}

const cols = DIRECTIONS.length * HERO_WALK_CYCLE.length;
const sheet: RGBAImage = {
  width: HERO_CANVAS * cols,
  height: HERO_CANVAS * rows.length,
  data: new Uint8ClampedArray(HERO_CANVAS * cols * HERO_CANVAS * rows.length * 4),
};
for (let i = 0; i < sheet.data.length; i += 4) sheet.data.set([...BG, 255], i);
rows.forEach((row, r) => {
  DIRECTIONS.forEach((dir, d) => {
    const { view, mirror } = SOURCE[dir];
    HERO_WALK_CYCLE.forEach((frame, k) => {
      const c = d * HERO_WALK_CYCLE.length + k;
      const { sprite, colors } = row.cell(view, frame as 0 | 1 | 2);
      const at = heroFrames(view)[frame]!;
      let cell = compose(
        [{ id: 'body', sprite, x: at.x - sprite.ox, y: at.y - sprite.oy, z: 0 }],
        HERO_CANVAS,
        HERO_CANVAS,
      );
      if (mirror) cell = flipX(cell);
      const img = paint(cell, buildPalette(colors, HERO_RAMPS), {
        lineStyle: 'tinted',
        selout: false,
      });
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
});
const big = scaleNearest(sheet, SCALE);
const name = ONLY ? `hero_walk_${ONLY.join('_')}_x${SCALE}.png` : `hero_walk_x${SCALE}.png`;
writePng(path.join(OUT, name), big);
console.log(`-> test-output/walk/${name} (${rows.length} rows)`);

// 1x dump of the dressed steps (same shape as test-output/score/sprites.json; view = `${view}${step}`)
if (!ONLY) {
  const entries: {
    id: string;
    label: string;
    view: string;
    w: number;
    h: number;
    rows: string[];
    baseRows: string[];
    png: string;
  }[] = [];
  for (const view of WALK_VIEWS_DRAWN as readonly HeroView[])
    for (const step of [0, 1] as const)
      for (const c of BASE_LOOKS) {
        const outfit = wearWalk(c.id, c.label, c.look, view as WalkView, step);
        const figure = WALK_VIEWS[view as WalkView][step].form.figure!;
        const s = dress(figure, outfit);
        const img = paint(s, buildPalette(outfit.colors, HERO_RAMPS), {
          lineStyle: 'tinted',
          selout: false,
        });
        const file = `${c.id}__${view}${step}.png`;
        writePng(path.join(SPRITES, file), img);
        entries.push({
          id: c.id,
          label: c.label,
          view: `${view}${step}`,
          w: s.w,
          h: s.h,
          rows: toAscii(s),
          baseRows: toAscii(figure),
          png: file,
        });
      }
  fs.writeFileSync(path.join(OUT, 'sprites.json'), JSON.stringify(entries));
  console.log(`${entries.length} step sprites -> test-output/walk/sprites/`);
}
