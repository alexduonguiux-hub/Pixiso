import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ASSETS_DIR = path.join(REPO_ROOT, 'assets');
export const DOCS_DIR = path.join(REPO_ROOT, 'docs');

/** KayKit Character Pack: Adventurers (CC0), pinned. */
export const KAYKIT = {
  id: 'kaykit_adventurers',
  name: 'KayKit Character Pack: Adventurers 1.0',
  license: 'CC0-1.0',
  repo: 'https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0',
  commit: '672074b73ba276876a19e8816ecdc5241817ab47',
  /** Relative to `assets/`. */
  root: 'vendor/kaykit-adventurers',
} as const;

export const KAYKIT_DIR = path.join(ASSETS_DIR, KAYKIT.root);
export const KAYKIT_SOURCE_JSON = path.join(KAYKIT_DIR, 'SOURCE.json');
export const INSPECTION_JSON = path.join(ASSETS_DIR, 'inspection.json');
export const ASSET_REPORT_MD = path.join(DOCS_DIR, 'ASSET_REPORT.md');
export const CATALOG_LABELS_YAML = path.join(REPO_ROOT, 'scripts', 'catalog-labels.yaml');
export const CATALOG_JSON = path.join(REPO_ROOT, 'packages', 'shared', 'catalog.json');

/** "Rogue_Hooded.glb" -> "rogue_hooded" */
export function idFromFile(file: string): string {
  return path
    .basename(file)
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
}
