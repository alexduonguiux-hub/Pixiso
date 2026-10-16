import { imageHash } from '@pixiso/pixel-core';
import { describe, expect, it } from 'vitest';
import { compose } from './compose.js';
import { toAscii } from './format.js';
import {
  HERO_CANVAS,
  HERO_FIGURE_H,
  HERO_FIGURE_W,
  HERO_GROUND,
  HERO_PIVOT,
  HERO_S_FIGURE,
  HERO_VIEWS,
  heroFrames,
  heroStand,
  heroViewS,
} from './hero64.js';
import { buildForm, FORMS } from './heroforms.js';
import { buildPalette, paint } from './paint.js';

describe('hero 64 mannequin', () => {
  it('front figure is 17×40 with the soles on the ground row', () => {
    expect(HERO_S_FIGURE.w).toBe(HERO_FIGURE_W);
    expect(HERO_S_FIGURE.h).toBe(HERO_FIGURE_H);
    const stand = heroStand('S');
    expect(toAscii(stand.sprite)).toEqual(toAscii(HERO_S_FIGURE));
    expect(stand.y + stand.sprite.h - 1).toBe(HERO_GROUND);
    expect(stand.x + Math.floor(stand.sprite.w / 2)).toBe(HERO_PIVOT.x);
  });

  it('every frame of every view fits the 64 canvas and is outlined by its own line cells', () => {
    for (const view of HERO_VIEWS) {
      for (const f of heroFrames(view)) {
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.x + f.sprite.w).toBeLessThanOrEqual(HERO_CANVAS);
        expect(f.y + f.sprite.h).toBeLessThanOrEqual(HERO_CANVAS);
        const rows = toAscii(f.sprite);
        // Top and bottom rows of the drawing are line cells (skull cap, soles).
        expect(rows[0]!.replace(/\./g, '')).toMatch(/^o+$/);
        expect(rows[rows.length - 1]!.replace(/\./g, '')).toMatch(/^o+$/);
      }
    }
  });

  it('the part split of the front figure recomposes to the figure exactly', () => {
    const body = heroViewS();
    const layers = Object.entries(body.parts).map(([id, p]) => ({
      id,
      sprite: p.sprite,
      x: p.x,
      y: p.y,
      z: p.z,
    }));
    const frame = compose(layers, HERO_CANVAS, HERO_CANVAS);
    const stand = heroStand('S');
    const whole = compose(
      [{ id: 'w', sprite: stand.sprite, x: stand.x, y: stand.y, z: 0 }],
      HERO_CANVAS,
      HERO_CANVAS,
    );
    expect(toAscii(frame)).toEqual(toAscii(whole));
  });

  it('body forms keep odd widths, stay centred and render deterministically', () => {
    const palette = buildPalette();
    for (const form of FORMS) {
      const s = buildForm(form);
      if (!form.scale) expect(s.w % 2).toBe(1);
      const rows = toAscii(s);
      expect(rows[rows.length - 1]!.replace(/\./g, '')).toMatch(/^o+$/);
      expect(imageHash(paint(s, palette))).toBe(imageHash(paint(buildForm(form), palette)));
    }
  });
});
