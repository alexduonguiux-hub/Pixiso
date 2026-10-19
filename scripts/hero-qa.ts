/** Automated checks on dressed hero outfits: broken outlines, skin peeking above a hat, overlays outside the figure. */
import {
  buildForm,
  CAST,
  castInView,
  HERO_VIEWS,
  dress,
  FORM_BASE,
  HERO_S_FIGURE,
  MATERIALS,
  MUTANTS,
  posedInView,
  SOLDIERS,
  toAscii,
  walkCastInView,
  WALK_VIEWS_DRAWN,
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
  // Transparent cells must reach the border: an enclosed pocket of 3+ cells is a hole (a 1–2 cell slit between limbs is daylight).
  const seen = new Uint8Array(W * H);
  const flood = (sx: number, sy: number): number => {
    const stack: Array<[number, number]> = [[sx, sy]];
    let n = 0;
    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (seen[y * W + x]) continue;
      seen[y * W + x] = 1;
      n++;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const X = x + dx;
        const Y = y + dy;
        if (X >= 0 && Y >= 0 && X < W && Y < H && at(X, Y) === '.' && !seen[Y * W + X])
          stack.push([X, Y]);
      }
    }
    return n;
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && at(x, y) === '.') flood(x, y);
  const holes: string[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (at(x, y) === '.' && !seen[y * W + x]) {
        const n = flood(x, y);
        if (n >= 3) holes.push(`${n} at (${x},${y})`);
      }
  if (holes.length) {
    problems++;
    console.log(`${outfit.id}: holes ${holes.join(', ')}`);
  }
  // With a hat (a rigid head overlay), no skin may show above the brow line (head row 8).
  const hat = outfit.overlays?.find((o) => o.rigid && o.space === 'head');
  if (hat && outfit.form?.headMap) {
    const [, hatBottom] = outfit.form.headMap(0, 8);
    const top = s.oy;
    const skin = MATERIALS.indexOf('skin');
    const peeking: string[] = [];
    for (let y = 0; y < hatBottom + top; y++)
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
for (const o of [...CAST, ...SOLDIERS, ...ZOMBIES, ...MUTANTS]) check(o);
for (const view of HERO_VIEWS)
  for (const o of [...castInView(view), ...posedInView(view)])
    check({ ...o, id: `${o.id}@${view}` });
// The walk steps of the standing cast (D-095).
for (const view of WALK_VIEWS_DRAWN)
  for (const step of [0, 1] as const)
    for (const o of walkCastInView(view, step)) check({ ...o, id: `${o.id}@${view}${step}` });
console.log(problems ? `${problems} problem(s)` : 'QA clean');
process.exitCode = problems ? 1 : 0;
