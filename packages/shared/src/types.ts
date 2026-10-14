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

export type CharacterHeightPx = 32 | 48 | 64;
export type DirectionsMode = 8 | '5+mirror';
export type OutlineMode = 'none' | 'dark' | 'selective';

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
