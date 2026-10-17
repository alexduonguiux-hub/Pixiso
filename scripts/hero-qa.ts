/** Automated checks on dressed hero outfits: broken outlines, skin peeking above a hat, overlays outside the figure. */
import {
  buildForm,
  CAST,
  dress,
  FORM_BASE,
  HERO_S_FIGURE,
  MATERIALS,
  toAscii,
  ZOMBIES,
  type Outfit,
  ZOMBIE_POSES,
} from '@pixiso/sprite-kit';

let problems = 0;
function check(outfit: Outfit): void {
  const figure = buildForm(outfit.form ?? FORM_BASE);
  const s = dress(figure, outfit);
  const rows = toAscii(s);
  const H = s.h;
  const W = s.w;
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? rows[y]![x]! : '.');
  const lonely: string[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (at(x, y) !== 'o') continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(x + dx, y + dy) === 'o') n++;
      if (n === 0) lonely.push(`(${x},${y})`);
    }
  if (lonely.length) {
    problems++;
    console.log(`${outfit.id}: lonely line cells ${lonely.join(' ')}`);
  }
  // Any cell that is not transparent must touch the rest of the figure (no floating pixels).
  const floating: string[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (at(x, y) === '.') continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(x + dx, y + dy) !== '.') n++;
      if (n === 0) floating.push(`(${x},${y})`);
    }
  if (floating.length) {
    problems++;
    console.log(`${outfit.id}: floating cells ${floating.join(' ')}`);
  }
  // With a hat (a rigid head overlay), no skin may show above the brow line (head row 8).
  const hat = outfit.overlays?.find((o) => o.rigid && o.space === 'head');
  if (hat && outfit.form?.headMap) {
    const [, hatBottom] = outfit.form.headMap(0, 8);
    const skin = MATERIALS.indexOf('skin');
    const peeking: string[] = [];
    for (let y = 0; y < hatBottom; y++)
      for (let x = 0; x < W; x++) {
        const v = s.cells[y * W + x]!;
        if (v >= 0 && Math.floor(v / 4) === skin) peeking.push(`(${x},${y})`);
      }
    if (peeking.length) {
      problems++;
      console.log(
        `${outfit.id}: skin above the hat line (row ${hatBottom}) at ${peeking.join(' ')}`,
      );
    }
  }
}
// Posed heads: after the shear, the outermost run of line cells of each row must still touch a line cell of the row above.
const baseRows = toAscii(HERO_S_FIGURE);
for (const pose of ZOMBIE_POSES) {
  const map = pose.form.headMap!;
  /** Runs of consecutive line cells in a base head row, mapped to figure columns. */
  const runs = (row: number): number[][] => {
    const out: number[][] = [];
    let run: number[] = [];
    [...baseRows[row]!].forEach((c, x) => {
      if (c === 'o') run.push(map(x, row)[0]);
      else if (run.length) {
        out.push(run);
        run = [];
      }
    });
    if (run.length) out.push(run);
    return out;
  };
  const gaps: string[] = [];
  for (let k = 1; k <= 14; k++) {
    const above = runs(k - 1);
    const here = runs(k);
    if (!above.length || !here.length) continue;
    const touches = (run: number[], others: number[][]) =>
      run.some((x) => others.some((o) => o.some((ox) => Math.abs(ox - x) <= 1)));
    const outer = (rs: number[][]) => [rs[0]!, rs[rs.length - 1]!];
    for (const run of outer(here)) if (!touches(run, above)) gaps.push(`rows ${k - 1}/${k}`);
    for (const run of outer(above)) if (!touches(run, here)) gaps.push(`rows ${k - 1}/${k}`);
  }
  if (gaps.length) {
    problems++;
    console.log(`pose ${pose.id}: skull edge broken between head ${[...new Set(gaps)].join(', ')}`);
  }
}
for (const o of [...CAST, ...ZOMBIES]) check(o);
console.log(problems ? `${problems} problem(s)` : 'QA clean');
process.exitCode = problems ? 1 : 0;
