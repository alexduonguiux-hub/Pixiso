/**
 * Dumps every dressed figure (base cast, soldiers, mutants, zombies and the
 * posed looks) in the five drawn views, and the base cast on the drawn walk
 * steps (views `S0`, `S1`, `N0`, `N1`, `W0`, `W1`; D-095), as 1x PNGs plus
 * their semantic cells, for scripts/research/score.py and qa_1x.py, which
 * measure them with the same yardstick as the reference sheet. Output:
 * test-output/score/sprites/<id>__<view>.png and test-output/score/sprites.json.
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
  posedWalkCast,
  walkCastInView,
  WALK_VIEWS,
  WALK_VIEWS_DRAWN,
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
  view: string;
  w: number;
  h: number;
  rows: string[];
  /** The undressed body: its own lint warnings are the baseline the dressing is judged against. */
  baseRows: string[];
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
      baseRows: toAscii(figure),
      png: file,
    });
  }
}
for (const view of WALK_VIEWS_DRAWN)
  for (const step of [0, 1] as const)
    for (const outfit of walkCastInView(view, step)) {
      const figure = WALK_VIEWS[view]![step].form.figure!;
      const s = dress(figure, outfit);
      const img = paint(s, buildPalette(outfit.colors, HERO_RAMPS), {
        lineStyle: 'tinted',
        selout: false,
      });
      const file = `${outfit.id}__${view}${step}.png`;
      writePng(path.join(OUT, file), img);
      entries.push({
        id: outfit.id,
        label: outfit.label,
        view: `${view}${step}`,
        w: s.w,
        h: s.h,
        rows: toAscii(s),
        baseRows: toAscii(figure),
        png: file,
      });
    }
// the stances' derived steps (D-101)
for (const view of VIEWS)
  for (const step of [0, 1] as const)
    for (const { id, label, outfit, figure } of posedWalkCast(view, step)) {
      const s = dress(figure, outfit);
      const img = paint(s, buildPalette(outfit.colors, HERO_RAMPS), {
        lineStyle: 'tinted',
        selout: false,
      });
      const file = `${id}__${view}${step}.png`;
      writePng(path.join(OUT, file), img);
      entries.push({
        id,
        label,
        view: `${view}${step}`,
        w: s.w,
        h: s.h,
        rows: toAscii(s),
        baseRows: toAscii(figure),
        png: file,
      });
    }
fs.writeFileSync(path.join(TEST_OUTPUT_DIR, 'score', 'sprites.json'), JSON.stringify(entries));
console.log(`${entries.length} sprites -> test-output/score/sprites/`);
