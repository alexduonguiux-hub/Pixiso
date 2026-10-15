import { describe, expect, it } from 'vitest';
import { compose, outline } from './compose.js';
import {
  EMPTY,
  LEGEND,
  flipX,
  mirrorFromLeft,
  packCell,
  parseSprite,
  sprite,
  toAscii,
} from './format.js';

describe('sprite templates', () => {
  it('parses ASCII into semantic cells and prints back identically', () => {
    const s = sprite`
      .oo.
      osSo
      .oo.
    `;
    expect(s.w).toBe(4);
    expect(s.h).toBe(3);
    expect(s.cells[0]).toBe(EMPTY);
    expect(s.cells[5]).toBe(packCell(LEGEND['s']!));
    expect(toAscii(s)).toEqual(['.oo.', 'osSo', '.oo.']);
  });

  it('rejects ragged rows and unknown glyphs', () => {
    expect(() => parseSprite(['oo', 'o'])).toThrow(/row 1/);
    expect(() => parseSprite(['o?'])).toThrow(/unknown glyph/);
  });

  it('flips and mirrors', () => {
    const s = parseSprite(['os..']);
    expect(toAscii(flipX(s))).toEqual(['..so']);
    expect(toAscii(mirrorFromLeft(s))).toEqual(['osso']);
  });
});

describe('compose', () => {
  it('draws higher z on top and ignores transparent cells', () => {
    const a = parseSprite(['ss', 'ss']);
    const b = parseSprite(['m.', '.m']);
    const out = compose(
      [
        { id: 'b', sprite: b, x: 0, y: 0, z: 2 },
        { id: 'a', sprite: a, x: 0, y: 0, z: 1 },
      ],
      2,
      2,
    );
    expect(toAscii(out)).toEqual(['ms', 'sm']);
  });

  it('clips layers at the canvas edge', () => {
    const out = compose([{ id: 'a', sprite: parseSprite(['sss']), x: 1, y: 0, z: 0 }], 3, 1);
    expect(toAscii(out)).toEqual(['.ss']);
  });

  it('outlines only outside the shape', () => {
    const out = outline(parseSprite(['...', '.s.', '...']), packCell(LEGEND['o']!));
    expect(toAscii(out)).toEqual(['.o.', 'oso', '.o.']);
  });
});
