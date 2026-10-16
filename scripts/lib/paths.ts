import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DOCS_DIR = path.join(REPO_ROOT, 'docs');
export const TEST_OUTPUT_DIR = path.join(REPO_ROOT, 'test-output');
export const CATALOG_LABELS_YAML = path.join(REPO_ROOT, 'scripts', 'catalog-labels.yaml');
export const CATALOG_JSON = path.join(REPO_ROOT, 'packages', 'shared', 'catalog.json');
