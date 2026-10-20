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

## Pivot — vẽ trên lưới pixel

### D-035 Drop 3D rendering; characters are semantic pixel matrices

After two review rounds the user judged the 3D→pixel output unfit at 32–48 px (see docs/PIVOT.md §1 for the diagnosis). The new source of truth for pixels is `packages/sprite-kit`: ASCII matrices of (material, shade) cells composed by layer and anchor on a 24×32 grid, animated by per-limb offset tables, coloured by `pixel-core` ramps. Deterministic by construction, no WebGL, no vendor assets. The 3D code and KayKit assets stay in git history until the user confirms their removal (PIVOT.md §5).

### D-036 Reference-image analysis lives in Python research scripts

`scripts/research/study_reference.py` and `study_crops.py` (Pillow + numpy, run with `python3 -I`) measure native pixel scale, tolerance-merged palettes, OKLCh ramps, outline colour/thickness and texture of any reference image. Decoding webp and doing the measurements in Node would have meant adding image-codec dependencies to a TypeScript monorepo for a one-off research task; the scripts are dev-only, not imported by any package, and their findings are written up in `docs/PIXEL_STYLE_REFERENCE.md`. The reference images themselves are not committed (copyright unknown).

### D-037 Reference ramp and tinted outline presets

Measurements on the reference art (PIXEL_STYLE_REFERENCE.md §2.3–2.4) disagree with two assumptions baked into `DEFAULT_RAMP_OPTIONS`: shadows there are _less_ saturated (×0.7–0.85), not more, and yellow shades toward orange, never toward green. `REFERENCE_RAMP_OPTIONS` encodes the measured values (steps −0.14/+0.13 L, ≤16° hue per step, shadow chroma ×0.85, highlight chroma ×1.0) and a new `shadowAwayFromHighlight` rule: the shadow rotates in the direction the highlight does not take. `buildTintedLine` gives each material a near-black outline (L 0.12) tinted by its own hue, and `paint()` gains `lineStyle: 'tinted'`; selective outlines (`selout`) exist as an option but stay off because the reference sprites keep a closed dark outline on the lit side too. The defaults are unchanged until sprite-kit becomes the core (PIVOT.md M1).

## M1 — sprite-kit là lõi

### D-038 Catalog v2 is generated from the sprite-kit registry

The catalog no longer describes glTF files. `packages/sprite-kit/src/registry.ts` is the single list of bodies (canvas + pivot), slots, colour targets (each bound to one material) and drawable directions; parts and clips come from `parts32.ts` and `anim.ts`. `scripts/build-catalog.ts` merges that registry with `scripts/catalog-labels.yaml` (Vietnamese labels and tags only) into `packages/shared/catalog.json` (schema `version: 2`), failing on any label without a definition or definition without a label, and a Vitest test keeps the committed JSON equal to what the registry generates. Server, web and Claude keep consuming one JSON; `CharacterConfig` is unchanged, so the Phase 5 schema design (HANDOFF §9.3) still applies.

### D-039 Three.js, the 3D scene and the KayKit assets are removed

With the pivot confirmed, `apps/web/src/scene`, `apps/web/src/render`, the three.js dependency, `scripts/fetch-assets.ts`, `scripts/inspect-assets.ts`, `assets/vendor/` (18 MB) and `docs/ASSET_REPORT.md` are deleted. They stay in git history before `b1560fc`. `pixel-core` keeps its pure image helpers (the ramp/outline/sheet code is used by sprite-kit and the exporter); its 3D post-processing passes (`look.ts`, `compose.ts`, cluster/island cleanup) are now unused but pure and tested, and are left in place for a future "import an image" path rather than deleted.

### D-040 ProjectStyle after the pivot

`characterHeightPx` becomes `32 | 64`: the base body is 32 px and output is nearest ×1 or ×2 (a 48 px set is a separate drawing, PIVOT.md decision 1). `outline` becomes `'ink' | 'soft' | 'none'`, the presets measured on reference art: ink = near-black outline tinted by the bordering material, soft = warm dark grey `#2e2428`, none = line cells take the material's shadow. The ramp is always `REFERENCE_RAMP_OPTIONS` (D-037 defaults are now in effect). The catalog lists the directions that have a drawn view (`S`, `W`, `E` today); the UI disables the rest until M2 draws them. `palette.mode === 'fixed'` and `directions: '5+mirror'` are kept in the type for Phase 4 and M4 but have no effect yet, and the palette size select is disabled with a note.

## M2 — thân đầy đủ

### D-041 Frame canvas is 32×32 with the pivot at (16, 30)

The 24-px-wide spike canvas had no room for a swung weapon: a horizontal or diagonal sword from the hand left the frame. Every frame is now 32×32 (64×64 at ×2), the body sits in the middle 24 columns and the four spare columns on each side hold attack poses. All frames of a character share the cell and pivot (HANDOFF §7).

### D-042 Mirrored directions keep a mirrored light

SE, E and NE are horizontal flips of SW, W and NW, so their light comes from the top-right. Re-lighting a flipped sprite would need either a second set of drawings per direction or a shading model separate from the artwork; neither is worth it at 32 px, and flipping side views is what the reference Pokémon-style sprites do. Rule 8 of PIXEL_STYLE_REFERENCE.md is relaxed accordingly: side views keep their lateral shading subtle so the flip reads naturally.

### D-043 Clip frames can swap drawings, request part poses and hide gear

Offset tables alone cannot raise an arm, swing a sword or lie down. `FrameOffsets` gained `limbSprites` (replace a limb drawing for one frame), `anchors` (move a slot anchor with the raised hand), `pose` (a part answers with a variant from `PartView.poses`, e.g. the sword's `up` and `swing`), `hideLimbs`, `hideParts` and `extra` (a bespoke layer). Six clips exist in every view: idle 2, walk 4, run 4, attack 3, hit 2, death 4. Death uses one lying drawing for every direction (mirrored directions flip it), with the gear dropped; a per-direction lying pose can replace it later without touching the clip model. Horizontal and diagonal swords are derived from the upright drawing by lossless quarter turns and a small generator, so one authored blade serves every pose.

## Vẽ lại từ hình khối

### D-044 Bodies are generated from shapes; outlines belong to the compositor

The user judged the hand-typed templates' character design not good enough: square heads, rectangular limbs and a line around every limb made the figure read as stacked boxes. Templates are now built by `draw.ts` from ellipses and rounded boxes and shaded with the shifted-shape recipe (shadow tone everywhere, base tone where the shape shifted toward the light still covers, highlight for a larger shift), which gives the crescent shading the reference sprites have. `bodygen.ts` assembles every authored view (S, SW, W, NW, N) from one parameter set (`CHIBI_CLASSIC`: egg head 14×13, tunic 8×8, legs 7, arms 6); other proportions are a parameter change, and `scripts/body-variants.ts` renders them side by side. Templates carry no outline: `compose()` draws the closed outer line around the finished silhouette and cuts a 1-px line into whatever an `edge` layer overlaps (arm over torso, helmet over face, sword over body), so forms standing side by side separate by tone and overlapping forms by a line. Hand-typed parts keep their interior lines but have their outer lines stripped (`stripOuterLines`), and capes are generated from shapes so they can be wider than the body in front views. The lying frame and the pose arms come from the same generator.

## Hero 64 — thân 64 px theo ảnh mẫu

### D-045 The hero mannequin is transcribed from the reference sheet and carries its own outline

The user judged the shape-built chibi "too ugly" and asked for the reference sheet's design to be copied at a 64×64 cell. The sheet is a ~2.3× JPEG-like resample, so its pixel grid was fitted first (`scripts/research/extract_v3.py`: gradient-periodicity fit, then one sample per source pixel, colour classes calibrated on the sheet's large clean copy of the front figure). The mannequin is 17×40 with its outline (head 15 rows, shoulders 4, torso 11, legs 10), not the 21×48 the first study guessed. Unlike D-044 bodies, these templates include their 1-px outline, because the reference draws lines a silhouette pass cannot: the chin line crossing the shoulders, the ear notch, the double line between forearm and torso, fist knuckles. `compose` is therefore used with no `edge` and no `outline` for hero frames. Views S, N and W with two walk steps each come from the sheet (`hero64.frames.ts`, generated); E is the mirror of W; SW and NW will be drawn by hand. The reference image is not committed and its licence is unknown: the transcription stays a study until the user confirms they own the design or replaces it with their own drawing.

### D-046 A second ramp preset measured on the 64 px reference

The 32 px preset (D-037) gives a near-white highlight and a near-black outline, both wrong next to the reference, whose skin ramp is shadow 200,143,111 / base 249,209,173 / light 253,233,200 with a brown outline 93,54,33 (ΔL −0.19 / +0.06, outline L 0.38 in the shadow's hue). `HERO_RAMP_OPTIONS` encodes that, and `RampOptions.lineL` lets the tinted outline sit at a mid-dark lightness instead of near black. The 32 px bodies keep `REFERENCE_RAMP_OPTIONS`.

### D-047 Fat and heavy builds are derived by duplicating template rows and columns; giants are drawn by hand

`heroforms.ts` builds a form by repeating chosen source rows and mirrored column pairs (centre column an even number of times) so every row keeps an odd width and the figure stays centred; interior columns only, so the outline stays one pixel. `FORM_FAT` and `FORM_HEAVY` are parameter sets over the base drawing. The user asked that giants be drawn, not scaled, so the ×1.5 (25×60) and ×2 (33×80) forms are hand-drawn figures in `hero64.giant.ts`, built with the same vocabulary as the base (1-px outline, 2-px outline steps only where a 2× slope needs them, ears, three- and four-column eyes, fists, feet one column wider than the calves); a `FormSpec.figure` short-circuits the duplication.

### D-048 Clothes are a material change on the figure; silhouettes are overlays

`outfit64.ts` dresses a hero figure in two steps. Tight clothes (shirt, sleeves, trousers, shoes, a hat crown) are `Remap`s: skin cells inside a box take another material with the same shade, so the body's own shading, outline and interior lines carry over and every walk frame is dressed by the same rule. Seams (hem, zip, hat band) are cells forced to the line material. Anything with its own silhouette (hair, hat brim, glasses, a bag and its strap, stains, pustules) is a hand-drawn `Overlay` template in figure coordinates, stamped last. Regions are given per body form, since the fat and heavy forms shift columns. `cast64.ts` holds the Vùng Xanh cast as data (four players, Ông Tư, Biến Thể, Kẻ Phun), each with its own `MaterialColors`; the game's atlas was only looked at for colours and silhouettes, nothing was copied from it.

### D-049 A pose is a form: the zombie stance is its own figure

A drooped head and uneven shoulders cannot come from recolouring or from offset tables on the standing figure, so `hero64.zombie.ts` draws the body of the stance by hand (19×40: left shoulder two rows above the right, the right arm two rows lower, open hands, bent legs, one foot turned out) and stamps the base head onto it two rows lower with a 1/2/3-column shear for the tilt. It is registered as `FORM_ZOMBIE`, so an outfit (Biến Thể) picks it like any other form and gives its regions in that figure's coordinates. The same route serves other characters whose silhouette is a pose rather than a size (a crawler, a hunched elder).

### D-050 Poses declare their clothing regions; looks are pose-independent

With eight zombies on eight stances, clothes could not stay as per-figure boxes. `hero64.poses.ts` draws each stance's body by hand and stamps the base head onto it (lowered, and sheared only on head rows 3, 5, 6, 7 or 9, where the skull's sides run vertical, so the outline stays connected), then lists the regions an outfit needs on that body: torso, neck opening, shoulder caps, sleeves (short, long, torn), trousers, shorts, shoes, flats, collar and hem seams, and anchors for details. A zombie is a `Look` (hair or hat, top, bottoms, footwear, details, colours) that `zombie()` lays onto any pose; mirrored poses are derived. Hats are rigid head-space overlays drawn wider than the skull, so a tilted head neither shears them nor leaks skin around them. `scripts/hero-qa.ts` runs the checks that caught the earlier faults (a sheared hat, a broken skull edge, skin above a brim) and is part of the review loop before a sheet is sent.

### D-051 Mutants: overlays behind the body, and bodies built from existing figures

`Overlay.under` stamps only onto transparent cells, which puts a carapace behind a figure without a second layer system. Where a mutation changes the silhouette for real (the brute's oversized claw arm and bone spikes), the body is a new figure composed in code from an existing drawing (`hero64.mutants.ts` stamps the ×1.5 giant onto a wider canvas, clears its left arm and draws the mutated one), so the hand-drawn base is reused rather than redrawn. Hats and ears that must keep their shape sit on poses whose head is not sheared (the worker and Kẻ Thính stand upright); the QA script flags the alternative. A `Look` may ask for the plain base face (`face: 'plain'`) when the horror is in what is added rather than in decay (the mimic's too-wide smile); a long dress is a pose-declared overlay (`ZombiePose.dress`) and suppresses the waist hem line so the garment reads as one piece. Two readability rules came out of review: a head-space overlay must stay within one column of the head grid on each side, because the narrowest pose canvas (19 columns, head at +1) cuts anything wider and the figure loses its outline there; and a light-coloured character must be checked on a mid-grey background, since the light review sheet hid the mimic's silhouette entirely. Where the game has its own sprite for a character, its silhouette and colour reading win over an invented one (the mimic shows its face; the hair-over-one-eye version did not read).

### D-052 Mọi góc nhìn của thân đứng đi qua một đường: góc là một "pose", món đồ vẽ theo góc

Thân đứng ở mỗi góc (S, SW, W, NW, N) được mô tả như một `ZombiePose` (`STAND_VIEWS`): cùng builder `build(look, pose, view)` mặc áo/quần/giày cho zombie, lính và dàn chính, nên một `Look` là đủ cho cả tám hướng. Món đồ có hình riêng (tóc, mũ, kính, râu, túi, vạt áo) là `ViewItem`: bảng hình theo góc, góc thiếu thì món đó không vẽ (kính nhìn từ sau), còn overlay/remap thường chỉ tính cho S nên zombie và đột biến (chỉ có S) không đổi. Mũ đối xứng dùng lại hình S cho SW/N/NW, mũ nồi lật gương cho N/NW, chỉ góc W vẽ mới. Hai góc SW/NW vẽ tay vì bảng mẫu không có; SE/E/NE lật thường theo D-042 (không hoán đổi sáng/tối: thử hoán đổi làm đỉnh đầu tối, sai hơn là chấp nhận sáng từ bên phải). Hệ quả đã biết: món lệch một bên (túi y tế, đuôi tóc) đổi bên ở hướng lật; khi cần sẽ vẽ riêng hướng đó. Mọi hình theo góc đi qua `gen_view_items.py`, ghép lên đúng thân rồi kiểm tra hở viền trước khi sinh TS, vì tay vẽ hàng trăm dòng ASCII không thể tự soát.

### D-053 Góc nhìn của dáng zombie: vẽ tay góc W, suy góc N từ thân S, góc 3/4 chỉ đổi đầu (cập nhật: mọi góc sinh và kiểm tra trong script)

Mỗi dáng zombie là một thân vẽ tay ở góc S; vẽ tay thêm bốn góc cho sáu dáng (và các dáng lật) là 24–40 thân nữa. Chọn: góc W vẽ tay vì nhìn nghiêng mới thấy rõ tư thế (tay vươn ra, chân kéo lê, lưng gù); góc N suy từ thân S lật gương vì hình học tay chân từ sau lưng gần như trùng với phía trước, chỉ khác bóng ngực và đầu, nên `poseviews64.ts` lật thân, san phẳng vệt sáng trong khung ngực và gắn đầu N (nghiêng ngược chiều); góc SW/NW lấy thân S/N và chỉ đổi sang đầu 3/4 của góc đó, vì ở cỡ 17 px hướng quay của đầu là thứ người xem đọc trước, còn thân 3/4 chỉ khác thân thẳng một cột ở tay xa. Hệ quả: vùng áo quần của N là vùng S lật, nên không phải khai báo lại; dáng lật dùng chung hình W với dáng gốc (độ nghiêng đầu sang trái/phải không thấy khi nhìn nghiêng); chân kéo lê ở góc W vẽ ra phía sau không phân biệt chân gần/xa. Khi cần đẹp hơn, vẽ tay thân 3/4 cho dáng nào hay dùng nhất rồi thay vào `POSE_VIEW_DATA`.

**Cập nhật 17/10/2026.** Việc suy góc trong TypeScript không qua kiểm tra nên để lọt một hàng ô hở dưới cằm ở mọi góc N và đầu lệch một cột ở SW/N. Chuyển toàn bộ phép suy sang `gen_pose_views.py`: script đọc thân S (kèm gốc lưới đầu và vùng áo quần) từ `DUMP`, suy các góc chưa vẽ tay, kiểm tra mọi hình (viền kín, ô lẻ, ô da hở, lỗ kín từ 3 ô; khe 1–2 ô giữa hai chi là ánh sáng lọt, cho phép) và ghi hết vào `POSE_VIEW_DATA`; `poseviews64.ts` chỉ đọc. Thân 3/4 vẽ tay cho cả sáu dáng ở góc SW (NW là mặt sau của nó, trừ khom lưng giữ bản NW có bướu); dáng lật dùng chung hình SW/NW của dáng gốc (cùng lý do với W) và có góc N riêng. Đầu có thể nằm sau thân (`headUnder`, lưng gù nhìn từ sau): `FormSpec.front` giữ các ô thân đứng trước mọi lớp vẽ, nên mũ và tóc bị bướu che đúng chỗ.

### D-054 Lint cầm bút pixel hiệu chỉnh theo ảnh mẫu, và skill vẽ pixel của dự án

