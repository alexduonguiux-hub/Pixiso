/**
 * Sprite-sheet packing: a grid of equal cells, rows given by the caller (one
 * direction per row for a clip sheet, one clip×direction per row for an
 * atlas), columns the frames. Every frame must have the character's cell
 * size, so the pivot is the same offset in every cell.
 */
import { blit } from './geometry.js';
import { createImage, type RGBAImage } from './types.js';

export interface SheetCell {
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Sheet {
  image: RGBAImage;
  cell: { w: number; h: number };
  rows: number;
  cols: number;
  /** Filled cells in row-major order (ragged rows leave their tail transparent). */
  cells: SheetCell[];
}

export function packSheet(rows: readonly (readonly RGBAImage[])[]): Sheet {
  const first = rows.find((r) => r.length > 0)?.[0];
  if (!first) throw new Error('packSheet: no frames');
  const cell = { w: first.width, h: first.height };
  const cols = Math.max(...rows.map((r) => r.length));
  const image = createImage(cell.w * cols, cell.h * rows.length);
  const cells: SheetCell[] = [];
  rows.forEach((frames, row) => {
    frames.forEach((frame, col) => {
      if (frame.width !== cell.w || frame.height !== cell.h)
        throw new Error(
          `packSheet: frame ${row}/${col} is ${frame.width}×${frame.height}, the cell is ${cell.w}×${cell.h}`,
        );
      const x = col * cell.w;
      const y = row * cell.h;
      blit(image, frame, x, y);
      cells.push({ row, col, x, y, w: cell.w, h: cell.h });
    });
  });
  return { image, cell, rows: rows.length, cols, cells };
}
