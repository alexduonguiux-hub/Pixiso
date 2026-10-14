import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { catalog } from './catalog.js';
import { defaultCharacterConfig } from './defaults.js';
import { normalizeConfig } from './normalize.js';
import { catalogSchema, checkCatalogReferences } from './schema.js';

const assetsDir = fileURLToPath(new URL('../../../assets', import.meta.url));

describe('generated catalog.json', () => {
  it('passes the zod schema and reference checks', () => {
    expect(() => catalogSchema.parse(catalog)).not.toThrow();
    expect(checkCatalogReferences(catalog)).toEqual([]);
  });

  it('references files that exist under assets/', () => {
    const root = path.join(assetsDir, catalog.asset.root);
    for (const c of catalog.characters) {
      expect(fs.existsSync(path.join(root, c.file)), c.file).toBe(true);
    }
    for (const p of catalog.parts) {
      if (p.source.type === 'file') {
        expect(fs.existsSync(path.join(root, p.source.file)), p.source.file).toBe(true);
      }
    }
  });

  it('has the slots and animations the UX relies on', () => {
    const slotIds = catalog.slots.map((s) => s.id);
    expect(slotIds).toEqual(expect.arrayContaining(['hand_right', 'hand_left', 'head', 'back']));
    const animIds = catalog.animations.map((a) => a.id);
    expect(animIds).toEqual(
      expect.arrayContaining(['idle', 'walk', 'run', 'attack_1h', 'hit', 'death']),
    );
    expect(catalog.characters.map((c) => c.id)).toEqual(
      expect.arrayContaining(['knight', 'barbarian', 'mage', 'rogue', 'rogue_hooded']),
    );
  });

  it('keeps looping locomotion clips free of root motion', () => {
    for (const a of catalog.animations) {
      if (a.loop) expect(a.rootMotion, a.id).toBe(false);
    }
  });

  it('produces a default config that normalizes to itself', () => {
    const cfg = defaultCharacterConfig(catalog);
    expect(normalizeConfig(cfg, catalog)).toEqual({ config: cfg, dropped: [] });
  });

  it('is self-consistent for every file part in every slot it claims', () => {
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
