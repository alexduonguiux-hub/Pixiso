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

/** Resolves once the scene has applied the current store state. */
export async function waitSceneReady(page: Page, timeout = 60_000): Promise<void> {
  await page.waitForFunction(() => window.__pixiso?.scene?.ready === true, undefined, { timeout });
  const err = await page.evaluate(() => window.__pixiso?.scene?.lastError ?? null);
  if (err) throw new Error(`scene apply failed: ${err}`);
}

export async function rigDebug(page: Page) {
  return page.evaluate(() => window.__pixiso!.scene!.rig.getDebugState());
}

/** Lets a couple of frames render so the canvas shows the latest state. */
export async function settleFrames(page: Page, frames = 3): Promise<void> {
  await page.evaluate(
    (n) =>
      new Promise<void>((resolve) => {
        let left = n;
        const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      }),
    frames,
  );
}
