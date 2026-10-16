import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildCatalog, readLabels } from './build-catalog.js';
import { CATALOG_JSON } from './lib/paths.js';

describe('catalog generation', () => {
  it('the committed catalog.json is what the registry and labels generate', () => {
    const generated = buildCatalog(readLabels());
    const committed = JSON.parse(fs.readFileSync(CATALOG_JSON, 'utf8'));
    expect(committed).toEqual(generated);
  });

  it('rejects a label without a definition', () => {
    const labels = readLabels();
    labels.parts.dragon_wings = { label_vi: 'Cánh rồng', tags: [] };
    expect(() => buildCatalog(labels)).toThrow(/label "dragon_wings" has no definition/);
  });

  it('rejects a definition without a label', () => {
    const labels = readLabels();
    delete labels.parts.cape;
    expect(() => buildCatalog(labels)).toThrow(/missing label for "cape"/);
  });
});
