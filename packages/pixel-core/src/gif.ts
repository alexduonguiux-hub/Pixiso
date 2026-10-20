/**
 * Animated GIF on an exact palette: every opaque pixel must be one of the
 * given colours (the export's locked palette), transparent pixels take a
 * reserved index. Loops forever; each frame restores the background first so
 * a narrower silhouette never shows the previous frame behind it.
 */
/// <reference path="./gifenc.d.ts" />
import { GIFEncoder } from 'gifenc/dist/gifenc.esm.js';
import type { Rgb8 } from './oklab.js';
import { rgbKey } from './stats.js';
import type { RGBAImage } from './types.js';

export interface GifFrame {
  image: RGBAImage;
  /** Milliseconds; GIF stores centiseconds, so multiples of 10 are exact. */
  delayMs: number;
}

export const GIF_MAX_COLORS = 255;

export function encodeGif(frames: readonly GifFrame[], palette: readonly Rgb8[]): Uint8Array {
  if (frames.length === 0) throw new Error('encodeGif: no frames');
  if (palette.length > GIF_MAX_COLORS)
    throw new Error(
      `encodeGif: ${palette.length} colours, at most ${GIF_MAX_COLORS} plus transparency`,
    );
  const { width, height } = frames[0]!.image;
  const index = new Map<number, number>();
  palette.forEach(([r, g, b], i) => index.set(rgbKey(r, g, b), i));
  const transparentIndex = palette.length;
  const table = [...palette.map((c) => [...c]), [0, 0, 0]];
  const gif = GIFEncoder();
  frames.forEach(({ image, delayMs }, n) => {
    if (image.width !== width || image.height !== height)
      throw new Error(
        `encodeGif: frame ${n} is ${image.width}×${image.height}, expected ${width}×${height}`,
      );
    const d = image.data;
    const px = new Uint8Array(width * height);
    for (let i = 0; i < px.length; i++) {
      if (d[i * 4 + 3] !== 255) {
        px[i] = transparentIndex;
        continue;
      }
      const k = rgbKey(d[i * 4]!, d[i * 4 + 1]!, d[i * 4 + 2]!);
      const idx = index.get(k);
      if (idx === undefined)
        throw new Error(`encodeGif: colour ${k.toString(16)} is not in the palette`);
      px[i] = idx;
    }
    gif.writeFrame(px, width, height, {
      ...(n === 0 ? { palette: table, repeat: 0 } : {}),
      delay: delayMs,
      transparent: true,
      transparentIndex,
      dispose: 2,
    });
  });
  gif.finish();
  return gif.bytes();
}

/** Walks the GIF block structure (header, tables, extensions, image descriptors) and counts the images. */
export function gifFrameCount(bytes: Uint8Array): number {
  if (String.fromCharCode(...bytes.subarray(0, 6)) !== 'GIF89a') throw new Error('not a GIF89a');
  const tableSize = (flags: number) => (flags & 0x80 ? 3 * (1 << ((flags & 7) + 1)) : 0);
  let i = 13 + tableSize(bytes[10]!);
  const skipSubBlocks = () => {
    while (bytes[i] !== 0) i += bytes[i]! + 1;
    i++;
  };
  let frames = 0;
  while (i < bytes.length) {
    const b = bytes[i]!;
    if (b === 0x3b) return frames;
    if (b === 0x21) {
      i += 2;
      skipSubBlocks();
    } else if (b === 0x2c) {
      i += 9 + tableSize(bytes[i + 9]!) + 1;
      i += 1; // LZW minimum code size
      skipSubBlocks();
      frames++;
    } else throw new Error(`unknown GIF block 0x${b.toString(16)} at ${i}`);
  }
  throw new Error('GIF has no trailer');
}
