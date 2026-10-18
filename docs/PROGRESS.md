# Progress

Living status for the MVP. One section per phase: done, decisions, open items.

## Phase 0 — Monorepo and assets ✅ (asset scripts and KayKit removed in M1, D-039)

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

## Phase 1 — 3D viewer and assembler ✅ (removed in M1, D-039)

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

## Phase 2 — Pixel render core ✅ (stopped here for review; 3D pipeline removed in M1, D-039)

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

## Phase 2b — Pixel look per pixel-art rules ✅ (stopped for review)

**Done**

- Researched the rules (Pixel Joint, Lospec, Pixel Parmesan, Pixelblog, Pixel Logic, Saint11, Dead Cells, three.js RenderPixelatedPass) and wrote `docs/PIXEL_RULES.md` (Vietnamese) with what the pipeline does for each rule.
- Shader data passes (`uPixisoPass`): albedo + toon light band, 4× supersampled (`PixelRenderer.renderPasses`).
- `pixel-core`: `ramps` (hue-shifted shades, gamut clamp, line colour), `compose` (ramp palette with artist-style budget, coverage + majority downsample, ramp outline), `clusters` (cluster cleanup with contrast protection), `look.processPasses`; 73 Vitest tests.
- `framePipeline.renderClip` has `look: 'ramp' | 'composite'`; the preview and review sheets use `ramp`; the Phase 2 baseline stays available for comparison (`*_sheet_baseline_x8.png`).
- Review sheets regenerated: new vs baseline for Knight and Mage, outline none/dark/selective, palettes 8/16/24/32, heights 32/48/64.

**Measurements** unchanged for the calibration tests (height 31/47/63 px, diamond 41×21, flat colours exact); determinism holds for the ramp look (hash-equal frames across runs).

**Decisions** D-022 … D-028.

**Open**

- 16 colours: Mage skin merges with hair (D-028). 24 colours is a good default for characters with many materials; a material-id pass reserving a base for `_Head` is the planned fix.
- Inner lines (depth/normal edges) and selective AA on inner lines remain post-MVP.

## Phase 2c — Large masses (second review round) ✅ (stopped for review)

**Done**

- Smooth normals by position (`scene/smoothNormals.ts`), applied to character and part meshes.
- Hue-weighted texel → material assignment; light/depth passes in a linear render target.
- `smoothBands`: majority filter + island absorption of light bands inside one material.
- Depth pass (16-bit) and `addInnerLines`: 1-px lines on the far side of occlusions, in the material's own line colour.
- `removeIslands`: floating crumbs < 6 px erased; `composeFrame` bridges 30–50 % slivers between solid blocks (thin crests/blades stay continuous).
- 80 Vitest tests; Playwright suite green; review sheets regenerated (new, baseline, outline/palette/height comparisons).

**Decisions** D-029 … D-034.

**Open**

- The Knight's visor/face reads as a dark slit with eyes; acceptable for a helmeted knight, but a per-mesh material reservation (D-028) would still help at 16 colours.
- Inner lines are depth-only; normal-based crease lines (folds) are not drawn.

## Pivot spike — pixel matrices (no 3D) ✅ (all four decisions confirmed 16/10)

- `packages/sprite-kit`: template format (`format.ts`), composer (`compose.ts`), palette painter (`paint.ts`), 32 px body for S and W (`body32.ts`), parts (`parts32.ts`: helmet, sword, round shield, cape), offset-table clips (`anim.ts`), character builder (`character.ts`). Unit tests.
- `scripts/spike-sprite-kit.ts` renders ×8 sheets to `test-output/spike-matrix/` in Node (pngjs), no browser.
- Plan and open decisions in `docs/PIVOT.md` §5.

## Reference-image study ✅

- Measured the 4 reference images (native scale, palette size, ramps in OKLCh, outline colour and thickness, dithering, object sizes, light direction) with `scripts/research/`; findings and 14 derived rules in `docs/PIXEL_STYLE_REFERENCE.md`.
- Surveyed open-source pixel-art skills/tools (pixel-art-studio, pixel-plugin, aseprite-mcp, LPC generator, ramp generators); what to borrow is listed in PIXEL_STYLE_REFERENCE.md §5.
- Added `REFERENCE_RAMP_OPTIONS`, `buildTintedLine` (pixel-core) and `PaintOptions` with tinted/selective outlines (sprite-kit), with tests (D-037). `scripts/spike-sprite-kit.ts` now renders both looks; comparison in `test-output/spike-matrix/compare_ramps_x8.png`.
- Still open: the four pivot decisions in PIVOT.md §5; templates need real 3-tone shading (rule 3 and 8 of the new doc).

