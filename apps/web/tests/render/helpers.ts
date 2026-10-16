import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEST_OUTPUT = fileURLToPath(new URL('../../../../test-output/', import.meta.url));

export function outDir(name: string): string {
  const dir = path.join(TEST_OUTPUT, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Fresh app state: cleared localStorage, preview paused on S idle. */
export async function openFresh(page: Page): Promise<void> {
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__pixiso !== undefined);
  await page.evaluate(() => {
    window
      .__pixiso!.store.getState()
      .setPreview({ playing: false, direction: 'S', animationId: 'idle' });
  });
}

/** Opaque pixel count and a hash of the preview canvas. */
export async function canvasStats(page: Page, testId: string) {
  return page.evaluate((id) => {
    const canvas = document.querySelector(`[data-testid="${id}"]`) as HTMLCanvasElement | null;
    if (!canvas || canvas.width === 0) return null;
    const ctx = canvas.getContext('2d')!;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let opaque = 0;
    let hash = 2166136261;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 255) opaque++;
      for (let k = 0; k < 4; k++) {
        hash ^= data[i + k]!;
        hash = Math.imul(hash, 16777619) >>> 0;
      }
    }
    return { width: canvas.width, height: canvas.height, opaque, hash };
  }, testId);
}