Người dùng yêu cầu tìm thêm skill hỗ trợ vẽ pixel. Khảo sát: catalog plugin của tổ chức không có skill vẽ pixel; SpriteCook sinh sprite bằng AI ảnh (trái nguyên tắc 1, code quyết định pixel), Unity `2d-pixel-perfect` là cấu hình engine; hai skill mã nguồn mở `pixel-art` và `pixel-art-sprites` (omer-metin/skills-for-antigravity) chỉ nêu quy tắc chung (tắt AA, scale nguyên, hue-shift, selout, không pillow shading, thử silhouette, số khung animation) mà `docs/PIXEL_STYLE_REFERENCE.md` §3 đã có từ phép đo; luận văn "Pixel Fixer" (TU Delft 2025) cho định nghĩa đo được của banding (cặp đoạn tông thẳng hàng) và pillow shading (dải đồng tâm theo viền). Không nguồn nào thay được việc tự vẽ ma trận, nên phần đáng giữ là **định nghĩa lỗi đo được**: `scripts/research/pixel_lint.py` kiểm tra doubles (khối 2×2 viền trên silhouette), jaggies (bậc 2-1-2, 3-1-3, 1-2-1 trên silhouette), banding (hai dải cùng vật liệu khác tông, cùng độ dài ≥ 3, xếp thẳng hàng) và outline-band (dải 1 ô một tông ôm viền ≥ 7 ô với tông khác phía trong, tức "đường mờ"); pillow và ô mồ côi là tùy chọn vì ảnh mẫu dùng nhiều điểm nhấn 1–2 ô. Ngưỡng chỉnh sao cho mannequin chép từ ảnh mẫu không bị báo, nên mỗi cảnh báo là một chỗ ta vẽ khác tay nghề của mẫu. Lint là báo cáo để đọc (`pnpm qa:pixel`, và in trong `gen_pose_views.py`), không chặn build, vì có ngoại lệ chấp nhận: viền đôi nơi hai bộ phận chạm nhau (bàn tay chạm đùi, hai bàn chân, nách), tay ngang 2 ô ở góc W, dải 7 ô trên tay dài của dáng vươn/khom; quy ước là số cảnh báo không được tăng sau một lần sửa. Lint lộ ra lỗi hệ thống của các thân vẽ sau mẫu: vệt sáng/bóng của chi vẽ thành sọc dọc suốt chiều dài sát viền và các dải bằng nhau xếp chồng; sửa theo mẫu đo trên mannequin: sáng ở 3–4 hàng trên của bắp, khuỷu/gối trơn, cẳng tay một vệt ngắn, bóng sườn là cụm 2–3 ô. Quy tắc cầm bút, quy trình sinh–kiểm tra–xem ảnh và bảng lỗi đã bị người dùng bắt gom vào skill `.claude/skills/pixel-art/SKILL.md`; CLAUDE.md yêu cầu đọc skill trước khi sửa bất kỳ template nào.

### D-055 Dáng là mannequin được sửa, không phải thân vẽ lại; người khổng lồ giữ nét ở cỡ pixel

Người dùng nhận xét tạo hình nhân vật sai dù đã có form mẫu, và người khổng lồ phải vẽ chứ không scale. Nguyên nhân: các thân dáng zombie và thân to con được vẽ tay tự do nên tỉ lệ trôi khỏi mannequin (thân 9 ô thay vì 7, chân ngắn 1–3 hàng), còn hai người khổng lồ tuy "vẽ tay" nhưng chép mannequin theo tỉ lệ từng ô (mắt 3–4 ô, chân mày 3–4 ô, mảng sáng nhân lên), tức vẫn là scale. Quy tắc chốt: (1) **một dáng là mannequin cộng những gì dáng đó làm thay đổi** — thân 7 ô, tay 3 ô, chân 3 ô, đũng hàng 29, chân 11 hàng giữ nguyên; chỉ vai, tay, đầu và bàn chân di chuyển; khi một chi che lên thân hay đùi thì vẽ nó **trước** (nắm tay rủ trước hông của zombie gục đầu, tay buông trước mép đùi của zombie khom lưng), không nới thân để tránh chồng; đầu hạ xuống thì thân mất đúng từng ấy hàng, chân không ngắn đi; (2) **thể hình (mập, to con) lấy tỉ lệ từ form nhân hàng/cột đã duyệt**, bản vẽ tay chỉ sửa cách tô; (3) **người khổng lồ giữ silhouette theo tỉ lệ mannequin nhưng mọi nét ở cỡ pixel**: viền 1 ô, mắt 2–3 ô rộng, chân mày 2 ô, một đường ngón tay, một hàng đốt ngón, bóng là cụm đặt tay chứ không phải mảng nhân theo tỉ lệ; sinh từ `gen_giants.py` với khoá silhouette (đổi silhouette phải khai báo hàng) để thân Đột Biến ghép từ khổng lồ ×1,5 và các vùng áo quần không trôi. Các thân 3/4 và mặt sau vẽ tay cũng dựng trên mannequin của góc đó theo cùng quy tắc.

### D-056 Nghiệm thu bằng thước đo lấy từ ảnh mẫu, không bằng mắt người vẽ

Sau ba vòng sửa theo mắt (lint, tỉ lệ, khổng lồ) người dùng vẫn thấy chưa đạt. Kết luận: người vẽ không được tự chấm. Chuẩn là nhân vật mặc đồ của ảnh mẫu, đưa về 1× và đo bằng đúng hàm sẽ đo sprite của ta (`score.py`): số màu, số họ màu, số bậc sáng, mật độ và số đoạn nét bên trong, mảng phẳng lớn nhất, tỉ lệ sáng/tối của da và áo, cộng lint cầm bút và kiểm tra chéo silhouette/góc nhìn. Ngưỡng đạt là dải của mẫu nới ±10 điểm hoặc ±20–40 % (QUALITY_BAR §2); vector sáng chỉ ghi nhận vì trên cả hình nó không phân biệt được tốt xấu. Số đo của mẫu được commit (`reference_figure.json`) để chấm được mà không cần ảnh; ảnh mẫu vẫn không commit. Kèm theo là bảng 10 mục nghiệm thu bằng mắt, chấm cạnh ảnh mẫu cùng tỉ lệ, và quy ước: mọi lần sửa phải ghi số sprite đạt trước/sau, không báo xong khi số đạt không tăng. Hệ quả đã thấy ngay: định dạng ô 3 bậc không chạm được 5–6 bậc của mẫu và áo remap thừa hưởng mảng sáng của da; hai việc này là quyết định cấu trúc, ghi ở QUALITY_BAR §5 để chủ dự án chốt trước khi vẽ lại.

### D-057 Năm bậc sáng mỗi chất liệu; da giữ bước nhỏ, vải và tóc bước rộng

Thước đo (QUALITY_BAR §1) cho thấy áo và tóc của ảnh mẫu dùng 5–6 bậc sáng với bước rộng (áo: L 0,17 / 0,31 / 0,40 / 0,59 / 0,71) trong khi da chỉ 3 bậc bước nhỏ; định dạng ô 3 bậc của ta không thể tái tạo điều đó và người chấm độc lập gọi đây là "bậc tông rụt rè". Chủ dự án chốt mở rộng. Cách làm: `Shade` thêm 3 = sâu và 4 = chói (ba bậc cũ giữ nguyên số nên mọi template cũ không đổi nghĩa), ô đóng gói `vật liệu × 8 + bậc`, mỗi vật liệu thêm một cặp chữ (thường = sâu, hoa = chói); `buildRamp5` trong pixel-core suy bậc sâu từ bậc tối và bậc chói từ bậc sáng theo cùng hướng dịch hue; `buildPalette` nhận tuỳ chọn theo từng vật liệu và `HERO_RAMPS` cho da bước nhỏ đo trên mannequin, mọi vật liệu khác bước rộng đo trên áo mẫu (`HERO_CLOTH_RAMP_OPTIONS`). Mắt có hai bậc (`E` navy trên, `e` xanh dưới). Hệ quả: áo quần hiện có đổi độ tương phản ngay (sáng +0,16 thay vì +0,06); hai bậc mới chỉ có tác dụng khi template dùng tới, tức bước "cắt may" và vẽ lại tóc kế tiếp.

### D-058 Cắt may: áo quần được tô lại như vải, không thừa hưởng bóng của da

Phép đổi vật liệu (D-048) giữ nguyên bậc sáng của thân, nên áo mang mảng sáng ngực–bụng của da và gần như không có bóng (áo của ta: sáng 20 %, tối 17 %; áo mẫu: sáng 10 %, tối 40 %). `tailor64.ts` tô lại từng món sau remap theo hộp của chính món đó, tất định và giống nhau ở mọi dáng và góc: mọi ô về tông gốc (giữ bóng tiếp xúc sẵn có của thân), khối bóng là một hình có đường ranh bậc thang (hẹp ở ngực, rộng dần qua sườn và bụng, hai hàng gấu), mảng sáng 3×3 ở vai–ngực trái với hai ô chói ở mép vai, bóng sâu dưới nách xa và góc gấu, nếp gấp ngắn dưới ngực và ở eo, hàng khuy trắng giữa áo dài tay (chỉ ở góc nhìn thấy mặt trước), túi ngực cho quân phục, tay áo xa tối toàn bộ với vành gốc ở trên, tay áo gần có sáng đỉnh bắp và bóng tiếp xúc 2 ô, cổ tay sâu cho tay dài, quần có đùi gần sáng, chân xa tối hai cột ngoài, băng gối, ô sâu sát giày, giày có mũi sáng và đế sâu. Kết quả đo: áo sáng/tối trung vị 9,5 / 45,8 % (mẫu 10 / 40), số sprite rớt tiêu chí "áo tối" 118 → 35, số chất liệu nhìn thấy trung vị 4 → 5. Chưa đạt: mảng phẳng lớn nhất vẫn 11 % vì tóc một tông; lint tăng vì ranh bóng theo quy tắc tạo dải thẳng hàng; sẽ xử lý khi vẽ tóc có lọn và khi thêm gân/khoá cho từng kiểu áo.

### D-059 Tóc có lọn và ba tông trở lên; chất liệu tối giữ sàn cho bóng sâu và viền

