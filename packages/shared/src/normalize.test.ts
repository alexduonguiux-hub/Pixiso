import { describe, expect, it } from 'vitest';
import { normalizeConfig } from './normalize.js';
import type { Catalog } from './schema.js';
import { catalogSchema, checkCatalogReferences } from './schema.js';
import { COLOR_NAMES } from './types.js';

const fixture: Catalog = catalogSchema.parse({
  version: 1,
  asset: {
    id: 'kit',
    name: 'Kit',
    license: 'CC0-1.0',
    source: 'x',
    commit: 'abc',
    root: 'vendor/kit',
  },
  referenceCharacter: 'knight',
  characters: [
    {
      id: 'knight',
      file: 'Knight.glb',
      label_vi: 'Hiệp sĩ',
      tags: [],
      heightM: 1.8,
      builtinNodes: ['Knight_Helmet'],
    },
    {
      id: 'mage',
      file: 'Mage.glb',
      label_vi: 'Pháp sư',
      tags: [],
      heightM: 1.7,
      builtinNodes: ['Mage_Hat'],
    },
  ],
  slots: [
    { id: 'hand_right', label_vi: 'Tay phải', bone: 'handslot.r' },
    { id: 'hand_left', label_vi: 'Tay trái', bone: 'handslot.l' },
    { id: 'head', label_vi: 'Đầu', bone: 'head' },
  ],
  parts: [
    {
      id: 'sword',
      slots: ['hand_right'],
      label_vi: 'Kiếm',
      tags: [],
      characters: ['*'],
      source: { type: 'file', file: 'sword.gltf' },
    },
    {
      id: 'dagger',
      slots: ['hand_right', 'hand_left'],
      label_vi: 'Dao',
      tags: [],
      characters: ['*'],
      source: { type: 'file', file: 'dagger.gltf' },
    },
    {
      id: 'knight_helmet',
      slots: ['head'],
      label_vi: 'Mũ',
      tags: [],
      characters: ['knight'],
      source: { type: 'builtin', node: 'Knight_Helmet' },
    },
  ],
  colorTargets: [
    { id: 'body', label_vi: 'Thân', kind: 'mesh', meshSuffixes: ['_Body'] },
    { id: 'hand_right', label_vi: 'Tay phải', kind: 'slot', slot: 'hand_right' },
  ],
  colors: COLOR_NAMES.map((id) => ({ id, label_vi: id, hex: '#808080' })),
  animations: [
    {
      id: 'idle',
      clip: 'Idle',
      label_vi: 'Đứng',
      loop: true,
      defaultFrames: 4,
      durationS: 1,
      rootMotion: false,
      tags: [],
    },
    {
      id: 'walk',
      clip: 'Walking_A',
      label_vi: 'Đi',
      loop: true,
      defaultFrames: 8,
      durationS: 1,
      rootMotion: false,
      tags: [],
    },
  ],
});

describe('fixture catalog', () => {
  it('is internally consistent', () => {
    expect(checkCatalogReferences(fixture)).toEqual([]);
  });
});

describe('normalizeConfig', () => {
  it('keeps a valid config unchanged', () => {
    const cfg = {
      version: 1 as const,
      baseCharacter: 'knight',
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
        baseCharacter: 'mage',
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
        baseCharacter: 'knight',
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
    expect(config.baseCharacter).toBe('knight');
    expect(config.animations).toEqual(['idle', 'walk']);
    expect(dropped).toEqual(['character "dragon"', 'animation "fly"']);
  });

  it('drops unknown color targets and "original" assignments', () => {
    const { config } = normalizeConfig(
      {
        version: 1,
        baseCharacter: 'knight',
        parts: {},
        colors: [
          { target: 'body', color: 'original' },
          { target: 'nose', color: 'red' },
          { target: 'hand_right', color: 'gold' },
        ],
        animations: ['walk'],
      },
      fixture,
    );
    expect(config.colors).toEqual([{ target: 'hand_right', color: 'gold' }]);
  });

  it('is idempotent', () => {
    const once = normalizeConfig(
      {
        version: 1,
        baseCharacter: 'mage',
        parts: { head: 'knight_helmet' },
        colors: [],
        animations: [],
      },
      fixture,
    ).config;
    expect(normalizeConfig(once, fixture)).toEqual({ config: once, dropped: [] });
  });
});
