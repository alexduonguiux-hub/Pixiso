/** Renders the shape-built S body in three proportion sets, idle + walk, ×8, for review. */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import {
  createImage,
  REFERENCE_RAMP_OPTIONS,
  scaleNearest,
  type RGBAImage,
} from '@pixiso/pixel-core';
import {
  buildBodyS,
  buildPalette,
  CANVAS_H,
  CANVAS_W,
  CHIBI_CLASSIC,
  CHIBI_ROUND,
  CHIBI_TALL,
  CLIPS,
  compose,
  paint,
  REFERENCE_PAINT_OPTIONS,
  toAscii,
  type BodyParams,
  type Layer,
  type LimbId,
} from '@pixiso/sprite-kit';
import { TEST_OUTPUT_DIR } from './lib/paths.js';

const OUT = path.join(TEST_OUTPUT_DIR, 'variants');
fs.mkdirSync(OUT, { recursive: true });
const SCALE = 8;
const PAD = 8;

function writePng(file: string, img: RGBAImage): void {
  const png = new PNG({ width: img.width, height: img.height });
  png.data = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  fs.writeFileSync(file, PNG.sync.write(png));
}

function frameFor(p: BodyParams, limbs: Partial<Record<LimbId, [number, number]>>) {
  const view = buildBodyS(p);
  const layers: Layer[] = (
    Object.entries(view.parts) as [LimbId, (typeof view.parts)[LimbId]][]
  ).map(([id, part]) => {
    const [dx, dy] = limbs[id] ?? [0, 0];
    return { id, sprite: part.sprite, x: part.x + dx, y: part.y + dy, z: part.z };
  });
  return compose(layers, CANVAS_W, CANVAS_H);
}

const VARIANTS: [string, BodyParams][] = [
  ['A tron', CHIBI_ROUND],
  ['B chibi', CHIBI_CLASSIC],
  ['C cao', CHIBI_TALL],
];
const palettes = [
  buildPalette({}, REFERENCE_RAMP_OPTIONS),
  buildPalette({ cloth: [70, 90, 140], hair: [40, 32, 36] }, REFERENCE_RAMP_OPTIONS),
  buildPalette(
    { cloth: [120, 60, 60], hair: [200, 150, 70], pants: [60, 60, 80] },
    REFERENCE_RAMP_OPTIONS,
  ),
];
const idle = CLIPS.find((c) => c.id === 'idle')!.frames.S;
const walk = CLIPS.find((c) => c.id === 'walk')!.frames.S;

const cellW = CANVAS_W * SCALE;
const cellH = CANVAS_H * SCALE;
const cols = 2 + 4 + 2;
const sheet = createImage(PAD + cols * (cellW + PAD), PAD + VARIANTS.length * (cellH + PAD));
for (let i = 0; i < sheet.data.length; i += 4) {
  const px = (i / 4) % sheet.width;
  const py = Math.floor(i / 4 / sheet.width);
  const v = (Math.floor(px / 16) + Math.floor(py / 16)) % 2 === 0 ? 0x2a : 0x22;
  sheet.data[i] = v;
  sheet.data[i + 1] = v;
  sheet.data[i + 2] = v + 6;
  sheet.data[i + 3] = 255;
}
function blit(img: RGBAImage, x: number, y: number) {
  const s = scaleNearest(img, SCALE);
  for (let sy = 0; sy < s.height; sy++)
    for (let sx = 0; sx < s.width; sx++) {
      const si = (sy * s.width + sx) * 4;
      if (s.data[si + 3] !== 255) continue;
      const di = ((y + sy) * sheet.width + (x + sx)) * 4;
      sheet.data[di] = s.data[si]!;
      sheet.data[di + 1] = s.data[si + 1]!;
      sheet.data[di + 2] = s.data[si + 2]!;
      sheet.data[di + 3] = 255;
    }
}
VARIANTS.forEach(([name, p], r) => {
  const frames = [
    ...idle.map((f) => paint(frameFor(p, f.limbs), palettes[0]!, REFERENCE_PAINT_OPTIONS)),
    ...walk.map((f) => paint(frameFor(p, f.limbs), palettes[0]!, REFERENCE_PAINT_OPTIONS)),
    paint(frameFor(p, {}), palettes[1]!, REFERENCE_PAINT_OPTIONS),
    paint(frameFor(p, {}), palettes[2]!, REFERENCE_PAINT_OPTIONS),
  ];
  frames.forEach((f, c) => blit(f, PAD + c * (cellW + PAD), PAD + r * (cellH + PAD)));
  console.log(`== ${name}`);
  console.log(toAscii(frameFor(p, {})).join('\n'));
});
writePng(path.join(OUT, 'variants_S_x8.png'), sheet);
console.log(`-> ${path.relative(process.cwd(), OUT)}/variants_S_x8.png`);
