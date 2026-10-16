import { describe, expect, it } from 'vitest';
import { catalog } from './catalog.js';
import { defaultCharacterConfig } from './defaults.js';
import { normalizeConfig } from './normalize.js';
import { catalogSchema, checkCatalogReferences } from './schema.js';

describe('generated catalog.json', () => {
  it('passes the zod schema and reference checks', () => {
    expect(() => catalogSchema.parse(catalog)).not.toThrow();
    expect(checkCatalogReferences(catalog)).toEqual([]);
  });

  it('has the slots, animations and directions the UX relies on', () => {
    expect(catalog.slots.map((s) => s.id)).toEqual(
      expect.arrayContaining(['hand_right', 'hand_left', 'head', 'back']),
    );
    expect(catalog.animations.map((a) => a.id)).toEqual(expect.arrayContaining(['idle', 'walk']));
    expect(catalog.directions).toEqual(expect.arrayContaining(['S', 'W', 'E']));
    expect(catalog.characters.map((c) => c.id)).toContain(catalog.referenceCharacter);
  });

  it('produces a default config that normalizes to itself', () => {
    const cfg = defaultCharacterConfig(catalog);
    expect(normalizeConfig(cfg, catalog)).toEqual({ config: cfg, dropped: [] });
  });

  it('accepts every part in every slot it claims', () => {
    for (const p of catalog.parts) {
      for (const slot of p.slots) {
        const cfg = { ...defaultCharacterConfig(catalog), parts: { [slot]: p.id } };
        const { config } = normalizeConfig(cfg, catalog);
        if (p.characters.includes('*') || p.characters.includes(config.baseCharacter)) {
          expect(config.parts[slot], `${p.id} in ${slot}`).toBe(p.id);
        }
      }
    }
  });
});
