import { test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { outDir, waitSceneReady } from './helpers.js';

/**
 * Produces the Phase 2 review images (HANDOFF §10, "Bàn giao để duyệt"):
 * 2 characters × directions S and E × 3 walk frames, nearest ×8, for the
 * pixel-rules look and for the Phase 2 baseline, plus comparison sheets for
 * outline modes, palette sizes and heights. Not an assertion test.
 */

const dir = outDir('review-phase2');
const SCALE = 8;

interface Setup {
  id: string;
  label: string;
  character: string;
  parts: Record<string, string>;
  colors: { target: string; color: string }[];
}

const SETUPS: Setup[] = [
  {
    id: 'knight',
    label: 'Hiệp sĩ · kiếm + khiên tròn + mũ giáp',
    character: 'knight',
    parts: {
      hand_right: 'sword_1handed',
      hand_left: 'shield_round',
      head: 'knight_helmet',
      back: 'knight_cape',
    },
    colors: [{ target: 'back', color: 'red' }],
  },
  {
    id: 'mage',
    label: 'Pháp sư · gậy phép + mũ, áo tím',
    character: 'mage',
    parts: {
      hand_right: 'staff',
      hand_left: 'spellbook_closed',
      head: 'mage_hat',
      back: 'mage_cape',
    },
    colors: [
      { target: 'body', color: 'purple' },
      { target: 'back', color: 'purple' },
    ],
  },
];

interface SheetOptions {
  directions: string[];
  frames: number[];
  heightPx: number;
  outline: string;
  colors: number;
  title: string;
  scale: number;
  look?: 'ramp' | 'composite';
}

async function applySetup(page: Page, s: Setup) {
  await page.evaluate((setup) => {
    const { store } = window.__pixiso!;
    store.getState().replaceConfig({
      version: 1,
      baseCharacter: setup.character,
      parts: setup.parts,
      colors: setup.colors as { target: string; color: 'red' }[],
      animations: ['idle', 'walk'],
    });
    store.getState().setPreview({ playing: false });
  }, s);
  await waitSceneReady(page);
}

/** In-page: renders the walk clip for each direction, one palette across all of them, and draws a labelled sheet. */
async function renderSheet(page: Page, o: SheetOptions) {
  return page.evaluate(async (o) => {
    const { store, scene } = window.__pixiso!;
    const core = window.__pixiso!.core;
    const s = store.getState();
    const walk = s.catalog.animations.find((a) => a.id === 'walk')!;
    const style = {
      ...s.style,
      characterHeightPx: o.heightPx as 32 | 48 | 64,
      outline: o.outline as 'none' | 'dark' | 'selective',
      palette: { mode: 'auto' as const, colors: o.colors },
    };
    const look = o.look ?? 'ramp';
    const perDir = o.directions.map((d) =>
      scene!.renderClip({
        animation: walk,
        direction: d as 'S',
        style,
        look,
        rawOnly: look === 'composite',
      }),
    );
    let frames;
    if (look === 'ramp') {
      const processed = core.processPasses(
        perDir.flatMap((r) => r.passes),
        { ...core.DEFAULT_LOOK, maxColors: o.colors, outline: style.outline },
      );
      frames = processed.frames;
    } else {
      frames = core.processFrames(
        perDir.flatMap((r) => r.raw),
        style.palette,
        style.outline,
      ).frames;
    }
    const colorKeys = [...core.colorHistogram(frames).keys()].sort((a, b) => a - b);
    const union = core.unionRects(frames.map((f) => core.opaqueBounds(f)))!;
    const rect = core.padRect(union, 1, frames[0]!.width, frames[0]!.height);

    const cells: { label: string; img: ReturnType<typeof core.cropImage> }[] = [];
    o.directions.forEach((d, di) => {
      for (const fi of o.frames) {
        const f = frames[di * walk.defaultFrames + fi]!;
        cells.push({
          label: `${d} · frame ${fi + 1}/${walk.defaultFrames}`,
          img: core.cropImage(f, rect),
        });
      }
    });

    const toCanvas = (
      img: { width: number; height: number; data: Uint8ClampedArray },
      scale: number,
    ) => {
      const c = document.createElement('canvas');
      c.width = img.width * scale;
      c.height = img.height * scale;
      const ctx = c.getContext('2d')!;
      const tmp = document.createElement('canvas');
      tmp.width = img.width;
      tmp.height = img.height;
      tmp
        .getContext('2d')!
        .putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, c.width, c.height);
      return c;
    };

    const cellW = rect.w * o.scale;
    const cellH = rect.h * o.scale;
    const pad = 16;
    const labelH = 22;
    const cols = o.frames.length;
    const rows = o.directions.length;
    const sheet = document.createElement('canvas');
    sheet.width = pad + cols * (cellW + pad);
    sheet.height = 64 + rows * (cellH + labelH + pad);
    const ctx = sheet.getContext('2d')!;
    ctx.fillStyle = '#1b1b20';
    ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.fillStyle = '#e8e8ec';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(o.title, pad, 28);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#9a9aa6';
    ctx.fillText(`${rect.w}×${rect.h} px · ${colorKeys.length} màu · ×${o.scale}`, pad, 46);
    cells.forEach((cell, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (cellW + pad);
      const y = 64 + row * (cellH + labelH + pad);
      ctx.fillStyle = '#9a9aa6';
      ctx.fillText(cell.label, x, y + 14);
      for (let cy = 0; cy < cellH; cy += 16) {
        for (let cx = 0; cx < cellW; cx += 16) {
          ctx.fillStyle = ((cx + cy) / 16) % 2 === 0 ? '#2a2a32' : '#222228';
          ctx.fillRect(x + cx, y + labelH + cy, Math.min(16, cellW - cx), Math.min(16, cellH - cy));
        }
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(toCanvas(cell.img, o.scale), x, y + labelH);
    });
    const py = sheet.height - 10;
    colorKeys.forEach((key, i) => {
      ctx.fillStyle = `rgb(${(key >> 16) & 255},${(key >> 8) & 255},${key & 255})`;
      ctx.fillRect(pad + i * 14, py - 8, 12, 8);
    });
    return {
      sheet: sheet.toDataURL('image/png'),
      frames: cells.map((c) => ({
        label: c.label,
        png: toCanvas(c.img, o.scale).toDataURL('image/png'),
      })),
      cell: { w: rect.w, h: rect.h },
      palette: colorKeys.length,
    };
  }, o);
}

function writeDataUrl(file: string, dataUrl: string) {
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1]!, 'base64'));
}

