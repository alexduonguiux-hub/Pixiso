import { countColors, imageHash } from '@pixiso/pixel-core';
import { describe, expect, it } from 'vitest';
import { CLIPS } from './anim.js';
import { CANVAS_H, CANVAS_W } from './body32.js';
import { buildClip, buildFrame } from './character.js';
import { toAscii } from './format.js';
import { buildPalette, paint } from './paint.js';
import { PARTS } from './parts32.js';

describe('character builder', () => {
  const knight = { parts: ['cape', 'knight_helmet', 'sword_1handed', 'shield_round'] };

  it('builds every clip for every facing with the right frame counts', () => {
    for (const clip of CLIPS) {
      for (const facing of ['S', 'W', 'E'] as const) {
        const frames = buildClip(knight, facing, clip);
        expect(frames.length).toBe(clip.frames[facing === 'S' ? 'S' : 'W'].length);
        for (const f of frames) {
          expect(f.w).toBe(CANVAS_W);
          expect(f.h).toBe(CANVAS_H);
        }
      }
    }
  });

  it('E is the exact mirror of W', () => {
    const w = buildClip(knight, 'W', CLIPS[0]!)[0]!;
    const e = buildClip(knight, 'E', CLIPS[0]!)[0]!;
    const wa = toAscii(w);
    const ea = toAscii(e);
    for (let y = 0; y < w.h; y++) expect(ea[y]).toBe([...wa[y]!].reverse().join(''));
  });

  it('is deterministic and keeps the feet on the pivot row', () => {
    const a = paint(buildFrame(knight, 'S', { limbs: {} }), buildPalette());
    const b = paint(buildFrame(knight, 'S', { limbs: {} }), buildPalette());
    expect(imageHash(a)).toBe(imageHash(b));
    const rows = toAscii(buildFrame({ parts: [] }, 'S', { limbs: {} }));
    expect(rows[29]).toMatch(/o/); // sole line
    expect(rows[30]).toMatch(/^\.+$/); // nothing below the soles
  });

  it('paints with one hue-shifted ramp per material and never more than 3 shades each', () => {
    const img = paint(
      buildFrame(knight, 'S', { limbs: {} }),
      buildPalette({ cloth: [60, 90, 150] }),
    );
    expect(countColors(img)).toBeLessThanOrEqual(13 * 3);
  });

  it('every part has both views and a known slot', () => {
    for (const p of PARTS) {
      expect(p.views.S.sprite.w).toBeGreaterThan(0);
      expect(p.views.W.sprite.w).toBeGreaterThan(0);
      expect(['head', 'hand_right', 'hand_left', 'back']).toContain(p.slot);
    }
    expect(() => buildFrame({ parts: ['nope'] }, 'S', { limbs: {} })).toThrow(/unknown part/);
  });
});
