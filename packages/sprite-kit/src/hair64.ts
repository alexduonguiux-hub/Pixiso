/**
 * Hair combing (D-074). Hair is drawn as a silhouette in one tone; once the
 * figure is dressed, every hair mass is toned here, in figure space, so a
 * tilted head (the pose's row shifts) is combed as it finally stands.
 *
 * The rule follows the reference head (five tones in three diagonal masses,
 * locks parted by a darker line) and the third review's prescription: a
 * light field runs from the upper left (bright crown, light mass) through the
 * base mass to a dark mass and a deep corner at the lower right; its quantiles
 * cut the mass into bands (bright 10 %, light 25 %, base 33 %, dark 24 %,
 * deep 8 %), each lock nudged up or down so no band edge runs straight across
 * the head. Locks fan out from a side parting (near the face in the side
 * view), widths 4-4-5; the far column of each lock is one tone darker than
 * the darker of the two locks it parts and, where it steps outward on the next
 * row, the step's corner joins it, so every strand line is 4-connected. A
 * cell against a line takes its band's body tone (never a strand line, never
 * deep), so the rim changes with the masses instead of running as a dark band
 * along the outline. A lone cell takes the tone most of its neighbours have.
 * Finally, masses first and lines only where needed: a same-tone region above
 * the scorer's flat limit (13 cells or 12 % of the hair) is parted by one
 * stroke of an adjacent tone along a lock through its middle or, as a last
 * resort, across its middle row, until every region fits.
 *
 * A mass drawn with more than one tone (the beard) is left as drawn.
 */
import { MATERIALS, type Sprite } from './format.js';
import type { HeroView } from './hero64.js';

const HAIR = MATERIALS.indexOf('hair');
const LINE_MATERIAL = MATERIALS.indexOf('line');
const MID = 1;
/** Cell shade of each tone index: bright, light, mid, shadow, deep. */
const SHADE_OF = [4, 2, 1, 0, 3] as const;
const WIDTHS = [4, 4, 5];
const SWEEP = 0.5;
const QUANTILES = [0.1, 0.35, 0.68, 0.92];
const JITTER = 0.07;
/** The parting sits this share of the half-width left of the crown centre. */
const PART = 0.15;
/** The scorer's flat gate for hair is 13.8 % of the hair and 16 cells; stay a step inside both. */
const FLAT_SHARE = 0.12;
const FLAT_CELLS = 13;
const MIN_MASS = 6;
const N4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Tones every hair mass of the dressed sprite, in place. */
export function combHair(s: Sprite, view: HeroView): void {
  const w = s.w;
  const h = s.h;
  const material = (i: number) => (s.cells[i]! < 0 ? -1 : s.cells[i]! >> 3);
  const seen = new Set<number>();
  for (let i = 0; i < s.cells.length; i++) {
    if (material(i) !== HAIR || seen.has(i)) continue;
    // one mass: the 8-connected hair cells, in canvas order
    const mass: number[] = [];
    const stack = [i];
    seen.add(i);
    while (stack.length > 0) {
      const c = stack.pop()!;
      mass.push(c);
      const x = c % w;
      const y = Math.floor(c / w);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const X = x + dx;
          const Y = y + dy;
          if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
          const j = Y * w + X;
          if (material(j) === HAIR && !seen.has(j)) {
            seen.add(j);
            stack.push(j);
          }
        }
    }
    mass.sort((a, b) => a - b);
    if (mass.length < MIN_MASS) continue;
    // A mass drawn with tones (the beard) is left as drawn. A combed mass may still hold a few cells that
    // are not mid: outline cells of the hair turned deep by the 2x2 line rule in dress(); those stay.
    const fixed = new Set(mass.filter((c) => (s.cells[c]! & 7) !== MID));
    if (fixed.size > 0.2 * mass.length) continue;
    comb(s, mass, fixed, view);
  }
}

const TONE_OF_SHADE = [3, 2, 1, 4, 0] as const;

