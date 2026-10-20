/**
 * Export (HANDOFF §7, D-097): one PNG sheet per animation (rows = directions,
 * columns = frames) with an Aseprite JSON beside it, a preview GIF that walks
 * through every direction, an optional atlas of all animations, and a ZIP of
 * everything. Everything is rendered by renderClip, so the files show exactly
 * what the preview shows; the same config and style give the same bytes.
 */
import {
  asepriteJson,
  checkAseprite,
  encodeGif,
  encodePng,
  packSheet,
  rgb8ToHex,
  utf8Encode,
  zipFiles,
  type AsepriteJson,
  type Rgb8,
  type RGBAImage,
} from '@pixiso/pixel-core';
import type { CharacterConfig, Direction, ProjectStyle } from '@pixiso/shared';
import { CLIPS, type Clip } from './anim.js';
import { AVAILABLE_DIRECTIONS } from './registry.js';
import { renderClip, usedColors, type ColorTable, type RenderedClip } from './render.js';

export const PIXISO_VERSION = '0.1.0';

/** The drawn views, in sheet row order, for a 5+mirror export (PIVOT.md decision 2, D-042). */
export const EXPORT_DIRECTIONS_5: readonly Direction[] = ['S', 'SW', 'W', 'NW', 'N'];
/** Directions a 5+mirror export leaves out, and the row to flip horizontally for each. */
export const MIRROR_5: Readonly<Record<string, Direction>> = { NE: 'NW', E: 'W', SE: 'SW' };

/** Height of the reference character in metres; the grid scale follows from it (HANDOFF §6.2). */
export const REFERENCE_HEIGHT_M = 1.75;
const COS_30 = Math.cos(Math.PI / 6);

/** Pixels per metre of ground for a style: the character's screen height over its real height foreshortened at 30°. */
export function pixelsPerMeter(style: ProjectStyle): number {
  return Math.round((style.characterHeightPx / (REFERENCE_HEIGHT_M * COS_30)) * 10) / 10;
}

export interface ExportFile {
  name: string;
  data: Uint8Array;
  type: 'image/png' | 'application/json' | 'image/gif' | 'application/zip';
}

export interface ExportOptions {
  /** File name stem; defaults to the base character id. */
  name?: string;
  /** Also write `{name}_atlas.png/json` with every animation stacked. */
  atlas?: boolean;
  /** Animation of the preview GIF; defaults to walk, else the first. */
  previewAnimation?: string;
  clips?: readonly Clip[];
}

export interface ExportedAnimation {
  id: string;
  frames: number;
  frameMs: number;
  png: ExportFile;
  json: ExportFile;
  aseprite: AsepriteJson;
}

export interface CharacterExport {
  name: string;
  directions: readonly Direction[];
  mirror?: Readonly<Record<string, Direction>>;
  cell: { w: number; h: number };
  pivot: { x: number; y: number };
  scale: number;
  /** Every colour of the export, `#rrggbb`, most frequent first. */
  palette: string[];
  animations: ExportedAnimation[];
  gif: ExportFile;
  atlas?: { png: ExportFile; json: ExportFile; aseprite: AsepriteJson };
  zip: ExportFile;
  /** Every file above except the zip, in the order they appear in it. */
  files: ExportFile[];
}

function jsonFile(name: string, value: unknown): ExportFile {
  return {
    name,
    data: utf8Encode(JSON.stringify(value, null, 2) + '\n'),
    type: 'application/json',
  };
}