## M1 — sprite-kit as the core ✅

**Done**

- `packages/sprite-kit` is the pixel source of truth: registry (`human` body 24×32, pivot (12, 30); slots `head`, `hand_right`, `hand_left`, `back`; 10 colour targets bound to materials; drawable directions S/W/E), `render.ts` (`CharacterConfig` + `ProjectStyle` → painted frames, outline presets ink/soft/none, ×2 output, fps override, used-colour palette).
- Catalog v2 generated from the registry + `scripts/catalog-labels.yaml` by `pnpm assets:catalog`; a test keeps `catalog.json` in sync (D-038). `normalizeConfig`, the store and the Claude contract are unchanged.
- Web app without three.js: `PreviewPanel` (zoom ×4–×8, 8 direction buttons with undrawn ones disabled, play/pause, iso ground diamond) and `FramesPanel` (frame strip + palette), both fed synchronously by sprite-kit. Style panel: 32/64 px, ink/soft/none.
- Removed: 3D scene and render code, KayKit assets (18 MB), fetch/inspect scripts, asset report (D-039). `assets/LICENSES.md` rewritten.
- `pnpm sheets` renders review sheets through the real config path to `test-output/sheets/`.
- Tests: 103 Vitest (shared, pixel-core, sprite-kit incl. render path, scripts catalog sync, store, server) and a Playwright smoke test (boot, parts/colour/direction changes, determinism across reload, frame strip).

**Open / next (M2)**

- Templates still use mostly one tone per material; redraw body and parts with the 3-tone rule and top-left light (PIXEL_STYLE_REFERENCE.md §3), then add SW/NW/N views and the remaining clips (run, attack, hit, death).
- Palette lock, iso grid and style import/export stay in Phase 4; sheet/JSON/GIF/ZIP export in M4; describe in M5.

## M2 — full base: five views, six clips ✅ (reviewed in three batches)

**Done**

- Batch 1: S and W body and parts redrawn with three tones per material, one top-left light, closed tinted outline, 2×3 eyes with a glint (PIXEL_STYLE_REFERENCE.md §3). Templates are authored at full width so the light can be asymmetric.
- Batch 2: authored SW, NW and N views (head, torso, limbs, helmet, sword, shield back, capes); SE, E, NE mirrored (D-042). Walk tables per view. All eight directions in the catalog and the preview.
- Batch 3: canvas 32×32 (D-041); frame model with limb swaps, part poses, hidden limbs/parts and bespoke layers (D-043); clips run, attack (wind-up, slash, recover with upright, horizontal and diagonal sword poses), hit (knock-back away from the facing) and death (jolt, collapse, lying, hold). Review sheets: `pnpm sheets` → `test-output/sheets/knight_clips_x8.png`.
- Tests: frame counts per view, no frame touches the side or bottom edge (nothing clipped), swing uses the pose, death drops gear and lies on the sole row, run never cuts the head, hit direction.

**Open**

- The lying frame is one drawing for every direction and shows the bare head (gear dropped); the kneel frame hides the legs instead of folding them.
- Run in S/N differs from walk only by the leg lift and flight; a stronger lean/arm pose could come with the next template pass.
- Only one body (`human`) and four parts; M3 adds the library.

## Redraw from shapes ✅ (after the M2 review: "tạo hình chưa đủ tốt")

**Done**

- `draw.ts` (ellipse, rounded box, ASCII overlay, shifted-shape shading, trim, outline stripping) and `compose()` with the closed outer outline plus selective inner lines on overlap (D-044).
- `bodygen.ts`: parametric chibi in all five views; three proportion presets (`CHIBI_ROUND`, `CHIBI_CLASSIC`, `CHIBI_TALL`), `CHIBI_CLASSIC` in the registry pending the user's pick; `scripts/body-variants.ts` renders them.
- Parts: outer lines stripped from the hand-typed helmet/sword/shield; capes generated from shapes (wider than the body in S). Pose arms and the lying frame regenerated. All six clips and eight directions render through the new bodies; the clipping test is green.

**Open**

