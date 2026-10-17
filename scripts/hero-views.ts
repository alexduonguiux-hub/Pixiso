/**
 * Eight-direction sheet of the standing base figure: one row per character
 * (the bare mannequin first, then BASE_LOOKS), columns S, SW, W, NW, N, NE,
 * E, SE. S/SW/W/NW/N are drawn; NE/E/SE mirror NW/W/SW (plain flip, D-042).
 * SCALE (default 4), BG=r,g,b, ONLY=id,id to pick characters, DUMP=path to
 * write the standing figures as ASCII JSON for the item generator.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { HERO_RAMP_OPTIONS, scaleNearest, type RGBAImage } from '@pixiso/pixel-core';
import {
  BASE_LOOKS,
  buildPalette,
  compose,
  dress,
  flipX,
  HEAVY_BODY,
  HEAVY_HEAD_X,
  HERO_CANVAS,
  HERO_VIEWS,
  heroStand,
  paint,
  POSE_BODIES,
  POSE_CRAWL,
  STAND_HEAVY,
  STAND_VIEWS,
  toAscii,
  wearView,
  ZOMBIE_BODY,
  ZOMBIE_HEAD_TOP,
  ZOMBIE_POSES,
  zombieHeadShift,
  type DressedSprite,
  type HeroView,
  type MaterialColors,
} from '@pixiso/sprite-kit';
import { TEST_OUTPUT_DIR } from './lib/paths.js';

const OUT = path.join(TEST_OUTPUT_DIR, 'variants');
fs.mkdirSync(OUT, { recursive: true });
const SCALE = Number(process.env.SCALE ?? 4);
const BG = (process.env.BG ?? '110,106,100').split(',').map(Number) as [number, number, number];
const ONLY = process.env.ONLY?.split(',').filter(Boolean);
// DUMP=path writes the five standing figures as ASCII JSON (input of scripts/research/gen_view_items.py)
// and, for scripts/research/gen_pose_views.py, the S body of every zombie pose with where its
// 17-column head grid sits and its clothes regions, plus which poses also exist mirrored.
if (process.env.DUMP) {
  const out: Record<string, unknown> = {};
  for (const v of HERO_VIEWS) out[v] = toAscii(STAND_VIEWS[v].form.figure!);
  // `headX` is where column 0 of the 17-column head grid sits (posedFigure's convention; the drooped zombie draws its head from column 0).
  const bodies = {
    droop: { body: ZOMBIE_BODY, headX: 0, headTop: ZOMBIE_HEAD_TOP, shift: zombieHeadShift },
    ...POSE_BODIES,
    heavy: { body: HEAVY_BODY, headX: HEAVY_HEAD_X, headTop: 0, shift: () => 0 },
  };
  const allPoses = [...ZOMBIE_POSES, POSE_CRAWL, STAND_HEAVY];
  out['poses'] = Object.fromEntries(
    Object.entries(bodies).map(([k, b]) => {
      const { id: _id, form: _form, w: _w, ...regions } = allPoses.find((q) => q.id === k)!;
      void _id;
      void _form;
      void _w;
      return [
        k,
        {
          body: toAscii(b.body),
          hx: b.headX,
          hy: b.headTop,
          shift: Array.from({ length: 17 }, (_, i) => b.shift(i)),
          regions,
        },
      ];
    }),
  );
  out['mirrored'] = ZOMBIE_POSES.filter((q) => q.id.endsWith('_m')).map((q) => q.id.slice(0, -2));
  fs.mkdirSync(path.dirname(process.env.DUMP), { recursive: true });
  fs.writeFileSync(process.env.DUMP, JSON.stringify(out));
  console.log(`-> ${process.env.DUMP}`);
}
export const DIRECTIONS = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'] as const;
export type Direction = (typeof DIRECTIONS)[number];
const SOURCE: Record<Direction, { view: HeroView; mirror: boolean }> = {
  S: { view: 'S', mirror: false },
  SW: { view: 'SW', mirror: false },
  W: { view: 'W', mirror: false },
  NW: { view: 'NW', mirror: false },
  N: { view: 'N', mirror: false },
  NE: { view: 'NW', mirror: true },
  E: { view: 'W', mirror: true },
  SE: { view: 'SW', mirror: true },
};
const MANNEQUIN: MaterialColors = {
  skin: [249, 209, 173],
  eye: [40, 95, 110],
  white: [212, 230, 238],
};
const rows: {
  id: string;
  cell: (view: HeroView) => { sprite: DressedSprite; colors: MaterialColors };
}[] = [
  {
    id: 'mannequin',
    cell: (view) => ({ sprite: { ...heroStand(view).sprite, ox: 0, oy: 0 }, colors: MANNEQUIN }),
  },
  ...BASE_LOOKS.filter((c) => !ONLY || ONLY.includes(c.id)).map((c) => ({
    id: c.id,
    cell: (view: HeroView) => {
      const outfit = wearView(c.id, c.label, c.look, view);
      return { sprite: dress(STAND_VIEWS[view].form.figure!, outfit), colors: outfit.colors };
    },
  })),
];
if (ONLY) rows.splice(0, 1);
const sheet: RGBAImage = {
  width: HERO_CANVAS * DIRECTIONS.length,
  height: HERO_CANVAS * rows.length,
  data: new Uint8ClampedArray(HERO_CANVAS * DIRECTIONS.length * HERO_CANVAS * rows.length * 4),
};
for (let i = 0; i < sheet.data.length; i += 4) sheet.data.set([...BG, 255], i);
rows.forEach((row, r) => {
  DIRECTIONS.forEach((dir, c) => {
    const { view, mirror } = SOURCE[dir];
    const { sprite, colors } = row.cell(view);
    const at = heroStand(view);
    let cell = compose(
      [{ id: 'body', sprite, x: at.x - sprite.ox, y: at.y - sprite.oy, z: 0 }],
      HERO_CANVAS,
      HERO_CANVAS,
    );
    if (mirror) cell = flipX(cell);
    const img = paint(cell, buildPalette(colors, HERO_RAMP_OPTIONS), {
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
const big = scaleNearest(sheet, SCALE);
const png = new PNG({ width: big.width, height: big.height });
png.data = Buffer.from(big.data.buffer, big.data.byteOffset, big.data.byteLength);
const name = ONLY ? `hero_views_${ONLY.join('_')}_x${SCALE}.png` : `hero_views_x${SCALE}.png`;
fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
console.log(`-> test-output/variants/${name} (${rows.length} rows)`);
