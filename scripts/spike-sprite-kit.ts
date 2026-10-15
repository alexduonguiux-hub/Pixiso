/**
 * Spike: draw characters directly on the pixel grid from matrix templates
 * (no 3D). Writes ×8 contact sheets to test-output/spike-matrix/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { blit, createImage, scaleNearest, type RGBAImage, type Rgb8 } from '@pixiso/pixel-core';
import {
  CLIPS,
  buildClip,
  buildPalette,
  paint,
  toAscii,
  type CharacterSpec,
  type MaterialColors,
} from '@pixiso/sprite-kit';
import { REPO_ROOT } from './lib/paths.js';

const OUT = path.join(REPO_ROOT, 'test-output', 'spike-matrix');
fs.mkdirSync(OUT, { recursive: true });

function writePng(file: string, img: RGBAImage): void {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  fs.writeFileSync(file, PNG.sync.write(png));
}

interface Setup {
  id: string;
  spec: CharacterSpec;
  colors: MaterialColors;
}

const SETUPS: Setup[] = [
  { id: 'villager', spec: { parts: [] }, colors: {} },
  {
    id: 'knight',
    spec: { parts: ['cape', 'knight_helmet', 'sword_1handed', 'shield_round'] },
    colors: { cloth: [70, 90, 140], cloth2: [170, 50, 50], metal: [160, 168, 182] },
  },
  {
    id: 'ranger',
    spec: { parts: ['cape', 'sword_1handed'] },
    colors: {
      cloth: [70, 120, 70],
      cloth2: [60, 80, 50],
      hair: [200, 150, 70],
      pants: [80, 60, 40],
    },
  },
];

const SCALE = 8;
const PAD = 8;

function sheetFor(setup: Setup): RGBAImage {
  const palette = buildPalette(setup.colors);
  const rows: RGBAImage[][] = [];
  for (const facing of ['S', 'E', 'W'] as const) {
    for (const clip of CLIPS) {
      rows.push(buildClip(setup.spec, facing, clip).map((s) => paint(s, palette)));
    }
  }
  const cellW = 24 * SCALE;
  const cellH = 32 * SCALE;
  const cols = Math.max(...rows.map((r) => r.length));
  const sheet = createImage(PAD + cols * (cellW + PAD), PAD + rows.length * (cellH + PAD));
  // dark checkerboard background
  for (let y = 0; y < sheet.height; y++) {
    for (let x = 0; x < sheet.width; x++) {
      const v = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0 ? 0x2a : 0x22) as number;
      const o = (y * sheet.width + x) * 4;
      sheet.data[o] = v;
      sheet.data[o + 1] = v;
      sheet.data[o + 2] = v + 6;
      sheet.data[o + 3] = 255;
    }
  }
  rows.forEach((row, r) => {
    row.forEach((frame, c) => {
      blitOpaque(
        sheet,
        scaleNearest(frame, SCALE),
        PAD + c * (cellW + PAD),
        PAD + r * (cellH + PAD),
      );
    });
  });
  return sheet;
}

/** Blit only opaque pixels so the checkerboard shows through. */
function blitOpaque(dst: RGBAImage, src: RGBAImage, x: number, y: number): void {
  const tmp = createImage(src.width, src.height);
  blit(tmp, src, 0, 0);
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

for (const setup of SETUPS) {
  const sheet = sheetFor(setup);
  writePng(path.join(OUT, `${setup.id}_x8.png`), sheet);
  const palette = buildPalette(setup.colors);
  const first = paint(buildClip(setup.spec, 'S', CLIPS[0]!)[0]!, palette);
  writePng(path.join(OUT, `${setup.id}_S_idle0_x1.png`), first);
  console.log(`${setup.id}: ${palette.colors.length} colours`);
}
// ASCII dump of the knight S idle frame for eyeballing in the terminal
console.log(toAscii(buildClip(SETUPS[1]!.spec, 'S', CLIPS[0]!)[0]!).join('\n'));
const unusedColor: Rgb8 = [0, 0, 0];
void unusedColor;
