/**
 * Dumps every dressed figure (base cast, soldiers, mutants, zombies and the
 * posed looks) in the five drawn views as 1x PNGs plus their semantic cells,
 * for scripts/research/score.py, which measures them with the same yardstick
 * as the reference sheet. Output: test-output/score/sprites/<id>__<view>.png
 * and test-output/score/sprites.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { type RGBAImage } from '@pixiso/pixel-core';
import {
  buildPalette,
  castInView,
  dress,
  paint,
  posedInView,
  toAscii,
  type HeroView,
  HERO_RAMPS,
} from '@pixiso/sprite-kit';
import { TEST_OUTPUT_DIR } from './lib/paths.js';

const OUT = path.join(TEST_OUTPUT_DIR, 'score', 'sprites');
fs.mkdirSync(OUT, { recursive: true });
function writePng(file: string, img: RGBAImage): void {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  fs.writeFileSync(file, PNG.sync.write(png));
}
const VIEWS: HeroView[] = ['S', 'SW', 'W', 'NW', 'N'];
const entries: {
  id: string;
  label: string;
  view: HeroView;
  w: number;
  h: number;
  rows: string[];
  png: string;
}[] = [];
for (const view of VIEWS) {
  for (const outfit of [...castInView(view), ...posedInView(view)]) {
    const figure = outfit.form!.figure!;
    const s = dress(figure, outfit);
    const img = paint(s, buildPalette(outfit.colors, HERO_RAMPS), {
      lineStyle: 'tinted',
      selout: false,
    });
    const file = `${outfit.id}__${view}.png`;
    writePng(path.join(OUT, file), img);
    entries.push({
      id: outfit.id,
      label: outfit.label,
      view,
      w: s.w,
      h: s.h,
      rows: toAscii(s),
      png: file,
    });
  }
}
fs.writeFileSync(path.join(TEST_OUTPUT_DIR, 'score', 'sprites.json'), JSON.stringify(entries));
console.log(`${entries.length} sprites -> test-output/score/sprites/`);
