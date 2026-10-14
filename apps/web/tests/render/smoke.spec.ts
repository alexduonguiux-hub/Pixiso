import { expect, test } from '@playwright/test';

test('app boots and lists catalog characters', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await expect(page.getByRole('heading', { name: 'Pixiso' })).toBeVisible();
  const items = page.getByTestId('character-list').locator('button');
  await expect(items).not.toHaveCount(0);
});

test('WebGL2 is available in headless Chromium', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  const info = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: true });
    if (!gl) return null;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      version: gl.getParameter(gl.VERSION) as string,
      renderer: dbg ? (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string) : 'n/a',
      maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    };
  });
  expect(info).not.toBeNull();
  expect(info!.maxTexture).toBeGreaterThanOrEqual(2048);
  console.log('WebGL:', info);
});
