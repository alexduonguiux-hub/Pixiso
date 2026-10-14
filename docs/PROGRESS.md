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

## Phase 1 — 3D viewer and assembler ⏳

Not started.

## Phase 2 — Pixel render core ⏳

Not started.

## Phase 3 — Directions, frames, sprite sheet, export ⏳

Not started.

## Phase 4 — Iso grid and project style ⏳

Not started.

## Phase 5 — Describe with Claude ⏳

Not started.

## Phase 6 — Polish ⏳

Not started.
