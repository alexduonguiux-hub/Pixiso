import { imageHash } from '@pixiso/pixel-core';
import { describe, expect, it } from 'vitest';
import { BASE_LOOKS, wearView, wearWalk } from './cast64.js';
import { toAscii } from './format.js';
import { HERO_VIEWS } from './hero64.js';
import {
  HERO_CLIP_IDS,
  HERO_PARTS,
  HERO_PRESETS,
  HERO_SLOT_IDS,
  heroLook,
  heroPartById,
} from './hero64.registry.js';
import { dress } from './outfit64.js';
import { buildPalette, HERO_RAMPS, paint } from './paint.js';
import { COLOR_TARGETS, HERO_BODY_ID } from './registry.js';
import { materialColorsFor } from './render.js';
import { STAND_VIEWS } from './views64.js';
import { WALK_VIEWS, WALK_VIEWS_DRAWN } from './walk64.js';

/** Presets carry hex colours only, so no named-colour table is needed. */
const NO_TABLE = new Map();

describe('hero registry', () => {
  it('every preset is the cast look, pixel for pixel, in every view and walk step', () => {
    expect(HERO_PRESETS.map((p) => p.id)).toEqual(BASE_LOOKS.map((c) => c.id));
    for (const preset of HERO_PRESETS) {
      const cast = BASE_LOOKS.find((c) => c.id === preset.id)!;
      const look = heroLook(preset.config.parts, materialColorsFor(preset.config, NO_TABLE));
      const same = (
        a: ReturnType<typeof dress>,
        b: ReturnType<typeof dress>,
        where: string,
      ): void => {
        expect(toAscii(b), where).toEqual(toAscii(a));
        expect(imageHash(paint(b, buildPalette(look.colors, HERO_RAMPS))), where).toBe(
          imageHash(paint(a, buildPalette(cast.look.colors, HERO_RAMPS))),
        );
      };
      for (const view of HERO_VIEWS) {
        const figure = STAND_VIEWS[view].form.figure!;
        same(
          dress(figure, wearView(cast.id, cast.label, cast.look, view)),
          dress(figure, wearView(cast.id, cast.label, look, view)),
          `${preset.id}@${view}`,
        );
      }
      for (const view of WALK_VIEWS_DRAWN)
        for (const step of [0, 1] as const) {
          const figure = WALK_VIEWS[view]![step].form.figure!;
          same(
            dress(figure, wearWalk(cast.id, cast.label, cast.look, view, step)),
            dress(figure, wearWalk(cast.id, cast.label, look, view, step)),
            `${preset.id}@${view}${step}`,
          );
        }
    }
  });

  it('presets are plain hero configs: known parts in their slots, every colour a target as hex', () => {
    for (const { id, config } of HERO_PRESETS) {
      expect(config.baseCharacter).toBe(HERO_BODY_ID);
      expect(Object.keys(config.parts).sort()).toEqual([...HERO_SLOT_IDS].sort());
      for (const [slot, part] of Object.entries(config.parts)) {
        if (part === 'none') continue;
        expect(heroPartById(part)?.slot, `${id}: ${part}`).toBe(slot);
      }
      const cast = BASE_LOOKS.find((c) => c.id === id)!;
      expect(config.colors.length).toBe(Object.keys(cast.look.colors).length);
      for (const c of config.colors) {
        expect(COLOR_TARGETS.some((t) => t.id === c.target), `${id}: ${c.target}`).toBe(true);
        expect(c.color).toMatch(/^#[0-9a-f]{6}$/);
      }
      expect(config.animations).toEqual([...HERO_CLIP_IDS]);
    }
  });

  it('every part has a unique id, sits in a hero slot and dresses the bare figure in every view', () => {
    const ids = new Set<string>();
    for (const p of HERO_PARTS) {
      expect(ids.has(p.id), p.id).toBe(false);
      ids.add(p.id);
      expect(HERO_SLOT_IDS).toContain(p.slot);
      const look = heroLook({ [p.slot]: p.id }, {});
      for (const view of HERO_VIEWS) {
        const figure = STAND_VIEWS[view].form.figure!;
        const s = dress(figure, wearView(p.id, p.id, look, view));
        expect(s.w - s.ox, `${p.id}@${view}`).toBeGreaterThanOrEqual(figure.w);
        expect(s.h - s.oy, `${p.id}@${view}`).toBeGreaterThanOrEqual(figure.h);
      }
    }
  });

  it('a head with neither hair nor hat is shaven; a part in the wrong slot is ignored', () => {
    const figure = STAND_VIEWS.W.form.figure!;
    const bare = toAscii(dress(figure, wearView('x', 'x', heroLook({}, {}), 'W')));
    const hat = toAscii(dress(figure, wearView('x', 'x', heroLook({ hat: 'helmet' }, {}), 'W')));
    const wrong = toAscii(
      dress(figure, wearView('x', 'x', heroLook({ hat: 'hair_spiky', hair: 'helmet' }, {}), 'W')),
    );
    expect(hat).not.toEqual(bare);
    expect(wrong).toEqual(bare);
    // the shaven skull differs from the raw figure (its hair shadow is lightened)
    expect(bare).not.toEqual(toAscii(figure));
  });
});
