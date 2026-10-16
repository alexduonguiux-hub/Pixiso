# Assets and licences

Pixiso no longer bundles any third-party asset. Every character, part and animation is a
pixel template authored in this repository (`packages/sprite-kit/src/*.ts`), so there is
nothing to attribute to an outside author.

| Asset | Location | Author | Licence |
|---|---|---|---|
| Pixiso base set (32 px chibi body, parts, clips) | `packages/sprite-kit/src/body32.ts`, `parts32.ts`, `anim.ts` | this project | decided by the project owner; not yet published separately from the repository |

Rules that still apply:

- Nothing from Mixamo is or may be committed.
- Reference images used for measurements (`docs/PIXEL_STYLE_REFERENCE.md`) are not committed; only the numbers derived from them are.
- The KayKit Character Pack (CC0) used by the 3D prototype was removed in M1; it remains in git history before commit `b1560fc` if anyone needs to reproduce the Phase 0–2 renders.
