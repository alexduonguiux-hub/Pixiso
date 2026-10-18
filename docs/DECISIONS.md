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
