import { DEFAULT_ANIMATION_IDS } from './defaults.js';
import type { Catalog, CatalogPart } from './schema.js';
import { COLOR_NAMES, PART_NONE, type CharacterConfig, type ColorName } from './types.js';

export interface NormalizeResult {
  config: CharacterConfig;
  /** Human-readable list of things that were dropped or changed. */
  dropped: string[];
}

export function partFitsCharacter(part: CatalogPart, characterId: string): boolean {
  return part.characters.includes('*') || part.characters.includes(characterId);
}

export function partsForSlot(catalog: Catalog, slotId: string, characterId: string): CatalogPart[] {
  return catalog.parts.filter((p) => p.slots.includes(slotId) && partFitsCharacter(p, characterId));
}

/**
 * Makes an arbitrary config valid against the catalog without throwing:
 * unknown character -> reference character; unknown/incompatible parts -> "none";
 * unknown color targets/colors -> dropped; unknown animations -> dropped (never empty).
 * Pure and deterministic; the result is always `normalize(normalize(x)) == normalize(x)`.
 */
export function normalizeConfig(input: CharacterConfig, catalog: Catalog): NormalizeResult {
  const dropped: string[] = [];

  let baseCharacter = input.baseCharacter;
  if (!catalog.characters.some((c) => c.id === baseCharacter)) {
    dropped.push(`character "${baseCharacter}"`);
    baseCharacter = catalog.referenceCharacter;
  }

  const parts: Record<string, string> = {};
  for (const slot of catalog.slots) {
    const wanted = input.parts[slot.id] ?? PART_NONE;
    if (wanted === PART_NONE) {
      parts[slot.id] = PART_NONE;
      continue;
    }
    const ok = partsForSlot(catalog, slot.id, baseCharacter).some((p) => p.id === wanted);
    if (ok) parts[slot.id] = wanted;
    else {
      dropped.push(`part "${wanted}" in slot "${slot.id}"`);
      parts[slot.id] = PART_NONE;
    }
  }
  for (const slotId of Object.keys(input.parts)) {
    if (!catalog.slots.some((s) => s.id === slotId)) dropped.push(`slot "${slotId}"`);
  }

  const targetIds = new Set(catalog.colorTargets.map((t) => t.id));
  const colorIds = new Set<string>(COLOR_NAMES);
  const seenTargets = new Set<string>();
  const colors: { target: string; color: ColorName }[] = [];
  for (const c of input.colors) {
    if (!targetIds.has(c.target)) {
      dropped.push(`color target "${c.target}"`);
      continue;
    }
    if (!colorIds.has(c.color)) {
      dropped.push(`color "${c.color}"`);
      continue;
    }
    if (seenTargets.has(c.target)) continue; // first assignment wins
    seenTargets.add(c.target);
    if (c.color !== 'original') colors.push({ target: c.target, color: c.color });
  }

  const animIds = new Set(catalog.animations.map((a) => a.id));
  const animations: string[] = [];
  for (const id of input.animations) {
    if (!animIds.has(id)) {
      dropped.push(`animation "${id}"`);
      continue;
    }
    if (!animations.includes(id)) animations.push(id);
  }
  if (animations.length === 0) {
    for (const id of DEFAULT_ANIMATION_IDS) if (animIds.has(id)) animations.push(id);
    if (animations.length === 0) animations.push(catalog.animations[0]!.id);
  }

  return { config: { version: 1, baseCharacter, parts, colors, animations }, dropped };
}
