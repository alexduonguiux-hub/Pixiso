import { characterConfigSchema } from '@pixiso/shared';
import { catalog } from '@pixiso/shared/catalog';
import { describe, expect, it } from 'vitest';
import { createAppStore } from './store.js';

describe('app store', () => {
  it('starts with a valid default config and a preview animation from it', () => {
    const s = createAppStore(catalog).getState();
    expect(s.config.baseCharacter).toBe(catalog.referenceCharacter);
    expect(s.config.animations).toContain(s.preview.animationId);
    expect(catalog.directions).toContain(s.preview.direction);
  });

  it('falls back to the reference body for an unknown character', () => {
    const store = createAppStore(catalog);
    store.getState().setPart('head', 'knight_helmet');
    store.getState().setPart('hand_right', 'sword_1handed');
    store.getState().setBaseCharacter('dragon');
    expect(store.getState().config.baseCharacter).toBe(catalog.referenceCharacter);
    expect(store.getState().config.parts.head).toBe('knight_helmet');
    expect(store.getState().config.parts.hand_right).toBe('sword_1handed');
  });

  it('rejects a part in a slot it does not support', () => {
    const store = createAppStore(catalog);
    store.getState().setPart('hand_right', 'shield_round');
    expect(store.getState().config.parts.hand_right).toBe('none');
    store.getState().setPart('hand_left', 'shield_round');
    expect(store.getState().config.parts.hand_left).toBe('shield_round');
  });

  it('replaces a colour per target and drops "original"', () => {
    const store = createAppStore(catalog);
    store.getState().setColor('body', 'red');
    store.getState().setColor('body', 'blue');
    store.getState().setColor('metal', 'gold');
    expect(store.getState().config.colors).toEqual([
      { target: 'body', color: 'blue' },
      { target: 'metal', color: 'gold' },
    ]);
    store.getState().setColor('body', 'original');
    expect(store.getState().config.colors).toEqual([{ target: 'metal', color: 'gold' }]);
  });

  it('keeps the preview animation inside the selected set', () => {
    const store = createAppStore(catalog);
    store.getState().setPreview({ animationId: 'walk' });
    store.getState().toggleAnimation('walk');
    expect(store.getState().config.animations).not.toContain('walk');
    expect(store.getState().config.animations).toContain(store.getState().preview.animationId);
    // never empties the list
    for (const id of [...store.getState().config.animations]) store.getState().toggleAnimation(id);
    expect(store.getState().config.animations.length).toBe(1);
  });

  it('round-trips the config through JSON without loss', () => {
    const store = createAppStore(catalog);
    store.getState().setPart('hand_right', 'sword_1handed');
    store.getState().setPart('back', 'cape');
    store.getState().setColor('cape', 'red');
    store.getState().toggleAnimation('walk');
    const json = store.getState().exportConfigJson();
    const before = store.getState().config;

    const other = createAppStore(catalog);
    const res = other.getState().importConfigJson(json);
    expect(res).toEqual({ ok: true, dropped: [] });
    expect(other.getState().config).toEqual(before);
    expect(characterConfigSchema.parse(JSON.parse(json))).toEqual(before);
  });

  it('reports invalid JSON and schema errors, and dropped items', () => {
    const store = createAppStore(catalog);
    expect(store.getState().importConfigJson('{nope')).toEqual({
      ok: false,
      error: 'invalid_json',
    });
    expect(store.getState().importConfigJson('{"version":2}')).toEqual({
      ok: false,
      error: 'invalid_schema',
    });
    const res = store.getState().importConfigJson(
      JSON.stringify({
        version: 1,
        baseCharacter: 'dragon',
        parts: {},
        colors: [],
        animations: ['fly'],
      }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.dropped).toEqual(['character "dragon"', 'animation "fly"']);
    expect(store.getState().config.baseCharacter).toBe(catalog.referenceCharacter);
  });

  it('restores a persisted config after normalizing it', () => {
    const store = createAppStore(catalog, {
      config: {
        version: 1,
        baseCharacter: 'human',
        parts: { head: 'sword_1handed', back: 'cape' },
        colors: [],
        animations: ['idle'],
      },
    });
    expect(store.getState().config.parts.head).toBe('none');
    expect(store.getState().config.parts.back).toBe('cape');
  });
});
