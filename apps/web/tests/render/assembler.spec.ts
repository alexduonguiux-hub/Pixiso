import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { outDir, rigDebug, settleFrames, waitSceneReady } from './helpers.js';

const dir = outDir('phase1');

async function freshPage(page: Page) {
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitSceneReady(page);
}

async function shot(page: Page, name: string) {
  await settleFrames(page);
  await page.getByTestId('viewport-canvas').screenshot({ path: path.join(dir, `${name}.png`) });
}

test('assembles parts and resets incompatible ones when the base changes', async ({ page }) => {
  await freshPage(page);
  await page.getByTestId('play-toggle').click(); // pause for stable screenshots

  await page.getByTestId('character-knight').click();
  await waitSceneReady(page);
  let dbg = await rigDebug(page);
  expect(dbg.characterId).toBe('knight');
  expect(dbg.visibleBuiltins).toEqual([]);
  expect(dbg.hiddenBuiltins).toContain('1H_Sword');

  await page.getByTestId('part-hand_right').selectOption('sword_1handed');
  await page.getByTestId('part-hand_left').selectOption('shield_round');
  await page.getByTestId('part-head').selectOption('knight_helmet');
  await page.getByTestId('part-back').selectOption('knight_cape');
  await waitSceneReady(page);
  dbg = await rigDebug(page);
  expect(dbg.attached).toEqual({ hand_right: 'sword_1handed', hand_left: 'shield_round' });
  expect(dbg.visibleBuiltins).toEqual(['Knight_Cape', 'Knight_Helmet']);
  await shot(page, 'knight-sword-shield-helmet');

  await page.getByTestId('character-mage').click();
  await waitSceneReady(page);
  dbg = await rigDebug(page);
  expect(dbg.characterId).toBe('mage');
  expect(dbg.attached).toEqual({ hand_right: 'sword_1handed', hand_left: 'shield_round' });
  expect(dbg.visibleBuiltins).toEqual([]);
  const parts = await page.evaluate(() => window.__pixiso!.store.getState().config.parts);
  expect(parts.head).toBe('none');
  expect(parts.back).toBe('none');
  await shot(page, 'mage-with-knight-gear');
});

test('recolours targets with both methods', async ({ page }) => {
  await freshPage(page);
  await page.getByTestId('play-toggle').click();
  await page.getByTestId('character-knight').click();
  await page.getByTestId('part-hand_left').selectOption('shield_round');
  await waitSceneReady(page);
  await shot(page, 'knight-original');

  await page.getByTestId('color-body-red').click();
  await page.getByTestId('color-hand_left-gold').click();
  await page.getByTestId('color-legs-navy').click();
  await waitSceneReady(page);
  let dbg = await rigDebug(page);
  expect(dbg.recolored['Knight_Body']?.method).toBe('ramp'); // B is the default (D-011);
  expect(dbg.recolored['shield_round']?.method).toBe('ramp');
  expect(dbg.recolored['Knight_LegLeft']).toBeDefined();
  expect(dbg.recolored['Knight_Head']).toBeUndefined();
  await shot(page, 'knight-recolor-B-ramp');

  await page.getByTestId('recolor-hue').click();
  await waitSceneReady(page);
  dbg = await rigDebug(page);
  expect(dbg.recolored['Knight_Body']?.method).toBe('hue');
  await shot(page, 'knight-recolor-A-hue');

  for (const c of ['purple', 'white', 'black', 'green'] as const) {
    for (const m of ['hue', 'ramp'] as const) {
      await page.getByTestId(`recolor-${m}`).click();
      await page.getByTestId(`color-body-${c}`).click();
      await waitSceneReady(page);
      await shot(page, `knight-body-${c}-${m}`);
    }
  }

  await page.getByTestId('color-body-original').click();
  await waitSceneReady(page);
  dbg = await rigDebug(page);
  expect(dbg.recolored['Knight_Body']).toBeUndefined();
});

test('plays clips, turns in 45° steps and applies cached changes within 100 ms', async ({
  page,
}) => {
  await freshPage(page);
  await page.getByTestId('character-rogue').click();
  await page.getByTestId('part-hand_right').selectOption('dagger');
  await page.getByTestId('part-hand_left').selectOption('dagger');
  await waitSceneReady(page);
  await page.getByTestId('play-toggle').click();

  let dbg = await rigDebug(page);
  expect(dbg.clip).toBe('Walking_A');
  await page.getByTestId('anim-attack_dual').check();
  await page.getByTestId('preview-attack_dual').click();
  await waitSceneReady(page);
  dbg = await rigDebug(page);
  expect(dbg.clip).toBe('Dualwield_Melee_Attack_Slice');

  for (const d of ['S', 'E', 'N', 'W'] as const) {
    await page.getByTestId(`dir-${d}`).click();
    await shot(page, `rogue-dir-${d}`);
  }
  dbg = await rigDebug(page);
  expect(dbg.direction).toBe('W');

  // Everything needed is cached now: measure apply latency for a part + colour change.
  const ms = await page.evaluate(async () => {
    const { store, scene } = window.__pixiso!;
    const t0 = performance.now();
    store.getState().setPart('hand_left', 'none');
    store.getState().setColor('body', 'teal');
    await new Promise<void>((resolve) => {
      const poll = () => (scene!.ready ? resolve() : setTimeout(poll, 1));
      poll();
    });
    return performance.now() - t0;
  });
  console.log(`apply latency: ${ms.toFixed(1)} ms`);
  expect(ms).toBeLessThan(100);
});

test('config survives a JSON round trip through the UI', async ({ page }) => {
  await freshPage(page);
  await page.getByTestId('character-barbarian').click();
  await page.getByTestId('part-hand_right').selectOption('axe_2handed');
  await page.getByTestId('color-arms-brown').click();
  await waitSceneReady(page);
  const before = await page.evaluate(() => window.__pixiso!.store.getState().config);
  const json = await page.getByTestId('config-json').inputValue();
  expect(JSON.parse(json)).toEqual(before);

  await page.getByTestId('character-knight').click();
  await waitSceneReady(page);
  await page.getByTestId('config-json').fill(json);
  await page.getByTestId('config-import').click();
  await waitSceneReady(page);
  const after = await page.evaluate(() => window.__pixiso!.store.getState().config);
  expect(after).toEqual(before);
  await expect(page.getByTestId('config-message')).toHaveText('Đã nhập cấu hình.');
});