test('review sheets: 2 characters × S/E × 3 walk frames at ×8', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitSceneReady(page);

  for (const setup of SETUPS) {
    await applySetup(page, setup);
    const base = {
      directions: ['S', 'E'],
      frames: [0, 1, 2],
      heightPx: 48,
      outline: 'selective',
      colors: 16,
      scale: SCALE,
    };
    const r = await renderSheet(page, {
      ...base,
      title: `${setup.label} · 48 px · viền chọn lọc · 16 màu · quy tắc pixel (mới)`,
    });
    writeDataUrl(path.join(dir, `${setup.id}_sheet_x8.png`), r.sheet);
    r.frames.forEach((f) => {
      const m = /^(\w+) · frame (\d+)/.exec(f.label);
      if (m) writeDataUrl(path.join(dir, `${setup.id}_${m[1]}_f${m[2]}_x8.png`), f.png);
    });
    const old = await renderSheet(page, {
      ...base,
      look: 'composite',
      title: `${setup.label} · 48 px · viền chọn lọc · 16 màu · Phase 2 (cũ)`,
    });
    writeDataUrl(path.join(dir, `${setup.id}_sheet_baseline_x8.png`), old.sheet);
    console.log(
      `${setup.id}: new cell ${r.cell.w}×${r.cell.h} (${r.palette} colours), baseline ${old.cell.w}×${old.cell.h} (${old.palette} colours)`,
    );
  }

  // Comparison sheets on the knight: outline modes, palette sizes, heights.
  await applySetup(page, SETUPS[0]!);
  const one = { directions: ['S'], frames: [0], scale: SCALE };
  for (const outline of ['none', 'dark', 'selective']) {
    const r = await renderSheet(page, {
      ...one,
      heightPx: 48,
      outline,
      colors: 16,
      title: `Viền: ${outline} · 48 px · 16 màu`,
    });
    writeDataUrl(path.join(dir, `compare_outline_${outline}_x8.png`), r.sheet);
  }
  for (const colors of [8, 16, 24, 32]) {
    const r = await renderSheet(page, {
      ...one,
      heightPx: 48,
      outline: 'selective',
      colors,
      title: `Bảng màu: ${colors} màu · 48 px · viền chọn lọc`,
    });
    writeDataUrl(path.join(dir, `compare_palette_${colors}_x8.png`), r.sheet);
  }
  for (const h of [32, 48, 64]) {
    const r = await renderSheet(page, {
      ...one,
      heightPx: h,
      outline: 'selective',
      colors: 16,
      title: `Chiều cao: ${h} px · viền chọn lọc · 16 màu`,
    });
    writeDataUrl(path.join(dir, `compare_height_${h}_x8.png`), r.sheet);
  }
});
