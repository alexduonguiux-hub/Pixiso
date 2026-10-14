# Progress

Living status for the MVP. One section per phase: done, decisions, open items.

## Phase 0 — Monorepo and assets ✅

**Done**

- pnpm workspace: `apps/web` (Vite + React + three), `apps/server` (Hono), `packages/shared` (types, zod, catalog), `packages/pixel-core` (pure RGBA helpers), `scripts/`.
- Tooling: TypeScript strict (`noUncheckedIndexedAccess`), ESLint 9 flat config + Prettier, Vitest (root config), Playwright 1.56.1 for render tests, `.env.example`.
- `pnpm assets:fetch` — HTTPS zip of the pinned commit with git sparse-clone fallback and `--zip` for hand-downloaded archives; keeps only the glTF subset; idempotent via `SOURCE.json`.
- `pnpm assets:inspect` — gltf-transform inspection → `docs/ASSET_REPORT.md` + `assets/inspection.json` (node trees, 41-joint rig, attach bones with transforms, built-in parts, accessory files, 76 clips with duration and root-motion measurement, rest-pose heights, shared material/atlas).
- `pnpm assets:catalog` — `scripts/catalog-labels.yaml` × inspection → `packages/shared/catalog.json` (5 characters, 4 slots, 25 file parts + 8 built-in parts, 8 colour targets, 17 colours, 31 animations), validated by zod + cross-reference checks and by Vitest.
- `normalizeConfig()` in `@pixiso/shared`: makes any config valid against the catalog (incompatible parts → `none`, etc.), with tests.
- Server skeleton: `GET /api/health`, `POST /api/describe` → `503 describe_disabled` without a key. Web skeleton lists catalog characters and shows server status. Playwright smoke test confirms WebGL2 in headless Chromium.
- `assets/LICENSES.md`, `docs/DECISIONS.md` (D-001 … D-009).

**Key facts from the asset survey** (see `docs/ASSET_REPORT.md`)

- Rest-pose heights (m): knight 2.314 (reference), barbarian 2.186, mage 2.203, rogue 2.187, rogue_hooded 2.251. Feet at y = 0.
- `Walking_*`, `Running_*`, `Idle` have no horizontal root motion; `Dodge_*` do (excluded).
- One material + one 1024×1024 gradient atlas per character; body is split into `_Body`, `_Head`, `_ArmLeft/Right`, `_LegLeft/Right` skinned meshes — recolouring per mesh is possible, but skin vs. clothing inside one mesh cannot be separated without UV-region work (HANDOFF §6.7 risk stands).

**Open**

- `heightM` is the T-pose bbox; the ±1 px height test in Phase 2 will decide whether to measure on the idle pose instead.

## Phase 1 — 3D viewer and assembler ✅

**Done**

- `apps/web/src/scene`: `loader` (cached GLTF), `IsoCameraRig` (30°/45° ortho, camera-attached key light), `CharacterRig` (SkeletonUtils clone, built-in part visibility, file parts attached to `handslot.*` with catalog `attach` transforms, per-mesh toon materials, recolour A/B via `onBeforeCompile`, AnimationMixer, 45° yaw steps, root-motion strip for loops), `SceneController` (renderer + store binding).
- `apps/web/src/state/store.ts`: zustand store; `CharacterConfig` + `ProjectStyle` are the single source of truth, every mutation goes through `normalizeConfig`; JSON import/export; localStorage persistence.
- UI shell with all panels (Describe bar disabled until Phase 5, Export disabled until Phase 3, pixel preview placeholder until Phase 2): characters, parts per slot, 17 named colours per target, animations with frame counts and preview, style selects, 8 direction buttons, play/pause, recolour-method toggle, config JSON.
- Tests: 33 Vitest (store, normalize, catalog, OKLab, server) and 6 Playwright render tests (`tests/render/assembler.spec.ts`): parts/builtins/attach state, base-change reset, recolour per target with both methods, clip switching, direction order, JSON round trip, apply latency.

**Acceptance**

- Part/colour/clip changes apply in ≈50 ms once assets are cached (measured in Playwright on SwiftShader; threshold 100 ms).
- Config → JSON → config is lossless (unit + UI test).
- Changing the base character resets incompatible parts to `"none"` (unit + UI test).

**Decisions** D-010 … D-015.

**Open**

- Thumbnails on character cards (needs the pixel renderer).
- Skin shares a mesh with sleeves on some characters; recolouring `arms` tints skin (known limitation, HANDOFF §6.7).

## Phase 2 — Pixel render core ✅ (stopped here for review)

**Done**

- `packages/pixel-core`: `alphaThreshold`, OKLab/OKLCh, `buildPaletteMedianCut` (OKLab, one palette for all frames, deterministic), `mapToPalette`, `addOutline` (`dark` / `selective`), `cleanupOrphans` (snapshot pass, protects outline, keeps 2-px details), geometry helpers (`opaqueBounds`, `unionRects`, `cropImage`, `flipHorizontal`, `scaleNearest`, `blit`), stats (`countColors`, `countSemiTransparent`, `imageHash`), `processFrame` / `processFrames` in the §6.5 order. 55 Vitest tests with ASCII fixtures.
- `apps/web/src/render`: `PixelRenderer` (sRGB8_ALPHA8 render target, nearest, no AA, helper layer excluded, Y-flipped readback), `pixelMath` (PPM, working frustum, §6.6 sample times, 10 ms frame durations), `framePipeline.renderClip` (synchronous clip sampling that restores the viewer pose).
- `inspect-assets` → `catalog.characters[].projected` (view-plane extents).
- Live pixel preview panel: processed clip at ×4/×6/×8, palette strip, cell size, colour count, PPM.
- Playwright `pixel.spec.ts`: determinism (byte-identical hashes), ≤N colours, 0 semi-transparent (raw and processed), reference height ±1 px for 32/48/64, 2:1 ground diamond (41×21 px), flat-colour sRGB check. `review-phase2.spec.ts` writes `test-output/review-phase2/*.png` (×8).

**Measurements** (Chromium 141 / SwiftShader)

| Setting | Rendered Knight height | PPM   |
| ------- | ---------------------- | ----- |
| 32 px   | 31 px                  | 14.29 |
| 48 px   | 47 px                  | 21.44 |
| 64 px   | 63 px                  | 28.59 |

Knight (sword, round shield, helmet, cape) walk cell 45×55 px; Mage (staff, spellbook, hat, cape) 51×62 px; 16 colours each.

**Decisions** D-016 … D-021.

**Open / for review**

- Look direction: selective outline + 16 colours is the proposed default; sheets for outline none/dark/selective, palettes 8/16/32 and heights 32/48/64 are in `test-output/review-phase2/`.
- 8-colour palettes wash out the Knight's warm accents (median cut favours the large grey areas); a hue-aware split or a minimum-chroma reserve could help later.
- Height comes out 1 px short of the setting at every size; compensating by +1 px on `characterHeightPx` is trivial if the exact number matters more than the rest-pose definition.

## Phase 3 — Directions, frames, sprite sheet, export ⏳

Not started.

## Phase 4 — Iso grid and project style ⏳

Not started.

## Phase 5 — Describe with Claude ⏳

Not started.

## Phase 6 — Polish ⏳

Not started.
