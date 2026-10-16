import { describe, expect, it } from 'vitest';
import { normalizeConfig } from './normalize.js';
import type { Catalog } from './schema.js';
import { catalogSchema, checkCatalogReferences } from './schema.js';
import { COLOR_NAMES } from './types.js';

const fixture: Catalog = catalogSchema.parse({
  version: 2,
  source: { id: 'fixture', name: 'Fixture', license: 'CC0-1.0' },
  referenceCharacter: 'human',
  characters: [
    {
      id: 'human',
      label_vi: 'Người',
      tags: [],
      canvas: { w: 24, h: 32 },
      pivot: { x: 12, y: 30 },
    },
    {
      id: 'dwarf',
      label_vi: 'Người lùn',
      tags: [],
      canvas: { w: 24, h: 32 },
      pivot: { x: 12, y: 30 },
    },
  ],
  slots: [
    { id: 'hand_right', label_vi: 'Tay phải' },
    { id: 'hand_left', label_vi: 'Tay trái' },
    { id: 'head', label_vi: 'Đầu' },
  ],
  parts: [
    { id: 'sword', slots: ['hand_right'], label_vi: 'Kiếm', tags: [], characters: ['*'] },
    {
      id: 'dagger',
      slots: ['hand_right', 'hand_left'],
      label_vi: 'Dao',
      tags: [],
      characters: ['*'],
    },
    { id: 'knight_helmet', slots: ['head'], label_vi: 'Mũ', tags: [], characters: ['human'] },
  ],
  colorTargets: [
    { id: 'body', label_vi: 'Thân', material: 'cloth' },
    { id: 'metal', label_vi: 'Kim loại', material: 'metal' },
  ],
  colors: COLOR_NAMES.map((id) => ({ id, label_vi: id, hex: '#808080' })),
  animations: [
    { id: 'idle', label_vi: 'Đứng', loop: true, frames: 2, frameMs: 500, tags: [] },
    { id: 'walk', label_vi: 'Đi', loop: true, frames: 4, frameMs: 140, tags: [] },
  ],
  directions: ['S', 'W', 'E'],
});

describe('fixture catalog', () => {
  it('is internally consistent', () => {
    expect(checkCatalogReferences(fixture)).toEqual([]);
  });

  it('reports broken references', () => {
    const broken: Catalog = {
      ...fixture,
      referenceCharacter: 'elf',
      parts: [
        ...fixture.parts,
        { id: 'sword', slots: ['tail'], label_vi: 'x', tags: [], characters: ['orc'] },
      ],
    };
    expect(checkCatalogReferences(broken)).toEqual([
      'referenceCharacter "elf" is not a character',
      'duplicate part id "sword"',
      'part "sword" references unknown slot "tail"',
      'part "sword" references unknown character "orc"',
    ]);
  });
});

describe('normalizeConfig', () => {
  it('keeps a valid config unchanged', () => {
    const cfg = {
      version: 1 as const,
      baseCharacter: 'human',
      parts: { hand_right: 'sword', hand_left: 'dagger', head: 'knight_helmet' },
      colors: [{ target: 'body', color: 'red' as const }],
      animations: ['idle', 'walk'],
    };
    const { config, dropped } = normalizeConfig(cfg, fixture);
    expect(config).toEqual(cfg);
    expect(dropped).toEqual([]);
  });

  it('resets parts that do not fit the new base character to "none"', () => {
    const { config, dropped } = normalizeConfig(
      {
        version: 1,
        baseCharacter: 'dwarf',
        parts: { hand_right: 'sword', head: 'knight_helmet' },
        colors: [],
        animations: ['idle'],
      },
      fixture,
    );
    expect(config.parts).toEqual({ hand_right: 'sword', hand_left: 'none', head: 'none' });
    expect(dropped).toContain('part "knight_helmet" in slot "head"');
  });

  it('rejects a part placed in a slot it does not support', () => {
    const { config } = normalizeConfig(
      {
        version: 1,
        baseCharacter: 'human',
        parts: { hand_left: 'sword' },
        colors: [],
        animations: [],
      },
      fixture,
    );
    expect(config.parts.hand_left).toBe('none');
  });

  it('falls back to the reference character and default animations', () => {
    const { config, dropped } = normalizeConfig(
      { version: 1, baseCharacter: 'dragon', parts: {}, colors: [], animations: ['fly'] },
      fixture,
    );
    expect(config.baseCharacter).toBe('human');
    expect(config.animations).toEqual(['idle', 'walk']);
    expect(dropped).toEqual(['character "dragon"', 'animation "fly"']);
  });

  it('drops unknown color targets and "original" assignments', () => {
    const { config } = normalizeConfig(
      {
        version: 1,
        baseCharacter: 'human',
        parts: {},
        colors: [
          { target: 'body', color: 'original' },
          { target: 'nose', color: 'red' },
          { target: 'metal', color: 'gold' },
        ],
        animations: ['walk'],
      },
      fixture,
    );
    expect(config.colors).toEqual([{ target: 'metal', color: 'gold' }]);
  });

  it('is idempotent', () => {
    const once = normalizeConfig(
      {
        version: 1,
        baseCharacter: 'dwarf',
        parts: { head: 'knight_helmet' },
        colors: [],
        animations: [],
      },
      fixture,
    ).config;
    expect(normalizeConfig(once, fixture)).toEqual({ config: once, dropped: [] });
  });
});
