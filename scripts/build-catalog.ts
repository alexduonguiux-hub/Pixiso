/**
 * Merges `assets/inspection.json` (facts measured from the glTF files) with
 * `scripts/catalog-labels.yaml` (hand-written labels and curation) into
 * `packages/shared/catalog.json`, then validates the result with the shared
 * zod schema and cross-reference checks. Any label that points at a node, file
 * or clip the inspection did not find is a hard error.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import {
  COLOR_NAMES,
  catalogSchema,
  checkCatalogReferences,
  type Catalog,
  type CatalogAnimation,
  type CatalogAttach,
  type CatalogPart,
} from '@pixiso/shared';
import type { Inspection } from './inspect-assets.js';
import { CATALOG_JSON, CATALOG_LABELS_YAML, INSPECTION_JSON, KAYKIT } from './lib/paths.js';

const attachSchema = z.object({
  translation: z.tuple([z.number(), z.number(), z.number()]),
  rotation: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

const labelsSchema = z.object({
  referenceCharacter: z.string(),
  characters: z.record(
    z.string(),
    z.object({
      label_vi: z.string(),
      description_vi: z.string().optional(),
      tags: z.array(z.string()),
    }),
  ),
  slots: z.record(z.string(), z.object({ label_vi: z.string(), bone: z.string() })),
  attachDefaults: z.record(z.string(), attachSchema),
  attachPresets: z.record(z.string(), attachSchema),
  parts: z.record(
    z.string(),
    z.object({
      slots: z.array(z.string()).min(1),
      label_vi: z.string(),
      tags: z.array(z.string()),
      attach: z.record(z.string(), z.union([z.string(), attachSchema])).optional(),
    }),
  ),
  builtinParts: z.record(
    z.string(),
    z.object({
      character: z.string(),
      node: z.string(),
      slot: z.string(),
      label_vi: z.string(),
      tags: z.array(z.string()),
    }),
  ),
  colorTargets: z.record(
    z.string(),
    z.object({
      label_vi: z.string(),
      meshSuffixes: z.array(z.string()).optional(),
      slot: z.string().optional(),
    }),
  ),
  colors: z.record(z.string(), z.object({ label_vi: z.string(), hex: z.string() })),
  animations: z.record(
    z.string(),
    z.object({
      clip: z.string(),
      label_vi: z.string(),
      loop: z.boolean(),
      defaultFrames: z.number().int(),
      tags: z.array(z.string()),
    }),
  ),
});

type Labels = z.infer<typeof labelsSchema>;

function fail(msg: string): never {
  throw new Error(msg);
}

function resolveAttach(
  labels: Labels,
  partId: string,
  slots: string[],
  overrides: Record<string, string | CatalogAttach> | undefined,
): Record<string, CatalogAttach> {
  const out: Record<string, CatalogAttach> = {};
  for (const slot of slots) {
    const override = overrides?.[slot];
    let attach: CatalogAttach | undefined;
    if (typeof override === 'string') {
      attach =
        labels.attachPresets[override] ??
        fail(`part "${partId}": unknown attach preset "${override}"`);
    } else if (override) {
      attach = override;
    } else {
      attach = labels.attachDefaults[slot];
    }
    if (attach) out[slot] = attach;
  }
  for (const slot of Object.keys(overrides ?? {})) {
    if (!slots.includes(slot))
      fail(`part "${partId}": attach for slot "${slot}" which is not in its slots`);
  }
  return out;
}

function build(inspection: Inspection, labels: Labels): Catalog {
  const inspected = new Map(inspection.characters.map((c) => [c.id, c]));
  const accessories = new Map(inspection.accessories.map((a) => [a.id, a]));
  const reference =
    inspected.get(labels.referenceCharacter) ??
    fail(`referenceCharacter "${labels.referenceCharacter}" was not inspected`);

  const characters = inspection.characters.map((c) => {
    const l =
      labels.characters[c.id] ??
      fail(`characters: missing label for inspected character "${c.id}"`);
    return {
      id: c.id,
      file: c.file,
      label_vi: l.label_vi,
      ...(l.description_vi ? { description_vi: l.description_vi } : {}),
      tags: l.tags,
      heightM: c.heightM,
      projected: {
        heightM: c.projectedS.heightM,
        aboveM: c.projectedS.aboveM,
        belowM: c.projectedS.belowM,
        widthM: c.projectedS.widthM,
        maxHeightM: c.projectedMax.heightM,
      },
      builtinNodes: c.builtinParts.map((p) => p.node).sort(),
    };
  });
  for (const id of Object.keys(labels.characters)) {
    if (!inspected.has(id)) fail(`characters: label "${id}" has no inspected file`);
  }

  const slots = Object.entries(labels.slots).map(([id, s]) => ({
    id,
    label_vi: s.label_vi,
    bone: s.bone,
  }));
  for (const s of slots) {
    for (const c of inspection.characters) {
      if (!c.attachBones[s.bone]?.found)
        fail(`slot "${s.id}": bone "${s.bone}" not found in "${c.id}"`);
    }
  }

  const parts: CatalogPart[] = [];
  for (const [id, p] of Object.entries(labels.parts)) {
    const acc = accessories.get(id) ?? fail(`parts: "${id}" is not an inspected accessory file`);
    parts.push({
      id,
      slots: p.slots,
      label_vi: p.label_vi,
      tags: p.tags,
      characters: ['*'],
      source: { type: 'file', file: acc.file },
      attach: resolveAttach(labels, id, p.slots, p.attach),
    });
  }
  for (const [id, p] of Object.entries(labels.builtinParts)) {
    const c =
      inspected.get(p.character) ??
      fail(`builtinParts: "${id}" references unknown character "${p.character}"`);
    if (!c.builtinParts.some((b) => b.node === p.node)) {
      fail(
        `builtinParts: "${id}" node "${p.node}" not found in "${p.character}" (have: ${c.builtinParts.map((b) => b.node).join(', ')})`,
      );
    }
    parts.push({
      id,
      slots: [p.slot],
      label_vi: p.label_vi,
      tags: p.tags,
      characters: [p.character],
      source: { type: 'builtin', node: p.node },
    });
  }

  const colorTargets = Object.entries(labels.colorTargets).map(([id, t]) => {
    if (t.slot) return { id, label_vi: t.label_vi, kind: 'slot' as const, slot: t.slot };
    const suffixes = t.meshSuffixes ?? fail(`colorTargets: "${id}" needs meshSuffixes or slot`);
    // Every character must have at least one matching mesh (suffixes may be alternates,
    // e.g. `_Head` vs `_Head_Hooded`), and every suffix must be used by someone.
    for (const c of inspection.characters) {
      if (!c.skinnedMeshes.some((m) => suffixes.some((suffix) => m.node.endsWith(suffix)))) {
        fail(`colorTargets: "${id}" matches no skinned mesh in "${c.id}"`);
      }
    }
    for (const suffix of suffixes) {
      if (
        !inspection.characters.some((c) => c.skinnedMeshes.some((m) => m.node.endsWith(suffix)))
      ) {
        fail(`colorTargets: "${id}" suffix "${suffix}" matches nothing`);
      }
    }
    return { id, label_vi: t.label_vi, kind: 'mesh' as const, meshSuffixes: suffixes };
  });

  const colors = COLOR_NAMES.map((id) => {
    const c = labels.colors[id] ?? fail(`colors: missing "${id}"`);
    return { id, label_vi: c.label_vi, hex: c.hex.toLowerCase() };
  });

  const common = new Set(inspection.commonAnimations);
  const refAnims = new Map(reference.animations.map((a) => [a.name, a]));
  const animations: CatalogAnimation[] = Object.entries(labels.animations).map(([id, a]) => {
    if (!common.has(a.clip))
      fail(`animations: "${id}" clip "${a.clip}" is not present in every character`);
    const info = refAnims.get(a.clip)!;
    if (info.durationS <= 0)
      fail(`animations: "${id}" clip "${a.clip}" has zero duration (a pose, not a clip)`);
    return {
      id,
      clip: a.clip,
      label_vi: a.label_vi,
      loop: a.loop,
      defaultFrames: a.defaultFrames,
      durationS: info.durationS,
      rootMotion: info.rootMotion,
      tags: a.tags,
    };
  });

  return {
    version: 1,
    asset: {
      id: KAYKIT.id,
      name: KAYKIT.name,
      license: KAYKIT.license,
      source: KAYKIT.repo,
      commit: KAYKIT.commit,
      root: KAYKIT.root,
    },
    referenceCharacter: labels.referenceCharacter,
    characters,
    slots,
    parts,
    colorTargets,
    colors,
    animations,
  };
}

function main(): void {
  if (!fs.existsSync(INSPECTION_JSON))
    fail(`${INSPECTION_JSON} not found. Run \`pnpm assets:inspect\` first.`);
  const inspection = JSON.parse(fs.readFileSync(INSPECTION_JSON, 'utf8')) as Inspection;
  const labels = labelsSchema.parse(parseYaml(fs.readFileSync(CATALOG_LABELS_YAML, 'utf8')));

  const catalog = catalogSchema.parse(build(inspection, labels));
  const problems = checkCatalogReferences(catalog);
  if (problems.length > 0) fail(`catalog is inconsistent:\n- ${problems.join('\n- ')}`);

  fs.writeFileSync(CATALOG_JSON, JSON.stringify(catalog, null, 2) + '\n');
  console.log(
    `[build-catalog] ${catalog.characters.length} characters, ${catalog.slots.length} slots, ${catalog.parts.length} parts, ${catalog.colorTargets.length} color targets, ${catalog.animations.length} animations -> ${path.relative(process.cwd(), CATALOG_JSON)}`,
  );
}

try {
  main();
} catch (err) {
  console.error(`[build-catalog] ${(err as Error).message}`);
  process.exit(1);
}
