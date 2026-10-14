import { createImage, type RGBAImage } from './types.js';

/**
 * Builds a small image from ASCII art: each character maps to an RGBA colour via
 * `legend`; '.' (or any unmapped char) is transparent.
 */
export function imageFromAscii(
  rows: string[],
  legend: Record<string, [number, number, number, number?]>,
): RGBAImage {
  const height = rows.length;
  const width = rows[0]!.length;
  const img = createImage(width, height);
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const c = legend[row[x]!];
      if (!c) continue;
      const i = (y * width + x) * 4;
      img.data[i] = c[0];
      img.data[i + 1] = c[1];
      img.data[i + 2] = c[2];
      img.data[i + 3] = c[3] ?? 255;
    }
  });
  return img;
}

export function asciiFromImage(
  img: RGBAImage,
  legend: Record<string, [number, number, number, number?]>,
): string[] {
  const inv = new Map<string, string>();
  for (const [ch, c] of Object.entries(legend)) inv.set(`${c[0]},${c[1]},${c[2]}`, ch);
  const rows: string[] = [];
  for (let y = 0; y < img.height; y++) {
    let row = '';
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (img.data[i + 3] !== 255) row += '.';
      else row += inv.get(`${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`) ?? '?';
    }
    rows.push(row);
  }
  return rows;
}