- The user's choice among A/B/C proportions; helmet, sword and shield are still hand-typed and could move to shapes for consistency.
- The side view (W) is narrow and flat compared with the front; a slightly wider side torso or a nose bump would help.

## Phase 3 — Directions, frames, sprite sheet, export ⏳

Not started.

## Phase 4 — Iso grid and project style ⏳

Not started.

## Phase 5 — Describe with Claude ⏳

Not started.

## Phase 6 — Polish ⏳

Not started.

## Hero 64 (đang làm, sau D-045)

- `packages/sprite-kit/src/hero64.ts`: mannequin 17×40 chép từ ảnh mẫu (bản lớn sạch làm chuẩn), tách bộ phận S có viền riêng (`heroViewS`), `heroFrames(view)` cho S/N/W (đứng + 2 bước đi), E = lật W. `hero64.frames.ts` sinh từ `scripts/research/gen_frames_ts.py`.
- `pixel-core`: `HERO_RAMP_OPTIONS` + `RampOptions.lineL` (viền nâu L 0,38).
- `heroforms.ts`: thể hình mập, to con bằng nhân hàng/cột; khổng lồ ×1,5 (25×60) và ×2 (33×80) vẽ tay trong `hero64.giant.ts` (không scale).
- Script xem: `scripts/hero-copy.ts` (S ×6 hai bảng màu), `scripts/hero-frames.ts` (12 khung ×4), `scripts/hero-forms.ts` (dàn thể hình ×4); ảnh so với mẫu trong `test-output/variants/`.
- `hero64.zombie.ts`: dáng zombie riêng (19×40): đầu gục xuống ngực và nghiêng, vai trái nhô, vai phải trễ, tay thõng xòe ngón, chân phải xoay ngang; dùng làm `FORM_ZOMBIE` cho Biến Thể.
- `hero64.heavy.ts`: thân to con vẽ tay (23×45), khuôn ngực sát ức, cơ bụng; thay bản nhân cột.
- `hero64.poses.ts`: 5 dáng zombie vẽ tay (gục đầu, vươn tay, lết chân, khom lưng, ngoẹo cổ) + dáng bò rình + 3 bản lật; mỗi dáng khai báo vùng áo quần, zombie mô tả bằng "look" (tóc/nón, áo, quần, giày, chi tiết) rồi tự mặc lên dáng. 8 zombie: dân thường nam/nữ, công nhân, cảnh sát, lính, VĐV nam/nữ, văn phòng. Nón/mũ là lớp cứng (`rigid`) rộng hơn hộp sọ; bước nghiêng đầu chỉ đặt ở hàng 3, 5, 6, 7, 9 của sọ.
- Đột biến (`MUTANTS`): Kẻ Thính (tai to, mắt khâu), Kẻ Bám Trần (dáng bò rình, tay dài tới đất có vuốt), Kẻ Mang Vỏ (thân to con + mai giáp sau lưng vẽ `under` + tấm giáp vai), Đột Biến (`hero64.mutants.ts`: khổng lồ ×1,5 với tay trái biến dị có vuốt, gai xương, mắt lồi, hàm răng), Kẻ Bắt Chước (vẽ lại theo sprite gốc của game: `POSE_STAND` đứng im như người thường, váy liền không tay màu trắng ngà tới ống chân với gấu rách là overlay `dress` của pose, tóc đen rối ngang vai để lộ mặt, hốc mắt trũng có chấm đỏ, nụ cười rộng tới mang tai có răng, mặt thường `face: 'plain'`, chân trần, vết máu trên váy; da xám ô-liu nhạt để tách khỏi váy).
- NPC thêm vào `CAST`: Bác sĩ Lan (tóc bob nâu đỏ sẫm, kính tròn, áo blouse trắng dài tới đùi hở vạt trước là overlay `COAT_TAILS`, quần xanh, giày sẫm) và Lính Nhiễm (builder zombie trên `POSE_DRAG`: nón sắt, quân phục ô-liu rách một tay áo, lở loét trên hai cẳng tay, thẻ bài trên ngực, mắt đỏ, giày vải màu đất).
- **Đủ 8 hướng cho nhân vật thân gốc đứng** (Dương, Ny, Sơn, Ông Tư, Bác sĩ Lan, Kẻ Bắt Chước, 5 lính): `hero64.views.ts` vẽ tay hai góc SW và NW (17×40) từ S/W/N; `views64.ts` khai báo vùng áo quần của thân đứng cho từng góc (`STAND_VIEWS`, cùng kiểu `ZombiePose`); `wearView(look, view)` mặc theo góc; tóc/mũ/kính/râu/túi/vạt áo vẽ riêng từng góc trong `views64.items.ts` (sinh từ `scripts/research/gen_view_items.py`, script này ghép từng hình lên thân góc đó và báo ô hở viền / ô lẻ trước khi sinh TS). SE/E/NE lật từ SW/W/NW (D-042, lật thường). `scripts/hero-views.ts` ra lưới 8 hướng (`ONLY=id`, `DUMP=path`). Dương đổi sang tóc dựng ba chỏm (`HAIR_SPIKY`); `dress()` tự nới canvas theo mọi lớp vẽ và trả `ox`/`oy` (tóc vượt lên trên sọ, mũ rộng hơn thân góc W), không cần khai báo tay. Sửa theo góp ý: nón góc W từng mất viền mép trước vì bị cắt ở cột −1; đỉnh tóc nhìn từ sau bỏ vệt ngôi (hai ô bóng đọc thành mắt); tóc xoăn và bob góc W vẽ lại phần sau tròn, ôm xuống gáy thay vì vách thẳng; ở góc W phần tóc "trước tai" của bob/xoăn/vuốt nằm ở cột 6–8 (trước vành tai), không còn lọn đè trước mắt kẹp với gọng kính thành vệt thừa; gọng kính góc SW kéo tới tai. Quy tắc rút ra khi vẽ tóc sẫm: không tô nguyên hàng/cột bóng `H` sát viền (bóng và viền nhuốm màu gần nhau nên thành đường mờ song song với viền); chỉ đặt cụm bóng 2–3 ô ở góc dưới phải. Chưa có: khung đi bộ SW/NW, mặc đồ cho khung đi bộ, các form khác (to con, mập, khổng lồ, 8 dáng zombie, đột biến) ở góc ngoài S.
- **Dáng zombie ở các góc còn lại** (`poseviews64.ts`, `scripts/research/gen_pose_views.py`, `hero64.poses.views.ts` sinh ra): góc W vẽ tay cho 6 dáng (gục đầu, vươn tay, lết chân với chân kéo lê phía sau, khom lưng với bướu lưng cao hơn đầu, ngoẹo cổ dùng đầu SW quay về phía người xem, bò bốn chân); góc N suy từ thân S của dáng (lật gương, bỏ vệt sáng ngực thành lưng, đầu N gắn đúng chỗ với độ nghiêng ngược, cổ áo thành đường thẳng, bỏ cà vạt/phù hiệu/khóa thắt lưng); góc SW/NW là thân S/N gắn đầu 3/4 của góc đó. Dáng lật (`_m`) dùng chung hình W của dáng gốc, góc sau lật từ góc sau của dáng gốc. Tóc ngắn, tóc dài, băng đô, nón bảo hộ, mặt zombie (hốc mắt, miệng, vết rách má, vết thương da đầu), tai và mắt khâu của Kẻ Thính có hình theo góc. `POSED_LOOKS`/`posedInView(view)`; `scripts/hero-pose-views.ts` ra lưới 8 hướng cho 8 zombie, Lính Nhiễm, Kẻ Thính, Kẻ Bám Trần. Chưa có: Hùng/Kẻ Phun/Kẻ Mang Vỏ/Đột Biến ngoài góc S.
- **Mọi góc của mọi dáng là một hình đã kiểm tra** (sửa sau góp ý "góc sau của lính khom không ổn"): `gen_pose_views.py` giờ đọc thân S, vị trí lưới đầu và vùng áo quần của 6 dáng từ `DUMP` của `scripts/hero-views.ts`, tự suy các góc chưa vẽ tay (SW = thân S + đầu SW; N = thân S lật, san bóng trong khung ngực, đầu N; NW = mặt sau của hình SW; dáng lật có góc N riêng, dùng chung W/SW/NW với dáng gốc), kiểm tra từng hình (viền kín, ô lẻ, ô da hở, lỗ ≥3 ô) rồi ghi tất cả vào `hero64.poses.views.ts`; `poseviews64.ts` chỉ còn đọc dữ liệu. Phép kiểm mới lộ ra: góc N suy ra bị hở nguyên hàng dưới cằm (đầu N thiếu hàng cổ), đầu SW/N của các dáng `posedFigure` lệch một cột (gốc lưới đầu là `headX`, chỉ zombie gục đầu vẽ từ cột 0), hai ô viền hở sẵn ở thân S ngoẹo cổ và bò, gấu áo rách góc W của Kẻ Thính có chấm không chạm viền. **Thân 3/4 vẽ tay cho cả sáu dáng** (`DROOP_SW`, `REACH_SW`, `DRAG_SW`, `HUNCH_SW`, `TWIST_SW`, `CRAWL_SW`), cùng một quy tắc: tay xa khuất sau thân chỉ lộ một cột da, vai xa thu vào, sườn gần đổ bóng một cột, chân xa hẹp hơn một cột khi tay không buông dọc chân, bàn chân xa ngắn một ô, bàn chân gần quay về người xem; đầu đặt đúng chỗ của góc S. Riêng từng dáng: vươn tay dùng khung 21 cột để hai bàn tay lệch một cột về phía xa và tay gần che sườn; lết chân có bàn chân kéo lê ngắn hai ô (chỉa ra sau, xa người xem); khom lưng thu vai xa hai cột, bàn tay xa quay vào cạnh gối, chân giữ bề rộng; ngoẹo cổ giữ hai gối chạm nhau; bò chỉ hẹp tay xa một cột. NW là mặt sau của hình SW (khom lưng giữ bản NW có bướu che gáy).
- **Thân to con đủ 8 hướng** (Hùng, Kẻ Mang Vỏ): `STAND_HEAVY` trong `views64.ts` khai báo vùng áo quần của thân 23×45 (giếng cổ giữa hai dây áo ba lỗ cột 7 và 15, tay dày năm cột tới hàng 34, hông hàng 34, chân 35–40, giày 41–44); thân này vào cùng pipeline với dáng zombie: `HEAVY_W` (20×46, đế thấp hơn một hàng như thân đứng; ngực nhô ra trước tay, tay buông giữa sườn, nên áo có cả mặt trước lẫn mặt sau khi nhìn nghiêng) và `HEAVY_SW` vẽ tay, N/NW suy ra. Đầu trọc: đầu gốc góc W/N/SW/NW để mảng bóng gáy tối (chỗ tóc che) nên người trọc nhìn như có tóc; `BALD_V` làm sáng vùng đó theo góc, chỉ giữ bóng ở gáy dưới. Hùng và Kẻ Mang Vỏ đổi từ outfit viết tay sang `Look` trên `STAND_HEAVY` (`wearPosed`), nên có mặt trong `posedInView`, QA và lưới 8 hướng. Mai giáp của Kẻ Mang Vỏ vẽ theo góc (`SHELL_V`): đỉnh mai ở hàng 4 (S không ràng buộc vì bị đầu che); từ sau mai phủ kín lưng và tay trên, chỉ ló đỉnh đầu; góc W là vòm sau lưng (vẽ dưới thân); SW/NW dịch hình lưng về phía gần; tấm giáp vai theo góc.
- **Thân mập đủ 8 hướng** (Kẻ Phun): `STAND_FAT` là `FORM_FAT` (nhân cột từ thân gốc) khai báo thành dáng; SW, N, NW áp cùng dải nhân cột lên thân gốc của góc đó (script tự dựng lại thân S và so với `buildForm(FORM_FAT)` để chắc cùng một phép); W nhân cột tay: đầu sâu thêm hai cột, lưng dày thêm hai cột, bụng nhô ra trước tay. Dải nhân cột sửa lại để mỗi hàng viền chỉ bước một cột (hàng 0–16 +2, 17–23 +4, 24–28 +6): thân S cũ có ô da lộ ở đỉnh đầu và vai do bước nhảy hai cột. Đầu rộng hơn đầu gốc nên `PoseViewData.headCols` ánh xạ từng cột lưới đầu sang cột hình cho tóc/mũ. Kẻ Phun đổi sang `Look` (`wearPosed`), mụn mủ vẽ theo góc (`PUSTULES_V`).
- **Đột Biến đủ 8 hướng**: `STAND_BRUTE` khai báo thân 31×60 (khổng lồ ×1,5 + tay vuốt + gai) thành dáng; trong script: góc W vẽ tay 22×61 (tay vuốt đặt phía gần để nét đặc trưng còn thấy khi nhìn nghiêng, theo tinh thần D-042; gai dựng trên vai gần trước quai hàm); góc SW sửa từ S (mắt trượt ra mép xa, mất tai xa, tay vuốt lùi hai cột sau thân, sườn gần đổ bóng, vuốt rủ trước đùi); góc N lật S, san bóng thân, nửa dưới đầu vẽ lại thành gáy trọc (da trung, bóng dưới phải, hai tai); NW là mặt sau của SW với gáy hẹp một cột phía xa. Mắt lồi, hàm răng, mụn đặt theo góc (`BRUTE_FACE_V`); Đột Biến đổi sang `Look` (`wearPosed`). Sửa thân khổng lồ S: hai ô đỉnh cơ thang (hàng 21) chưa có viền phía trên. **Lưng gù nhìn từ sau vẽ tay** (`HUNCH_N`): bướu nhô giữa hai vai che gáy, đầu nằm sau thân (`headUnder`), `FormSpec.front` giữ ô thân trước mọi lớp tóc/mũ nên mũ sắt chỉ ló phần trên bướu. `scripts/hero-qa.ts` chạy thêm trên zombie ở mọi góc và báo lỗ kín. Ảnh: `scripts/hero-pose-views.ts` (`ONLY=`, `SCALE=`).
- **Lint cầm bút pixel và skill vẽ** (sau góp ý "chưa ưng chất lượng, kiếm thêm skill vẽ pixel"): khảo sát skill/plugin/tài liệu (xem D-054), không có cái nào thay được việc vẽ ma trận, nên lấy định nghĩa đo được của các lỗi kinh điển làm `scripts/research/pixel_lint.py` (viền đôi, bậc giật, dải thẳng hàng, sọc ôm viền; pillow và ô mồ côi tùy chọn), ngưỡng hiệu chỉnh để mannequin chép từ ảnh mẫu không bị báo. Lint chạy trong `gen_pose_views.py` và `pnpm qa:pixel`. Nó lộ ra lỗi hệ thống của các thân vẽ sau mẫu: vệt sáng/bóng của tay chân là sọc dọc suốt chiều dài sát viền, hai dải bằng nhau xếp chồng ở sườn và tay; sửa trên thân S (zombie, khổng lồ, to con, dáng khom và bò), các thân SW/N/W vẽ tay và tay vuốt của Đột Biến theo mẫu: sáng 4 hàng trên bắp, khuỷu trơn, cẳng tay một vệt ngắn, sườn là cụm 2–3 ô (cảnh báo 120 → 95; phần còn lại là viền đôi ở chỗ hai bộ phận chạm nhau, tay ngang 2 ô ở góc W, vài dải đúng ngưỡng 7 ô). Quy tắc cầm bút, quy trình và bảng lỗi đã bị bắt gom vào `.claude/skills/pixel-art/SKILL.md`; CLAUDE.md yêu cầu đọc trước khi sửa template; thêm `pnpm qa:hero`.
- **Tạo hình đưa về đúng form mẫu** (sau góp ý "tạo hình các nhân vật bị lỗi dù có form mẫu trước đó" và "người khổng lồ vẽ chứ không scale"): đo từng thân so với mannequin lộ ra thân gục đầu và khom lưng rộng 9 ô (mẫu 7), vươn tay và ngoẹo cổ chân ngắn 2 hàng, lết chân ngắn 1 hàng, thân to con vẽ tay có đùi ngắn 3 hàng so với form nhân hàng đã duyệt, và hai người khổng lồ là mannequin phóng 1,5×/2× từng ô (mắt 3–4 ô, mảng sáng nhân theo tỉ lệ). Sửa: năm thân S của dáng zombie dựng lại từ đúng ma trận mannequin (thân 7 ô, tay 3 ô, đũng ở hàng 29, chân 11 hàng), chỉ đổi phần thuộc về dáng: gục đầu có bướu vai trái, tay phải trễ 2 hàng với nắm tay rủ **trước** hông, đầu nghiêng 0/1/2 cột để cằm rơi đúng mép thân; khom lưng có tay rủ trước mép đùi tới gối; vươn tay giữ khối bàn tay, hông và chân lấy từ mẫu; ngoẹo cổ và lết chân bớt một hàng thân (đầu lún xuống) để chân đủ dài. Thân 3/4 (SW) và mặt sau khom lưng vẽ lại theo cùng cách trên mannequin SW; mọi góc còn lại sinh và kiểm tra lại. Thân to con: đũng lên hàng 31, chân 13 hàng (như `FORM_HEAVY` nhân hàng cũ) ở S/W/SW, vùng áo quần theo. Người khổng lồ ×1,5 và ×2 sinh từ `scripts/research/gen_giants.py` (`hero64.giant.ts`): giữ silhouette nhưng mọi nét ở cỡ pixel (mắt 2–3 ô cao 3–4 dưới chân mày 2 ô, nắm tay một đường ngón, đốt ngón một hàng), bóng đặt tay (vòm sáng lệch trên–trái, vạch xương đòn và bóng dưới ngực, hai cặp cơ bụng, cụm bóng sườn, sáng chi chỉ ở hàng trên bắp và một vệt ngắn cẳng); mặt Đột Biến ở góc SW/W vẽ lại theo mắt mới. Kết quả: `problems: 0`, QA sạch, cảnh báo lint không tăng, 113 test.
- **Mô hình đánh giá đo được** (sau góp ý "mọi thứ vẫn không đạt, cần mô hình đánh giá chính xác và tiêu chuẩn cao hơn"): `docs/QUALITY_BAR.md` + `pnpm qa:score` (`scripts/hero-score-dump.ts` xuất 130 sprite 1×, `scripts/research/score.py` đo trong không gian ảnh bằng cùng hàm với nhân vật mặc đồ của ảnh mẫu đã đưa về 1×, số đo mẫu lưu ở `scripts/research/reference_figure.json`). Kết quả thật: **0/130 đạt**; khoảng cách lớn nhất là mảng phẳng (12,6 % so với 5,3 % của mẫu) và tông áo (ta sáng 20 %/tối 17 %, mẫu sáng 10 %/tối 40 %); 28 cặp nhân vật có silhouette chỉ khác màu. Ba khoảng cách cấu trúc ghi ở QUALITY_BAR §5 chờ chốt: số bậc sáng (mẫu 5–6, ta 3), lớp cắt may cho áo thay vì remap, silhouette riêng từng nhân vật.
- **Sửa mắt theo mẫu và mở 5 bậc sáng** (sau khi chủ dự án chốt làm cả ba việc ở QUALITY_BAR §5, bắt đầu từ mắt): đối chiếu từng ô với mannequin mẫu ở 1× cho thấy bản chép đúng 100 % trừ mắt; mắt sửa thành mống một cột navy-trên-xanh-dưới (`E`/`e`) với trắng chỉ ở hai hàng dưới, ở S, SW và góc ngang (cả khung đi), mống người thường đổi sang xanh bão hoà của mẫu. Định dạng ô lên 5 bậc (D-057): `buildRamp5`, `HERO_CLOTH_RAMP_OPTIONS`, `HERO_RAMPS`, cặp chữ sâu/chói cho mỗi vật liệu, lint biết glyph mới. Điểm `qa:score` trước/sau: 0/130 → 0/130 (hai bước này chưa đổi số đo gộp; bước kế là cắt may và tóc).
- **Cắt may** (D-058, `tailor64.ts`): áo quần tô lại như vải sau remap theo hộp của món. Số đo trước/sau: áo sáng/tối 19,8/17,7 % → 9,5/45,8 % (mẫu 10/40); rớt "áo tối" 118 → 35; chất liệu 4 → 5; mảng phẳng 12,6 → 11,2 %; đạt vẫn 0/130 (mảng phẳng do tóc, lint do ranh bóng). Khuy và túi chỉ ở S/SW.
- **Tóc có lọn + sàn cho chất liệu tối** (D-059): bảy kiểu tóc vẽ lại ở S, SW, W, N/NW với lọn 2–3 ô (ô sáng mở đầu, ô bóng/khe sâu kết thúc), chói `J` ở đỉnh, mái chờm lông mày; tóc xoăn thành múi. Dải màu: bóng sâu không dưới L 0,17, viền không dưới 0,10, xám trung tính bớt ngả vàng. Số đo trước/sau: đạt 0 → 2/130; mảng phẳng rớt 115 → 96; chất liệu 38 → 17; đường nét 18 → 13; mật độ nét 14 → 9; lint 128 → 128; silhouette trùng 28 (chưa động). Còn lại của bước tóc: ảnh ×16 cho thấy tóc đen vẫn tối hơn mọi tông khác của sprite nên cần kiểm tra lại khi làm silhouette riêng.
- **Thước đo sáng/tối hết lật** (D-060): tông nền = tông gần trung vị khi hai tông đầu đều ≥ 25 %. Số đo mẫu không đổi. Đạt 2 → 4/130; áo sáng rớt 42 → 13, áo tối 54 → 21. Còn lại theo thứ tự lớn: lint 111 (ranh bóng theo quy tắc), mảng phẳng 96 (mũ sắt/nồi/lưỡi trai một tông, váy trắng, da Kẻ Phun), da góc sau 34.
- **Mảng phẳng theo chất liệu + tóc dải chéo sinh tự động** (D-061): thước mới cho bức tranh thật (rớt: quần 93, áo 89, da 47, tóc 45, cloth2 25, giày 19 trên 130); tóc mọi kiểu trừ xoăn tô lại bằng `apply_locks.py` (tóc rớt 63 → 45 sau khi đổi sang dải 2 ô; mảng tóc lớn nhất của Sơn 37 → ≤ 12 ô); mũ sắt/nồi/lưỡi trai/bảo hộ tô vòm theo một quy tắc (`retone_hats`, ánh sáng trên–trái ở mọi góc). Đạt 2/130. Bước kế: cấu trúc áo quần trong `tailor64.ts` (nếp, đường may, gối, ống) để chia mảng ≤ 22,6 % mỗi món; da thân trần (Kẻ Phun, Đột Biến, Kẻ Mang Vỏ).
- Ny: tóc xoăn (`HAIR_CURLY`, viền lượn sóng rộng hơn sọ, vệt xoăn 2 ô) để khác Bác sĩ Lan. Bảng màu quân đội dùng chung `ARMY` (áo ô-liu, quần, mũ/nồi xanh sẫm `cloth2`, giày sẫm, kim loại) cho zombie quân đội, Lính Nhiễm và bộ lính chưa nhiễm.
- `SOLDIERS` (lính chưa nhiễm, thân gốc đứng, mặt thường): nón sắt + rằn ri, mũ nồi (`BERET`) + phù hiệu, đầu đinh áo thun + thẻ bài, lính nữ mũ lưỡi trai + tóc đuôi ngựa, quân y nón sắt + túi chữ thập. Builder `zombie()` đổi tên thành `wear()` vì dùng chung. `scripts/hero-cast.ts` có `SET=soldiers`.
- Ông Tư: râu quai nón rậm màu xám đậm (`BEARD`: ria, đường miệng ngăn ria với râu, râu rộng hơn hàm xuống tới cổ áo). Mũ `rigid` giờ dịch ngang theo hàng mắt thay vì hàng đáy mũ, nên trên đầu nghiêng (Lính Nhiễm, zombie cảnh sát) mũ nằm giữa mặt.
- Sửa theo góp ý: tai Kẻ Thính vẽ lại dựng đứng bên sọ, nằm trong một cột ngoài lưới đầu nên không bị khung 19 cột cắt mất viền, và vẽ `under` để sọ giữ nguyên nét; mũ vẽ sau mặt nên vết rách má không còn in lên mũ. `scripts/hero-cast.ts` nền xem mặc định xám trung tính (`BG=r,g,b` đổi được) vì nền sáng làm nhân vật trắng mất hình.
- `scripts/hero-qa.ts`: kiểm tra tự động trước khi gửi ảnh (viền lẻ, pixel trôi nổi, da lộ trên mũ, bước nghiêng đầu làm đứt viền sọ). `scripts/hero-cast.ts` nhận `SET=cast|zombies|mutants|all`.
- `outfit64.ts` + `cast64.ts`: mặc đồ bằng đổi vật liệu theo vùng + lớp vẽ thêm (tóc, nón, kính, túi); dàn Vùng Xanh: Dương, Hùng (to con), Ny (áo bạc hà để không lẫn với áo blouse trắng của Bác sĩ Lan), Sơn, Ông Tư, Biến Thể, Kẻ Phun (mập). Script `scripts/hero-cast.ts`.
- Chưa làm: tách bộ phận cho N/W, mặc đồ cho khung đi bộ (và khung đi SW/NW), nhân vật Vùng Xanh còn lại (Mai, Kẻ Lang Thang, Bầy Chuột Đỏ), đưa thân hero vào registry/catalog.
