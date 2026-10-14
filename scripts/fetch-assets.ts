/**
 * Downloads the KayKit Adventurers pack (CC0) into `assets/vendor/kaykit-adventurers`.
 *
 * Sources, in order of preference:
 *   --zip <file>  a zip downloaded by hand (GitHub "Download ZIP" or the itch.io pack)
 *   --url <url>   a zip URL (default: GitHub's zip for the pinned commit)
 *   git           shallow sparse clone of the pinned commit (fallback when HTTPS is blocked)
 *   --git         skip HTTPS and go straight to git
 *   --force       re-download even if the pinned commit is already present
 *
 * Only the glTF subset is kept (Characters/gltf, Assets/gltf, LICENSE.txt, README.md);
 * the FBX files and sample renders are not needed by the app.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { KAYKIT, KAYKIT_DIR, KAYKIT_SOURCE_JSON } from './lib/paths.js';

const ZIP_URL = `https://codeload.github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/zip/${KAYKIT.commit}`;
const WANTED_DIRS = ['Characters/gltf/', 'Assets/gltf/'];
const WANTED_FILES = new Set(['LICENSE.txt', 'README.md']);

interface Args {
  zip?: string;
  url?: string;
  git: boolean;
  force: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { git: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--zip') args.zip = argv[++i];
    else if (a === '--url') args.url = argv[++i];
    else if (a === '--git') args.git = true;
    else if (a === '--force') args.force = true;
    else if (a === '-h' || a === '--help') {
      console.log('usage: pnpm assets:fetch [--zip <file>] [--url <url>] [--git] [--force]');
      process.exit(0);
    } else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

/** Maps any archive/clone path to its destination under KAYKIT_DIR, or null if not wanted. */
export function destinationFor(entryPath: string): string | null {
  const p = entryPath.replace(/\\/g, '/');
  if (p.endsWith('/')) return null;
  for (const dir of WANTED_DIRS) {
    const i = p.indexOf('/' + dir);
    if (i >= 0) return p.slice(i + 1);
    if (p.startsWith(dir)) return p;
  }
  const base = p.slice(p.lastIndexOf('/') + 1);
  if (WANTED_FILES.has(base)) return base;
  return null;
}

function isUpToDate(): boolean {
  if (!fs.existsSync(KAYKIT_SOURCE_JSON)) return false;
  try {
    const src = JSON.parse(fs.readFileSync(KAYKIT_SOURCE_JSON, 'utf8')) as { commit?: string };
    if (src.commit !== KAYKIT.commit) return false;
  } catch {
    return false;
  }
  return fs.existsSync(path.join(KAYKIT_DIR, 'Characters', 'gltf', 'Knight.glb'));
}

function clearDestination(): void {
  for (const sub of ['Characters', 'Assets'])
    fs.rmSync(path.join(KAYKIT_DIR, sub), { recursive: true, force: true });
  fs.mkdirSync(KAYKIT_DIR, { recursive: true });
}

function writeEntry(rel: string, data: Uint8Array): void {
  const out = path.join(KAYKIT_DIR, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, data);
}

function extractZip(buf: Uint8Array, label: string): number {
  const entries = unzipSync(buf, { filter: (f) => destinationFor(f.name) !== null });
  let n = 0;
  for (const [name, data] of Object.entries(entries)) {
    writeEntry(destinationFor(name)!, data);
    n++;
  }
  if (n === 0)
    throw new Error(`${label}: no Characters/gltf or Assets/gltf entries found in the zip`);
  return n;
}