/** Renders every animation of the config in every exported direction and packs the files. */
export function exportCharacter(
  config: CharacterConfig,
  style: ProjectStyle,
  table: ColorTable,
  opts: ExportOptions = {},
): CharacterExport {
  const name = opts.name ?? config.baseCharacter;
  const mirrored = style.directions === '5+mirror';
  const directions = mirrored
    ? EXPORT_DIRECTIONS_5.filter((d) => AVAILABLE_DIRECTIONS.includes(d))
    : AVAILABLE_DIRECTIONS;
  if (config.animations.length === 0) throw new Error('exportCharacter: no animations selected');

  // Render everything first: the cell, pivot and palette are shared by every file.
  const rendered = config.animations.map((id) => ({
    id,
    byDirection: directions.map((d) =>
      renderClip(config, style, id, d, table, opts.clips ?? CLIPS),
    ),
  }));
  const first = rendered[0]!.byDirection[0]!;
  const { cell, pivot, scale } = first;
  for (const { id, byDirection } of rendered)
    for (const clip of byDirection)
      if (
        clip.cell.w !== cell.w ||
        clip.cell.h !== cell.h ||
        clip.pivot.x !== pivot.x ||
        clip.pivot.y !== pivot.y
      )
        throw new Error(
          `exportCharacter: animation "${id}" does not share the character's cell and pivot`,
        );
  const allFrames: RGBAImage[] = rendered.flatMap((r) => r.byDirection.flatMap((c) => c.frames));
  const paletteRgb: Rgb8[] = usedColors(allFrames);
  const palette = paletteRgb.map((c) => rgb8ToHex(...c));
  const pixiso = {
    directions: [...directions],
    ...(mirrored ? { mirror: { ...MIRROR_5 } } : {}),
    pixelsPerMeter: pixelsPerMeter(style),
    palette,
  };

  const sheetFor = (
    stem: string,
    rows: { tag: string; frameName: (col: number) => string; clip: RenderedClip }[],
  ): { png: ExportFile; json: ExportFile; aseprite: AsepriteJson } => {
    const sheet = packSheet(rows.map((r) => r.clip.frames));
    const aseprite = asepriteJson({
      sheet,
      image: `${stem}.png`,
      version: PIXISO_VERSION,
      rowTags: rows.map((r) => r.tag),
      frameName: (row, col) => rows[row]!.frameName(col),
      duration: (row) => rows[row]!.clip.frameMs,
      pivot,
      pixiso,
    });
    const problems = checkAseprite(aseprite);
    if (problems.length) throw new Error(`exportCharacter: ${stem}: ${problems.join('; ')}`);
    return {
      png: { name: `${stem}.png`, data: encodePng(sheet.image), type: 'image/png' },
      json: jsonFile(`${stem}.json`, aseprite),
      aseprite,
    };
  };

  const animations: ExportedAnimation[] = rendered.map(({ id, byDirection }) => {
    const rows = byDirection.map((clip, i) => ({
      tag: `${id}_${directions[i]}`,
      frameName: (col: number) => `${name}_${id}_${directions[i]}_${col}`,
      clip,
    }));
    const { png, json, aseprite } = sheetFor(`${name}_${id}`, rows);
    return {
      id,
      frames: rows[0]!.clip.frames.length,
      frameMs: rows[0]!.clip.frameMs,
      png,
      json,
      aseprite,
    };
  });

  // Preview GIF: the preview animation in every exported direction, one after the other.
  const previewId =
    opts.previewAnimation && config.animations.includes(opts.previewAnimation)
      ? opts.previewAnimation
      : config.animations.includes('walk')
        ? 'walk'
        : config.animations[0]!;
  const preview = rendered.find((r) => r.id === previewId)!;
  const gifFrames = preview.byDirection.flatMap((clip) =>
    clip.frames.map((image) => ({ image, delayMs: clip.frameMs })),
  );
  const gif: ExportFile = {
    name: `${name}_preview.gif`,
    data: encodeGif(gifFrames, paletteRgb),
    type: 'image/gif',
  };

  const atlas = opts.atlas
    ? sheetFor(
        `${name}_atlas`,
        rendered.flatMap(({ id, byDirection }) =>
          byDirection.map((clip, i) => ({
            tag: `${id}_${directions[i]}`,
            frameName: (col: number) => `${name}_${id}_${directions[i]}_${col}`,
            clip,
          })),
        ),
      )
    : undefined;

  const files: ExportFile[] = [
    ...animations.flatMap((a) => [a.png, a.json]),
    ...(atlas ? [atlas.png, atlas.json] : []),
    gif,
  ];
  const zip: ExportFile = {
    name: `${name}.zip`,
    data: zipFiles(files.map((f) => ({ name: f.name, data: f.data }))),
    type: 'application/zip',
  };
  return {
    name,
    directions,
    ...(mirrored ? { mirror: { ...MIRROR_5 } } : {}),
    cell,
    pivot,
    scale,
    palette,
    animations,
    gif,
    ...(atlas ? { atlas } : {}),
    zip,
    files,
  };
}
