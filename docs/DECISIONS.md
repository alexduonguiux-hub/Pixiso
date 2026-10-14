# Decisions

Append-only log of choices the spec left open or that deviate from it. Newest at the bottom.

## Phase 0

### D-001 Vendor assets are committed, fetch is idempotent

HANDOFF §5.1 allows committing KayKit (CC0). The glTF subset (≈19 MB) is committed under `assets/vendor/kaykit-adventurers/` so a clean clone runs offline. `pnpm assets:fetch` is a no-op when `SOURCE.json` already carries the pinned commit; `--force` re-downloads. FBX files (≈100 MB) and sample renders are not kept.

### D-002 fetch-assets tries HTTPS zip first, then a sparse git clone

Some networks block `codeload.github.com` but allow git. The script downloads GitHub's zip for the pinned commit, and on failure falls back to `git init` + sparse-checkout + `fetch --depth 1 <commit>`. `--zip <file>` extracts a hand-downloaded zip (GitHub or itch.io) by matching `Characters/gltf/` and `Assets/gltf/` at any depth, so the archive layout does not matter.

### D-003 Hand slots use the separate accessory files; head/back use built-in meshes

Each character GLB bundles its own weapons/shields as non-skinned meshes under `handslot.r` / `handslot.l`, while `Assets/gltf/` contains the same items as separate files. The catalog exposes the files for `hand_right` / `hand_left` (one definition works for all five characters), and exposes only hats/helmets (`head`) and capes (`back`) as character-specific built-in parts. Every other built-in mesh is hidden. Each file part carries an `attach` transform per slot copied from the equivalent built-in node (e.g. right-hand weapons are rotated 180° about Y and lifted 0.033 m; shields sit at `(0, 0.017, 0.156)`), see `docs/ASSET_REPORT.md` §4. `arrow`, `arrow_bundle` and `quiver` have no attach point on the rig and are left out.

### D-004 A part may fit several slots

HANDOFF's catalog example has one `slot` per part, but the sample sentences need daggers in both hands. Parts have `slots: string[]`; `CharacterConfig.parts` stays `slotId -> partId`.

### D-005 Five characters, not four

The pinned repo contains `Rogue_Hooded.glb` in addition to the four in the README. It is included as `rogue_hooded`.

### D-006 Catalog carries measured facts

`catalog.json` includes `heightM` (rest-pose bbox height from the POSITION accessors), clip `durationS` and a `rootMotion` flag from `inspect-assets`, so the web app never has to guess. `Dodge_*` clips move the `root` bone and are excluded from the MVP list; `Death_*` move the hips while falling, which is expected and kept.

### D-007 Named colours live in the catalog

The 17 `ColorName`s are fixed in `packages/shared`, but their Vietnamese labels and representative hex values are data in `catalog.json` (`colors`), so UI swatches and the recolour shader read one source.

### D-008 Toolchain versions

TypeScript 5.9 (not 7.x), ESLint 9 flat config, Vite 7, Vitest 4, React 19, three 0.186, zod 4, Hono 4, `@playwright/test` pinned to 1.56.1 because that is the Playwright build whose Chromium (141 / r1194) is preinstalled in the CI container; other machines run `pnpm exec playwright install chromium` once. `moduleResolution: bundler` everywhere; the server runs through `tsx`, no build step for the MVP.

### D-009 `assets/` is Vite's public directory

`apps/web` sets `publicDir` to the repo's `assets/`, so vendor files are served as `/vendor/kaykit-adventurers/...` in dev and copied into `dist/` on build. The `.gltf` accessories reference `*_texture.png` by relative URI, which keeps working.
