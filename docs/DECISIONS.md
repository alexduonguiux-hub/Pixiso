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

## Phase 1

### D-010 Bone and node names are looked up in three.js' sanitized form

`GLTFLoader` strips `. : / [ ]` from node names (`handslot.r` → `handslotr`). The catalog keeps the real glTF names (what gltf-transform reports); `CharacterRig` resolves them with `PropertyBinding.sanitizeNodeName` at lookup time.

### D-011 Recolour method B (lightness ramp) is the default; A (hue rotation) stays selectable

Both were implemented as one shader (`uRecolorMode`) and compared on the real asset (`test-output/phase1/knight-body-*-{hue,ramp}.png`). A leaves near-grey texels alone, so on the Knight's grey armour "áo đỏ" changes only the belt and gem — correct in theory, useless in practice. B repaints every texel of the part with the target hue/chroma while keeping the texel's lightness offset, which gives clean, predictable results on armour, cloth and shields. B is the default; the viewport has a toggle so A can still be used for chromatic parts (e.g. the Mage's robe). The skin-in-the-same-mesh limitation (HANDOFF §6.7) applies to both and is accepted for the MVP.

### D-012 Direction convention

Model forward is +Z. Facing the camera ("S") is yaw = +45°; direction k is `yaw = 45° − k·45°` (clockwise seen from above). Verified visually: E shows the right-hand profile, N the back, W the left profile (`test-output/phase1/rogue-dir-*.png`).

### D-013 Toon material and texture sampling

Every mesh gets its own `MeshToonMaterial` (3-step nearest `gradientMap`, atlas kept) so recolouring is per part. The atlas is sampled with `NearestFilter`, no mipmaps, because the gradient atlas is a set of flat strips and mipmapping would blend neighbouring strips at sprite resolution. Lights: one `DirectionalLight` (2.6) parented to the camera at camera-space (−6, 9, 5) plus `AmbientLight` (1.1); physically-based light units.

### D-014 Looping clips lose horizontal root motion at load

`stripHorizontalRootMotion` pins X/Z of the `hips`/`root` position tracks to their first key for clips the catalog marks `loop: true`; vertical bob is kept. KayKit's locomotion clips are already in place, so this is a safety net.

### D-015 Config and style persist in localStorage

Key `pixiso:v1`, written on every config/style change, validated with zod and normalized on load; all access wrapped in try/catch (HANDOFF §8, done early because it was cheap).

## Phase 2

### D-016 Pixel-centre pivot convention

The pixel frustum is offset by half a pixel so the world origin (the character's feet) projects to the **centre** of pixel `(pivotX, pivotY)`: `left = −(pivotX+0.5)/PPM`, `right = (W−pivotX−0.5)/PPM`, `top = (pivotY+0.5)/PPM`, `bottom = −(H−pivotY−0.5)/PPM`. Exported pivots are therefore integer pixel coordinates that name a pixel, not an edge.

### D-017 sRGB render target instead of CPU conversion

The low-res `WebGLRenderTarget` is created with `colorSpace: SRGBColorSpace` (RGBA8 → `SRGB8_ALPHA8` storage), so the GPU encodes linear → sRGB at float precision and `readRenderTargetPixels` already returns 8-bit sRGB. This avoids the banding a linear 8-bit readback converted on the CPU would show in dark tones. Verified by the flat-colour test (`#d1343a` → `209,52,58`, exact for four colours). HANDOFF §6.3's intent ("convert to sRGB before quantising") is met; the conversion point moved.

### D-018 PPM from the projected rest-pose height, not `h·cosθ`

HANDOFF §6.2 gives `PPM = characterHeightPx / (h_ref·cosθ)`. That ignores depth: in a 30° view the sprite's screen height is the vertical extent **plus** `depth·sinθ` (head back to toe front), so the Knight would come out ≈12 % taller than requested (2.239 m projected vs 2.004 m). `inspect-assets` now projects the rest-pose vertices onto the camera plane (`projected.heightM`, stored in the catalog), and `PPM = characterHeightPx / projected.heightM` of the reference character. Measured: 32/48/64 px → 31/47/63 px rendered (idle pose, within the ±1 px acceptance; the −1 is idle posture vs T-pose plus edge rasterisation).

### D-019 Working canvas for single-frame renders

Before the Phase 3 union crop, frames are rendered on a canvas of `3h × 2.5h` pixels with the pivot at `(W/2, H − 0.6h)`, which fits two-handed weapons, capes and the mage hat at every direction. The live preview crops to the union of the clip's opaque bounds plus 1 px.

### D-020 Preview renders the whole clip, not the live pose

The pixel preview samples the selected clip (`defaultFrames` frames, HANDOFF §6.6 timing) for the current direction, builds one palette from all of them and plays the processed frames at the exported frame duration. That is exactly what the exporter will produce, so what you see is what you get; re-rendering is debounced 60 ms after any config/style change.

### D-021 Orphan cleanup semantics

Single pass over a snapshot of the frame (results independent of scan order); outline pixels are protected; an opaque pixel with no opaque neighbour is removed. Verified by fixtures incl. a 2-px eye.

## Phase 2b — pixel look

### D-022 Two data passes instead of one shaded render

The pixel pipeline no longer quantises the shaded composite. Every Pixiso material carries a shared `uPixisoPass` uniform: pass 1 writes the albedo (texture × recolour), pass 2 writes the toon light band as grey. Both are rendered 4× supersampled into the sRGB render target. The viewer path (pass 0) is unchanged. Reason: pixel-art rules separate _what colour a material is_ from _how it is lit_; mixing them before quantising is what produced noise and banding (PIXEL_RULES §0).

### D-023 Coverage + majority downsampling

4× passes are reduced to 1× by coverage (≥ 50 % of the block opaque) and by the most common (material, band) pair in the block. No averaging, so no new colours; silhouettes follow the true edge, which gives even stair-steps and less jitter between frames (PIXEL_RULES §1–2).

### D-024 Structured ramp palette replaces frame median-cut

Auto palettes are built from the albedo: K = ⌊0.55·(N−1)⌋ base materials (median cut weighted toward hue/chroma, population flattened by count^0.6, box representative = most common texel), then the budget is spent as an artist would: full 3-shade ramps for the largest forms, shadow shades next, flat colours for accents, one line colour. Ramps are hue-shifted (shadow −0.16 L toward 264°, highlight +0.08 L toward 110°). HANDOFF §6.5's "median-cut on the final frames" remains as the `composite` look for comparison; the user asked for pixel-art rules, and the structured palette is how pixel artists actually work. Fixed palettes still work: ramp frames are snapped to the fixed colours.

### D-025 Light bands tuned for the iso key light

Shadow for dot(N,L) ≤ 0.15, mid up to 0.8, highlight only above 0.8 (64-texel nearest gradient map). The first attempt (0.05 / 0.6) put most of a chibi's big round surfaces in the highlight band and the Knight came out chalk-white.

### D-026 Cluster cleanup with contrast protection

`cleanupClusters` merges 4-connected clusters < 3 px into the neighbouring component they touch most, only when that neighbour is larger (or equal and lower colour key, so two specks never swap), and never when the lightness gap exceeds 0.3 (eyes, buckles are deliberate). Outline pixels are protected. Replaces the plain orphan pass for the ramp look.

### D-027 Selective outline from the ramp

The outline pixel takes the darkest neighbour's own shadow shade when that shade is clearly darker than the fill (ΔL ≥ 0.12, L < 0.55); otherwise the global line colour. This is Lospec's "selout" rule applied with the palette we already have, and it costs no extra colours.

### D-028 Known limit at 16 colours

With 8 materials the Mage's skin can merge into the blond hair (24 colours separates them; the Knight keeps his face at 16). A material-id pass that reserves a base for the `_Head` mesh is the planned fix (PIXEL_RULES §6).

## Phase 2c — large masses

### D-029 Smooth normals by position

KayKit meshes are exported with split normals on most edges (Knight_Body: 540 unique positions, 1025 unique position+normal pairs). Facet shading breaks the toon bands into dozens of islands at sprite size. `smoothNormalsByPosition` averages area-weighted face normals over every vertex sharing a position (ignoring UV/material splits) once per geometry, for characters and parts alike. The viewer shades the same smoothed normals, so what you see is what you get.

### D-030 Band masses inside a material

After downsampling, `smoothBands` runs a majority filter on the light band restricted to same-material neighbours (2 passes, needs a clear majority) and absorbs band islands below 4 px. Material boundaries are never crossed, so colour clusters stay intact while shading becomes a few large masses (PIXEL_RULES §2, §5).

### D-031 Inner lines from a depth pass

A third data pass writes 16-bit depth (R high, G low) across a 10 m range centred on the character (pixel camera near/far = distance ± 5 m). After downsampling (block keeps its nearest depth), an opaque pixel whose 4-neighbour is nearer by more than 12 cm becomes a line pixel in its own material's line colour. One pixel wide, always on the far (shadow) side, protected from cleanup. This was listed as post-MVP in HANDOFF §3; it is cheap here because the pass infrastructure already existed, and it is the single biggest readability gain for 3D-to-pixel sprites (Dead Cells, RenderPixelatedPass).

### D-032 Material assignment uses the same hue-weighted metric as material selection

Texels are assigned to bases with the weights used to split the boxes (L×0.5, a×2, b×2), so a gradient strip of one hue never straddles two materials. Light and depth passes render into a linear (NoColorSpace) target; only the albedo uses the sRGB target.

### D-033 Island removal

Opaque 8-connected islands smaller than 6 px are erased after cleanup. The Knight's thin helmet crest seen edge-on produced floating crumbs above the head in the E frames; a sprite is one silhouette.

### D-034 Bridging thin slivers during downsampling

A block covered 30–50 % becomes a pixel when both its horizontal or both its vertical neighbours are solid (≥ 50 %). Thin geometry seen edge-on (the Knight's helmet crest, blades, staffs) stays continuous instead of leaving crumbs that the island filter would then erase; nothing is invented where no geometry exists.
