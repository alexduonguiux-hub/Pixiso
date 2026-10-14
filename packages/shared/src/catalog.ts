/**
 * Loads and validates the generated catalog once at module import.
 * Kept in its own entry (`@pixiso/shared/catalog`) so the catalog builder
 * can import the schemas without depending on the file it generates.
 */
import catalogJson from '../catalog.json' with { type: 'json' };
import { catalogSchema, checkCatalogReferences, type Catalog } from './schema.js';

function load(): Catalog {
  const parsed = catalogSchema.parse(catalogJson);
  const problems = checkCatalogReferences(parsed);
  if (problems.length > 0) {
    throw new Error(`catalog.json is inconsistent:\n- ${problems.join('\n- ')}`);
  }
  return parsed;
}

export const catalog: Catalog = load();