function comb(s: Sprite, mass: number[], fixed: Set<number>, view: HeroView): void {
  const w = s.w;
  const h = s.h;
  const set = new Set(mass);
  const fillAt = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && set.has(y * w + x);
  const lineAt = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < w &&
    y < h &&
    s.cells[y * w + x]! >= 0 &&
    s.cells[y * w + x]! >> 3 === LINE_MATERIAL;
  const xsOf = (y: number) => {
    const xs: number[] = [];
    for (let x = 0; x < w; x++) if (fillAt(x, y)) xs.push(x);
    return xs;
  };
  // the mass proper: the first run of rows with at least three cells and no gap but a line between them
  const solid = (y: number) => {
    const xs = xsOf(y);
    if (xs.length < 3) return false;
    for (let x = xs[0]!; x <= xs[xs.length - 1]!; x++)
      if (!fillAt(x, y) && !lineAt(x, y)) return false;
    return true;
  };
  const rows = [...new Set(mass.map((c) => Math.floor(c / w)))].sort((a, b) => a - b);
  let top = rows.find(solid) ?? rows[0]!;
  let bottom = top;
  while (bottom + 1 < h && solid(bottom + 1)) bottom++;
  const Hh = bottom - top + 1;
  const topXs =
    xsOf(Math.min(top + 1, h - 1)).length > 0 ? xsOf(Math.min(top + 1, h - 1)) : xsOf(top);
  const mid = (topXs[0]! + topXs[topXs.length - 1]!) / 2;
  let R = 1;
  for (const c of mass) R = Math.max(R, Math.abs((c % w) - mid));
  // the parting: beside the face in the side view, else a side parting left of the crown centre
  const cx = view === 'W' ? topXs[topXs.length - 1]! - 2 : mid - PART * R;
  const period = WIDTHS.reduce((a, b) => a + b, 0);
  const lock = (x: number, y: number): [number, number, number] => {
    // distance from the parting, less the sweep: a lock drifts outward as it falls (hair fans out from the
    // crown), so its lines run from the crown down and away from the parting
    const u = Math.floor((x < cx ? cx - x - 0.5 : x - cx) - SWEEP * (y - top) + 100) - 100;
    const k = Math.floor(u / period);
    let p = u - k * period;
    let i = 0;
    while (p >= WIDTHS[i]!) {
      p -= WIDTHS[i]!;
      i++;
    }
    return [k * WIDTHS.length + i, p, WIDTHS[i]!];
  };
  const field = (x: number, y: number) => {
    const nx = (x - mid) / R;
    const ny = Math.min((y - top) / Math.max(1, Hh - 1), 1.25);
    return 0.5 * nx + 0.9 * (ny - 0.35) + 0.25 * nx * ny;
  };
  const ds = mass.map((c) => field(c % w, Math.floor(c / w))).sort((a, b) => a - b);
  const edges = QUANTILES.map((q) => ds[Math.min(ds.length - 1, Math.floor(q * ds.length))]!);
  // tone index of the cell's band: bright .. deep
  const band = (x: number, y: number) => {
    const k = lock(x, y)[0];
    const d = field(x, y) + (((k % 2) + 2) % 2 === 1 ? JITTER : -JITTER);
    let b = 4 - edges.length;
    for (const e of edges) if (d >= e) b++;
    return b;
  };
  const againstLine = (x: number, y: number) => N4.some(([dx, dy]) => lineAt(x + dx, y + dy));
  const isSep = (x: number, y: number) => {
    const [k, p, wd] = lock(x, y);
    if (p === wd - 1) return true;
    // the corner of a step: on the row below this column is the far column of the lock, here it is the first
    // column of the lock beyond; the corner joins the line so it stays 4-connected
    if (p === 0 && fillAt(x, y + 1)) {
      const [k2, p2, w2] = lock(x, y + 1);
      if (p2 === w2 - 1 && k2 === k - 1) return true;
    }
    return false;
  };
  const sepTone = (x: number, y: number) => {
    // one tone darker than the darker of the two locks the line parts (the lock beyond it may already be in
    // the next band; a line of that band's body tone would join the masses it should part)
    const fx = x + (x >= cx ? 1 : -1);
    let b = band(x, y);
    if (fillAt(fx, y)) b = Math.max(b, band(fx, y));
    return Math.min(4, b + 1);
  };
  const tone = new Map<number, number>();
  for (const c of mass) {
    if (fixed.has(c)) {
      tone.set(c, TONE_OF_SHADE[s.cells[c]! & 7]!);
      continue;
    }
    const x = c % w;
    const y = Math.floor(c / w);
    const b = band(x, y);
    tone.set(c, isSep(x, y) ? sepTone(x, y) : againstLine(x, y) ? Math.min(3, b) : b);
  }
  const fixLone = (keep: Set<number>) => {
    for (const c of mass) {
      if (keep.has(c)) continue;
      const g = tone.get(c)!;
      const x = c % w;
      const y = Math.floor(c / w);
      const nb: number[] = [];
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          if (fillAt(x + dx, y + dy)) nb.push(tone.get((y + dy) * w + x + dx)!);
        }
      if (nb.length === 0 || nb.includes(g)) continue;
      let best = -1;
      let bestScore: [number, number] = [-1, -9];
      for (const t of [...new Set(nb)].sort((a, b) => a - b)) {
        const score: [number, number] = [nb.filter((v) => v === t).length, -Math.abs(t - g)];
        if (score[0] > bestScore[0] || (score[0] === bestScore[0] && score[1] > bestScore[1])) {
          best = t;
          bestScore = score;
        }
      }
      tone.set(c, best);
    }
  };
  fixLone(fixed);
  // Masses first, lines only where needed.
  const regionsOf = (tones: Map<number, number>, cells: Iterable<number>) => {
    const pool = new Set(cells);
    const done = new Set<number>();
    const out: number[][] = [];
    for (const c of pool) {
      if (done.has(c)) continue;
      const g = tones.get(c);
      const reg = [c];
      const st = [c];
      done.add(c);
      while (st.length > 0) {
        const a = st.pop()!;
        const x = a % w;
        const y = Math.floor(a / w);
        for (const [dx, dy] of N4) {
          const q = (y + dy) * w + x + dx;
          if (x + dx < 0 || x + dx >= w || !pool.has(q) || done.has(q) || tones.get(q) !== g)
            continue;
          done.add(q);
          st.push(q);
          reg.push(q);
        }
      }
      out.push(reg);
    }
    return out;
  };
  const largest = (tones: Map<number, number>) =>
    Math.max(0, ...regionsOf(tones, mass).map((r) => r.length));
  const limit = Math.max(FLAT_CELLS, Math.floor(FLAT_SHARE * mass.length));
  const locked = new Set<number>(fixed);
  const candidates = (reg: number[]) => {
    const regSet = new Set(reg);
    const strokes: number[][] = [];
    // along a lock: each column of each lock that passes through the region, with the step corners
    const cols = new Map<string, number[]>();
    for (const c of reg) {
      const [k, p] = lock(c % w, Math.floor(c / w));
      const key = `${k},${p}`;
      if (!cols.has(key)) cols.set(key, []);
      cols.get(key)!.push(c);
    }
    for (const cells of cols.values()) {
      const stroke = new Set(cells);
      for (const c of cells) {
        const x = c % w;
        const y = Math.floor(c / w);
        const nxt = cells.find((d) => Math.floor(d / w) === y + 1);
        if (nxt !== undefined && Math.abs((nxt % w) - x) === 1 && regSet.has((y + 1) * w + x))
          stroke.add((y + 1) * w + x);
      }
      strokes.push([...stroke]);
    }
    // across the middle rows
    const ys = [...new Set(reg.map((c) => Math.floor(c / w)))].sort((a, b) => a - b);
    const ym = ys[Math.floor(ys.length / 2)]!;
    for (const yy of [ym, ym - 1, ym + 1])
      strokes.push(reg.filter((c) => Math.floor(c / w) === yy));
    return strokes.map((st) => st.filter((c) => !locked.has(c))).filter((st) => st.length > 0);
  };
  const split = () => {
    for (let iter = 0; iter < 60; iter++) {
      const big = regionsOf(tone, mass).filter((r) => r.length > limit);
      if (big.length === 0) break;
      let reg = big[0]!;
      for (const r of big) if (r.length > reg.length) reg = r;
      const g = tone.get(reg[0]!)!;
      const tones = [g + 1, g - 1].filter((t) => t >= 0 && t <= 4);
      let best: { score: [number, number]; stroke: number[]; t: number } | undefined;
      for (const stroke of candidates(reg))
        for (const t of tones) {
          const trial = new Map(tone);
          for (const c of stroke) trial.set(c, t);
          // a stroke across a row is a last resort: it stacks equal runs (the lint's banding)
          const across = new Set(stroke.map((c) => Math.floor(c / w))).size === 1;
          const score: [number, number] = [largest(trial) + (across ? 3 : 0), stroke.length];
          if (
            !best ||
            score[0] < best.score[0] ||
            (score[0] === best.score[0] && score[1] < best.score[1])
          )
            best = { score, stroke, t };
        }
      if (!best || best.score[0] >= reg.length + 3) break;
      for (const c of best.stroke) {
        tone.set(c, best.t);
        locked.add(c);
      }
    }
  };
  split();
  // No terraces: two runs of different tones, side by side with the same start and length (3 or more), read
  // as a drawn step (the lint's banding). The second run gives up its last cell to the tone that continues
  // beyond it, or to the first run's tone.
  const toneAt = (x: number, y: number) => (fillAt(x, y) ? tone.get(y * w + x)! : -1);
  const runsAlong = (cells: [number, number][]) => {
    const runs: { t: number; start: number; len: number }[] = [];
    cells.forEach(([x, y], i) => {
      const t = toneAt(x, y);
      const last = runs[runs.length - 1];
      if (last && last.t === t && last.start + last.len === i) last.len++;
      else runs.push({ t, start: i, len: 1 });
    });
    return runs.filter((r) => r.t >= 0 && r.len >= 3);
  };
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  for (const c of mass) {
    minX = Math.min(minX, c % w);
    maxX = Math.max(maxX, c % w);
    minY = Math.min(minY, Math.floor(c / w));
    maxY = Math.max(maxY, Math.floor(c / w));
  }
  const giveUp = (
    cells: [number, number][],
    run: { t: number; start: number; len: number },
    other: number,
  ) => {
    const ends = [cells[run.start + run.len - 1]!, cells[run.start]!];
    for (const [x, y] of ends) {
      const c = y * w + x;
      if (locked.has(c)) continue;
      // the tone that continues past this end along the same line, else the other run's tone
      const [nx, ny] =
        x === cells[run.start + run.len - 1]![0] && y === cells[run.start + run.len - 1]![1]
          ? [cells[run.start + run.len]?.[0] ?? -1, cells[run.start + run.len]?.[1] ?? -1]
          : [cells[run.start - 1]?.[0] ?? -1, cells[run.start - 1]?.[1] ?? -1];
      const next = nx >= 0 ? toneAt(nx, ny) : -1;
      tone.set(c, next >= 0 && next !== run.t ? next : other);
      locked.add(c);
      return true;
    }
    return false;
  };
  for (let iter = 0; iter < 20; iter++) {
    let changed = false;
    const lines: [number, number][][] = [];
    for (let x = minX; x <= maxX; x++)
      lines.push(Array.from({ length: maxY - minY + 1 }, (_, i) => [x, minY + i]));
    const rowsL: [number, number][][] = [];
    for (let y = minY; y <= maxY; y++)
      rowsL.push(Array.from({ length: maxX - minX + 1 }, (_, i) => [minX + i, y]));
    for (const group of [lines, rowsL])
      for (let i = 0; i + 1 < group.length; i++) {
        const a = group[i]!;
        const b = group[i + 1]!;
        for (const ra of runsAlong(a))
          for (const rb of runsAlong(b)) {
            if (rb.t === ra.t || rb.start !== ra.start || rb.len !== ra.len) continue;
            const spanIs = (line: [number, number][] | undefined, t: number) =>
              line !== undefined &&
              line.slice(ra.start, ra.start + ra.len).every(([x, y]) => toneAt(x, y) === t);
            if (spanIs(group[i + 2], ra.t) || spanIs(group[i - 1], rb.t)) continue;
            if (giveUp(b, rb, ra.t) || giveUp(a, ra, rb.t)) changed = true;
          }
      }
    if (!changed) break;
  }
  // a cell given up may have joined two regions: part them again
  split();
  fixLone(locked);
  for (const c of mass) if (!fixed.has(c)) s.cells[c] = HAIR * 8 + SHADE_OF[tone.get(c)!]!;
}
