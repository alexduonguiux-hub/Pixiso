import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { canvasStats, openFresh, outDir } from './helpers.js';

const dir = outDir('m1');

/** Waits until the preview canvas reports having drawn `direction:animation:frame:parts:colours`. */
async function drawn(page: Page, key: string) {
  await expect(page.getByTestId('preview-canvas')).toHaveAttribute('data-drawn', key);
  return (await canvasStats(page, 'preview-canvas'))!;
}

test('app boots and lists catalog characters', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await expect(page.getByRole('heading', { name: 'Pixiso' })).toBeVisible();
  const items = page.getByTestId('character-list').locator('button');
  await expect(items).not.toHaveCount(0);
});

test('preview draws the configured character, reacts to parts and directions, deterministically', async ({
  page,
}) => {
  await openFresh(page);
  const overlay = page.getByTestId('preview-stage').locator('.overlay');
  const status = page.getByTestId('preview-status');
  const bare = await drawn(page, 'S:idle:0:0:0');
  await expect(overlay).toHaveText('Nam (S)');
  await expect(status).toContainText('Khung 1/2');
  expect(bare.opaque).toBeGreaterThan(0);

  await page.getByTestId('part-head').selectOption('knight_helmet');
  await page.getByTestId('part-hand_right').selectOption('sword_1handed');
  await page.getByTestId('part-hand_left').selectOption('shield_round');
  await page.getByTestId('part-back').selectOption('cape');
  await page.getByTestId('color-cape-red').click();
  const knight = await drawn(page, 'S:idle:0:4:1');
  expect(knight.hash).not.toBe(bare.hash);
  expect(knight.opaque).toBeGreaterThan(bare.opaque);
  await page.getByTestId('preview-stage').screenshot({ path: path.join(dir, 'knight-S.png') });

  await page.getByTestId('dir-W').click();
  const west = await drawn(page, 'W:idle:0:4:1');
  await expect(overlay).toHaveText('Tây (W)');
  expect(west.hash).not.toBe(knight.hash);
  await page.getByTestId('preview-stage').screenshot({ path: path.join(dir, 'knight-W.png') });

  // Every catalog direction renders; the back view differs from the side view.
  await page.getByTestId('dir-N').click();
  const north = await drawn(page, 'N:idle:0:4:1');
  expect(north.hash).not.toBe(west.hash);
  await page.getByTestId('preview-stage').screenshot({ path: path.join(dir, 'knight-N.png') });
  await page.getByTestId('dir-W').click();
  await drawn(page, 'W:idle:0:4:1');

  // Same config twice → same bytes (localStorage keeps the config across the reload).
  await page.reload();
  await page.waitForFunction(() => window.__pixiso !== undefined);
  await page.evaluate(() =>
    window
      .__pixiso!.store.getState()
      .setPreview({ playing: false, direction: 'W', animationId: 'idle' }),
  );
  const again = await drawn(page, 'W:idle:0:4:1');
  expect(again.hash).toBe(west.hash);

  // The frame strip and palette are populated.
  await expect(page.getByTestId('frame-strip').locator('canvas')).toHaveCount(2);
  await expect(page.getByTestId('pixel-palette').locator('.swatch')).not.toHaveCount(0);
});
