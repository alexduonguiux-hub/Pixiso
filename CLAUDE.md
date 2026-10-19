# Pixiso — công cụ tạo nhân vật pixel art isometric

Web app giúp người **không biết vẽ, không biết dựng 3D** tạo nhân vật pixel art isometric có animation. Đầu ra là sprite sheet + JSON dùng được cho mọi engine.

**Đọc `docs/HANDOFF.md` trước khi làm bất cứ việc gì.** File đó là đặc tả đầy đủ, chia theo phase, có tiêu chí nghiệm thu.

**Pivot 16/10/2026:** không còn render từ model 3D. Nhân vật được **vẽ trực tiếp trên lưới pixel** bằng ma trận ngữ nghĩa trong `packages/sprite-kit`. Đọc thêm `docs/PIVOT.md` (kế hoạch M1–M5) và `docs/PIXEL_STYLE_REFERENCE.md` (quy tắc vẽ đo từ ảnh tham chiếu). Trong HANDOFF, mục 5 (asset KayKit), 6.1–6.5 (render 3D) và Phase 1–2 đã bị thay thế; mục 2, 3, 7, 8, 9 vẫn là đích.

## Stack

- Monorepo **pnpm workspaces**, TypeScript strict ở mọi package.
- `apps/web`: Vite + React. Gồm UI ghép nhân vật, preview pixel (vẽ từ sprite-kit, không WebGL), xuất file.
- `apps/server`: Node 20+, Hono (hoặc Express) và `@anthropic-ai/sdk`. Chỉ server giữ API key và gọi Claude API.
- `packages/pixel-core`: hàm thuần (không DOM, không WebGL), gồm:
  - giảm màu và bảng màu;
  - viền, dọn pixel lẻ, ngưỡng alpha;
  - xếp sprite sheet, sinh JSON kiểu Aseprite.
- `packages/sprite-kit`: nguồn sự thật của pixel. Template ASCII ô (vật liệu + bậc sáng), ghép lớp theo điểm neo trên khung 24×32, animation là bảng offset từng chi, tô màu bằng dải hue-shift của pixel-core; `render.ts` biến `CharacterConfig` + `ProjectStyle` thành khung hình. Registry (thân, slot, bộ phận, mục tiêu màu, hướng vẽ được) là nguồn sinh catalog.
- `packages/shared`: kiểu dữ liệu dùng chung (`CharacterConfig`, catalog) và schema zod.
- `scripts/`: sinh `catalog.json` từ registry sprite-kit + `scripts/catalog-labels.yaml`; render sheet kiểm tra; script nghiên cứu ảnh tham chiếu (`scripts/research/`, Python, chỉ dùng khi nghiên cứu).
- Test:
  - Vitest cho logic;
  - Playwright (Chromium headless) cho test preview trên trình duyệt.

## Lệnh (giữ đúng tên khi tạo `package.json`)

| Lệnh | Việc |
|---|---|
| `pnpm install` | Cài đặt |
| `pnpm dev` | Chạy web + server cùng lúc |
| `pnpm test` | Vitest toàn repo |
| `pnpm test:render` | Playwright render tests |
| `pnpm typecheck` | `tsc --noEmit` mọi package |
| `pnpm assets:catalog` | Sinh `packages/shared/catalog.json` từ sprite-kit + nhãn (có test giữ file đồng bộ) |
| `pnpm sheets` | Render sheet ×8 vào `test-output/sheets/` để tự xem bằng mắt |
| `pnpm qa:hero` | Kiểm tra hình nhân vật ở mọi góc (viền sọ, da hở trên mũ, lỗ kín) |
| `pnpm qa:pixel` | Lint cầm bút pixel (viền đôi, bậc giật, dải thẳng hàng, sọc ôm viền) trên thân và mọi góc dáng |
| `pnpm qa:score` | Chấm điểm mọi nhân vật ở 5 góc theo thước đo của ảnh mẫu (số tông, mảng phẳng, đường chi tiết, tỉ lệ sáng/tối, silhouette) → `test-output/score/report.md`; chuẩn trong `docs/QUALITY_BAR.md` |
| `pnpm qa:1x` | **Thước nghiệm thu chính** (D-088): đo ở cỡ thật — mảng rời khỏi thân và ô da đơn phải bằng 0, mảnh vật liệu dưới 3 ô và số cặp nhân vật dễ lẫn không được tăng → `test-output/score/report_1x.md` |

