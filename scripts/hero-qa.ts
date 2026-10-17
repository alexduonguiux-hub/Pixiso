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
  // With a hat (a rigid head overlay), no skin may show above the hat's bottom line.
  const hat = outfit.overlays?.find((o) => o.rigid && o.space === 'head');
  if (hat && outfit.form?.headMap) {
    const [, hatBottom] = outfit.form.headMap(hat.x, hat.y + hat.sprite.h - 1);
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
// Posed heads: after the shear, each row's outermost line cell must still touch a line cell of the row above.
const baseRows = toAscii(HERO_S_FIGURE);
for (const pose of ZOMBIE_POSES) {
  const map = pose.form.headMap!;
  const mappedLine = (row: number) =>
    [...baseRows[row]!].flatMap((c, x) => (c === 'o' ? [map(x, row)[0]] : []));
  const gaps: string[] = [];
  for (let k = 1; k <= 14; k++) {
    const above = mappedLine(k - 1);
    const here = mappedLine(k);
    if (!above.length || !here.length) continue;
    const touches = (x: number, xs: number[]) => xs.some((o) => Math.abs(o - x) <= 1);
    for (const [label, x, xs] of [
      ['left', Math.min(...here), above],
      ['right', Math.max(...here), above],
      ['left', Math.min(...above), here],
      ['right', Math.max(...above), here],
    ] as const)
      if (!touches(x, [...xs])) gaps.push(`${label} edge between head rows ${k - 1} and ${k}`);
  }
  if (gaps.length) {
    problems++;
    console.log(`pose ${pose.id}: ${[...new Set(gaps)].join('; ')}`);
  }
}
for (const o of [...CAST, ...ZOMBIES]) check(o);
console.log(problems ? `${problems} problem(s)` : 'QA clean');
process.exitCode = problems ? 1 : 0;
