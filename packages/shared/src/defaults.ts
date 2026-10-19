import type { Catalog } from './schema.js';
import { PART_NONE, type CharacterConfig, type ProjectStyle } from './types.js';

export const DEFAULT_PROJECT_STYLE: ProjectStyle = {
  characterHeightPx: 32,
  directions: 8,
  palette: { mode: 'auto', colors: 16 },
  outline: 'ink',
  cell: 'auto',
  fps: 'fromClip',
};

export const DEFAULT_ANIMATION_IDS = ['idle', 'walk'] as const;

/** A valid, empty-handed config for a character of the catalog (the reference character by default). */
export function defaultCharacterConfig(
  catalog: Catalog,
  characterId: string = catalog.referenceCharacter,
): CharacterConfig {
  const parts: Record<string, string> = {};
  for (const slot of catalog.slots) parts[slot.id] = PART_NONE;
  const fits = (a: Catalog['animations'][number]) =>
    !a.characters || a.characters.includes('*') || a.characters.includes(characterId);
  const fitting = catalog.animations.filter(fits);
  const animations = DEFAULT_ANIMATION_IDS.filter((id) => fitting.some((a) => a.id === id));
  return {
    version: 1,
    baseCharacter: characterId,
    parts,
    colors: [],
    animations:
      animations.length > 0 ? [...animations] : [(fitting[0] ?? catalog.animations[0]!).id],
  };
}
