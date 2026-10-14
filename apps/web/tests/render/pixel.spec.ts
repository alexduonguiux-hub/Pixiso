import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { outDir, waitSceneReady } from './helpers.js';

/**
 * Phase 2 acceptance (HANDOFF §10): determinism, ≤N colours, no semi-transparent
 * pixels, reference height ±1 px, 2:1 ground diamond, linear→sRGB correctness.
 * Everything heavy runs inside the page; only numbers and PNG data URLs come back.
 */

const dir = outDir('phase2');

async function openBare(page: Page, character = 'knight') {
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitSceneReady(page);
  await page.evaluate((id) => {
    const { store } = window.__pixiso!;
    store.getState().replaceConfig({
      version: 1,
      baseCharacter: id,
      parts: {},
      colors: [],
      animations: ['idle', 'walk'],
    });
    store.getState().setPreview({ playing: false, direction: 'S', animationId: 'idle' });
  }, character);
  await waitSceneReady(page);
}

/** Runs a clip render in-page and returns compact statistics. */
async function renderStats(
  page: Page,
  animationId: string,
  direction: string,
  heightPx: number,
  frames = 1,
  outline = 'selective',
  colors = 16,
  look: 'ramp' | 'composite' = 'ramp',
  rawCheck = false,
) {
  return page.evaluate(
    async ({ animationId, direction, heightPx, frames, outline, colors, look, rawCheck }) => {
      const { store, scene } = window.__pixiso!;
      const s = store.getState();
      const animation = s.catalog.animations.find((a) => a.id === animationId)!;
      const style = {
        ...s.style,
        characterHeightPx: heightPx as 32 | 48 | 64,
        outline: outline as 'none' | 'dark' | 'selective',
        palette: { mode: 'auto' as const, colors },
      };
      const core = window.__pixiso!.core;
      const res = scene!.renderClip({
        animation,
        direction: direction as 'S',
        style,
        frames,
        look,
      });
      const rawRes = rawCheck
        ? scene!.renderClip({
            animation,
            direction: direction as 'S',
            style,
            frames,
            rawOnly: true,
          })
        : null;
      return {
        hashes: res.frames.map((f) => core.imageHash(f)),
        colors: res.frames.map((f) => core.countColors(f)),
        semi: res.frames.map((f) => core.countSemiTransparent(f)),
        rawSemi: rawRes ? rawRes.raw.map((f) => core.countSemiTransparent(f)) : [],
        bounds: res.frames.map((f) => core.opaqueBounds(f)),
        palette: res.palette.length,
        ppm: res.ppm,
        frustum: res.frustum,
      };
    },
    { animationId, direction, heightPx, frames, outline, colors, look, rawCheck },
  );
}

test('same config renders byte-identical frames twice', async ({ page }) => {
  await openBare(page, 'knight');
  await page.evaluate(() => {
    const { store } = window.__pixiso!;
    store.getState().setPart('hand_right', 'sword_1handed');
    store.getState().setPart('hand_left', 'shield_round');
    store.getState().setColor('body', 'red');
  });
  await waitSceneReady(page);
  const a = await renderStats(page, 'walk', 'S', 48, 4);
  const b = await renderStats(page, 'walk', 'S', 48, 4);
  expect(a.hashes).toEqual(b.hashes);
  expect(a.hashes.length).toBe(4);
  expect(new Set(a.hashes).size).toBe(4); // frames actually differ
});

test('output has ≤ N colours and no semi-transparent pixels', async ({ page }) => {
  await openBare(page, 'mage');
  await page.evaluate(() => {
    const { store } = window.__pixiso!;
    store.getState().setPart('hand_right', 'staff');
    store.getState().setPart('head', 'mage_hat');
  });
  await waitSceneReady(page);
  for (const colors of [8, 16]) {
    const r = await renderStats(page, 'walk', 'E', 48, 4, 'selective', colors);
    expect(r.palette).toBeLessThanOrEqual(colors);
    for (const c of r.colors) expect(c).toBeLessThanOrEqual(colors);
    for (const n of r.semi) expect(n).toBe(0);
  }
  // Even before post-processing the GPU pass must not produce blended edges (antialias off).
  const raw = await renderStats(page, 'idle', 'S', 48, 1, 'none', 16, 'ramp', true);
  expect(raw.rawSemi[0]).toBe(0);
  // The Phase 2 baseline look must still satisfy the same limits.
  const old = await renderStats(page, 'walk', 'E', 48, 2, 'selective', 16, 'composite');
  expect(old.palette).toBeLessThanOrEqual(16);
  for (const n of old.semi) expect(n).toBe(0);
});

