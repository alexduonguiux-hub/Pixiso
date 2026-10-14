# Pixiso — công cụ tạo nhân vật pixel art isometric

Web app giúp người **không biết vẽ, không biết dựng 3D** tạo nhân vật pixel art isometric có animation. Đầu ra là sprite sheet + JSON dùng được cho mọi engine.

**Đọc `docs/HANDOFF.md` trước khi làm bất cứ việc gì.** File đó là đặc tả đầy đủ, chia theo phase, có tiêu chí nghiệm thu.

## Stack

- Monorepo **pnpm workspaces**, TypeScript strict ở mọi package.
- `apps/web`: Vite + React + three.js. Gồm UI ghép nhân vật, viewport 3D, preview pixel, xuất file.
- `apps/server`: Node 20+, Hono (hoặc Express) và `@anthropic-ai/sdk`. Chỉ server giữ API key và gọi Claude API.
- `packages/pixel-core`: hàm thuần (không DOM, không WebGL), gồm:
  - giảm màu và bảng màu;
  - viền, dọn pixel lẻ, ngưỡng alpha;
  - xếp sprite sheet, sinh JSON kiểu Aseprite.
- `packages/shared`: kiểu dữ liệu dùng chung (`CharacterConfig`, catalog) và schema zod.
- `scripts/`: tải asset, khảo sát asset, sinh `catalog.json`.
- Test:
  - Vitest cho logic;
  - Playwright (Chromium headless) cho test render WebGL.

## Lệnh (giữ đúng tên khi tạo `package.json`)

| Lệnh | Việc |
|---|---|
| `pnpm install` | Cài đặt |
| `pnpm dev` | Chạy web + server cùng lúc |
| `pnpm test` | Vitest toàn repo |
| `pnpm test:render` | Playwright render tests |
| `pnpm typecheck` | `tsc --noEmit` mọi package |
| `pnpm assets:fetch` | Tải KayKit (CC0) vào `assets/vendor/` |
| `pnpm assets:inspect` | Sinh `docs/ASSET_REPORT.md` |
| `pnpm assets:catalog` | Sinh `packages/shared/catalog.json` |

## Nguyên tắc bất biến

1. **Code quyết định pixel, Claude chỉ quyết định cấu hình.**
   - Claude API chỉ trả về JSON theo schema, chọn từ catalog.
   - Không bao giờ để LLM sinh hay sửa pixel.
2. **Pixel-perfect.**
   - Tắt antialias, dùng `NearestFilter`.
   - Ảnh xuất ra không có pixel bán trong suốt.
   - Số pixel trên mỗi mét là cố định, điểm neo cố định ở chân nhân vật.
3. **Tất định.** Cùng cấu hình và cùng môi trường thì phải ra cùng byte PNG. Cấm dùng random không có seed.
4. **Phép chiếu 2:1 dimetric.**
   - Camera orthographic, góc ngẩng 30°, phương vị 45°.
   - Camera và đèn đứng yên; chỉ xoay nhân vật, mỗi bước 45°.
5. **Bảo mật API key.**
   - `ANTHROPIC_API_KEY` chỉ đọc từ `.env` ở server, không log, không gửi xuống trình duyệt.
   - Thiếu key thì app vẫn chạy; chỉ tính năng "Mô tả" bị tắt kèm thông báo rõ ràng.
6. **Giấy phép asset.**
   - Chỉ đóng gói asset CC0 (KayKit).
   - Không bao giờ commit file Mixamo.
   - Ghi nguồn và giấy phép vào `assets/LICENSES.md`.
7. **Không thêm dependency lớn** mà không ghi lý do vào `docs/DECISIONS.md`.

## Cách làm việc

- **Làm theo đúng thứ tự phase** trong `docs/HANDOFF.md`.
- **Hết mỗi phase:**
  - chạy `pnpm typecheck && pnpm test`, và `pnpm test:render` nếu có;
  - cập nhật `docs/PROGRESS.md` (đã làm, quyết định đã chốt, việc còn lại);
  - commit.
- **Spec không nói rõ:**
  - chọn phương án đơn giản nhất, ghi vào `docs/DECISIONS.md` rồi làm tiếp;
  - chỉ hỏi người dùng khi quyết định không thể đảo ngược.
- **Tự kiểm tra bằng mắt.**
  - Sau mỗi thay đổi liên quan render, xuất ảnh mẫu vào `test-output/` (đã gitignore).
  - Phóng to nearest ×8 rồi tự xem ảnh trước khi báo xong.
- **Ngôn ngữ:** UI tiếng Việt, gom chuỗi vào một file để sau này làm i18n. Code và comment viết tiếng Anh.
- **Commit:** nhỏ, theo từng tính năng, thông điệp rõ ràng.
