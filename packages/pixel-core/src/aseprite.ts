/**
 * Aseprite "array" JSON for a packed sheet (HANDOFF §7), plus a `meta.pixiso`
 * block with what engines need beyond Aseprite's fields: the cell, the pivot,
 * the direction order, the mirror map of a 5+mirror export, the palette and
 * the grid scale. `checkAseprite` is the Phase 3 acceptance test in code.
 */
import type { Rect } from './geometry.js';
import type { Sheet } from './sheet.js';

export interface AsepriteFrame {
  filename: string;
  frame: Rect;
  rotated: false;
  trimmed: false;
  spriteSourceSize: Rect;
  sourceSize: { w: number; h: number };
  /** Milliseconds. */
  duration: number;
}

export interface AsepriteTag {
  name: string;
  from: number;
  to: number;
  direction: 'forward';
}

export interface AsepriteSliceKey {
  frame: number;
  bounds: Rect;
  pivot: { x: number; y: number };
}

export interface AsepriteSlice {
  name: string;
  color: string;
  keys: AsepriteSliceKey[];
}

export interface PixisoMeta {
  cell: { w: number; h: number };
  pivot: { x: number; y: number };
  /** Rows of the sheet in order (one direction each for a clip sheet). */
  directions: string[];
  /** Directions not in the sheet and the row to flip horizontally for them (5+mirror). */
  mirror?: Record<string, string>;
  pixelsPerMeter: number;
  /** Every colour in the export, `#rrggbb`, most frequent first. */
  palette: string[];
}

export interface AsepriteJson {
  frames: AsepriteFrame[];
  meta: {
    app: 'pixiso';
    version: string;
    image: string;
    format: 'RGBA8888';
    size: { w: number; h: number };
    scale: string;
    frameTags: AsepriteTag[];
    slices: AsepriteSlice[];
    pixiso: PixisoMeta;
  };
}

export interface SheetSpec {
  sheet: Sheet;
  /** File name of the PNG the JSON describes. */
  image: string;
  version: string;
  /** Tag name per row (`walk_S`). */
  rowTags: readonly string[];
  /** Frame name per cell (`knight_walk_S_0`). */
  frameName: (row: number, col: number) => string;
  /** Frame duration per cell, ms. */
  duration: (row: number, col: number) => number;
  pivot: { x: number; y: number };
  pixiso: Omit<PixisoMeta, 'cell' | 'pivot'>;
}

export function asepriteJson(spec: SheetSpec): AsepriteJson {
  const { sheet } = spec;
  const frames: AsepriteFrame[] = sheet.cells.map((c) => ({
    filename: spec.frameName(c.row, c.col),
    frame: { x: c.x, y: c.y, w: c.w, h: c.h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: c.w, h: c.h },
    sourceSize: { w: c.w, h: c.h },
    duration: spec.duration(c.row, c.col),
  }));
  const frameTags: AsepriteTag[] = [];
  for (let row = 0; row < sheet.rows; row++) {
    const idx = sheet.cells.map((c, i) => (c.row === row ? i : -1)).filter((i) => i >= 0);
    if (idx.length === 0) continue;
    const name = spec.rowTags[row];
    if (name === undefined) throw new Error(`asepriteJson: no tag for row ${row}`);
    frameTags.push({ name, from: idx[0]!, to: idx[idx.length - 1]!, direction: 'forward' });
  }
  return {
    frames,
    meta: {
      app: 'pixiso',
      version: spec.version,
      image: spec.image,
      format: 'RGBA8888',
      size: { w: sheet.image.width, h: sheet.image.height },
      scale: '1',
      frameTags,
      slices: [
        {
          name: 'pivot',
          color: '#0000ffff',
          keys: [
            {
              frame: 0,
              bounds: { x: 0, y: 0, w: sheet.cell.w, h: sheet.cell.h },
              pivot: { ...spec.pivot },
            },
          ],
        },
      ],
      pixiso: { cell: { ...sheet.cell }, pivot: { ...spec.pivot }, ...spec.pixiso },
    },
  };
}

/**
 * The Phase 3 checks (HANDOFF §10): every frame rect inside the image, tags
 * covering every frame exactly once and in order, one cell size, the pivot
 * inside the cell and the same for every frame (frames share the slice key).
 */
export function checkAseprite(json: AsepriteJson): string[] {
  const problems: string[] = [];
  const { size, pixiso, frameTags, slices } = json.meta;
  json.frames.forEach((f, i) => {
    const r = f.frame;
    if (r.x < 0 || r.y < 0 || r.x + r.w > size.w || r.y + r.h > size.h)
      problems.push(`frame ${i} (${f.filename}) is outside the image`);
    if (r.w !== pixiso.cell.w || r.h !== pixiso.cell.h)
      problems.push(`frame ${i} (${f.filename}) is not the cell size`);
    if (f.duration <= 0) problems.push(`frame ${i} has no duration`);
  });
  const covered = new Array<number>(json.frames.length).fill(0);
  let last = -1;
  for (const t of frameTags) {
    if (t.from > t.to || t.from < 0 || t.to >= json.frames.length)
      problems.push(`tag ${t.name} has bad bounds ${t.from}-${t.to}`);
    if (t.from !== last + 1) problems.push(`tag ${t.name} does not follow the previous tag`);
    last = t.to;
    for (let i = t.from; i <= t.to && i < covered.length; i++) covered[i]!++;
  }
  covered.forEach((n, i) => {
    if (n !== 1) problems.push(`frame ${i} is covered by ${n} tags`);
  });
  const pivotSlice = slices.find((s) => s.name === 'pivot');
  if (!pivotSlice || pivotSlice.keys.length === 0) problems.push('no pivot slice');
  else {
    const p = pivotSlice.keys[0]!.pivot;
    if (p.x < 0 || p.y < 0 || p.x >= pixiso.cell.w || p.y >= pixiso.cell.h)
      problems.push('pivot is outside the cell');
    if (p.x !== pixiso.pivot.x || p.y !== pixiso.pivot.y)
      problems.push('slice pivot and meta.pixiso.pivot differ');
    for (const k of pivotSlice.keys)
      if (k.pivot.x !== p.x || k.pivot.y !== p.y) problems.push(`pivot moves at frame ${k.frame}`);
  }
  if (pixiso.directions.length !== frameTags.length && pixiso.directions.length > 0) {
    // a clip sheet has one tag per direction; an atlas has clips × directions
    if (frameTags.length % pixiso.directions.length !== 0)
      problems.push('tags are not a whole number of direction sets');
  }
  return problems;
}
