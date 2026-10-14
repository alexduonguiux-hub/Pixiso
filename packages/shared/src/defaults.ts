import type { Catalog } from './schema.js';
import { PART_NONE, type CharacterConfig, type ProjectStyle } from './types.js';

export const DEFAULT_PROJECT_STYLE: ProjectStyle = {
  characterHeightPx: 48,
  directions: 8,
  palette: { mode: 'auto', colors: 16 },
  outline: 'selective',
  cell: 'auto',
  fps: 'fromClip',
};

export const DEFAULT_ANIMATION_IDS = ['idle', 'walk'] as const;

/** A valid, empty-handed config for the catalog's reference character. */
export function defaultCharacterConfig(catalog: Catalog): CharacterConfig {
  const parts: Record<string, string> = {};
  for (const slot of catalog.slots) parts[slot.id] = PART_NONE;
  const animations = DEFAULT_ANIMATION_IDS.filter((id) =>
    catalog.animations.some((a) => a.id === id),
  );
  return {
    version: 1,
    baseCharacter: catalog.referenceCharacter,
    parts,
    colors: [],
    animations: animations.length > 0 ? [...animations] : [catalog.animations[0]!.id],
  };
}