## Nguyên tắc bất biến

1. **Code quyết định pixel, Claude chỉ quyết định cấu hình.**
   - Claude API chỉ trả về JSON theo schema, chọn từ catalog.
   - Không bao giờ để LLM sinh hay sửa pixel.
2. **Pixel-perfect.**
   - Mọi pixel do template quyết định; phóng to chỉ bằng nearest với hệ số nguyên (32 px gốc, xuất ×1 hoặc ×2).
   - Ảnh xuất ra không có pixel bán trong suốt, không dithering, không anti-alias ra nền.
   - Khung và điểm neo (chân nhân vật) cố định cho mọi khung hình của một thân.
3. **Tất định.** Cùng cấu hình và cùng môi trường thì phải ra cùng byte PNG. Cấm dùng random không có seed.
4. **Góc nhìn 2:1 isometric, vẽ tay.**
   - Một nguồn sáng trên–trái cho mọi hướng; dải sáng/bóng tính theo vị trí trên màn hình sau khi lật.
   - Mỗi hướng là một góc nhìn vẽ riêng (S, SW, W, NW, N); hướng đối xứng lấy bằng lật ngang. Bước xoay 45°.
5. **Bảo mật API key.**
   - `ANTHROPIC_API_KEY` chỉ đọc từ `.env` ở server, không log, không gửi xuống trình duyệt.
   - Thiếu key thì app vẫn chạy; chỉ tính năng "Mô tả" bị tắt kèm thông báo rõ ràng.
6. **Giấy phép asset.**
   - Không đóng gói asset bên ngoài; mọi template là tác phẩm của dự án, giấy phép do chủ dự án đặt.
   - Không bao giờ commit file Mixamo hay ảnh tham chiếu chưa rõ bản quyền.
   - Ghi nguồn và giấy phép vào `assets/LICENSES.md`.
7. **Không thêm dependency lớn** mà không ghi lý do vào `docs/DECISIONS.md`.

## Cách làm việc

- **Làm theo kế hoạch M1–M5** trong `docs/PIVOT.md` §5; tiêu chí nghiệm thu xuất file và Claude lấy từ HANDOFF §7, §9, §10.
- **Hết mỗi phase:**
  - chạy `pnpm typecheck && pnpm test`, và `pnpm test:render` nếu có;
  - cập nhật `docs/PROGRESS.md` (đã làm, quyết định đã chốt, việc còn lại);
  - commit.
- **Spec không nói rõ:**
  - chọn phương án đơn giản nhất, ghi vào `docs/DECISIONS.md` rồi làm tiếp;
  - chỉ hỏi người dùng khi quyết định không thể đảo ngược.
- **Trước khi vẽ hay sửa bất kỳ ma trận pixel nào, đọc `.claude/skills/pixel-art/SKILL.md`** (quy tắc cầm bút, quy trình sinh và kiểm tra, lỗi đã bị bắt). Sau khi sửa: `pnpm qa:1x` phải qua (thước nghiệm thu chính từ 19/10: cỡ thật 1×), `pnpm qa:pixel` và `pnpm qa:hero` phải sạch hoặc không tệ hơn trước; `pnpm qa:score` (thước ×6 của các vòng giám khảo) chỉ còn để tham khảo, ghi số nhưng không chặn; nghiệm thu theo `docs/QUALITY_BAR.md`, không theo cảm tính.
- **Tự kiểm tra bằng mắt.**
  - Sau mỗi thay đổi liên quan render hoặc template, chạy `pnpm sheets` (ảnh ×8 trong `test-output/sheets/`, đã gitignore).
  - Tự xem ảnh và đối chiếu 14 quy tắc trong `docs/PIXEL_STYLE_REFERENCE.md` §3 trước khi báo xong.
- **Ngôn ngữ:** UI tiếng Việt, gom chuỗi vào một file để sau này làm i18n. Code và comment viết tiếng Anh.
- **Commit:** nhỏ, theo từng tính năng, thông điệp rõ ràng.
