/**
 * Pixel templates are small matrices of *semantic* cells, written as ASCII so
 * they can be authored and diffed as text. A cell names a material and a shade,
 * never a colour: colours come later from the palette (see paint.ts), which is
 * what makes recolouring and palette locking exact.
 */

export const MATERIALS = [
  'skin',
  'hair',
  'cloth',
  'cloth2',
  'pants',
  'boots',
  'metal',
  'leather',
  'wood',
  'accent',
  'white',
  'eye',
  'line',
] as const;
export type Material = (typeof MATERIALS)[number];

/** 0 = shadow, 1 = mid, 2 = highlight. */
export type Shade = 0 | 1 | 2;

export interface Cell {
  material: Material;
  shade: Shade;
}

/** Glyph → cell. Lowercase = mid, uppercase = shadow, special glyphs for highlights and fixed tones. */
export const LEGEND: Record<string, Cell> = {
  o: { material: 'line', shade: 1 },
  e: { material: 'eye', shade: 1 },
  x: { material: 'white', shade: 1 },
  s: { material: 'skin', shade: 1 },
  S: { material: 'skin', shade: 0 },
  $: { material: 'skin', shade: 2 },
  h: { material: 'hair', shade: 1 },
  H: { material: 'hair', shade: 0 },
  '#': { material: 'hair', shade: 2 },
  c: { material: 'cloth', shade: 1 },
  C: { material: 'cloth', shade: 0 },
  '^': { material: 'cloth', shade: 2 },
  k: { material: 'cloth2', shade: 1 },
  K: { material: 'cloth2', shade: 0 },
  '&': { material: 'cloth2', shade: 2 },
  p: { material: 'pants', shade: 1 },
  P: { material: 'pants', shade: 0 },
  '+': { material: 'pants', shade: 2 },
  b: { material: 'boots', shade: 1 },
  B: { material: 'boots', shade: 0 },
  '!': { material: 'boots', shade: 2 },
  m: { material: 'metal', shade: 1 },
  M: { material: 'metal', shade: 0 },
  w: { material: 'metal', shade: 2 },
  l: { material: 'leather', shade: 1 },
  L: { material: 'leather', shade: 0 },
  '|': { material: 'leather', shade: 2 },
  d: { material: 'wood', shade: 1 },
  D: { material: 'wood', shade: 0 },
  '%': { material: 'wood', shade: 2 },
  a: { material: 'accent', shade: 1 },
  A: { material: 'accent', shade: 0 },
  '*': { material: 'accent', shade: 2 },
};

/** A parsed template: `cells[y*w+x]` is -1 (transparent) or `materialIndex*4 + shade`. */
export interface Sprite {
  w: number;
  h: number;
  cells: Int16Array;
}

export const EMPTY = -1;

export function packCell(c: Cell): number {
  return MATERIALS.indexOf(c.material) * 4 + c.shade;
}

export function unpackCell(v: number): Cell {
  return { material: MATERIALS[Math.floor(v / 4)]!, shade: (v % 4) as Shade };
}

/**
 * Parses ASCII rows. Every row must have the same length; `.` is transparent;
 * unknown glyphs throw so a typo never becomes a silent hole.
 */
export function parseSprite(rows: string[], name = 'sprite'): Sprite {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const cells = new Int16Array(w * h).fill(EMPTY);
  rows.forEach((row, y) => {
    if (row.length !== w)
      throw new Error(`${name}: row ${y} has ${row.length} cells, expected ${w}`);
    for (let x = 0; x < w; x++) {
      const g = row[x]!;
      if (g === '.' || g === ' ') continue;
      const cell = LEGEND[g];
      if (!cell) throw new Error(`${name}: unknown glyph "${g}" at (${x}, ${y})`);
      cells[y * w + x] = packCell(cell);
    }
  });
  return { w, h, cells };
}

/** Parses a template literal: blank lines and common indentation are ignored. */
export function sprite(strings: TemplateStringsArray, ...values: string[]): Sprite {
  const text = strings.reduce((acc, s, i) => acc + s + (values[i] ?? ''), '');
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const indent = Math.min(...lines.map((l) => l.length - l.trimStart().length));
  return parseSprite(
    lines.map((l) => l.slice(indent).trimEnd()).map((l) => l),
    'template',
  );
}

export function toAscii(s: Sprite): string[] {
  const inv = new Map<number, string>();
  for (const [g, c] of Object.entries(LEGEND)) if (!inv.has(packCell(c))) inv.set(packCell(c), g);
  const rows: string[] = [];
  for (let y = 0; y < s.h; y++) {
    let row = '';
    for (let x = 0; x < s.w; x++) {
      const v = s.cells[y * s.w + x]!;
      row += v < 0 ? '.' : (inv.get(v) ?? '?');
    }
    rows.push(row);
  }
  return rows;
}

export function flipX(s: Sprite): Sprite {
  const out = new Int16Array(s.w * s.h);
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) out[y * s.w + x] = s.cells[y * s.w + (s.w - 1 - x)]!;
  return { w: s.w, h: s.h, cells: out };
}

/** Mirrors the left half onto the right so symmetric templates only need one side authored. */
export function mirrorFromLeft(s: Sprite): Sprite {
  const out = Int16Array.from(s.cells);
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < Math.floor(s.w / 2); x++)
      out[y * s.w + (s.w - 1 - x)] = s.cells[y * s.w + x]!;
  }
  return { w: s.w, h: s.h, cells: out };
}