Giám khảo độc lập (QUALITY_BAR §6, lỗi #2) chấm tóc của ta là "khối một màu có viền": 2 tông, không có lọn, mái không chờm lông mày; mẫu có 4 tông, lọn 2–3 ô rõ ràng, mái vắt chéo qua trán. Mọi kiểu tóc (ngắn, dựng, vuốt, bob, xoăn, dài, đuôi ngựa, rối) vẽ lại ở S và từng góc với cùng một quy tắc: mỗi lọn là dải 2–3 ô tông gốc mở đầu bằng một ô sáng ở phía nguồn sáng và kết thúc bằng một ô bóng (hoặc bóng sâu `j` ở khe giữa hai lọn), đỉnh sọ có 1–2 ô chói `J`, hàng mái chờm xuống hàng lông mày với mép răng cưa; tóc xoăn là các múi 3–4 ô (sáng góc trên–trái, bóng và khe sâu góc dưới–phải) chứ không phải ô sáng/tối xen kẽ từng ô (bản đầu đọc thành chấm rời, đúng lỗi #4 của giám khảo). Đo lại trên chất liệu tối lộ thêm một lỗi của dải màu: với nền tóc đen (L 0,34) bóng sâu rơi xuống 0,10 và viền (suy từ bóng sâu −0,12) thành đen tuyền 0,00, nên tóc đen là khối đen. Đo quần đen của mẫu: viền 0,00–0,13, mảng tối nhất 0,17–0,18, bóng 0,23, gốc 0,26, sáng 0,34, chói 0,45. Theo đó `buildRamp5` sàn bóng sâu ở L 0,17 (hoặc bóng −0,03 nếu bóng đã thấp hơn), `buildTintedLine` sàn viền ở 0,10; dải vải hạ `tintChroma` 0,02 → 0,012 vì tông sáng của màu xám trung tính ngả ô-liu trông bẩn trên tóc đen (sáng của quần xám mẫu là xám trung tính). Kết quả `qa:score`: đạt 0 → 2/130; rớt "mảng phẳng" 115 → 96, "chất liệu" 38 → 17, "đường nét" 18 → 13, mật độ nét 14 → 9; lint 128 cảnh báo không đổi; QA hero sạch.

### D-060 Tông nền của thước đo sáng/tối là tông gần trung vị, không phải tông dùng nhiều nhất

Sau cắt may, áo dài tay có khối bóng ≈ 48 % và tông gốc ≈ 42 %; lấy tông dùng nhiều nhất làm nền thì nền lật sang tông bóng và số đo đảo thành "sáng 50 % / tối 7 %" (34 sprite rớt "áo sáng" vì thế, không phải vì vẽ sai). Định nghĩa mới cho cả ảnh mẫu lẫn sprite của ta: nền = tông dùng nhiều nhất, nhưng nếu hai tông dùng nhiều nhất đều ≥ 25 % thì nền là tông (trong hai tông đó) gần độ sáng trung vị của các tông có mặt hơn, hoà thì lấy tông sáng hơn; như vậy khối bóng vượt 50 % hay mảng sáng rộng đều không lật số đo. Đo lại ảnh mẫu bằng định nghĩa mới cho đúng số cũ (da 17/25, áo 38/19: áo mẫu lấy tông tối làm nền thật vì tông giữa của nó dưới 25 %), nên `reference_figure.json` và ngưỡng giữ nguyên. Kết quả: đạt 2 → 4/130; rớt "áo sáng" 42 → 13, "áo tối" 54 → 21; da không đổi đáng kể (18/34, phần lớn là góc sau: gáy và tay thiếu bóng hoặc toàn bóng).

### D-061 Mảng phẳng đo theo từng chất liệu và loại viền ra; tóc tô bằng dải chéo 2 ô sinh tự động

Số `flatMax` toàn thân có hai lỗi: (1) với người mặc đồ tối, mảng "phẳng" lớn nhất là mạng viền (các màu viền tối gần nhau bị gộp) chứ không phải mảng tô nào; (2) một con số chung không phân biệt da trần với vải: đo lại mannequin mẫu cho mảng da lớn nhất 26,1 % số ô da (thân trần của mẫu cũng là một khối), còn người mặc đồ mẫu: da mặt 14,3 %, tóc 10,6 %, áo 17,4 %, quần đen 5,2 % (vỡ vụn vì nhiều tông gần đen). Thước mới: bỏ viền và nét khỏi mọi mảng; mỗi chất liệu đo riêng mảng cùng tông lớn nhất theo % số ô của chính nó; mảng ≤ 8 ô không tính; ngưỡng 1,3× số mẫu cùng loại (da trần khi da ≥ 40 % số ô; mọi món áo quần giày so với áo mẫu, vì quần mẫu vỡ vụn do màu chứ không do nét). Kết quả cho bức tranh thật thay cho "122/130 rớt một số gộp": rớt theo chất liệu — quần 93, áo 89, da 47, tóc 45, cloth2 25, giày 19. Tóc: vẽ tay lọn bằng chấm/vạch rời không chia được mảng gốc (mảng `h` 37 ô ở sọ Sơn), nên tông tóc nay do `scripts/research/lock_paint.py` + `apply_locks.py` sinh từ silhouette: dải chéo rộng 2 ô toả từ đỉnh sọ (độ nghiêng 0,5 ô/hàng), nửa sáng xen sáng/gốc, nửa tối xen gốc/bóng, dải ngoài cùng bên phải tối, một dải quét 1 ô (chói bên sáng, sâu bên tối) cắt ngang mọi lọn như vệt trắng trên mái của mẫu; hàng có khe (chỏm, mai) giữ nguyên nét. Dải 1 ô + mép (bản thử đầu) đọc thành vạch xước; dải 2 ô mới giống dải của mẫu. Đổi silhouette tóc thì chạy lại `apply_locks.py` rồi `gen_view_items.py`.

### D-062 Cấu trúc áo quần theo luật (nếp, ống, gối, đế) và lint phân biệt nét vẽ với bậc gradient

Thước D-061 chỉ ra áo quần của ta là khối: mảng gốc của áo thun Dương 34 ô, chân quần 15 ô một tông, mũ sắt 46 ô. Mẫu chia mỗi món thành mảng ≤ 20 ô bằng nếp và đường may, nên `tailor64.ts` thêm cấu trúc cùng một luật cho mọi dáng và góc: thân áo có hai nếp ngang kín bề rộng phía sáng (dưới ngực và ở 68 % chiều cao; ô đầu bắt sáng, phần trong khối bóng chuyển sâu từ ô sau đường ranh), mép xa của khối bóng chuyển sâu (so le từng hàng để không thành dải thẳng hàng); tay dài có nếp khuỷu; quần đọc từng ống (ống gần: sáng đỉnh đùi, cột bóng mé trong, nếp đùi và băng gối; ống xa: cột ngoài bóng, nếp đùi và băng gối sâu; gấu sâu; quần soóc bỏ nếp đùi, ống hẹp ≤ 2 ô bỏ cột bóng); giày có gót bóng, mũi sáng, đế sâu với ô mũi nhạt hơn một bậc. Luật giữ bóng của thân chỉ giữ bóng _tiếp xúc_ (ô bóng chạm ô ngoài món), không giữ nửa lưng tối của thân góc W, và góc W không tô tay áo hai lần (hai hộp tay trùng nhau vì tay xa khuất). Kiểu đầu đinh là remap sọ → tóc nên mang theo mảng sáng của sọ: thêm loại garment `hair` tô dải chéo (cùng số với `lock_paint.py`) trong không gian đầu (`Garment.space`, `tailor` nhận hàm ánh xạ nên đầu nghiêng vẫn có lọn thẳng). Mũ: mũ sắt thêm vành bóng hàng 4, mũ lưỡi trai đường may giữa, mũ nồi hai nếp; váy và đầm có ly dọc mỗi 3 ô; râu có sợi; gáy góc N/NW từ toàn bóng (phần dưới tóc của mẫu) thành gốc với bóng mé và dưới để đầu trọc/đội mũ nhìn từ sau có khối. Đường may: ô viền nào làm thành khối viền 2×2 (gấu áo gặp viền quần) thì đổi thành tông sâu của chất liệu nó che, quyết định sau khi đã đặt mọi lớp vẽ. Lint `banding` bỏ qua cặp dải khi một dải chỉ dày 1 ô và phía bên kia trở lại tông đầu (đó là nét nếp/đường may, không phải bậc gradient); thước "chất liệu" chấp nhận 2 họ cho nhân vật cởi trần (vải < 5 % số ô). Số đo: đạt 5 → 28/130; rớt lint 119 → 70, mảng phẳng quần 93 → 0, da 47 → 0, tóc 32 → 2, áo 39 → 10, cloth2 20 → 9; QA sạch; lint template 128 (không đổi).

### D-063 Lint chấm phần mặc thêm, không chấm lại thân đã chép từ mẫu

Thân mannequin chép đúng mẫu tự mang vài cảnh báo lint (khối viền 2×2 ở đũng và thắt lưng, bậc 1-2-1 ở thái dương), nên ngưỡng "lint ≤ 2" cho sprite mặc đồ không còn chỗ cho bất kỳ lớp nào. `hero-score-dump.ts` xuất thêm ASCII của thân trần (`baseRows`); scorer chấm `lintAdded = lint(sprite) − lint(thân)` ≤ 2: phần mặc thêm (áo quần, tóc, mũ, túi) không được thêm quá hai cảnh báo; cảnh báo của thân do `pnpm qa:pixel` giữ không tăng. Cùng bước: ô viền của lớp vẽ (tóc chạm vai, túi chạm gấu) nằm thành khối viền 2×2 với viền thân cũng đổi sang tông sâu của chính lớp đó (cùng luật với đường may, D-062); túi cứu thương lên một hàng để không đè gấu; vành mũ sắt lệch một ô so với hàng trên; gấu ống xa giữ ô bóng ngoài; gáy N/NW có mảng sáng 3 ô trên–trái và bớt bóng mé trái; mặt zombie có hai ô sáng gò má (lớp mặt từng xoá hết sáng của mặt gốc). Đạt 28 → 47/130; lintAdded rớt 30 → 22; da sáng rớt 23 → 15, da tối 26 → 22.

### D-064 Silhouette riêng bằng đạo cụ vẽ đủ 5 góc, không bằng đổi màu

Thước silhouette (1 − IoU < 0,08 ở góc S, cùng cỡ khung) báo 28 cặp nhân vật chỉ khác màu; nặng nhất là hai lính nón sắt giống hệt nhau (0,0). Cách gỡ: mỗi nhân vật chính mang một đạo cụ hợp vai, vẽ tay ở S, SW, W, NW, N theo cùng luật với thân: hình khép viền 1 ô (nòng súng 1 px là chính ô viền), phần khuất sau thân vẽ `under`, vật cầm cách viền tay một cột với ngón tay bắc qua để không thành khối viền 2×2, và không được tạo lỗ kín ≥ 3 ô giữa đạo cụ và thân (`qa:hero` bắt: nòng súng chạy dọc cạnh mặt rồi khép với vai là lỗ 8 ô; sửa bằng cách cho nòng khuất sau vai ở hàng 14–17 và báng ôm sát viền chân). Đợt 1 (lính): súng cầm đứng nghiêm bên tay phải (lính đầu đinh), súng đeo chéo lưng với dây qua ngực (lính nón sắt), túi cứu thương lớn treo ngoài hông phải trên dây chéo (quân y, thay túi nhỏ trong thân). Cặp trùng 28 → 12; đạt 47/130 giữ nguyên; QA sạch; lint template 128. Đợt 2 (dàn chính): Sơn có ba lô (nóc ló hai bên cổ vẽ `under`, hai dây qua ngực; từ sau là khối da thuộc 11 cột có nắp, dây giữa với khoá, đường may ngang) và gậy tựa vai phải (chéo 2:1 có viền, cán có viền ngoài và nắp; bỏ ở N/NW vì từ sau gậy khuất sau đầu và ba lô — bản N tạo lỗ kín 5 ô với mái tóc); Ông Tư có áo khoác kiểm lâm dài tới gối (tay rộng thêm một cột mỗi bên, vạt mở trước, xẻ sau); Bác sĩ Lan vạt blouse dài và rộng hơn một cột, bìa kẹp trắng kẹp kim loại ở tay trái; Ny tunic xuống dưới hông (treo dưới đường gấu áo thun để mảng áo không nối liền) và túi nhỏ ở hông phải. Mọi tấm vải mới sinh từ một hàm `panel()`: mép sáng 2 hàng, cột bóng đổi sang sâu từ hàng 3, nếp dọc mỗi 3 cột với độ dài so le (lint `banding` không bắt), gấu là hàng viền; ô viền của lớp vẽ đè lên viền thân (gấu áo khoác trên viền chân, viền ba lô cạnh viền tay) đổi sang tông sâu như đường may — luật này giờ áp cho mọi ô viền của lớp vẽ, kể cả hàng cuối. Kết quả: cặp trùng 12 → 2 (lính nón sắt ~ lính mũ nồi 0,066; cảnh sát zombie ~ Lính Nhiễm 0,022 — hai dáng lết giống nhau); đạt 47 → 53/130; QA sạch; lint template 128. Đợt 3: lính mũ nồi thêm hộp bản đồ da ở hông trái; cảnh sát zombie đổi sang dáng gục đầu lật (`POSE_DROOP_M`) — rồi lại trùng với VĐV nam cùng dáng (0,052) nên thêm dùi cui cạnh bàn tay buông và bao súng ở hông xa (ở N/NW đổi bên, góc W chỉ dùi cui phía gần); đỉnh gậy của Sơn ló sau vai ở N/NW (`under`) để diện tích SW/NW không lệch quá 8 %. Cặp trùng 2 → 0; đạt 53/130; QA sạch; lint template 128.

### D-065 Vết bẩn, rằn ri, mụn là hình 2–4 ô; rằn ri là vật liệu thứ hai, không phải bóng của áo

Giám khảo (QUALITY_BAR §6, lỗi #7–#9): máu, mụn, rằn ri là chấm 1–2 ô rải rác, đọc như bẩn hoặc lỗi nén; zombie lính hai cẳng tay trần là chất liệu sáng nhất sprite; gi-lê công nhân đổi hình theo hướng. Sửa: vết máu là giọt 2–3 ô (`'.DD....','..D....','......D','DD....D','D......','....DD.'`), mụn là cặp ô ở mọi góc, rằn ri là ô 3 ô trên lưới 6×4 (`CAMO_TILE`, không lệch hàng để không sinh ô lẻ) và vẽ bằng `cloth2` (xanh sẫm hơn của bảng quân đội) thay vì tông bóng của áo — bản tô bằng bóng đẩy "áo tối" của lính nữ lên 60 % và rớt thước; bản mật độ 33 % cũng vậy, nên giữ 25 %. Zombie lính đổi da sang xám trung tính (146,150,148; chroma 0,005 nên là họ xám riêng, không gộp với ô-liu của quân phục như bản xám-lục 152,150,138 làm "chất liệu" tụt còn 2). Dải phản quang gi-lê vẽ ở mọi góc: góc không có neo ngực lấy hàng từ hộp thân và thụt 2 ô để không cắt đường kẻ lưng thành ô viền lẻ. Đạt 53 → 58/130; QA sạch; lint template 128.

### D-066 Gáy nhìn từ sau: khối có sáng, không phải mảng bóng

Thân N/NW chép từ mẫu để phần sọ dưới tóc toàn bóng (mẫu có tóc che). Với người trọc, đội mũ hoặc đầu đinh, mảng đó lộ ra như một khối tối phẳng, và thước da góc sau rớt (sáng 5–8 %, tối 42–45 %). Sửa hàng 8–13 của đầu N và NW: nửa trên gáy về tông gốc, mảng sáng 5 ô ở trên–trái (hai hàng '$$' + một ô dưới), bóng giữ mé phải và hàng dưới cùng, hàng 13 chia 'ssSS' để thân mập (nhân cột) không sinh cặp dải 5 ô thẳng hàng. Thử thước "da so với thân trần của chính sprite" (tỉ lệ mẫu 0,70/0,96) nhưng bỏ: thân dáng zombie có bóng gốc rất ít nên mặt hốc mắt hợp lý lại bị phạt (đạt 58 → 49); giữ dải cố định của mẫu. Đạt 58 → 64/130; da sáng rớt 16 → 7; QA sạch; lint template 128.

### D-067 Giám khảo vòng 2 và các sửa mảng áo cuối

Biên bản ở QUALITY_BAR §7: 5/10, 6/10, 5/10, 5/9 — chưa đạt nhưng mắt, áo, góc ngang, góc sau, nhận diện đã đạt. Cùng bước: vành mũ sắt bắt đầu bằng một ô sáng (tách mảng gốc trên/dưới vành mà không thành cặp dải thẳng hàng), nếp của tấm vải chạy hết chiều cao (nét 1 ô trong mảng phẳng được lint miễn từ D-062, nên không cần so le nữa), dải sâu mép xa của thân áo để một ô bóng mỗi 4 hàng. Đạt 64 → 68/130; QA sạch; lint template 128. Thứ tự việc kế theo giám khảo: súng/gậy ở góc sau (B2, B3), mắt lính và zombie (B7, B10), nắm tay (B11), thắt lưng/gấu/đế (B12), tóc sẫm (B5), râu và ánh sáng Ông Tư (B6), Kẻ Thính/Kẻ Bám Trần (B9), rồi thân 45° (B1).

### D-068 Sửa theo giám khảo vòng 2: đạo cụ ở góc sau, mắt, cạp quần

B2: súng đeo lưng nhìn từ sau vẽ thân 2 ô (viền + nòng kim loại, viền + báng gỗ) thay vì một nét `o` chìm trong màu áo. B3: gậy của Sơn bỏ hẳn ở N/NW — mảng ló 3×4 là "khối rời", bản nghiêng ra ngoài tạo lỗ kín 5 ô với mái tóc và nóc ba lô, bản ngả ra sau đầu làm sprite N cao hơn S 4 hàng; từ sau gậy tựa trước vai khuất sau đầu là chấp nhận được, lệch diện tích SW/NW 8,4 % ghi nhận. B11: súng cầm đứng đặt sát viền tay, không còn khe và ngón tay 1 ô; cặp viền kề nhau do luật đường may đổi thành tông sâu của báng nên đọc là tay nắm. B7: mống mắt lính và Ông Tư đổi từ nâu xám mặc định (60,50,40) sang nâu bão hoà (150,80,40). B10: mắt zombie giữ lại lòng trắng vàng (hai ô sáng gò má ở D-063 đã vô tình đè lên) và mống đỏ sáng hơn (222,62,48); sáng gò má chuyển lên xương mày hai bên hốc mắt. B12: cạp quần sâu một hàng dưới đường gấu chỉ cho quần ≥ 8 hàng — ở quần 7 hàng của thân đứng và quần soóc nó đẩy "áo tối" của Kẻ Phun quá 55 % và làm rớt 2–3 sprite, nên dàn chính giữ đường gấu làm thắt lưng. Đạt 68/130 giữ nguyên; QA sạch; lint template 128.

### D-069 Tóc sẫm: lọn đọc theo chiều dài, không còn "nhiễu camo" (B5 của giám khảo vòng 2)

Ảnh ×12 xác nhận lời giám khảo: dải 2 ô xen sáng/gốc cộng dải quét chéo (D-061) trên tóc L 0,30 thành các mảng xám ô-liu rải trên nền đen, đọc như rằn ri; dải màu không phải thủ phạm (sáng 0,47 / gốc 0,31 / bóng 0,20 / sâu 0,17 / viền 0,10 đủ cách nhau) mà là pattern: mọi ô sáng đều rời nhau. Thử ba bản trước khi chốt: (1) lọn 3 ô `sáng–gốc–bóng` một ô mỗi cột → đan như vải dệt (mảng đều nhau nên mắt bắt lưới); (2) lọn 4 ô thân 2 ô → mảng `h` 14–15 ô, rớt mảng tóc 24–33 sprite; (3) bản chốt: lọn 3 ô = **một cột mép trên–trái + thân 2 ô**, đọc **theo chiều dài**: hai hàng đỉnh sáng, đoạn 1 (hàng 2–4) mép sáng/thân gốc, đoạn 2 (hàng 5–8) mép sáng/thân bóng, đoạn 3 (hàng ≥ 9, chỉ khối cao ở N/NW) mép gốc/thân sâu; phía bóng của quả cầu (nx + 0,5·ny > 0,6) mỗi cặp tối hơn một bậc, đoạn 3 đảo (mép sâu/thân bóng) để hai đoạn liền nhau không cùng tông. Ranh đoạn nằm ngang trên mọi lọn (thử so le từng lọn thì mép đoạn sau trùng tông thân đoạn trước của lọn kề và dính thành mảng 12–17 ô). Hàng có khe dưới khối (chỏm mái, mai, tóc rủ) nay cũng do script tô: mỗi đoạn ô liền là một lọn con (ô trái là mép), chỏm = gốc/bóng (phía bóng: bóng/sâu), tóc rủ đổi cặp mỗi 3 hàng, đoạn ≥ 4 ô (tóc sau gáy góc W) giữ hình học lọn của khối; ô đơn lấy tông mép (trước đây giữ nét cũ nên phụ thuộc lịch sử). Khối = dãy hàng đặc đầu tiên (≥ 3 ô liền) — bản đầu lấy dãy dài nhất nên ở góc W tóc dài tô phần sau gáy làm đỉnh. Cùng số trong `tailor64.ts` cho đầu đinh; mọi remap tóc của một lớp gộp thành một garment (góc W remap gáy riêng, tô riêng nó thành một "đỉnh" sáng sát viền sau đầu). Mái răng cưa: Sơn thêm mũi nhọn dưới chỏm trái và giữa hai mắt, Dương hai mũi ở hai đầu chân mày, Kẻ Bắt Chước lọn giữa 3-2-1 ô xuống tới hàng mắt; cùng hình ở SW.

**Viền không được đứt/dày vì tóc** (góp ý "lỗi đứt nét" trên ảnh lính đầu đinh góc W): hàng đáy khối tóc tô toàn sâu `j` (L 0,17) đè lên đường chân mày và sát viền sọ (L 0,10) nên viền ở trán đọc như dày 3 ô rồi đứt; ô sáng của "đỉnh" gáy sát viền sau đầu đọc như viền hở. Luật: hàng đáy = mép gốc, thân bóng, **một** ô sâu ở chỗ hai lọn gặp nhau; ô tóc sát viền (đầu/cuối hàng) không bao giờ tối hơn gốc ở phía sáng và không bao giờ sâu ở phía bóng (đúng quy tắc "không tô hàng/cột bóng sát viền trên tóc sẫm" của SKILL, nay do script giữ). Số đo: mảng tóc lớn nhất ≤ 10 ô ở S, ≤ 14 ở N/NW (≤ 11,7 % số ô tóc), không sprite nào rớt mảng tóc; QA sạch; lint tổng 95 → 95 (tổng cảnh báo hai lần chạy `qa:pixel`); 113 test. **Đạt 68 → 66/130**, và đây là con số thật: thước `lines`/`lineDens` đo trong không gian ảnh (ô tối L < 0,33 có ≥ 2 ô sáng kề) nên trên tóc sẫm nó đếm mép bóng/sâu của lọn là "nét trong" — `lines` đổi ở 46/130 sprite chỉ vì đổi tông tóc, Bác sĩ Lan góc N có `lineDens` 4,7 → 7,0 mà không thêm nét nào; ba sprite rớt mới (Bác sĩ Lan N/NW, zombie nữ thể thao W) trước đạt `lines` nhờ hàng `j` đáy tóc, tức nhờ chính lỗi đứt nét. Việc còn nợ: đếm nét từ chất liệu viền (`rows` đã có trong `measure`) thay vì theo độ tối, và đo lại mẫu cùng cách. Chưa chấm lại bằng giám khảo; làm sau khi xong B6/B9/B1.

### D-070 Ông Tư: tay áo khoác là luật nới (`letOut`), râu không còn là khẩu trang (B6 của giám khảo vòng 2)

Ảnh ×12 cho thấy ba lỗi: (1) râu là hộp chữ nhật viền kín với một vạch `o` ngang đủ bề rộng (đường miệng) → đọc như khẩu trang xám; (2) dải nới tay áo khoác là overlay tĩnh `oC`/`Co` vẽ cho thân S: ở hàng tay hẹp nó nằm ngoài viền tay thành viền đôi, ở góc SW nó rời hẳn khỏi tay (cột trống ở giữa, hàng 18–20), và chạy xuống cả hai hàng bàn tay; (3) "sáng đối xứng" của giám khảo chính là hai dải ấy. Sửa: **nới tay áo thành luật cắt may** — `Garment.letOut` (tay áo và vai của `Look.sleeves: 'wide'`): từng hàng, nếu ngoài ô mép của tay là viền rồi đến ô trống thì viền dời ra một cột, cột vừa trống lấy tông của ô mép (sáng ở đầu bắp tay phía sáng, bóng phía xa, sâu ở hàng cổ tay), và đóng viền trên/dưới chỗ chưa có gì; không nới ở góc W vì tay nằm trong thân (ngoài viền tay là vải ngực, không phải ô trống). Hai ngoại lệ đo bằng lint: hàng đầu của một garment không tự đóng viền phía trên (đóng ở đó tạo bậc 1-2-1 trên dốc vai; hàng dưới nối tiếp dùng ngay viền cũ của hàng trên), và không đóng viền nếu nó hoàn thành khối viền 2×2 (cổ áo gặp vai ở SW). Bỏ nới vai thì dốc vai S/SW/N/NW thành bậc 1-2-1 hoặc 2-1-2 ở chỗ khác, nên vai cũng nới (dốc 1-1-1 liền xuống tay). Hai overlay dải tĩnh của `RANGER_COAT`/`_BACK` bỏ; vạt áo giữ. **Râu** vẽ lại ở S/SW/W: ria 3 ô dưới mũi tách khỏi râu má bằng hai ô da ở khoé môi, vết miệng là khe sâu `jj` 2 ô (không phải đường `o`), râu rộng hơn hàm 1 ô rồi thu dần, chòm nhọn `HjH` rủ qua đường cổ áo vào khe cổ (viền `ooo` ở hàng 17); hai bên chòm để trống cho đường cổ áo tự làm viền (vẽ `o` đè lên đó thành khối 2×2 với viền đóng của tay áo ở SW). Góc W: râu ôm quai hàm từ mai (2 ô trước tai) ra cằm và vòng dưới hàm, hai ô cổ lộ ở khe sau. Số đo: đạt 66 → 66/130 (Ông Tư S và SW đạt; N/NW vẫn rớt `materials`/`lines` như trước); lint tổng 95; QA sạch; silhouette trùng 0; 113 test.

### D-071 Kẻ Thính và Kẻ Bám Trần nhất quán 8 hướng (B9 của giám khảo vòng 2)

**Tai to góc W/E**: lớp `BIG_EAR_W` cũ vẽ cái lá tai nằm gọn trong silhouette sọ, cùng màu da sọ, nên chỉ còn vài nét `o` trên đầu — "mất tai". Tai nay là lá nghiêng ra sau: gốc ở vị trí tai của đầu W, vươn 3 hàng trên đỉnh sọ và 2 cột ra sau gáy (canvas tự nới, `oy`), viền kín, vành `s` 2 ô phía trước/trên, lòng tai `S` phía sau–dưới (bản đầu lòng tai toàn `S` đẩy "da tối" của Kẻ Thính W lên 43,6 %). Thước nhất quán liền báo cao S 40 / W 44, nên tai S/SW/N/NW cũng vươn 3 hàng trên sọ (mũi 2 ô, thân lá ôm cạnh sọ như cũ); S 43 / W 44. **Kẻ Bám Trần**: thân S/SW (và N/NW suy ra) là dáng ngồi xổm 34 hàng (đầu lún 6 hàng, tay dài chạm đất), thân W là bò bốn chân 23 hàng — hai dáng khác nhau. Chọn vẽ lại W theo S (một thân thay vì bốn): thân W đứng với đầu hạ 6 hàng (cằm thành đường kín `full_chin`, vai ngay dưới), thân mất 6 hàng trên, tay gần dài từ vai trước, chéo xuống trước ngực rồi thẳng trước hông–đùi tới bàn tay vuốt (ngón tách bằng `o`) chạm đất trước bàn chân xa (che mũi chân xa; vuốt gần hơn), tay xa khuất; canvas 15 cột (tay trước mép). Vùng áo quần khai báo lại theo thân mới; vết bẩn 7 ô không vừa thân W nên W không có vết bẩn (như các dáng W khác). Số đo: đạt 66 → 67/130; lint tổng 95 → 92 (thân bò cũ có một viền đôi); QA sạch; lệch góc nhìn 2 → 1 (chỉ còn diện tích SW/NW của Sơn, D-068); 113 test.

### D-072 Thân 45° xoay thật (B1 của giám khảo vòng 2) và hai thước đo hết phụ thuộc may rủi

**Thân SW/NW** (`hero64.views.ts`): giám khảo đúng — SW là S dịch mặt. Theo đúng đơn của họ: vai xa thu 2 cột ở hàng cơ thang (hàng 15–16, dốc 1-1-1 xuống tay), tay xa còn **một** cột khuất sau thân (hàng 19–28) với nắm tay 2 cột ló ra ở hông (nắm tay rộng hơn cổ tay), bàn chân xa cao hơn một hàng (lùi xa; hộp giày/đế của `STAND_SW`/`STAND_NW` theo), mắt xa 1 ô mống không lòng trắng và cách viền một ô da, góc hàm xa thu vào cùng nhịp với cổ (SW hàng 14–15). NW là mặt sau của cùng tư thế: phía xa là mép phải màn hình, cùng ba thay đổi, thêm vệt sáng 2 ô ở cẳng tay gần (tay gần là tay được chiếu sáng ở góc sau). Phía xa = phía nào: quay 45° sang trái thì vai phải của nhân vật (mép trái màn hình) lùi ra sau, tai trái (mép phải) hiện ra — bản cũ đã đúng chiều, chỉ chưa đủ độ. Kéo theo: thân mập SW/NW suy từ thân SW bằng nhân cột ở giữa làm bậc 2 cột giữa hàng 16–17 thành ô hở nên vai xa chỉ thu 2 ở hàng 16 khi hàng 17 cũng theo (dốc đều); hai lọn tóc dài/rối ở SW thêm ô viền ở cột 3 vì góc hàm không còn che. Rộng thân S 17 / SW–NW 15 (tiêu chí 5 của QUALITY_BAR §3: ≥ 2 ô). Ảnh ×8 bốn góc của 9 nhân vật: thân đọc là quay 3/4.

**Thước `materials` đếm từ ô.** Số họ màu đo trong ảnh gom theo hue của ô _hạt giống_ (ô nhiều nhất của họ), nên cùng một sprite da và gỗ (hue 48 và 76, cách 28°) khi tách khi gộp tuỳ ô nào được đếm trước; họ "mắt" 14 ô cũng được tính là một chất liệu và rớt khỏi sàn 8 ô ngay khi mắt xa còn 1 ô — lính SW rớt `materials` chỉ vì thế. Với sprite của ta (có `rows`) nay đếm chất liệu từ ô: họ chất liệu có ≥ 2 % số ô, gộp khi màu trung bình không phân biệt được bằng mắt (hue trong 32° **và** L trong 0,2; xám gộp với xám theo L); mắt, lòng trắng, viền không phải chất liệu. Mẫu (không có `rows`) giữ cách đo trong ảnh (4). Thước mới trên thân cũ: 67 → 70 (Lính Nhiễm SW/W, cảnh sát zombie N/NW hết rớt oan; Kẻ Bám Trần W rớt thật: da–áo–quần tím xám cùng họ theo thiết kế).

**Da sáng ở góc sau.** Sàn 8 % lấy từ mặt trước của mẫu, nơi sáng da là mặt; góc N/NW không có mặt, sáng da chỉ còn mấy ô đầu bắp tay và nắm tay gần — bản cũ "đạt" nhờ cột sáng ở **tay xa** (sai hướng sáng, nay bỏ). Sàn cho N/NW = 4 %.

**Mũ nồi, lưỡi trai.** Khối bóng của mũ nồi 24 ô liền (31 % số ô mũ) từng lọt cổng vì cổng thứ hai tính theo số ô cả hình; thân nhỏ đi 20 ô là lộ. Mũ nồi S/SW/N/NW và W thêm nếp sâu `q` chéo qua khối bóng và một ô sâu cắt dải băng; lưỡi trai nhìn từ sau thêm đường may giữa (`K` nối hàng 1–4). Số đo cuối: **đạt 67 → 73/130** (HEAD cũ → nay; đổi thước +3, thân 45° +3 với mũ); lint tổng 92 → 89; QA sạch; silhouette trùng 0; lệch góc nhìn 1 (Sơn, D-068); 113 test. Còn rớt sau B1 có lý do: mũ nồi W 25,3 % (giảm từ 31,9).

### D-073 Chi tiết nhỏ nhất là 2 ô cùng tông; ô viền góc giày lấy màu viền của giày (B4, B8 của giám khảo vòng 3)

**Quy tắc ô lẻ.** Giám khảo vòng 3 đếm bằng script: một pixel mờ không có láng giềng-8 cùng màu và
lệch mọi láng giềng ≥ 0,18 L (OKLab) hoặc tự nó bão hoà (C ≥ 0,12) là "ô lẻ"; ở 1× nó đọc như nhiễu
máy. Từ nay một chi tiết (mụn, máu, khoá, phù hiệu, thẻ bài, điểm sáng đỉnh sọ, khớp gối, mắt cá,
đốt ngón, vết sẹo) không bao giờ là 1 ô một tông: tối thiểu 2 ô kề nhau cùng tông, ngang hoặc dọc.
Thước đo: `python3 -I scripts/research/lone_pixels.py all` (đọc kết quả `pnpm qa:score`), không được
tăng sau mỗi lần vẽ. Trước: 664 ô lẻ / 122 sprite; sau: 357 / 111.

**Đã đổi theo luật đó.** Đỉnh sọ: hàng 2 thành `oSS$$$$$SSo` để hai `S` hàng 1 có bạn chéo (S, N, SW,
NW, dáng, thân ×1,5; thân béo/nặng suy ra từ thân gốc). Vai trần `oSSs$$…$$sSSo` thay vì `S s S`.
Nắm tay `oSSsss`, hàng gối cuối `o$$so` (hàng duy nhất lộ dưới quần đùi), mắt cá `ooosso`, móng vuốt
Đột Biến hai hàng `S`, ngón chân `SS`. Mụn Kẻ Phun, nhọt Đột Biến, máu Kẻ Bắt Chước (cả W), sẹo da
đầu zombie: từng vết là cặp. Băng đô `**` trên–trái; khoá thắt lưng và phù hiệu `ww`; thẻ bài hai ô
`w`; cà vạt 3 ô sáng + 4 ô tối thay vì xen kẽ từng hàng; túi cứu thương xếp lại (sáng 2 ô trên–trái,
chữ thập ở giữa, đường may đậm hàng dưới cùng, không còn `a x A` so le); mép tối góc N của thân giữ
cột sáng liền thay vì `S o S`; thân béo W bỏ ba `S` đơn trên vai/bụng. Luật nếp áo đã sáng 2 ô
(hàng trước, cùng đợt): `x <= lit + 1`.

**B8.** `borderingMaterial` (paint.ts) trước chỉ nhìn vòng 1: ô viền ở góc đế giày W chỉ chạm viền
nên rơi về màu viền mặc định (28,24,36) — "dấu hiệu máy" giám khảo bắt trên 24/27 nhân vật. Nay
vòng 1 toàn viền thì nhìn vòng 2; sprite W không còn pixel màu đó ở 6 hàng đáy.

**Còn để lại, có chủ ý.** Giám khảo muốn thay vành `S` đỉnh đầu hói bằng một mảng sáng 3×2 lệch
trên–trái; dome `$` đã là mảng sáng lớn nên chỉ ghép vành thành cặp, việc vẽ lại dome 5 góc × 4 thân
gộp vào B1/B2. Ô thái dương (giữa viền lông mày và mắt) và ô tai khi tóc che hàng trên là thiết kế
mặt → B5. Mép tay áo rách / nếp tay áo của zombie dân thường, công nhân, thể thao → B2. Tóc Ny ở
N/NW → B1. Góc túi sau lưng Ny thành `r` do luật khối viền 2×2 (outfit64) — 2 ô/sprite, giữ.
Đạt 73 → 76/130, lint 89 → 89, QA sạch.

### D-074 Tóc là ba mảng chéo có đường lọn, chải bằng luật khi mặc (B1 của giám khảo vòng 3)

**Vì sao đổi.** Giám khảo vòng 3 đọc tóc D-069 là "lưới chu kỳ 3 cột, mái thẳng như mũ úp" — mỗi lọn 3 ô có
một cột mép sáng nên ở ×6 tóc đọc như mũ len. Ảnh mẫu (dựng lại ở 1×) dùng 5 tông thành ba mảng xuôi chéo:
mảng sáng trên–trái, mảng gốc, mảng tối ôm dưới–phải, với vài đường lọn sẫm chạy chéo giữa các mảng.

**Luật mới (`packages/sprite-kit/src/hair64.ts`, `combHair`).** Tóc chỉ được _vẽ silhouette_ một tông (`h`

- viền `o`) trong `cast64.ts` và `gen_view_items.py`; đầu đinh là silhouette sọ của từng góc (overlay, không
  còn remap). Khi `dress()` xong mọi lớp, mỗi mảng tóc (8-liên thông, ≥ 6 ô, không phải râu vẽ tay) được chải
  _trên hình đã mặc, trong không gian hình_ — nên đầu nghiêng (dịch hàng của dáng) vẫn ra mảng liền, điều mà tô
  sẵn trên literal không đảm bảo được. Luật: (1) trường sáng chạy từ trên–trái xuống dưới–phải, cắt theo
  phân vị thành 5 dải chói 10 % / sáng 25 % / gốc 33 % / tối 24 % / sâu 8 %, mỗi lọn lệch ±0,07 để ranh dải
  không thẳng hàng; (2) lọn toả từ ngôi lệch trái (góc W: ngôi sát mặt), rộng 4-4-5, quét 0,5 ô/hàng _ra
  ngoài_; cột xa của lọn là đường lọn, tối hơn một bậc so với dải tối hơn trong hai lọn nó ngăn, có ô góc ở
  mỗi bậc để đường liền 4-liên thông; (3) ô sát viền lấy tông thân của dải (không là đường lọn, không sâu);
  (4) ô lẻ lấy tông đa số láng giềng; (5) _mảng trước, nét sau_: vùng cùng tông vượt ngưỡng phẳng của thước
  (13 ô hay 12 % tóc, dưới cổng 13,8 % / 16 ô) bị cắt bằng một nét tông kề dọc lọn qua giữa, bất đắc dĩ
  mới cắt ngang; (6) chống bậc thang: hai dải cùng đầu cùng dài ≥ 3 ô kề nhau (luật `banding` của lint) thì
  dải sau nhường ô cuối; rồi cắt lại lần nữa. Vài ô viền tóc bị `dress()` đổi thành sâu (luật khối viền 2×2)
  giữ nguyên; mảng có > 20 % ô khác tông gốc (râu) không chải.

**Mái.** Hàng mái cuối của mọi kiểu (S và SW) mất ô 4–6: mép mái bên trái ngôi cao hơn bên phải một hàng
(đơn của giám khảo), lọn giữa hai mắt giữ nguyên; SWEPT góc SW khuyết lệch một ô để không lộ ô viền lông mày
đơn.

**Đã thử và bỏ.** Ba mảng phẳng không đường lọn: rớt `flat hair` 33/130 (vùng 20–50 ô). Đường lọn chéo 1 ô
không có ô góc: không ngăn được vùng 4-liên thông. Quét _vào_ ngôi (D-069): ở góc N thành chữ X. Lọn rộng
3-3-4-3 với đường lọn ở mọi lọn: mật độ nét 1/3 cột, lại "lưới". Tô sẵn bằng Python trên literal
(`lock_paint.py`, `apply_locks.py`, đã xoá): vỡ ở đầu nghiêng (zombie dân nữ 18,7 % phẳng).

**Số đo.** Đạt 76 → 77/130; `flat hair` 0 → 1 (zombie văn phòng @W, 14,x %); ô lẻ 357 → 338; lint cầm bút
89 → 89; `lintAdded` rớt 19 → 17; banding trên tóc (lint chạy trên ma trận ô) 40 → 1; QA sạch; 113 test.
`lineDens`/`lines` (đếm pixel tối mảnh trong ảnh) giảm trên 52 sprite vì tóc ít ô sâu hơn — thước này đo cả
sợi tóc tối, giữ nguyên để so với mẫu cùng cách đo.

### D-075 Áo quần có kết cấu: thắt lưng, cổ tay, băng gối, mảng sáng một khối, gấu (B2 của giám khảo vòng 3)

**Luật mới trong `tailor64.ts` / `build()`.** (1) _Mảng sáng áo_: một khối chữ L ở vai–ngực trái (khối 3×3

- đuôi 2 cột xuống ngực), ngân sách ≈ 12 % số ô món áo (6–16 ô), đổ khối trước rồi đuôi rồi hàng cuối của
  khối; góc sau chỉ giữ khối vai (≤ 9 ô) vì đuôi dọc tạo dải bằng nhau với cột bên cạnh. (2) _Nếp ngực_ bắt
  sáng 3 ô (2 ô thẳng hàng với đuôi sáng phía trên thành bậc thang), lùi còn 2 hoặc 0 khi hàng không đủ ô.
  (3) _Gấu_: hàng cuối trên đường may là dải sâu suốt bề rộng (khi hàng ≥ 3 ô). (4) _Thắt lưng_ (`belt`):
  chính hàng đường may đổi thành da giày (nâu sẫm của bảng `boots`, như màu giám khảo nêu) với khoá 2 ô sáng
  ở mặt trước. (5) _Cổ tay_ (`cuffs`): hàng cuối tay dài là vải 2 bóng (xanh sẫm của mũ/rằn ri) thay cho tông
  sâu của ống tay — tối hơn ống tay hơn một bậc, đúng "ngoài dải". (6) _Băng gối_ (`kneepads`): 2 ô sáng cạnh
  mép sáng mỗi ống quần ở hàng gối, chỉ khi ống ≥ 3 ô. (7) _Cổ áo thun_: chữ V 3+1 ô vải sâu dưới đường cổ ở
  S/SW. (8) _Thân trần_ vẫn kết thúc bằng đường cạp quần (seam suốt bề rộng thân). Lính (5), zombie quân đội,
  Lính Nhiễm nhận `belt`+`cuffs`+`kneepads`. Vết bẩn dời sang phải một cột để không đè lên ô sáng của nếp.

**Thân trần vẽ lại** (mannequin S + khung đi, SW, khổng lồ ×1,5): bỏ dải sáng bụng, thêm khối sáng 3×3 ở
ngực trái (đuôi 2 cột 3 hàng) và khối tối 3×4 ở sườn phải, hai hàng dưới bụng tối bên phải; cổ giữ bóng
dưới cằm (`SSsSS`, `SsS`); khổng lồ: khối sáng 4×4 ngực trái, khối tối 3 ô rộng dưới tay phải, hàng cuối
của khối lùi một ô để không xếp dải bằng với hàng cơ bụng. Chỉ hiện trên người cởi trần (Kẻ Phun, Hùng,
Kẻ Mang Vỏ, Đột Biến); người mặc áo được `tailor` tô đè. NW/N/W và các dáng zombie giữ thân cũ.

**Đã thử và bỏ.** Cạp quần sâu cho mọi quần (Kẻ Phun quần tối 64 % > 55 %); đuôi sáng đầy đủ ở góc sau
(banding cột); nếp bắt sáng 2 ô cùng đuôi sáng (bậc thang hàng); cổ tay vải 2 gốc và thắt lưng da sáng (thước
`lines` đếm vạch tối: mất một vạch, zombie quân đội @W rớt — vẫn rớt với nâu sẫm vì cổ tay nhập với vạch khác,
chấp nhận 1 sprite); vết bẩn hạ một hàng hay đảo thứ tự hàng (ô viền lẻ ở Kẻ Bám Trần/Kẻ Thính góc sau).

**Số đo.** Đạt 77 → 80/130 (được: Kẻ Phun @S, Lính nón sắt @N/NW, thể thao @S/W; mất: zombie quân đội @W
`lines`); ô lẻ 338 → 340 (2 ô da mép bụng Kẻ Phun cạnh cạp quần mới, hộp thân không phủ hết bụng béo); lint
cầm bút 89 → 89; QA sạch; 113 test.

### D-076 Mắt góc W, mắt zombie, mắt Đột Biến (B5 của giám khảo vòng 3)

**Góc W (mọi nhân vật, `hero64.frames.ts`):** mống 3 ô dọc giữ nguyên, trắng chỉ còn **một ô** thấp phía sau
mống (hàng dưới cùng của mống, cột trong); ba ô trắng cũ (cột trắng suốt chiều cao + ô má) về da. Ông Tư
đội mũ vành nên mống trong profile mất ô trên; lớp `BRIM_EYE_V` thêm ô mống dưới để mắt vẫn 3 ô.

**Mặt zombie (`ZOMBIE_FACE`, `ZFACE_SW`):** hai ô `$` "xương mày bắt sáng" nằm sát cột mống nên giám khảo đọc
thành cột nhạt 3 ô; dời lên hàng thái dương (S: hai bên, cách mắt 2 cột; SW: cặp ô ở thái dương gần) — vẫn
giữ sáng da cho thước `skin hl` (bỏ hẳn thì zombie cảnh sát/công nhân rớt 6,7 %).

**Đột Biến:** bỏ mắt lồi 3×3 (overlay `BRUTE_EYE`); cả hai mắt là cùng một mô-đun vẽ trong thân khổng lồ
(`gen_giants.py` S, `gen_pose_views.py` SW/W): khối đỏ 2×2 + một ô trắng ở góc trên–ngoài, không viền hốc
mắt; góc lật không còn đổi bên mắt to.

**Kẻ Phun góc SW:** mắt gần từng rộng 3 ô vì dải nhân cột của thân mập nhân cột giữa (chính là cột mắt gần
của đầu 3/4); đầu SW/NW nay nhân cột 7 (giữa hai mắt) bằng `FAT_BANDS_Q`.

**Số đo.** Đạt 80 → 82/130 (được zombie cảnh sát @S/SW; mất Kẻ Thính @N và zombie quân đội @W ở thước
`lines` — ít ô tối mảnh hơn khi bớt trắng/viền hốc mắt); ô lẻ 340 → 332; lint cầm bút 89; QA sạch; 113 test.

### D-077 Zombie và thể hình lớn xoay 45°, một dáng một tư thế (B3 của giám khảo vòng 3)

**Bàn chân xa lùi một hàng ở mọi thân 3/4** (`gen_pose_views.py`, `raise_far_foot` trong `add()` cho SW):
khối giày xa (cột đọc từ hàng đế, bên trái khe giữa hai chân, hàng theo hộp `shoeL`) dời lên một hàng đè lên
hàng cuối của ống chân; hộp `shoeL`/`flats` theo. Áp cho gục đầu, vươn tay, lết chân, khom, ngoẹo cổ, to con,
khổng lồ (bò không có chân đứng; mập đã suy từ thân SW gốc nên có sẵn). Đo lại: bàn chân trái kết thúc cao
hơn bàn chân phải một hàng ở 13/13 thân đứng góc SW.

**Dáng vươn tay = một tư thế.** S và SW từng là tay buông (thật ra là cẳng tay vươn ra trước vẽ thành khối
5 ô bên sườn), còn W tay duỗi thẳng — giám khảo đọc là hai tư thế. Theo đơn của họ: S/SW vẽ cánh tay vươn
về phía người xem = ống tay ngắn cạnh ngực rồi **nắm tay 3×3 trước ngực** (mép đè lên viền thân), bóng 2 ô
ở hàng dưới; W giữ tay duỗi. Hộp tay áo rút còn hai hàng, nắm tay là da (trừ khỏi hộp thân qua `neck`),
vết chém dời lên nắm tay, vết bẩn dời lên hàng 24 (dưới hàng nếp, trên gấu và viền đũng). Góc SW: vai xa,
cánh tay xa và nắm tay xa lùi vào một cột, nắm tay xa 2 ô (thân hẹp hơn S một cột; thước bề rộng còn đếm
cả mũ cứng/tai to nên không thấy).

**Số đo.** Đạt 82 → 83/130; ô lẻ 332 → 335 (3 ô: nắm tay/vết bẩn mới); lint cầm bút 89 → 82 (bỏ các cột
tay cũ); QA sạch; 113 test. Chưa làm: hộp thân zombie góc SW chưa cắt 2 cột cho các dáng khác (đã hẹp 1).

### D-078 Chấm lẻ hệ thống thành luật (B2 của giám khảo vòng 4)

**Nguồn của từng loại ô lẻ** (soi bằng cách khớp ảnh ×1 của giám khảo vào `sprites.json`): (a) hai chấm chói
X·X trên vai mọi áo = ô chói cố định của tailor ở (x0+1, y0+1), (x0+2, y0+1) — ô thứ hai rơi vào cổ áo — cộng
ô chói đơn ở đỉnh vai áo và ống tay; (b) "rằn ri vẽ bằng ô đơn" thật ra là ô sâu `v` của luật mép xa (so le 2
hàng, bỏ hàng thứ 4) rơi trên cột bóng rộng 1 ô, và `y` sâu lẻ của quần; (c) "lỗ lục" ở cổ sau bốn zombie =
ô đường may đổi sang tông sâu của da (D-063) tại góc không còn ô da nào kề; (d) "màu dùng một lần" = ô viền
lấy màu viền của vật liệu kề (nắp quai 1 ô của Sơn, viền cạnh mụn 2 ô của Kẻ Phun, viền đũng cạnh rằn ri);
(e) góc túi Ny thành `r` sâu cùng cơ chế (c).

**Luật mới.** `tailor64`: viền chói là **cặp 2 ô kề nhau** trên hàng y0+1 (ngang từ mép sáng; dọc theo mép
sáng khi thân chỉ còn một cột cạnh ba lô), không còn ô chói đơn ở ống tay; trước khi ghi, ô sâu/sáng/chói
**không có ô cùng tông kề 4 trong món thì lùi một bậc** (sâu→bóng, chói→sáng, sáng→gốc); cổ tay lấy thêm
hàng trên khi hàng cuối chỉ còn 1 ô mà hàng trên rộng ≥ 2 (tay sáng, bị túi che); khối sáng góc sau 3-3-2
thay cho 3×3 (cạnh khối vuông là dải bằng nhau cạnh cột gốc → `banding`). `dress()`: ô đường may đổi sang
sâu mà là **da hoặc vật liệu điểm nhấn** và không có ô cùng giá trị kề 8 → nở vào ô bóng/gốc cùng vật liệu
kề 4, không có thì giữ viền (viền đôi chỗ hai bộ phận chạm là lỗi nhẹ hơn); vải và tóc giữ như cũ (sâu cạnh
viền là tối trên tối). Pass cuối `fixLoneCells`: ô vải không có ô cùng vật liệu quanh và bị ≥ 3 ô của một vật
liệu vải khác bao → nhận tông phổ biến của vật liệu đó (chấm rằn ri rời, `v` kẹt giữa đốm); ô chói không có ô
cùng giá trị kề → sáng, không có sáng kề → gốc; **da không bao giờ bị nuốt hay nuốt** (da lộ qua áo là cổ hở
hoặc lỗ rách). `paint.ts`: ô viền không trùng màu với ô nào kề → lấy màu phổ biến của các ô viền kề (hoà thì
tối hơn). `cast64`: thẻ bài hạ một hàng (hàng đầu dải cổ V nguyên vẹn), vết loét Lính Nhiễm thành cặp 2 ô.
`lone_pixels.py` thêm chế độ `strict` = đúng luật giám khảo vòng 4 (mọi ô, kể cả viền, không có ô cùng màu
kề 8; trừ mắt/răng).

**Đã thử và bỏ.** Nở mọi ô lẻ kể cả bóng 1 ô của thân (gót giày `B`, ống quần `PpP`, bậc da ở cổ) → đạt 83 →
65–79, vì đổi hình bóng mannequin và tạo banding; đóng "lỗ kim" bằng viền → tai góc sau thành khối viền
đôi; gấu quần toàn tông sâu → banding với hàng trên; cổ tay 2 hàng cho mọi tay dài → Sơn @SW rớt `cloth
sh` 55,3 %; đổi tông tai góc sau (`$` → `s`/`S`) → ba lính @N rớt `skin sh`. Giữ nguyên tai.

**Số đo.** Đạt 83 → 83/130 (mất zombie dân thường nam @N: `skin sh` 10,5 % vì ô sâu lẻ ở góc cổ áo từng
được đếm là bóng da; được Lính Nhiễm @N nhờ khối sáng bậc thang); ô lẻ (thước D-073) 335 → 310; ô lẻ
`strict` 2748 → 1691; lint cầm bút 82; QA sạch; 113 test. Còn lại: ô da 1 ô kẹp giữa viền (tai, bàn tay một
cột — 137 `S`, 58 `s`, 38 `$` theo thước D-073) là thiết kế thân, chỉ sửa được bằng vẽ lại bộ phận; cổ tay
1 ô của lính mũ nồi @S (hộp bản đồ che cả hàng trên).

### D-079 Phụ kiện có mặt ở mọi hướng thấy được (B3 của giám khảo vòng 4)

**Dây túi của Ny** chỉ có ở S/SW (lớp `MEDIC_BAG[0]`); N/NW thêm `STRAP_BACK` (vai phải — bên trái màn hình —
chéo qua lưng xuống hông, như dây túi quân y ở `BAG_N`), W thêm đoạn 3 ô chéo trên bắp tay gần (7,18)→(9,20)
theo đơn của giám khảo (đè lên viền tay: dây nằm trước mép tay), dùng chung cho túi quân y (`SATCHEL_W`).

**Gậy của Sơn ở N/NW**: D-068 từng bỏ hẳn vì bản nghiêng ra tạo lỗ kín 5 ô với tóc và nóc ba lô. Lật đúng
gậy của S qua trục thân (gốc x = −4, tựa trên vai phải, nghiêng ra ngoài qua đầu) thì lỗ kín ấy lại xuất
hiện — nguyên nhân là **nóc ba lô góc sau chỉ rộng 11 ô trong khi mặt trước 15 ô** (cùng một vật). Nóc ba
lô N nay rộng 15 như S (`BACKPACK_N`), NW hẹp hơn một cột phía xa (`BACKPACK_NW`), tô sáng trên–trái / bóng
dưới–phải 2-3-5 ô (nóc phẳng 13×3 đẩy `flat leather` của Sơn @N lên 22,9 %); gậy vẽ trước nóc nên khuất
sau nóc và ló ra ở vai; chỉ còn khe 1 ô như ở S. Lệch diện tích SW/NW của Sơn (ghi nhận từ D-068) hết: thước
nhất quán 1 → 0.

**Nòng súng đeo lưng (lính nón sắt) ở N/NW**: `RIFLE_SLUNG_N` thêm nòng = cột viền 1 ô lật từ S (x = −1
hàng 5–7, x = 0 hàng 8–16) bên trái mũ sắt; thân súng chéo và báng giữ nguyên.

**Dải phản quang công nhân**: hàng dải từng tính theo neo ngực (S: 26 và 29 — hàng 29 là hàng quần; N: 21 và
24; W: 22 và 25) nên trước/sau/bên khác nhau và vết máu vẽ sau cắt dải thành ô `w` rời. Nay dải ở `hemY − 3`
và `hemY − 1` (25 và 27) cùng bề rộng ở mọi góc, vẽ sau vết máu (`details` của công nhân đổi thứ tự), vết
chém dời lên trên dải khi trang phục có dải (`min(gash.y, hemY − 6)`).

**Góc lớp vẽ trên viền thân** (túi Ny, túi quân y): ô viền của lớp vẽ đè viền thân đổi sang tông sâu rồi
"nở" (D-078) đã ăn mất ô sáng góc túi (`oorrao`); nay góc lớp vẽ lẻ quay về viền (chấp nhận viền đôi tại chỗ
túi chạm thân), chỉ đường may (cổ áo trên da) mới nở.

**Số đo.** Đạt 83/130 giữ nguyên; ô lẻ 310 → 302; `strict` 1691 → 1688; lệch góc nhìn 1 → 0; lint 82; QA
sạch; 113 test.

### D-080 Mắt Kẻ Bắt Chước và Đột Biến theo công thức chung (B4 của giám khảo vòng 4)

Hai chỗ duy nhất giám khảo đọc là "điểm/khối" thay vì "mắt được vẽ": Kẻ Bắt Chước mắt 1 ô đỏ giữa hốc
3×3, Đột Biến khối 2×2 một tông với ô trắng góc trên–ngoài (D-076). Cả hai nay dùng đúng mô-đun của thân:
cột mống 3 ô tối-trên (`E E e`), hai ô trắng phía ngoài ở hai hàng dưới; SW mắt xa chỉ còn cột mống; W cột
mống + một ô trắng thấp phía sau.

**Kẻ Bắt Chước** (`SUNKEN_EYES`, `SUNKEN_SW/W`): hốc mắt giữ bằng ô bóng ở góc trên–ngoài và dọc mé trong mỗi
cột mống (`SES.SES / xES.SEx / xe...ex`), lọn tóc giữa hai mắt giữ nguyên; SW góc ngoài mắt gần để tông gốc
(ô `S` ở đó sẽ lẻ); W bóng hốc là cặp dọc sau mống.

**Đột Biến** (`gen_giants.py` GIANT15 hàng 12–15, `gen_pose_views.py` BRUTE_SW hàng 12–15 và BRUTE_W hàng
10–13): chân mày 2 ô bóng trên mỗi mắt, cột mống 3 hàng ở cột trong của khối cũ, trắng ở cột ngoài hai
hàng dưới, bỏ ô trắng góc trên–ngoài; SW mắt xa (trái) chỉ cột mống; W mống 3 ô + trắng thấp phía sau.
Khổng lồ ×1,5 giữ "mắt 2–3 ô" của D-055.

**Số đo.** Đạt 83/130 giữ nguyên; ô lẻ 302 → 303 (ô bóng góc hốc mắt Kẻ Bắt Chước); `strict` 1690; QA sạch;
lint 82; 113 test.

### D-081 Mặt thường có miệng, mày đầu đinh nâu (B5 của giám khảo vòng 4)

Dưới vành mũ sắt/mũ nồi chỉ còn hai mắt và mảng sáng cằm; ảnh mẫu có nét miệng nâu 3 ô. Mọi `Look` mặt
thường (`face: 'plain'`) nay có **miệng 2 ô viền** (`MOUTH_V`): S (7,12)–(8,12) dưới mảng sáng cằm, SW
(6,12)–(7,12) lệch về má gần, W (3,12)–(4,12) là khía vào mép mặt; góc sau không có. Ô viền lấy màu viền
của da (nâu, cùng màu chân mày) nên đọc là nét vẽ chứ không phải lỗ. Tắt bằng `mouth: false` cho Kẻ Bắt
Chước (nụ cười riêng), Đột Biến (răng vẽ trong thân) và Kẻ Phun (đầu mập nhân cột giữa tách miệng thành hai
ô viền lẻ — `qa:hero` bắt); râu Ông Tư vẽ sau nên che miệng chung.

**Mày lính đầu đinh**: hai ô mày đều có nhưng ô trong kề tóc nên lấy màu viền tóc (gần đen) — giám khảo đọc
là "mày 1 ô + chấm đen". Chân tóc đầu đinh ở S/SW lên một hàng (`BUZZ_BOXES` hàng 0–6), trán lộ một hàng
da, mày tiếp giáp da ba phía → nâu cả cặp; W giữ nguyên (cả hai ô mày đều kề tóc nên cùng màu; rút ngắn
khối tóc W làm mảng tóc phẳng 19 % và rớt một sprite).

**Số đo.** Đạt 83/130 giữ nguyên; ô lẻ 303 → 302; `strict` 1686; QA sạch; lint 82; 113 test.

### D-082 Bậc sáng trên áo trắng và quần chân rộng (B6 của giám khảo vòng 4)

**Áo gần trắng không có bậc sáng**: ramp vải cộng +0,16 L cho ô sáng, nhưng gốc L ≈ 0,93 bị kẹp ở trần
gam nên áo Lan chỉ sáng +8 L\*, áo zombie văn phòng +4, váy Kẻ Bắt Chước +11. Không đổi ramp (các áo khác
đúng); hạ tông gốc của ba món theo đơn: Lan (228,226,220) → (212,210,204), văn phòng (236,236,232) →
(214,214,210), Kẻ Bắt Chước (226,216,196) → (214,203,182) cho cả `cloth` và `cloth2`. Quy tắc rút ra:
**vải "trắng" đặt ở L\* ≤ 85** để còn chỗ cho bậc sáng; Kẻ Bắt Chước nhờ vậy cũng đủ 3 vật liệu theo thước.

**Quần chân rộng** (`tailor64` pants): khối sáng đùi gần tỉ lệ theo chân — rộng `max(2, round(legW/2))`,
sâu `min(4, max(2, round(h/3)))` (chân gốc vẫn 2×2; Đột Biến 3×4; Kẻ Phun 3×2); chân xa rộng ≥ 5 ô có khối
sáng 2×2 ở mé trong (phía sáng). Chân rộng **và dài** (legW ≥ 5, h ≥ 8 — khổng lồ) có bóng 2 ô: cột tiếp xúc
mé trong chân gần rộng 2 dưới gối, mép ngoài chân xa rộng 2 suốt ống, cột tiếp xúc mé trong chân xa (phía
sáng) về gốc. Thử áp bóng 2 ô cho cả quần ngắn chân rộng (Kẻ Phun, h = 7) → bóng vải 55,6–58,3 % ở 4 góc,
rớt 4 sprite → giới hạn h ≥ 8.

**Mai Kẻ Mang Vỏ**: dải sáng mép trên–trái của khối mai (`SHELL_HUMP`) rộng 2 ô ở các hàng 2–7, 1 ô ở
hàng 8–9 (sáng mai 6,5 → 10,9 %).

**Không làm** hai mục còn lại của B6: zombie cảnh sát (sáng 7 → 11 %) và công nhân (27 → 19 %) đều qua
ngưỡng 5–45 %; đơn thuốc sửa từng ô đầu nếp của luật chung không áp được cho một nhân vật.

**Số đo.** Đạt 83 → 85/130 (được Đột Biến @SW/@W: sáng quần 2,6 → 10,5 %); ô lẻ 302 → 299; `strict`
1686; QA sạch; lint 82; 113 test.

### D-083 Góc 45° xoay thật: lõi thân 6 ô (B1 của giám khảo vòng 4)

D-072/D-077 thu vai xa 2 cột, tay xa 1 cột, chân xa lùi, mắt xa 1 ô — nhưng **lõi thân vẫn 7 ô như S** và
vai chỉ 15 → 14, nên giám khảo đo "SW/NW chỉ là S dịch tay". Theo đơn: lõi thân mất **một cột gốc phía xa**
từ hàng đỉnh thân đến gấu (7 → 6), vai xa mất một ô (15 → 13), mọi thứ ngoài phía xa (tay xa, viền) dồn vào
một cột; cổ, mảng sáng ngực, phía gần giữ nguyên. Hàng tay 17 → 15, hàng thân 17 → 14.

**Luật `narrow_torso`** (`gen_pose_views.py`, áp cho dáng SW gục đầu, vươn tay, lết chân, khom, ngoẹo cổ;
NW suy từ SW nên theo luôn): ở các hàng vai bỏ mũi vai xa (ô thân đầu tiên trong hộp thân); dưới vai bỏ một ô
gốc `s` có ô gốc kề (giữ mảng sáng `$$` và mảng bóng nguyên khối), không có thì ô trong dải ≥ 3 cùng tông, rồi
ô gốc bất kỳ, rồi ô thân đầu tiên; không bao giờ ô trong hộp cổ (nắm tay của dáng vươn tay nằm trong hộp thân
như ngoại lệ cổ); hàng có dưới 4 ô ứng viên (cuống cổ dưới đầu hạ) để yên — xoá nó làm cằm hở da. Hộp vai xa
và tay xa dời vào một cột vô điều kiện (hàng đỉnh hộp vai có thể không nằm trong các hàng đã thu — lỗi đầu
làm zombie dân thường @NW lộ một cột da ở vai); hộp thân, gấu, cổ áo, mỏ neo (ngực, số, cà vạt, khoá, vết
bẩn, vết chém) dời theo ô đã xoá của đúng hàng ấy. Thân bò (Kẻ Bám Trần) không áp: thân khuất sau tay và đã
hẹp sẵn một cột. Thân mập suy từ khung SW nên hẹp theo; to con và khổng lồ giám khảo đã chấp nhận bề rộng.

**Khung đứng** (`hero64.views.ts` `HERO_SW/NW_FIGURE` hàng 15–28) tính bằng cùng luật rồi ghi tay; vùng
`STAND_SW/NW` (`views64.ts`) khai báo lại: thân [5,15,12,28] / [4,15,11,28], vai xa [3,15,4,18] /
[12,15,13,18], tay xa [2,18,5,·] / [11,18,14,·], gấu [6,28,11,28] / [5,28,10,28]. Mảng sáng ngực SW so le
(hàng thứ ba 1 ô) vì khối 2×3 vuông cạnh cột gốc cùng chiều cao là `banding` (khung và thân gục đầu).

**Áo trên thân quay** (`Garment.turned`, bật cho SW/NW): thân mất một cột **phía sáng** nên tỉ lệ bóng áo
vọt (Dương @SW 56,8 %, Sơn 58,1 %); đường ranh bóng của thân lùi một cột về phía gần → 50–54 %. Ba lô góc
NW: thân ba lô hẹp một cột phía xa theo lưng (đang che bàn tay xa của Sơn).

**Chưa làm theo đơn:** hạ vai xa một hàng (vai đã 13 ô nhờ bỏ mũi vai); mũ sắt zombie quân đội ở SW vẫn
là vòm đối xứng như S (vòm tròn nhìn từ 45° không khác; ô nhạt cạnh mắt xa giám khảo nêu đã hết từ D-078).

**Số đo.** Đạt 85 → 84/130 (mất Kẻ Thính @NW ở thước ảnh `lines`/`lineDens`: cột bóng 1 ô ôm viền phía xa
từng được đếm là một nét; so với nền 83 vẫn +1); ô lẻ 299 → 288; `strict` 1651; lint cầm bút 82 → 80 (hết
bậc 4-1-4 ở hông SW/NW của khung và dáng vươn tay, thêm một bậc ở cuống cổ dáng lết); lệch góc nhìn 0; QA
sạch; `problems: 0`; 113 test.

### D-084 Mặt nghiêng của zombie văn phòng và Đột Biến (B7 của giám khảo vòng 4)

**Zombie văn phòng @W** (dáng ngoẹo cổ): góc W từng ghép **đầu SW** lên thân nghiêng ("đầu trượt về vai gần"
đọc từ bên hông thành mặt quay về người xem), còn tóc và miệng là lớp vẽ cho đầu W — kết quả là mép mặt phẳng
hai cột viền, mắt xa dán sát mép, mắt gần ở chỗ tai, không mũi. Nay dáng ngoẹo cổ dùng **đầu W** như mọi dáng
khác (vẫn nghiêng một cột từ hàng 5), hàng cuống cổ của thân vẽ lại như dáng lết (đầu W tự có hàng cổ); mặt
nghiêng có cột mống 3 ô + một ô trắng thấp, bướu mũi, răng.

**Đột Biến @W**: trán ở cột 1, hàm nhô ra cột 0 nhưng không có mũi → bướu mũi 2 hàng ở cột 0 (hàng 13–14), hàm
lùi về cột 1 (hàng 15–16) như đầu W gốc; vuốt gần: vạch ngón kéo liền từ hàng 45 tới đầu móng (một hàng đốt
ngón rời thành hai ô viền lẻ, script từ chối ghi).

**Số đo.** Đạt 84/130 giữ nguyên; ô lẻ 288 → 286; `strict` 1646; lint 80; QA sạch; `problems: 0`; 113 test.

### D-085 Tóc lính: đuôi tóc có tông, đầu đinh chải thành mảng (B8 của giám khảo vòng 4)

**Lính nữ.** Hai cụm tóc hai bên mũ mềm dài thêm một hàng (`hhH` / `Hh` ở S và SW), đuôi tóc tô tay bốn
tông: cột sáng `#` ở đỉnh, `H` giữa, khe sâu `j` hai hàng dưới (mảng tô tay nên `combHair` giữ nguyên).
Zombie VĐV nữ dùng cùng đuôi.

**Đầu đinh.** Giám khảo kê ba mảng (sáng 3×2 trên–trái, gốc, tối hai hàng dưới–phải, chân tóc liền một
dải). Thước `flat hair` của `qa:score` không cho một vùng cùng tông vượt 1,3 × 2,1 % ô của hình (16 ô ở S,
12 ở W), nên mảng gốc 31 ô của đơn thuốc rớt (đã thử tô tay: 84 → 81/130). Giải: overlay tóc có cờ **`crop`**
(`Overlay.crop`; `O(..., crop=True)` trong `gen_view_items.py`), `dress()` gom ô của nó đưa vào `combHair`,
và mảng crop được chải theo chế độ riêng trong `hair64.ts`: **ba tông** theo trường sáng (sáng 20 %, gốc,
tối 25 %), không jitter, không chu kỳ lọn; chỉ khi một mảng vượt ngưỡng mới chia bằng **một nét thẳng 2:1
xuống–phải**, tối và ngắn nhất đủ dùng (nét được hụt một ô ở đầu hoặc cuối để chỉ chạm mảng tối ở góc chứ
không nhập vào nó; nét sáng chỉ khi không nét tối nào đủ); ngưỡng chia là đúng cổng hình của thước
(`FLAT_FIG_SHARE` 0,0273). Chế độ này chỉ áp cho crop **vừa trong bốn mảng** của cổng (`CROP_MASSES`):
đầu đinh S/SW (56 ô, cổng 16/15). W (73 ô, cổng 12), N/NW (117–121 ô, cổng 15–16) và zombie văn phòng
(cổng 13) cần từ năm mảng trở lên nên giữ bộ chải lọn — giám khảo đã chấm đạt góc sau và không nêu góc W;
thử chải crop ở đó cho 6–8 nét chồng chéo, xấu hơn lọn. Kết quả S/SW: `###hh / ###hhhhhh / ##hHHhhhh /
##hhhHhhHHH / #hhhhhHHHHH / hhhhhHHHHHH` — mảng sáng, mảng gốc có một nét, mảng tối ôm chân tóc.

**Thử và bỏ.** Nét chia theo lọn của bộ chải thường (chéo xuống–trái, có ô góc bậc): cắt mảng gốc thành lát
1–4 ô, hai nét sát nhau. Nét tối chạm thẳng mảng tối: nhập vào nó, vượt cổng. Bốn tông (thêm sâu): góc sâu
L 0,17 sát viền L 0,12 đọc thành viền dày.

**Số đo.** Đạt 84/130, không sprite nào đổi trạng thái so với HEAD, đầu đinh đạt cả năm góc; ô lẻ 287 /
`strict` 1663 — đúng bằng HEAD đo lại trong cùng phiên (D-084 ghi 286 / 1646 là số đo trước lần sửa cuối của
B7); lint 80; QA sạch; `problems: 0`; 113 test.

### D-086 Nhận diện ở 1× trong nhóm lục (B9 của giám khảo vòng 4)

**Zombie cảnh sát.** Mũ kê-pi có **dải băng đỏ** (200,40,50) quanh mũ ở cả năm góc: `POLICE_CAP_V` suy từ
`PEAKED_CAP_V` bằng `banded()` — hàng băng (hàng 5 của mọi bản vẽ mũ) đổi vật liệu vải 2 sang điểm nhấn, hai ô
sáng bên trái, ba ô tối bên phải như chính tông của hàng đó. Lính nữ vẫn đội mũ trơn (dải đỏ là của cảnh sát);
màu nhấn khai trong `colors` của riêng zombie cảnh sát. Đây là màu đỏ duy nhất của nhóm lục nên đọc được ở 1×.

**Zombie quân đội so với Lính Nhiễm.** Da cẳng tay đổi từ xám trung tính (146,150,148) sang da xám-lục của các
zombie (`SKIN_M` 172,182,142) — xám trung tính đọc như găng; thêm chi tiết **`rip`**: lỗ áo rách ở bụng lộ bốn
ô da (hai cặp so le, ô đơn nào cũng có bạn), đặt theo neo ngực của dáng (`chest` + (2, 3)) ở S và SW, so le
ngược chiều ở SW để các ô bóng nếp gấp cạnh lỗ vẫn đi đôi trên thân hẹp hơn. Giám khảo còn gợi ý bỏ mũ sắt;
không làm vì mũ sắt là dấu hiệu "lính" của cả hai và góc SW của mũ vừa làm ở D-083.

**Dọn theo.** Thân gù góc N/NW: vai áo phủ nốt ô da hở ở hàng 15 hai bên (hộp vai thêm `[4,15,4,15]` và
`[14,15,14,15]`), bóng nắm tay là cột hai ô (hàng 32–33) thay vì một ô — hai chỗ này lộ ra khi da sáng hơn.

**Số đo.** Đạt 84 → 85/130 (zombie quân đội@NW đạt nhờ bóng da 13,9 %; không sprite nào rớt); ô lẻ 287 giữ,
`strict` 1663 → 1655; lint 80; QA sạch; `problems: 0`; 113 test.

### D-087 Lỗi nhỏ còn lại (B10 của giám khảo vòng 4)

Năm mục, hai làm, một đã xong từ trước, hai từ chối vì vướng thước:

- **(ii) Dải cổ áo zombie cảnh sát @N** — làm. Dáng gục đầu nhìn từ sau để hở lưng trên giữa gáy và đường may cổ
  (hàng 17 của dáng S): thêm đoạn cổ áo ngay dưới gáy (`[6,14,11,14]` ở droop N, lật thành `[7,14,12,14]` cho
  `droop_m`), đặt đầu danh sách để đoạn cuối vẫn neo cổ thun và rằn ri; tóc che nó ở mọi look khác (zombie dân
  thường, VĐV), mũ kê-pi để lộ nên dải đọc tối liền từ x=3 đến 12.
- **(v) Gấu áo Kẻ Bám Trần** — làm. `Look.hem: true` trên áo rách = rách được may vào một đường gấu (đường
  `waist` thay cho năm đường may xơ), lỗ rách hai ô dời lên một hàng cho nguyên vẹn; gấu của dáng bò dời xuống hàng
  cuối của thân (28, như góc W đã có) ở S/SW/N/NW. Áo tách khỏi hông ở 1×; ô lẻ Kẻ Bám Trần@W 5 → 4.
- **(iii) Ô đầu vành mũ Lính nữ @W** — đã đúng màu viền mũ (0,6,0) từ D-078 (hoà màu ô viền lẻ); không sửa thêm.
  Thử bỏ viền trên của đuôi tóc W để hết ô viền vành sau bị đổi thành tóc sâu: zombie VĐV nữ@W rớt `flat hair`
  14,6 % → hoàn lại.
- **(i) Ô mũi giày @W một tông với đế** — từ chối. Đế một tông xếp lên hàng thân giày thành hai dải bằng nhau
  (lint `banding`) trên mọi giày góc S: 15 sprite rớt `lintAdded`, 85 → 70. Ô mũi nhạt hơn một bậc là chủ ý của
  `tailor64` để phá dải; giữ.
- **(iv) Ô gấu quần Lan (37,56)** — từ chối. Đó là đầu cột bóng của chân xa, chỉ còn một ô vì áo blouse che phần
  trên; đổi sang sâu (`underCoat`) đúng ý giám khảo ở S nhưng ở SW ô sâu dày thêm viền bên dưới, Lan@SW mất một
  điểm ảnh "đường mảnh" và rớt `lineDens` 4,08 < 4,1 (85 → 84). Thước ưu tiên theo CLAUDE.md; ghi lại để lần
  hiệu chỉnh thước xem lại ngưỡng sát của Lan@SW.

**Số đo.** Đạt 85/130 giữ nguyên (không sprite nào đổi trạng thái); ô lẻ 287 → 286, `strict` 1655 → 1642; lint
80; QA sạch; `problems: 0`; 113 test. **Hết thứ tự B2 → B3 → B4 → B5 → B6 → B1 → B7 → B8 → B9 → B10 của vòng 4.**

### D-088 Thước 1× thay thước ×6 làm cổng nghiệm thu; sửa thân gốc cho cỡ thật

**Vì sao.** Sau bốn vòng giám khảo, 85/130 sprite đạt thước ×6 nhưng ở cỡ thật dàn 64 px vẫn có pixel rời khỏi
thân, chấm da đơn và sáu bộ quân phục lục không phân biệt được (người dùng, 19/10). Thước ×6 đo chi tiết ở độ
phóng kiểm tra, không đo cái người chơi nhìn. Từ đây **`pnpm qa:1x` là cổng**, `pnpm qa:score` chỉ ghi số.

**Thước** (`scripts/research/qa_1x.py`, báo cáo `test-output/score/report_1x.md`), đo trên dump của bộ chấm:

- `islands`: mảng 8-liên-thông tách khỏi thân (đồ vật trôi nổi) — **phải 0**.
- `skin1`: ô da không có ô da nào trong 8 ô quanh (chấm thịt rời: tai còn một ô dưới tóc, má kẹt giữa các viền; ngón
  cái chạm tay chéo góc thì không tính) — **phải 0**. Định nghĩa 4-liên-thông đã thử: nó bắt cả ngón cái dưới cổ tay
  áo và góc hàm dưới cổ áo rồi lấp bằng viền, tạo khối viền 2×2 và xoá ngón; đổi sang 8 ô.
- `frag`: vùng cùng vật liệu 4-liên-thông dưới 3 ô (trừ viền, mắt, trắng) — không được tăng (mốc 731).
- cặp dễ lẫn ở 1× (góc S): IoU silhouette ≥ 0,82 (căn theo chân) và ΔE oklab trung bình của sáu dải ngang ≤ 0,075
  — không được tăng (mốc 7: Dương~Lính nữ, Lính mũ nồi~Lính nữ, Lính nón sắt~Quân y, Dương~Lính mũ nồi, zombie dân
  thường nam~nữ, Dương~zombie văn phòng, Lính mũ nồi~Quân y).

**Sửa thân gốc một lần** (lan ra cả dàn):

- Mặt S/SW: bỏ viền ngoài hốc mắt (`o` hai hàng cạnh mắt, SW ba hàng) — ảnh mẫu không có; mắt = mống + trắng + chân
  mày trên nền da. Trước đó ô da góc mắt và ô má dưới trắng mắt là chấm thịt rời trên mọi nhân vật.
- Mặt W: bỏ đường sau hốc mắt (cột `o` hai ô) — vành mũ che hàng 8 là ô góc mắt rời.
- Tai N/NW rộng hai ô ở hàng 9 (đầu nghiêng từng làm rời ô tai).
- Ngón cái nối vào bàn tay ở S, N, NW, dáng gục đầu, dáng lết (S và SW); ngón treo của dáng vươn tay @W rộng hai ô;
  chân duỗi của dáng lết @W rộng hai ô suốt chiều dài (trước là một đường chéo một ô, đọc như vệt rơi); vai nâng
  của dáng ngoẹo cổ (S, SW) đặt trên da.
- `dress()` có `coverLoneSkin`: ô da không còn ô da nào quanh lấy ô của thứ phủ lên nó (tóc trước, rồi bất kỳ vật
  liệu vẽ đè; 4 ô kề trước, vòng 8 sau); kẹt giữa viền bốn phía thì lấp bằng viền, trừ khi viền đó tạo khối 2×2
  (khi ấy vòng 8 phủ trước, viền là đường cùng). Còn 5 ô lấp bằng viền tạo khối 2×2: ngón cái Ny @N/NW và Lính nón
  sắt @N dưới cổ tay áo, tai zombie quân đội @NW dưới mũ sắt, zombie văn phòng @N — tồn đọng.
- Đồ vật chạm thân: dùi cui cảnh sát @SW theo thân hẹp (x 0), bảng kẹp của Lan @NW sát tay (`CLIPBOARD_BACK_NW`),
  súng đeo chéo @W có dây hai ô viền từ vai xuống báng.
- Miệng rộng của Kẻ Bắt Chước @SW kéo răng tới viền hàm (ô da góc miệng từng kẹt).
- Thử và hoàn lại: dời miệng zombie xuống hàng cằm (tạo hai túi da mới mỗi mặt).

**Số đo** (trước → sau, cùng định nghĩa): islands 3 → 0; skin1 143 → 0; frag 1012 → 731; cặp lẫn 7 → 7; lint
thân (`qa:pixel`) 80 → 74; ô lẻ theo giám khảo 287 → 232, `strict` 1663 → 1539; QA sạch; 113 test. Thước ×6 tham
khảo: 85 → 77/130 — rớt chủ yếu `lines`/`lineDens` (bớt viền mắt) và `lintAdded` (5 ô lấp viền), hai metric đếm nét
tối mảnh ở ×6, không phải mục tiêu nữa.

**Còn lại của kế hoạch 19/10** (mục 3–6): chấm thành mảng ≥ 3 ô (frag 731), giảm nhiễu tông cho mảng dưới 100 ô,
bảng màu nhận diện cho nhóm lục (7 cặp), và 5 ô viền tồn đọng ở trên.

### D-089 Bảng màu nhận diện cho nhóm lục (mục 5 của kế hoạch 19/10)

Bảy cặp dễ lẫn ở 1× (thước D-088) đều là người mặc olive quân đội hoặc đứng cạnh họ: cả dàn sống trong L 0,2–0,6
với sắc độ gần 0, nên ở cỡ thật sáu bộ quân phục là một khối xám-lục. Mỗi nhân vật trong nhóm nhận **một chìa khoá
màu lớn** (đọc được ở 1×) và một bước lệch bảng màu khỏi olive chuẩn (`ARMY` vẫn là gốc chung):

| Nhân vật              | Chìa khoá                                                                                                                                                                                            | Thay đổi                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Dương                 | áo lục trong, lạnh (70,150,100), quần navy sâu hơn                                                                                                                                                   | hết lẫn với lính (áo cũ (84,116,64) là olive)                   |
| Lính nón sắt          | giữ olive chuẩn + súng chéo                                                                                                                                                                          | không đổi                                                       |
| Lính quân y           | **chữ thập đỏ 5 ô trên mũ sắt** (mọi góc, `rigid` theo mũ), **băng tay trắng** 2 hàng trên tay phải (remap vải → trắng, giữ viền; bỏ ở tay xa một cột của NW), kaki sáng (152,146,112), cổ tay trắng | mũ sắt vẽ bằng vải nên vẫn kaki, không trắng được bằng bảng màu |
| Lính mũ nồi           | **mũ nồi và cổ tay đỏ rượu** (118,42,54), quân phục tối và xanh hơn (80,92,72)                                                                                                                       |                                                                 |
| Lính nữ               | olive ấm, sáng hơn (124,124,80), mũ mềm sáng hơn                                                                                                                                                     |                                                                 |
| Zombie quân đội       | quân phục mục xám-olive (92,96,80); Lính Nhiễm giữ olive sống                                                                                                                                        |                                                                 |
| Zombie dân thường nữ  | tóc nâu đỏ (104,56,48), áo hồng đậm hơn (214,124,152)                                                                                                                                                | cả hai dân thường từng tóc gần đen                              |
| Zombie dân thường nam | áo xám xanh (108,122,132)                                                                                                                                                                            |                                                                 |
| Zombie văn phòng      | tóc bạc (118,116,112)                                                                                                                                                                                | từng lẫn với Dương vì cùng tóc đen                              |

**Số đo.** Cặp lẫn 7 → **0** (cặp gần nhất còn lại: Ông Tư ~ Lính nữ ΔE 0,078, Dương ~ Lính nữ 0,079, hai zombie dân
thường 0,080); islands 0, skin1 0, frag 731 giữ; thước ×6 77/130 (tham khảo); ô lẻ theo luật màu của giám khảo 232 →
245 vì các ô đơn sẵn có nay tương phản hơn (ô mũ nồi/cổ tay đỏ rượu của Lính mũ nồi, ô bóng áo hồng của zombie
nữ) — đó là mảnh 1 ô thuộc mục 3; QA sạch; 113 test. Mốc cặp lẫn trong `qa_1x.py` hạ xuống 0.

### D-090 Giảm nhiễu tông cho cỡ thật (mục 4 của kế hoạch 19/10)

Ba thay đổi, cùng một lý do: ở 1× mỗi bước tông thừa là một đốm.

- **Tóc:** mảng dưới 130 ô (mọi kiểu tóc ở S/SW/W, đa số góc sau; trừ tóc dài và tóc bù xù 145–194 ô) chải như
  crop của D-085: ba tông sáng/gốc/tối theo trường sáng, không jitter, không chu kỳ lọn, một vùng cùng tông được
  tới 30 % mảng (không dưới cổng hình), chỉ chia bằng một nét thẳng khi vượt. Năm tông và lọn 4-4-5 giữ cho mảng
  lớn. Hệ quả: thước ×6 `flat hair` rớt 40 sprite — đúng chủ ý, mảng lớn là thứ mắt đọc được ở cỡ thật.
- **Áo:** bỏ cặp chói 2 ô ở vai (thành sáng, nhập vào khối sáng), bỏ hai ô sâu dưới nếp xa và dải sâu bậc thang
  ở mép xa, túi áo tô bóng thay vì sâu, bóng dưới tay xa là tông tối. Sâu chỉ còn ở hàng gấu, cổ tay, cạp, gối,
  đế và đuôi nếp gấp — tức các đường cấu trúc.
- **Viền:** trần L của màu viền hạ 0,38 → 0,22 cho cả da lẫn vải (`lineL` trong `HERO_RAMP_OPTIONS` và
  `HERO_CLOTH_RAMP_OPTIONS`): viền vẫn nhuộm theo vật liệu như ảnh mẫu, nhưng tối và đều hơn nên silhouette đọc
  rõ ở 1×–2× (A/B trên sáu nhân vật). Viền tối hơn làm các dải màu xích lại, hai cặp lẫn mới xuất hiện (Ông Tư ~
  Lính nữ / quân y): Ông Tư nhận **râu trắng** (188,182,172) làm chìa khoá, áo vàng đất (194,148,84), quần nâu;
  quân y kaki xanh xám hơn (140,148,104). Thử mũ cối nhạt cho Ông Tư: tiến sát quân y hơn, hoàn lại.

**Số đo.** islands 0, skin1 0, frag 731 (không đổi — mảnh nhỏ nằm ở chi tiết, là mục 3), cặp lẫn 0 (ba cặp sát
ngưỡng 0,076: Dương ~ Lính nữ, Lính nón sắt ~ quân y, Ông Tư ~ quân y); lint thân 74; ô lẻ theo luật màu 242 /
`strict` 1482; QA sạch; 113 test. Thước ×6 tham khảo 77 → 53/130 (flat hair 40, flat cloth 8): thước đó đòi tóc
5 tông và vùng ≤ 13 ô, trái với mục tiêu 1×; không chạy theo nữa.

### D-091 Góc sau: tóc một khối, lưng áo không nếp

Người dùng chỉ vào góc sau của Dương và Ông Tư (19/10): tóc từ sau vẫn là mảnh ghép năm tông với vệt lọn chéo
(mảng 140–190 ô còn chải lọn sau D-090), lưng áo có hai nếp ngang đọc thành sọc. Sửa: **mọi mảng tóc** chải
theo chế độ mảng (ba tông, một vùng tới 30 % mảng) — `SMALL_MASS` vượt mọi mảng, bộ chải lọn D-074 giữ trong
mã để tham khảo; **không nếp ở góc sau** (`light === 'block'`): lưng chỉ còn khối sáng vai, mảng bóng bên phải
và gấu. Thước 1× giữ nguyên (islands 0, skin1 0, frag 731, cặp lẫn 0); 113 test; QA sạch.

### D-092 Góc sau: dựng hình theo góc nhìn, không lật mặt trước

Người dùng nói rõ (19/10): góc sau của Dương và Ông Tư chưa ổn ở **tạo hình**, không phải màu (D-091 mới sửa
tông). Soi ×10 cạnh khung N của ảnh mẫu: đầu N dùng đường cằm của mặt trước làm gáy nên Ông Tư là "quả trứng
không mặt"; cổ thắt 3 ô giữa hai khối viền `ooo` rồi nở ra; cổ áo sau là vạch thẳng ngang hàng với chữ V trước
(gáy thành ô cửa sổ 13 ô); tai sau là một ô tóc kẹp viền ("khía"); đầu NW là đầu N bớt một cột, không xoay.

- **Đầu N gốc** (`hero64.frames.ts` hàng 10–14, ngoại lệ "không sửa tay" thứ hai sau mắt): nửa dưới sọ là chén
  bóng `S` (hàng 12–13 trọn, mé phải hàng 10–11) như khung đi N của ảnh mẫu; hàng 14 `ossSSSsso`: cơ thang lộ
  hai bên cổ như hàng cằm góc S, hết khối `ooo`. `BALD_V` bỏ N/NW (gáy gốc đã đọc là đầu cạo: vòm sáng, chén
  bóng, tai).
- **Đầu NW** (`hero64.views.ts`): đầu quay 3/4 nhìn từ sau có **silhouette bằng SW** (đầu quay đọc như nhau từ
  trước và sau): mép gần thẳng đứng ở cột 2 xuống tới hàm, mé xa cong vào vai hẹp — hàng 10–13 nội 3–13, 3–12,
  3–11, 4–10; tai gần 2×2 bên trái; dải da má một ô dọc mép gần (cột 3 hàng 10–12, ô (4,13)) là dấu hiệu đầu
  quay; hàng 14 `ossSSSso` (4–11), không nhô qua vai xa như cằm SW — `gen_pose_views.py` xoá ô viền cằm thừa
  của thân lật bên cạnh hàng cổ.
- **Cổ áo sau** = chữ U nông cao hơn chữ V trước hai hàng (viền (6,15), (10,15), (7–9,16); gáy 3×2 ô bên trong):
  `STAND_N`/`STAND_NW` và `back_regions()` cho dáng; cổ thẳng (thân to con) giữ thẳng. Đầu hạ (gục, lết, ngoẹo,
  bò) đẩy U xuống `max(V − 2, hy + 15)`; các hàng sọ 12–14 nằm trong hộp thân được khai là cổ để hộp thân không
  nhuộm sọ thành vải (dải cổ `[6,14,11,14]` của D-087 chỉ che vết này — bỏ); hộp vai nhô bắt đầu dưới ô gáy.
- **Tóc từ sau** (`gen_view_items.py`): SPIKY/SHORT/PONYTAIL chừa tai 2×2 (hàng 8–9 tóc 4–12 ở N, 4–13 ở NW)
  và phủ tới hàng sọ cuối không có hàng viền riêng (hết khối viền đôi dưới tóc); PONYTAIL hở gáy hàng 13;
  SWEPT phủ tai, N lấp hàng 13, NW theo sọ xoay; BUZZ chừa tai và dải má qua `BUZZ_BOXES`; BOB/CURLY/WILD/LONG
  giữ (khối tóc rộng hơn sọ).

Số: islands 0, skin1 0, frag 731 → 720 (mốc hạ theo), cặp lẫn 0; lint 74 = 74; QA sạch; 113 test; ô lẻ 240 → 234
(strict 1482 → 1536: cặp ô cơ thang và dải má là chủ ý); thước ×6 tham khảo 38 → 34 (ba lính đội mũ @NW rớt
`skin sh` > 40 % vì phần da còn thấy dưới mũ sắt chủ yếu là chén bóng gáy; Lính Nhiễm @N `lintAdded`). 40 sprite
đổi, chỉ N/NW. Còn lại: đầu gục nhìn từ sau vẫn hạ hai hàng như mặt trước (đầu cúi thì ụ chẩm phải cao hơn và
gáy lộ nhiều hơn — cần vẽ lại hàng 14–17 của thân gục ở N/NW); bàn tay và gót góc sau chưa vẽ riêng.

### D-093 Chi tiết dạng chấm thành mảng ba ô trở lên (mục 3 của kế hoạch 19/10)

Thước 1× đếm 720 mảnh vật liệu dưới 3 ô. Kiểm kê theo nguồn sinh (`scripts/research/frag_inventory.py`: mảnh
theo vật liệu, chữ ô và vật liệu bao quanh): dây túi/dây súng chéo một ô (~65 — mỗi ô chéo là một vùng
4-liên-thông riêng), vết máu/vết loét/vết da đầu và má bằng gỗ `D` (~105: cặp 2 ô, hoặc bị cà vạt, thẻ bài, dải
phản quang cắt, hoặc bị dải lệch của đầu nghiêng xé chéo), mụn Kẻ Phun và nhọt Đột Biến (~50), cổ tay vải 2 trên
tay áo hẹp (27), thắt lưng một hàng bị khoá 2 ô chia thành mẩu 2 ô (38), rằn ri bị mép hộp cắt (15), quần Ny lộ
một dải giữa gấu áo và tunic (8), súng sau lưng vẽ nét một ô (6). Luật thay cho sửa từng nhân vật:

- **Dây chéo rộng 2 ô** (bậc thang `A./AA/.AA`): dây túi Ny và quân y ở mọi góc, dây súng đeo lưng (mỗi bậc
  chung một cột với bậc kế), gậy Sơn (2 ô gỗ ở hàng đổi bậc), nòng và báng súng từ sau `oMMo`/`oDD` như súng
  cầm trước (`omMo`).
- **Vết là mảng chữ L ba ô** (`STAIN_ROWS`, vết váy Kẻ Bắt Chước, vết loét Lính Nhiễm, mụn/nhọt mỗi góc, vết da
  đầu ba ô một hàng, vết má `dd/.d` ở hàng 6–7 — nằm trong một dải lệch của mọi đầu nghiêng nên không bị xé);
  `cullSmallBlotches()` cắt vết theo cột lòng thân (thân quay hẹp hơn: vết đè lên viền tay) và chỉ giữ hàng
  trên dải phản quang, mảng còn dưới 3 ô thì bỏ; rằn ri qua cùng bộ lọc. Cà vạt vẽ sau vết máu.
- **Thắt lưng hai hàng** (hàng gấu và hàng trên), khoá 2×2 đặt sao cho mẩu đai bên cạnh ≥ 2 cột; phù hiệu 2×2;
  thẻ bài = ô xích + bản 2 ô.
- **Cổ tay vải 2 ≥ 3 ô**: tay áo 2 cột lấy 2 hàng, tay xa 1 cột lấy 3 hàng (`tailor64.ts`).
- Tunic Ny bắt đầu ngay dưới đường may eo (hàng 29).

Số: frag 720 → 334 (mốc hạ theo), islands 0, skin1 0, cặp lẫn 0; lint 74 = 74; QA sạch; 113 test; ô lẻ 234 → 227,
strict 1536 → 1518; thước ×6 tham khảo 34 → 33. 97 sprite đổi (24 nhân vật). 334 mảnh còn lại chủ yếu là ô
cấu trúc: da 206 (cơ thang cạnh cằm góc S/SW 37, bàn tay/ngón 2 ô 24, khoé miệng zombie 39, tai một ô dưới tóc
ngắn 8), vải 58 (đuôi áo một ô dưới gấu @W 12, góc vai dáng gục/ngoẹo), quần 22 (ô cạp cạnh tay buông của dáng
lết/ngoẹo), vải 2 15, tóc 12. Đó là nét dựng hình (hàng cằm, góc cổ áo, má hóp) hơn là chấm rời; xử lý tiếp nếu
người dùng còn thấy rớt pixel ở 1×.

### D-094 Khối viền 2×2 phát sinh khi mặc đồ (mục 6 của kế hoạch 19/10)

Thước mới `scripts/research/doubles_dressed.py`: canh thân trần dưới sprite đã mặc rồi trừ các khối 2×2 của
chính thân, còn lại là khối do mũ, đường may, đạo cụ hay ô lấp viền tạo ra: HEAD 40 khối, sau D-092/D-093 còn 26.
Năm nguồn không phải "hai vật chạm nhau" được sửa bằng luật:

- **Mày dưới vành nón bảo hộ**: nón 8 hàng để lộ hàng mày ngay dưới vành (khối 2×2 ở hai mày). Nón S có hàng
  thứ 9 bằng ô da trán đè lên mày; góc SW có bản riêng vì mày lệch hai cột; góc sau giữ 8 hàng.
- **Gọng kính @W**: viền dưới gọng nằm trên đường miệng; bỏ ô góc trước của viền dưới (`.ooo..`).
- **Báng súng đeo lưng @N/NW**: báng đè nửa bàn tay phải, để lại một ô da bị vây kín rồi lấp viền thành khối
  3×3; báng kéo dài thêm hai hàng có viền phải (`oDDo`) phủ trọn bàn tay, phần đuôi hạ xuống hàng 29–33 cạnh
  chân (cách viền chân một cột, bàn tay còn lộ bốn ô bên phải báng).
- **Vai dáng gù @N/NW**: hàng đỉnh bướu bớt một ô viền mỗi bên; gáy lộ cạnh bướu thay vì một ô da bị vây kín.
- **Đuôi áo @W**: hộp thân góc ngang kết thúc ở hàng may gấu (28) thay vì 29 (thân đứng, `regions_w`, dáng vươn);
  ô vải đơn dưới gấu sau lưng thành cạp quần, và áo @W có lại dải gấu sâu ở hàng 27.

Còn 14 khối, tất cả ở chỗ đạo cụ chạm thân (túi hông Ny/quân y, ba lô và gậy Sơn): chấp nhận theo SKILL §2.3.
Đầu gục @N/NW giữ hạ hai hàng (ghi chú để lại ở D-092 rút lại): cúi đầu thì đỉnh đầu hạ ở mọi góc, gáy lộ hai
hàng 16–17 là đúng. Số: frag 334 → 321 (mốc hạ theo), islands 0, skin1 0, cặp lẫn 0; lint 74 = 74; QA sạch;
113 test; ô lẻ 227 → 226, strict 1518 → 1511; thước ×6 tham khảo 33/130. **Hết sáu mục của kế hoạch 19/10.**

### D-095 Khung đi bộ S/N/W của dàn nhân vật đứng: đầu đứng ghép lên thân bước, áo quần theo vùng từng khung

- **Thân bước** là bản chép từ ảnh mẫu (`hero64.frames.ts`, chỉ số 0 và 2); đầu chép lệch cột và chưa có mắt/gáy
  đã sửa, nên `withStandingHead()` dán 14 hàng đầu đứng (+ hàng cằm) lên thân bước và dịch khung để đầu nằm đúng
  chỗ đầu đứng trên canvas (đầu không được đổi dọc chu kỳ). **Bước A ở mọi góc là chân trái người trước**; hàng S
  của ảnh mẫu xếp ngược với hàng N/W nên `heroFrames('S')` đảo hai bước, để quay người giữa chừng không đổi chân.
- `walk64.ts`: sáu dáng `ZombiePose` (S/N/W × A/B) với hộp áo quần đọc từ thân bước, như `views64.ts` đọc từ thân
  đứng. Trường mới: `legSplit` + `nearLeg` (thợ may quần tách hai ống ở cột khai báo và chân gần/sáng có thể là
  chân phải), `sleeveExcept` (ô thân nằm trong hộp tay áo khi cẳng tay vắt chéo ngực @W), `extrasDx` (dịch cột
  cho lớp vẽ thân của góc đứng), `walkKey`. `form.front` = cẳng tay + nắm đấm vung trước thân (và cả cánh tay vung
  sau ở W B): mọi lớp đè (túi, đuôi áo, thắt lưng, ba lô) nằm sau tay.
- **Vật phẩm thân**: `ViewItem` nhận thêm khoá bước `S0..W1`; không có thì lấy hình góc đứng dịch `extrasDx`.
  Biến thể vẽ riêng trong `gen_view_items.py` (`*_WALK`, kiểm trên thân bước qua khoá `walk` của dump): dây và
  túi Ny, ba lô + gậy Sơn, áo khoác Ông Tư, đuôi áo + bảng kẹp + khoá kéo Lan, vết máu váy Kẻ Bắt Chước, súng đeo
  lưng, túi quân y, túi bản đồ, súng cầm @W. Quy tắc rút ra: váy/đuôi áo trên khung bước mở từ bề rộng hông (hai
  hàng thu dần) vì bàn tay che góc trên khi đứng đã vung đi; nòng súng dài hơn khung đứng khép túi kín sau sọ (giữ
  12 hàng, đỉnh chạm vành mũ); dây chéo dừng trên thắt lưng và trước nắm đấm (đè khoá còn một chấm); rằn ri chỉ
  trên ô thân và ngoài vùng ngoại lệ của thân (hộp thân @W chứa viền tay); thắt lưng chỉ trên ô thân, khoá về phía
  bàn tay không che; tay áo dài của tay vung sau dài sáu hàng để cổ tay có ba ô.
- Sửa thân bước (ngoại lệ ghi ở đầu `hero64.frames.ts`): nắm tay vung sau ở S thành khối sáu ô (đường đốt ngón của
  mẫu để lại mảnh da 1–2 ô ở 1×); góc hông W A (15,27) là ô thân để đường may gấu không khép khối viền.
- **Thước**: `hero-score-dump.ts` dump thêm 66 sprite bước → `qa:1x`, `qa:score`, `doubles_dressed.py` đo cả
  khung bước; `hero-qa` và test `hero64.test.ts` cũng kiểm. Mốc `frag` 321 → **438** (= 321 đứng không đổi + 117
  bước: cơ thang cạnh cằm và tay buông 2 ô như thân đứng, dây chéo cắt rằn ri/vải, súng cầm đè chân @W, hàng gấu sâu
  bị rằn ri cắt). islands 0, skin1 0, cặp lẫn 0, lint 74, 114 test; khối viền do mặc 43 (14 đứng + 29 bước, đều là
  đạo cụ chạm thân hoặc tay). `pnpm walk` render bảng S/W/E/N (A, đứng, B, đứng) ×4 vào `test-output/walk/`.
- Chấp nhận/để lại: súng cầm của Lính đầu đinh đứng yên bên hông khi tay vung (S) và đi qua trước chân sau (W A);
  ba lô Sơn @W B gần như khuất sau cánh tay (chỉ nắp lộ); dáng W của mẫu vung tay cùng bên chân trước (giữ theo
  mẫu). SW/NW chưa có khung bước (E/NE/SE lật từ W/NW như D-042).

**Bổ sung D-095 (cùng ngày): khung bước SW/NW suy từ bước S/N.** `gen_pose_views.py` nhận bốn dáng bước
(`walk_s0/s1/n0/n1`, thân không đầu và vị trí lưới đầu đi theo dump) và suy SW từ bước S như dáng zombie
(`narrow_torso`: bỏ một cột thân phía xa mỗi hàng, ở đây **mọi hàng** từ vai tới gấu vì nắm đấm che gần hết thân ở
vài hàng — hàng không thu sẽ xé nắm đấm), NW từ bước N thu phía xa bên phải (lật, thu, lật lại); không nâng bàn
chân xa (bàn chân bước đã khác độ cao, nâng sẽ tách khối đế). Cột đã bỏ từng hàng được phát ra (`narrowed`) để
`walk64.ts` dựng `front` và để vật phẩm vẽ cho bước S/N tự theo sang SW/NW: `ViewItem` tra `SW0` → `S0` (dịch qua
bảng cột, **nguyên khối theo đa số ô** vì dịch từng ô xé súng chéo lưng) → `SW` dịch cột. `heroFrames('SW'/'NW')`
đọc hình suy ra từ `hero64.poses.views.ts`, đầu lưới đặt đúng chỗ đầu đứng, hàng theo bước nguồn; chưa sinh thì
đứng yên. Bảng đi bộ đủ 8 hướng (NE/E/SE lật). Số: 110 sprite bước; frag 438 → **527** (SW 49, NW 40, đứng giữ
321), islands 0, skin1 0, cặp lẫn 0; khối viền do mặc 47 (14 đứng + 33 bước); lint `qa:pixel` 74 → 138: toàn bộ
phần tăng là thân bước (30: khối đế giày đặc của ảnh mẫu ở hàng 36–39, hai góc nắm đấm chạm thân, một dải, một
bậc) và bốn góc suy từ chúng (34); các hình cũ giữ nguyên số. Chấp nhận khối đế vì là nét của ảnh mẫu đã duyệt.

### D-096 Thân hero 64 px vào registry/catalog: bộ phận là mảnh `Look`, preset là dàn Vùng Xanh viết thành cấu hình

- **Thân** `hero` (canvas 64×64, neo (32, 62)) nằm trong `BODIES` cạnh `human`; `BodyDef.views` thành tuỳ chọn vì thân
  hero vẽ nguyên khối, không tách chi. `renderClip` rẽ nhánh theo `baseCharacter === 'hero'` → `renderHeroClip`: mặc
  `Look` lên thân đứng của góc vẽ (`wearView`) và lên thân bước (`wearWalk`) cho walk, đặt lên canvas đúng chỗ
  `heroFrames` đặt khung, lật ngang cho NE/E/SE, tô bằng `HERO_RAMPS` qua `paintSetupFor(style, colors, ramp)`.
  Idle = khung đứng giữ hai khung (chưa có nhịp thở), walk = `HERO_WALK_CYCLE` bốn khung; thời lượng lấy từ `CLIPS`
  (500/140 ms). Các clip khác (run, attack, hit, death) chỉ của `human`: animation trong catalog có `characters`,
  `normalizeConfig` bỏ clip nhân vật không có khung hình (`animation "run" for character "hero"`),
  `defaultCharacterConfig(catalog, id)` chọn từ tập vừa; `slotsForCharacter` cho UI chỉ hiện slot có bộ phận.
- **Slot và bộ phận** (`hero64.registry.ts`): bảy slot `hair, hat, face, top, bottoms, shoes, gear`; một bộ phận là
  hàm vá lên bản nháp `Look`, áp theo thứ tự cố định hair → face → top → bottoms → shoes → gear → hat (đúng thứ tự
  extras của các look trong `cast64`, mũ sau mặt như `build()`), nên một preset xếp lớp y như look của nó. 45 bộ
  phận: 9 kiểu tóc, 7 mũ, 3 mặt (kính, râu, mặt Kẻ Bắt Chước), 13 áo (áo thun lính = thun + thắt lưng/cổ tay/gối +
  thẻ bài; áo y tá = thun + dây + tunic; ba quân phục = áo dài tay + chi tiết; hai áo khoác tắt gấu, áo kiểm lâm nới
  tay), 5 quần/váy (váy dính máu = váy + vết máu), 3 giày, 5 đồ mang (ba lô + gậy, hai kiểu súng, túi bản đồ, túi cứu
  thương + chữ thập trên mũ). Đầu không tóc không mũ → `BALD_V`. `cast64` xuất `HERO_ITEMS` và tách `JACKET_ZIP_V`,
  `LAB_COAT_V`, `DOG_TAG_V`, `MIMIC_FACE_V` + `DRESS_STAINS_V` (trước gộp trong `MIMIC_V`); hệ quả duy nhất: bước
  SW của Kẻ Bắt Chước nay mang mặt góc SW thay vì mặt S dán lên đầu đã xoay (hai sprite đổi, mọi thước giữ).
  Chi tiết zombie (vết máu áo, rách, dải phản quang, cà vạt, số áo) và dáng zombie/thể hình chưa vào catalog.
- **Màu**: `ColorAssignment.color` nhận thêm `#rrggbb` (schema `colorValueSchema`, normalize hạ chữ thường,
  `materialColorsFor` đọc thẳng không qua bảng tên); thêm mục tiêu `eyes` (eye) và `white` (white) để mọi màu của
  dàn diễn đạt được. Mặc định thân hero (`HERO_DEFAULT_COLORS`): da/mắt/trắng của mannequin + áo quần của Dương,
  còn lại `DEFAULT_MATERIAL_COLORS` (đúng màu các look đang dùng ngầm, nên preset không lệch).
- **Preset** (`catalog.presets`, `catalogPresetSchema`, nhãn trong `catalog-labels.yaml`): 11 look của `BASE_LOOKS`
  viết thành cấu hình đầy đủ (bộ phận + màu hex trên mục tiêu); `hero64.registry.test.ts` chứng minh preset mặc ra
  **đúng từng ô và từng màu** với look gốc ở 5 góc và 10 bước đi, và mọi bộ phận mặc được lên thân trần ở 5 góc.
  Bộ phận 32 px nay ghi `characters: ['human']` thay vì `['*']`. Web: nút preset trong panel nhân vật
  (`replaceConfig`), panel phụ kiện theo `slotsForCharacter`, animation không có khung bị khoá, ô màu tự chọn
  (`<input type="color">`), `setColor` nhận hex; Playwright có kịch bản preset Sơn → 64×64 → màu hex → về thân 32 px.
- Số: 125 test (114 + 11), Playwright 3; catalog 2 thân / 11 slot / 49 bộ phận / 12 mục tiêu màu / 6 clip / 11
  preset; qa:1x giữ (islands 0, skin1 0, frag 527, cặp lẫn 0), qa:hero sạch, lint 138. Để lại: idle hero không nhịp
  thở; xuất file (Phase 3) và Mô tả (Phase 5) cho thân hero.

### D-097 Xuất file (M4): sheet PNG theo animation, JSON Aseprite, GIF xem trước, ZIP, trang `player.html`

- **Bộ mã hoá trong `pixel-core`** (hàm thuần, Uint8Array vào/ra): `encodePng` (RGBA8, filter 0, một IDAT, zlib của
  `fflate`), `packSheet` (lưới ô bằng nhau, hàng do người gọi đặt, cột là khung), `asepriteJson` + `checkAseprite`
  (định dạng "array" + `meta.pixiso`, kiểm tra của Phase 3 viết thành hàm), `encodeGif` (`gifenc`, bảng màu đúng
  bằng màu đã dùng + một chỉ số trong suốt, lặp vô hạn, `dispose: 2`), `zipFiles`/`unzipFiles` (`fflate`, mốc thời
  gian cố định 2026-01-01 cho mọi mục nên cùng nội dung → cùng byte; PNG/GIF lưu không nén). Thêm `fflate` 0.8.3 và
  `gifenc` 1.0.3 làm dependency của pixel-core (HANDOFF §7 chỉ định, cả hai nhỏ, không phụ thuộc gì); `pngjs` chỉ
  là devDependency để test giải mã lại. `gifenc` không có kiểu: khai báo trong `gifenc.d.ts`.
- **`exportCharacter(config, style, table, opts)`** (`sprite-kit/src/export.ts`, tầng chính sách trên `renderClip`):
  render mọi animation của config ở mọi hướng, kiểm tra chung ô và neo, bảng màu = hợp màu đã dùng của toàn bộ
  khung (nhiều nhất trước); mỗi animation một `{name}_{anim}.png` (hàng = hướng theo thứ tự HANDOFF §6.1, cột =
  khung) và `{name}_{anim}.json` (tag `{anim}_{dir}`, tên khung `{name}_{anim}_{dir}_{i}`, slice `pivot` một khoá ở
  khung 0, `meta.pixiso` gồm ô, neo, hướng, bảng màu, `pixelsPerMeter`); `{name}_preview.gif` = animation xem trước
  (walk, không có thì cái đầu) lần lượt qua mọi hướng; tuỳ chọn `{name}_atlas.png/json` xếp mọi animation; `{name}.zip`.
  `name` mặc định là id thân (`human`/`hero`).
- **5 hướng + lật**: sheet giữ năm góc vẽ S, SW, W, NW, N (PIVOT quyết định 2 và D-042, khác HANDOFF §6.6 vốn viết
  cho pipeline 3D là S, SE, E, NE, N) và `meta.pixiso.mirror = { NE: 'NW', E: 'W', SE: 'SW' }`; UI ghi chú chi tiết
  lệch bên sẽ đổi bên.
- **`pixelsPerMeter`** = `characterHeightPx / (1,75 m · cos 30°)` (HANDOFF §6.2 với nhân vật tham chiếu cao 1,75 m):
  32 px → 21,1; 64 px → 42,2. Là thước lưới danh nghĩa; Phase 4 (lưới iso) sẽ dùng và chỉnh nếu cần.
- **Test rung (Phase 3)**: thân 32 px đo đúng theo HANDOFF — tâm X của hai hàng đặc thấp nhất đổi ≤ 1 px giữa hai
  khung liền nhau (khép vòng) và cả clip nằm trong dải ±1 px; đứng yên thì bằng nhau tuyệt đối. Thân hero không đo
  được bằng bàn chân: bước đi là bản chép dáng sải chân, bàn chân trước gần camera hơn nên nằm thấp hơn trên canvas
  2:1, hai hàng thấp nhất chỉ chứa một bàn chân và đổi bên mỗi bước (tâm 34,5 / 32 / 29,5 / 32 ở S). Với hero đo
  đầu (hai hàng đặc trên cùng, phải đứng yên tuyệt đối theo D-095) và tâm hộp bao của cả hình (≤ 2 px giữa hai khung,
  dải ±1 px); đo thực: đầu 0, hộp bao ≤ 1,5 (ba lô Sơn @W).
- **Web**: `ExportBar` có ô tên file, hộp "gộp một atlas", ba nút (ZIP; PNG + JSON của animation đang xem; GIF) tải
  qua Blob; `apps/web/dev/player.html` (trang thuần, không build) nạp PNG + JSON bằng file input hoặc kéo thả, tự
  kiểm tra kích thước/khung/tag, phát theo `duration` từng tag, vẽ điểm neo; Playwright xuất ZIP từ app (`hero.zip`)
  rồi nạp sheet walk vào player và thấy khung chạy.
- **Để lại**: GIF và sheet dùng tỉ lệ xuất của style (32 → ×1, 64 → ×2 cho thân 32 px; thân hero luôn ×1 trên ô 64);
  chưa có khoá bảng màu dự án (Phase 4) nên `palette` là bảng đo được; `meta.version` cố định `0.1.0`. Số: 136 test
  (+11), Playwright 4; thước pixel không đổi (không sửa ma trận).

### D-098 Kẻ Lang Thang và Mai trên thân đứng; `gifenc` nạp theo đường dẫn ESM

- Hai nhân vật còn thiếu của game mà thân đứng đủ dựng (dáng đứng thẳng, có idle + đi bộ 8 hướng ngay), đọc
  từ atlas của game chỉ để lấy màu và dáng: **Kẻ Lang Thang** (kẻ nhiễm canh đầu cầu) đầu trọc (`BALD_V`), da tái
  vàng, mặt nhiễm (hốc mắt, miệng răng, vết rách má), áo ba lỗ nâu rách có máu (`tank` + chi tiết `gash`, `stains`),
  quần ngắn cùng vải, chân trần; **Mai** (hồn ma dẫn đường) tóc ngắn rẽ ngôi, áo thun, quần ngắn, chân trần, mọi
  vật liệu một tông xanh lục nhạt (game vẽ bán trong suốt trong quầng xanh; sprite không có pixel bán trong suốt
  nên màu gánh phần "ma"; quầng sáng là hiệu ứng của game, không thuộc sprite). Bộ phận mới trong catalog:
  `face_zombie` (mặt nhiễm cho mọi thân), `tank_torn` (ba lỗ rách dính máu). Preset `ke_lang_thang`, `mai`;
  test preset ≡ look giữ. Thước: islands 0, skin1 0, cặp lẫn 0 (Mai trùng silhouette với zombie VĐV nam /
  văn phòng ở IoU 0,86–0,88 nhưng ΔE 0,12–0,13 nên không lẫn), frag 527 → **567** (+40 của 2 nhân vật × 15
  sprite: cùng loại mảnh như thân đứng — cơ thang cạnh cằm, ô da cạnh tóc, góc tay), lint 138, QA sạch.
- `gifenc` không có `exports` trong package.json nên Node (tsx, script) lấy bản CJS và không thấy `GIFEncoder`;
  pixel-core nạp thẳng `gifenc/dist/gifenc.esm.js` (khai báo kiểu theo đường dẫn đó). Vite và Node đều chạy.
- Còn của dàn game: Bầy Chuột Đỏ (thân mới, không phải người), các dáng zombie/thể hình vào catalog, đi bộ cho chúng.