async function downloadZip(url: string): Promise<Uint8Array> {
  console.log(`[fetch-assets] downloading ${url}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(180_000), redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return new Uint8Array(await res.arrayBuffer());
}

function copyTree(fromDir: string, archivePrefix: string): number {
  let n = 0;
  const walk = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === '.git') continue;
        walk(full);
      } else {
        const rel = destinationFor(archivePrefix + path.relative(fromDir, full));
        if (rel) {
          writeEntry(rel, fs.readFileSync(full));
          n++;
        }
      }
    }
  };
  walk(fromDir);
  return n;
}

function fetchViaGit(): number {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pixiso-kaykit-'));
  const run = (args: string[]) =>
    execFileSync('git', args, { cwd: tmp, stdio: ['ignore', 'inherit', 'inherit'] });
  try {
    console.log(`[fetch-assets] git sparse clone of ${KAYKIT.repo} @ ${KAYKIT.commit.slice(0, 7)}`);
    run(['init', '-q']);
    run(['remote', 'add', 'origin', KAYKIT.repo]);
    run([
      'sparse-checkout',
      'set',
      '--no-cone',
      '/addons/kaykit_character_pack_adventures/Characters/gltf/',
      '/addons/kaykit_character_pack_adventures/Assets/gltf/',
      '/LICENSE.txt',
      '/README.md',
    ]);
    run(['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', KAYKIT.commit]);
    run(['-c', 'advice.detachedHead=false', 'checkout', '-q', KAYKIT.commit]);
    return copyTree(tmp, 'repo/');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function verify(): { glb: number; gltf: number } {
  const glbDir = path.join(KAYKIT_DIR, 'Characters', 'gltf');
  const gltfDir = path.join(KAYKIT_DIR, 'Assets', 'gltf');
  const glb = fs.existsSync(glbDir)
    ? fs.readdirSync(glbDir).filter((f) => f.endsWith('.glb')).length
    : 0;
  const gltf = fs.existsSync(gltfDir)
    ? fs.readdirSync(gltfDir).filter((f) => f.endsWith('.gltf')).length
    : 0;
  if (glb === 0 || !fs.existsSync(path.join(glbDir, 'Knight.glb'))) {
    throw new Error('verification failed: Characters/gltf/Knight.glb is missing');
  }
  if (gltf === 0) throw new Error('verification failed: Assets/gltf has no .gltf files');
  if (!fs.existsSync(path.join(KAYKIT_DIR, 'LICENSE.txt'))) {
    throw new Error('verification failed: LICENSE.txt is missing');
  }
  return { glb, gltf };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.force && !args.zip && isUpToDate()) {
    console.log(
      `[fetch-assets] already at ${KAYKIT.commit.slice(0, 7)} in ${path.relative(process.cwd(), KAYKIT_DIR)}; use --force to re-download`,
    );
    return;
  }
  clearDestination();

  let count = 0;
  if (args.zip) {
    const zipPath = path.resolve(args.zip);
    console.log(`[fetch-assets] extracting local zip ${zipPath}`);
    count = extractZip(new Uint8Array(fs.readFileSync(zipPath)), zipPath);
  } else if (!args.git) {
    try {
      count = extractZip(await downloadZip(args.url ?? ZIP_URL), 'download');
    } catch (err) {
      console.warn(
        `[fetch-assets] HTTPS download failed (${(err as Error).message}); falling back to git`,
      );
      count = fetchViaGit();
    }
  } else {
    count = fetchViaGit();
  }

  const { glb, gltf } = verify();
  const source = {
    name: KAYKIT.name,
    license: KAYKIT.license,
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    source: KAYKIT.repo,
    commit: KAYKIT.commit,
    kept: ['Characters/gltf/**', 'Assets/gltf/**', 'LICENSE.txt', 'README.md'],
  };
  fs.writeFileSync(KAYKIT_SOURCE_JSON, JSON.stringify(source, null, 2) + '\n');
  console.log(
    `[fetch-assets] wrote ${count} files: ${glb} character .glb, ${gltf} accessory .gltf -> ${path.relative(process.cwd(), KAYKIT_DIR)}`,
  );
}

main().catch((err) => {
  console.error(`[fetch-assets] ${(err as Error).message}`);
  process.exit(1);
});
