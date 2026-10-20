/**
 * Generates `packages/shared/catalog.json` from the sprite-kit registry (the
 * facts: bodies, slots, parts, colour targets, clips, drawable directions) and
 * `scripts/catalog-labels.yaml` (the words: Vietnamese labels and tags), then
 * validates the result with the shared zod schema and cross-reference checks.
 * A label without a definition, or a definition without a label, is a hard error.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import {
  COLOR_NAMES,
  catalogSchema,
  checkCatalogReferences,
  type Catalog,
  type ColorName,
} from '@pixiso/shared';
import {
  AVAILABLE_DIRECTIONS,
  BODIES,
  CLIPS,
  COLOR_TARGETS,
  HERO_BODY_ID,
  HERO_CLIP_IDS,
  HERO_PARTS,
  HERO_PRESETS,
  HERO_SLOT_IDS,
  PARTS,
  RATS_PRESETS,
  REFERENCE_BODY,
  SLOT_IDS,
} from '@pixiso/sprite-kit';

/** Every ready-made character: the hero cast and the rat pack (D-099). */
const PRESETS = [...HERO_PRESETS, ...RATS_PRESETS];
import { CATALOG_JSON, CATALOG_LABELS_YAML } from './lib/paths.js';

const labeled = z.object({ label_vi: z.string(), tags: z.array(z.string()) });

const labelsSchema = z.object({
  source: z.object({
    id: z.string(),
    name: z.string(),
    license: z.string(),
    note: z.string().optional(),
  }),
  referenceCharacter: z.string(),
  characters: z.record(z.string(), labeled.extend({ description_vi: z.string().optional() })),
  slots: z.record(z.string(), z.object({ label_vi: z.string() })),
  parts: z.record(z.string(), labeled),
  colorTargets: z.record(z.string(), z.object({ label_vi: z.string() })),
  colors: z.record(z.string(), z.object({ label_vi: z.string(), hex: z.string() })),
  animations: z.record(z.string(), labeled),
  presets: z.record(z.string(), labeled.extend({ description_vi: z.string().optional() })),
});

export type Labels = z.infer<typeof labelsSchema>;

function fail(msg: string): never {
  throw new Error(msg);
}

/** Every defined id must be labelled and every label must name a definition. */
function pairUp<T>(section: string, defined: readonly string[], labels: Record<string, T>): void {
  for (const id of defined) if (!(id in labels)) fail(`${section}: missing label for "${id}"`);
  for (const id of Object.keys(labels))
    if (!defined.includes(id)) fail(`${section}: label "${id}" has no definition in sprite-kit`);
}

export function readLabels(file: string = CATALOG_LABELS_YAML): Labels {
  return labelsSchema.parse(parseYaml(fs.readFileSync(file, 'utf8')));
}

export function buildCatalog(labels: Labels): Catalog {
  pairUp(
    'characters',
    BODIES.map((b) => b.id),
    labels.characters,
  );
  pairUp('slots', [...SLOT_IDS, ...HERO_SLOT_IDS], labels.slots);
  pairUp('parts', [...PARTS.map((p) => p.id), ...HERO_PARTS.map((p) => p.id)], labels.parts);
  pairUp(
    'colorTargets',
    COLOR_TARGETS.map((t) => t.id),
    labels.colorTargets,
  );
  pairUp('colors', COLOR_NAMES, labels.colors);
  pairUp(
    'animations',
    CLIPS.map((c) => c.id),
    labels.animations,
  );
  pairUp(
    'presets',
    PRESETS.map((p) => p.id),
    labels.presets,
  );
  if (labels.referenceCharacter !== REFERENCE_BODY) {
    fail(`referenceCharacter must be "${REFERENCE_BODY}" (sprite-kit REFERENCE_BODY)`);
  }

  const catalog: Catalog = {
    version: 2,
    source: labels.source,
    referenceCharacter: labels.referenceCharacter,
    characters: BODIES.map((b) => {
      const l = labels.characters[b.id]!;
      return {
        id: b.id,
        label_vi: l.label_vi,
        ...(l.description_vi ? { description_vi: l.description_vi } : {}),
        tags: l.tags,
        canvas: { ...b.canvas },
        pivot: { ...b.pivot },
      };
    }),
    slots: [...SLOT_IDS, ...HERO_SLOT_IDS].map((id) => ({
      id,
      label_vi: labels.slots[id]!.label_vi,
    })),
    // The 32 px parts fit the limb body, the hero's parts its own body (D-096): a part names its body.
    parts: [
      ...PARTS.map((p) => ({ id: p.id, slot: p.slot, body: REFERENCE_BODY })),
      ...HERO_PARTS.map((p) => ({ id: p.id, slot: p.slot, body: HERO_BODY_ID })),
    ].map((p) => ({
      id: p.id,
      slots: [p.slot],
      label_vi: labels.parts[p.id]!.label_vi,
      tags: labels.parts[p.id]!.tags,
      characters: [p.body],
    })),
    colorTargets: COLOR_TARGETS.map((t) => ({
      id: t.id,
      label_vi: labels.colorTargets[t.id]!.label_vi,
      material: t.material,
    })),
    colors: COLOR_NAMES.map((id: ColorName) => ({
      id,
      label_vi: labels.colors[id]!.label_vi,
      hex: labels.colors[id]!.hex.toLowerCase(),
    })),
    animations: CLIPS.map((c) => ({
      id: c.id,
      label_vi: labels.animations[c.id]!.label_vi,
      loop: c.loop,
      frames: c.frames.S.length,
      frameMs: c.frameMs,
      tags: labels.animations[c.id]!.tags,
      // idle and walk have frames on every body; the other clips are the limb body's offset tables
      characters: (HERO_CLIP_IDS as readonly string[]).includes(c.id) ? ['*'] : [REFERENCE_BODY],
    })),
    directions: [...AVAILABLE_DIRECTIONS],
    presets: PRESETS.map((p) => {
      const l = labels.presets[p.id]!;
      return {
        id: p.id,
        label_vi: l.label_vi,
        ...(l.description_vi ? { description_vi: l.description_vi } : {}),
        tags: l.tags,
        config: p.config,
      };
    }),
  };
  const parsed = catalogSchema.parse(catalog);
  const problems = checkCatalogReferences(parsed);
  if (problems.length > 0) fail(`catalog is inconsistent:\n- ${problems.join('\n- ')}`);
  return parsed;
}

function main(): void {
  const catalog = buildCatalog(readLabels());
  fs.writeFileSync(CATALOG_JSON, JSON.stringify(catalog, null, 2) + '\n');
  console.log(
    `[build-catalog] ${catalog.characters.length} bodies, ${catalog.slots.length} slots, ${catalog.parts.length} parts, ${catalog.colorTargets.length} colour targets, ${catalog.animations.length} clips, ${catalog.presets.length} presets, directions ${catalog.directions.join('/')} -> ${path.relative(process.cwd(), CATALOG_JSON)}`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(`[build-catalog] ${(err as Error).message}`);
    process.exit(1);
  }
}
