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
