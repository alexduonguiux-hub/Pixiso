import { catalog } from '@pixiso/shared/catalog';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** `assets/` is Vite's public dir, so vendor files live under `/vendor/...`. */
export const ASSET_BASE = `/${catalog.asset.root}/`;

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();

/** Loads (once) a glTF relative to the asset root; concurrent callers share the promise. */
export function loadGltf(relPath: string): Promise<GLTF> {
  let p = cache.get(relPath);
  if (!p) {
    p = loader.loadAsync(ASSET_BASE + relPath);
    cache.set(relPath, p);
    p.catch(() => cache.delete(relPath));
  }
  return p;
}

export function isGltfCached(relPath: string): boolean {
  return cache.has(relPath);
}

export function characterFile(characterId: string): string {
  const c = catalog.characters.find((x) => x.id === characterId);
  if (!c) throw new Error(`unknown character "${characterId}"`);
  return c.file;
}

/** Warms the cache in the background so later switches feel instant. */
export function preloadAllAssets(): void {
  const files = [
    ...catalog.characters.map((c) => c.file),
    ...catalog.parts.flatMap((p) => (p.source.type === 'file' ? [p.source.file] : [])),
  ];
  let i = 0;
  const next = () => {
    const f = files[i++];
    if (!f) return;
    loadGltf(f).finally(() => setTimeout(next, 0));
  };
  next();
}
