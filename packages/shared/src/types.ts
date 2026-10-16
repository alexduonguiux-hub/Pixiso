/**
 * Core data types shared by web, server and scripts.
 * `CharacterConfig` + `ProjectStyle` are the single source of truth for a character.
 */

export const COLOR_NAMES = [
  'original',
  'red',
  'dark_red',
  'orange',
  'yellow',
  'gold',
  'green',
  'forest_green',
  'teal',
  'blue',
  'navy',
  'purple',
  'pink',
  'brown',
  'white',
  'gray',
  'black',
] as const;

export type ColorName = (typeof COLOR_NAMES)[number];

export interface ColorAssignment {
  target: string;
  color: ColorName;
}

export interface CharacterConfig {
  version: 1;
  /** Character id in the catalog. */
  baseCharacter: string;
  /** slotId -> partId | "none" */
  parts: Record<string, string>;
  colors: ColorAssignment[];
  /** animationId in the catalog */
  animations: string[];
}

/**
 * Output height of the 32 px base body: 32 = native, 64 = nearest ×2.
 * A 48 px set would be a separate drawing (PIVOT.md §5, decision 1).
 */
export type CharacterHeightPx = 32 | 64;
export type DirectionsMode = 8 | '5+mirror';
/**
 * Outline presets measured on reference art (PIXEL_STYLE_REFERENCE.md §2.4):
 * 'ink' = near-black tinted by the material, 'soft' = warm dark grey, 'none' = material shadow.
 */
export type OutlineMode = 'ink' | 'soft' | 'none';

export type PaletteSetting = { mode: 'auto'; colors: number } | { mode: 'fixed'; hex: string[] };

export interface ProjectStyle {
  characterHeightPx: CharacterHeightPx;
  directions: DirectionsMode;
  palette: PaletteSetting;
  outline: OutlineMode;
  /** Lock the cell size so every character of a project shares it. */
  cell: 'auto' | { w: number; h: number };
  fps: number | 'fromClip';
}

/** Row order of a sprite sheet. Clockwise when seen from above; S faces the camera. */
export const DIRECTIONS_8 = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'] as const;
export type Direction = (typeof DIRECTIONS_8)[number];

export const PART_NONE = 'none';