test('reference character height matches characterHeightPx within ±1 px', async ({ page }) => {
  await openBare(page, 'knight');
  const measured: Record<number, number> = {};
  for (const h of [32, 48, 64] as const) {
    const r = await renderStats(page, 'idle', 'S', h, 1, 'none', 32);
    const b = r.bounds[0]!;
    expect(b).not.toBeNull();
    measured[h] = b!.h;
    console.log(`height ${h}px -> rendered ${b!.h}px (w ${b!.w}), ppm ${r.ppm.toFixed(3)}`);
    expect(Math.abs(b!.h - h)).toBeLessThanOrEqual(1);
  }
  fs.writeFileSync(path.join(dir, 'height-check.json'), JSON.stringify(measured, null, 2));
});

test('a 1×1 m ground square renders as a 2:1 diamond', async ({ page }) => {
  await openBare(page, 'knight');
  const r = await page.evaluate(async () => {
    const { store, scene } = window.__pixiso!;
    const s = store.getState();
    const core = window.__pixiso!.core;
    scene!.setTestObject('ground_square');
    const animation = s.catalog.animations[0]!;
    const style = { ...s.style, characterHeightPx: 64 as const, outline: 'none' as const };
    const res = scene!.renderClip({ animation, direction: 'S', style, frames: 1, rawOnly: true });
    scene!.setTestObject(null);
    const img = core.alphaThreshold(res.raw[0]!);
    return { bounds: core.opaqueBounds(img), ppm: res.ppm };
  });
  expect(r.bounds).not.toBeNull();
  const { w, h } = r.bounds!;
  console.log(
    `ground square: ${w}×${h} px at ppm ${r.ppm.toFixed(3)} (expected width ≈ ${(Math.SQRT2 * r.ppm).toFixed(1)})`,
  );
  expect(Math.abs(w - 2 * h)).toBeLessThanOrEqual(2);
  expect(Math.abs(w - Math.SQRT2 * r.ppm)).toBeLessThanOrEqual(2);
});

test('flat colours survive the linear→sRGB path unchanged', async ({ page }) => {
  await openBare(page, 'knight');
  const samples = await page.evaluate(async () => {
    const { store, scene } = window.__pixiso!;
    const s = store.getState();
    const out: Record<string, number[]> = {};
    for (const hex of ['#d1343a', '#3a7bd5', '#808080', '#f2d23c']) {
      scene!.setTestObject('flat_quad', hex);
      const res = scene!.renderClip({
        animation: s.catalog.animations[0]!,
        direction: 'S',
        style: s.style,
        frames: 1,
        rawOnly: true,
      });
      const img = res.raw[0]!;
      // the quad is centred 1 m above the origin: sample around that pixel
      const x = res.frustum.pivotX;
      const y = res.frustum.pivotY - Math.round(res.ppm * Math.cos(Math.PI / 6));
      const i = (y * img.width + x) * 4;
      out[hex] = [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, img.data[i + 3]!];
    }
    scene!.setTestObject(null);
    return out;
  });
  for (const [hex, rgba] of Object.entries(samples)) {
    const n = parseInt(hex.slice(1), 16);
    const expected = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    console.log(`flat ${hex} -> ${rgba.join(',')}`);
    expect(rgba[3]).toBe(255);
    for (let k = 0; k < 3; k++) expect(Math.abs(rgba[k]! - expected[k]!)).toBeLessThanOrEqual(1);
  }
});

test('live pixel preview shows a processed clip', async ({ page }) => {
  await openBare(page, 'rogue');
  await page.evaluate(() => window.__pixiso!.store.getState().setPreview({ animationId: 'walk' }));
  await expect(page.getByTestId('pixel-status')).toContainText('màu', { timeout: 30_000 });
  const size = await page
    .getByTestId('pixel-canvas')
    .evaluate((c) => [(c as HTMLCanvasElement).width, (c as HTMLCanvasElement).height]);
  expect(size[0]).toBeGreaterThan(48);
  expect(size[1]).toBeGreaterThan(48);
  await page
    .getByTestId('pixel-canvas')
    .screenshot({ path: path.join(dir, 'preview-rogue-walk.png') });
});
