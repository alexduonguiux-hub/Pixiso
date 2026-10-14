import { test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { outDir, waitSceneReady } from './helpers.js';

/**
 * Produces the Phase 2 review images (HANDOFF §10, "Bàn giao để duyệt"):
 * 2 characters × directions S and E × 3 walk frames, nearest ×8, plus comparison
 * sheets for outline modes, palette sizes and heights. Not an assertion test.
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

/** In-page helper: renders frames and returns ×SCALE PNG data URLs plus a labelled contact sheet. */
async function renderSheet(
  page: Page,
  opts: {
    directions: string[];
    frames: number[];
    heightPx: number;
    outline: string;
    colors: number;
    title: string;
    scale: number;
  },
) {
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
    // One palette for the whole character: build it from all 8 walk frames of every direction.
    const perDir = o.directions.map((d) =>
      scene!.renderClip({ animation: walk, direction: d as 'S', style, rawOnly: true }),
    );
    const allRaw = perDir.flatMap((r) => r.raw);
    const processed = core.processFrames(allRaw, style.palette, style.outline);
    const union = core.unionRects(processed.frames.map((f) => core.opaqueBounds(f)))!;
    const rect = core.padRect(union, 1, allRaw[0]!.width, allRaw[0]!.height);

    const cells: { label: string; img: ReturnType<typeof core.cropImage> }[] = [];
    o.directions.forEach((d, di) => {
      for (const fi of o.frames) {
        const f = processed.frames[di * walk.defaultFrames + fi]!;
        cells.push({
          label: `${d} · frame ${fi + 1}/${walk.defaultFrames}`,
          img: core.cropImage(f, rect),
        });
      }
    });

    const toPng = (
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

    // Contact sheet: checkerboard background, cells in a row per direction, labels above.
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
    ctx.fillText(`${rect.w}×${rect.h} px · ${processed.palette.length} màu · ×${o.scale}`, pad, 46);
    cells.forEach((cell, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (cellW + pad);
      const y = 64 + row * (cellH + labelH + pad);
      ctx.fillStyle = '#9a9aa6';
      ctx.fillText(cell.label, x, y + 14);
      // checkerboard
      for (let cy = 0; cy < cellH; cy += 16) {
        for (let cx = 0; cx < cellW; cx += 16) {
          ctx.fillStyle = ((cx + cy) / 16) % 2 === 0 ? '#2a2a32' : '#222228';
          ctx.fillRect(x + cx, y + labelH + cy, Math.min(16, cellW - cx), Math.min(16, cellH - cy));
        }
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(toPng(cell.img, o.scale), x, y + labelH);
    });
    // palette strip
    const py = sheet.height - 10;
    processed.palette.forEach((c, i) => {
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(pad + i * 14, py - 8, 12, 8);
    });
    return {
      sheet: sheet.toDataURL('image/png'),
      frames: cells.map((c) => ({
        label: c.label,
        png: toPng(c.img, o.scale).toDataURL('image/png'),
      })),
      cell: { w: rect.w, h: rect.h },
      palette: processed.palette.length,
    };
  }, opts);
}

function writeDataUrl(file: string, dataUrl: string) {
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1]!, 'base64'));
}

test('review sheets: 2 characters × S/E × 3 walk frames at ×8', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitSceneReady(page);

  for (const setup of SETUPS) {
    await applySetup(page, setup);
    const r = await renderSheet(page, {
      directions: ['S', 'E'],
      frames: [0, 1, 2],
      heightPx: 48,
      outline: 'selective',
      colors: 16,
      title: `${setup.label} · 48 px · viền chọn lọc · 16 màu`,
      scale: SCALE,
    });
    writeDataUrl(path.join(dir, `${setup.id}_sheet_x8.png`), r.sheet);
    r.frames.forEach((f) => {
      const m = /^(\w+) · frame (\d+)/.exec(f.label);
      if (m) writeDataUrl(path.join(dir, `${setup.id}_${m[1]}_f${m[2]}_x8.png`), f.png);
    });
    console.log(`${setup.id}: cell ${r.cell.w}×${r.cell.h}, ${r.palette} colours`);
  }

  // Comparison sheets on the knight: outline modes, palette sizes, heights.
  await applySetup(page, SETUPS[0]!);
  for (const outline of ['none', 'dark', 'selective']) {
    const r = await renderSheet(page, {
      directions: ['S'],
      frames: [0],
      heightPx: 48,
      outline,
      colors: 16,
      title: `Viền: ${outline} · 48 px · 16 màu`,
      scale: SCALE,
    });
    writeDataUrl(path.join(dir, `compare_outline_${outline}_x8.png`), r.sheet);
  }
  for (const colors of [8, 16, 32]) {
    const r = await renderSheet(page, {
      directions: ['S'],
      frames: [0],
      heightPx: 48,
      outline: 'selective',
      colors,
      title: `Bảng màu: ${colors} màu · 48 px · viền chọn lọc`,
      scale: SCALE,
    });
    writeDataUrl(path.join(dir, `compare_palette_${colors}_x8.png`), r.sheet);
  }
  for (const h of [32, 48, 64]) {
    const r = await renderSheet(page, {
      directions: ['S'],
      frames: [0],
      heightPx: h,
      outline: 'selective',
      colors: 16,
      title: `Chiều cao: ${h} px · viền chọn lọc · 16 màu`,
      scale: SCALE,
    });
    writeDataUrl(path.join(dir, `compare_height_${h}_x8.png`), r.sheet);
  }
});
