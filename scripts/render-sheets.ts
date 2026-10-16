/**
 * Renders review sheets through the real config path (CharacterConfig +
 * ProjectStyle → sprite-kit) to test-output/sheets/, nearest ×8, so every
 * render-related change can be eyeballed before it is reported done.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { createImage, scaleNearest, type RGBAImage } from '@pixiso/pixel-core';
import { DEFAULT_PROJECT_STYLE, type CharacterConfig, type ProjectStyle } from '@pixiso/shared';
import { catalog } from '@pixiso/shared/catalog';
import { colorTableFrom, renderClip } from '@pixiso/sprite-kit';
import { TEST_OUTPUT_DIR } from './lib/paths.js';

const OUT = path.join(TEST_OUTPUT_DIR, 'sheets');
fs.mkdirSync(OUT, { recursive: true });

const SCALE = 8;
const PAD = 8;
const table = colorTableFrom(catalog.colors);

const SETUPS: { id: string; config: CharacterConfig }[] = [
  {
    id: 'villager',
    config: {
      version: 1,
      baseCharacter: 'human',
      parts: {},
      colors: [],
      animations: ['idle', 'walk'],
    },
  },
  {
    id: 'knight',
    config: {
      version: 1,
      baseCharacter: 'human',
      parts: {
        head: 'knight_helmet',
        hand_right: 'sword_1handed',
        hand_left: 'shield_round',
        back: 'cape',
      },
      colors: [
        { target: 'body', color: 'navy' },
        { target: 'cape', color: 'red' },
      ],
      animations: ['idle', 'walk'],
    },
  },
  {
    id: 'ranger',
    config: {
      version: 1,
      baseCharacter: 'human',
      parts: { hand_right: 'sword_1handed', back: 'cape' },
      colors: [
        { target: 'body', color: 'forest_green' },
        { target: 'cape', color: 'green' },
        { target: 'hair', color: 'gold' },
        { target: 'legs', color: 'brown' },
      ],
      animations: ['idle', 'walk'],
    },
  },
];

function writePng(file: string, img: RGBAImage): void {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  fs.writeFileSync(file, PNG.sync.write(png));
}

function checkerboard(w: number, h: number): RGBAImage {
  const img = createImage(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0 ? 0x2a : 0x22;
      const o = (y * w + x) * 4;
      img.data[o] = v;
      img.data[o + 1] = v;
      img.data[o + 2] = v + 6;
      img.data[o + 3] = 255;
    }
  }
  return img;
}

function blitOpaque(dst: RGBAImage, src: RGBAImage, x: number, y: number): void {
  for (let sy = 0; sy < src.height; sy++) {
    for (let sx = 0; sx < src.width; sx++) {
      const si = (sy * src.width + sx) * 4;
      if (src.data[si + 3] !== 255) continue;
      const di = ((y + sy) * dst.width + (x + sx)) * 4;
      dst.data[di] = src.data[si]!;
      dst.data[di + 1] = src.data[si + 1]!;
      dst.data[di + 2] = src.data[si + 2]!;
      dst.data[di + 3] = 255;
    }
  }
}

/** Rows = direction × clip, columns = frames. */
function sheet(rows: RGBAImage[][]): RGBAImage {
  const cellW = Math.max(...rows.flat().map((f) => f.width)) * SCALE;
  const cellH = Math.max(...rows.flat().map((f) => f.height)) * SCALE;
  const cols = Math.max(...rows.map((r) => r.length));
  const out = checkerboard(PAD + cols * (cellW + PAD), PAD + rows.length * (cellH + PAD));
  rows.forEach((row, r) =>
    row.forEach((f, c) =>
      blitOpaque(out, scaleNearest(f, SCALE), PAD + c * (cellW + PAD), PAD + r * (cellH + PAD)),
    ),
  );
  return out;
}

for (const { id, config } of SETUPS) {
  const rows: RGBAImage[][] = [];
  for (const direction of catalog.directions) {
    for (const anim of catalog.animations) {
      rows.push(renderClip(config, DEFAULT_PROJECT_STYLE, anim.id, direction, table).frames);
    }
  }
  writePng(path.join(OUT, `${id}_x8.png`), sheet(rows));
  // Turnaround: idle frame 0 for every direction in sheet-row order.
  writePng(
    path.join(OUT, `${id}_turnaround_x8.png`),
    sheet([
      catalog.directions.map(
        (d) => renderClip(config, DEFAULT_PROJECT_STYLE, 'idle', d, table).frames[0]!,
      ),
    ]),
  );
  const first = renderClip(config, DEFAULT_PROJECT_STYLE, 'idle', 'S', table);
  writePng(path.join(OUT, `${id}_S_idle0_x1.png`), first.frames[0]!);
  console.log(`${id}: ${first.palette.length} colours, cell ${first.cell.w}×${first.cell.h}`);
}

// Outline presets and the 64 px output side by side, knight S walk.
const knight = SETUPS[1]!.config;
const variants: ProjectStyle[] = [
  DEFAULT_PROJECT_STYLE,
  { ...DEFAULT_PROJECT_STYLE, outline: 'soft' },
  { ...DEFAULT_PROJECT_STYLE, outline: 'none' },
  { ...DEFAULT_PROJECT_STYLE, characterHeightPx: 64 },
];
writePng(
  path.join(OUT, 'knight_styles_x8.png'),
  sheet(variants.map((s) => renderClip(knight, s, 'walk', 'S', table).frames)),
);
console.log(`sheets -> ${path.relative(process.cwd(), OUT)}`);
