# Pixiso: Tài liệu bàn giao cho Claude Code

> Đặt file này tại `docs/HANDOFF.md`, còn `CLAUDE.md` ở gốc repo. Đây là đặc tả cho **bản thử nghiệm (MVP)**.
> Các quyết định ở mục 1 đã chốt sau một vòng nghiên cứu. Chỉ đổi khi có lý do kỹ thuật rõ ràng và phải ghi lại vào `docs/DECISIONS.md`.

---

## 0. Câu lệnh khởi động (dán vào Claude Code)

```
Đây là dự án Pixiso. Hãy đọc kỹ CLAUDE.md và docs/HANDOFF.md.
1) Tóm tắt kế hoạch của bạn trong tối đa 15 dòng, kèm danh sách điểm nào trong spec còn mơ hồ hoặc rủi ro.
2) Bắt đầu Phase 0 ngay, không cần chờ tôi duyệt, trừ khi gặp quyết định không thể đảo ngược.
3) Làm lần lượt từng phase. Hết mỗi phase thì chạy typecheck và test, cập nhật docs/PROGRESS.md rồi commit.
4) DỪNG lại sau Phase 2 và gửi tôi ảnh pixel mẫu (phóng to ×8) để duyệt hướng nhìn trước khi làm tiếp.
```

---

## 1. Bối cảnh và các quyết định đã chốt

| Vấn đề | Quyết định | Lý do |
|---|---|---|
| Loại asset trọng tâm | **Nhân vật có animation**, 8 hướng, isometric | Nhu cầu chính của người dùng |
| Đầu ra | **Sprite sheet PNG + JSON kiểu Aseprite**, không phụ thuộc engine | Người dùng dùng nhiều engine khác nhau |
| Cách tạo hình | **Model 3D có rig → render ra pixel** (không vẽ 2D bằng AI) | Mỗi nhân vật có hàng trăm frame (8 hướng × nhiều animation). Chỉ 3D mới giữ được tỷ lệ, ánh sáng và chi tiết đồng nhất |
| Người dùng | **Không biết vẽ, không biết 3D** | Họ chỉ **mô tả, chọn, chỉnh**; không bao giờ phải vẽ hay dựng model |
| Cách người dùng tạo | **Ghép bộ phận** từ thư viện dùng chung một skeleton, đổi màu theo bảng màu, chọn animation trong thư viện | Kết quả luôn hợp lệ và đồng bộ. Mọi animation chạy được với mọi cách phối |
| Vai trò Claude API | **"Bộ não"**: mô tả tiếng Việt → JSON cấu hình (structured outputs). Không sinh pixel | Code quyết định pixel, Claude quyết định cấu hình |
| Asset khởi đầu | **KayKit Character Pack: Adventurers** (CC0) | Đã rig sẵn, có animation, có phụ kiện, được phép dùng thương mại không cần ghi tên |
| Nền tảng | Web (three.js), server Node nhỏ để giữ API key | Không cần cài đặt, chạy được mọi nơi |

---

## 2. Trải nghiệm mục tiêu của MVP

1. Người dùng mở app, thấy sẵn một nhân vật mẫu đang đi bộ trên lưới isometric ở dạng pixel.
2. Có hai cách tạo nhân vật:
   - **(a)** Gõ mô tả, ví dụ "pháp sư áo tím cầm gậy phép", rồi bấm **Tạo**. Claude chọn nhân vật gốc, phụ kiện, màu và animation.
   - **(b)** Tự chọn trong bảng **Nhân vật / Phụ kiện / Màu / Animation**.
3. Chỉnh tiếp bằng lời ("đổi khiên sang màu vàng") hoặc bằng điều khiển trên giao diện.
4. Chỉnh **Phong cách dự án**: chiều cao nhân vật (32/48/64 px), bảng màu, viền, số hướng.
5. Bấm **Xuất** để tải ZIP gồm: PNG từng animation, JSON, và GIF xem trước.
6. Món nào người dùng yêu cầu mà thư viện chưa có thì hiện thành nhãn "Chưa có trong thư viện". Không bao giờ âm thầm bỏ qua.

---

## 3. Phạm vi

### Trong MVP
- Nạp nhân vật KayKit, bật/tắt phụ kiện, đổi màu theo màu có tên, chọn animation.
- Pipeline render pixel: camera isometric 2:1, độ phân giải thấp, toon shading, giảm màu, viền, dọn pixel.
- 8 hướng, kèm tùy chọn chỉ render 5 hướng rồi lật ngang ra 3 hướng còn lại; lấy mẫu frame; ô (cell) và điểm neo (pivot) cố định.
- Xuất PNG + JSON Aseprite + ZIP + GIF.
- Preview pixel trên lưới isometric.
- Endpoint `POST /api/describe` dùng Claude API (structured outputs), có chế độ sửa bằng lời.
- App vẫn chạy đầy đủ khi không có API key, trừ tính năng Mô tả.

### Ngoài MVP (chỉ cần chừa chỗ trong kiến trúc)
- Kiểm tra chất lượng bằng vision (`/api/review`).
- AI tạo đồ vật mới (TRELLIS.2 / Pixal3D).
- Tạo động tác từ mô tả chữ (HY-Motion / Kimodo).
- Backend PixelLab.
- Cho người dùng tải lên GLB riêng.
- Bộ phận modular thực sự (tráo đầu/thân/quần áo giữa các nhân vật). KayKit không hỗ trợ việc này, xem mục 5.4.
- Bóng đổ, đường viền trong (inner lines), tile và môi trường.

---

## 4. Kiến trúc

```
apps/web (Vite + React + three.js)
├─ ui/            Panels: Describe, Character, Parts, Colors, Animations, Style, Export
├─ state/         CharacterConfig + ProjectStyle là nguồn sự thật duy nhất (store nhỏ, ví dụ zustand)
├─ scene/         Nạp GLB, gắn phụ kiện, đổi màu (material clone + shader), AnimationMixer
├─ render/        IsoCameraRig, PixelRenderer (render target low-res → readback → pixel-core)
├─ preview/       Canvas lưới iso + nhân vật pixel phóng to nearest
└─ export/        Gọi pixel-core để xếp sheet, sinh JSON, nén ZIP (fflate), GIF (gifenc)

apps/server (Node + Hono)
└─ POST /api/describe → dựng JSON schema từ catalog → Claude API → validate → trả CharacterConfig

packages/pixel-core   Hàm thuần trên RGBA Uint8Array: alpha threshold, OKLab, median-cut,
                      map palette, outline, orphan cleanup, flip, pack sheet, Aseprite JSON
packages/shared       Kiểu dữ liệu, zod schema, catalog.json (sinh ở Phase 0)
scripts/              fetch-assets, inspect-assets, build-catalog
```

**Luồng dữ liệu:**

```
UI / Claude ─▶ CharacterConfig ─▶ scene (3D)
                                    │
                                    ▼
                              PixelRenderer (mọi hướng × frame)
                                    │
                                    ▼
                              pixel-core ─▶ preview & export
```

### Kiểu dữ liệu chính (`packages/shared`)

```ts
export type ColorName =
  | "original" | "red" | "dark_red" | "orange" | "yellow" | "gold" | "green"
  | "forest_green" | "teal" | "blue" | "navy" | "purple" | "pink" | "brown"
  | "white" | "gray" | "black";

export interface CharacterConfig {
  version: 1;
  baseCharacter: string;                       // id trong catalog
  parts: Record<string, string>;               // slotId -> partId | "none"
  colors: { target: string; color: ColorName }[];
  animations: string[];                        // animationId trong catalog
}

export interface ProjectStyle {
  characterHeightPx: 32 | 48 | 64;             // mặc định 48
  directions: 8 | "5+mirror";                  // mặc định 8
  palette: { mode: "auto"; colors: number }    // mặc định auto, 16 màu
         | { mode: "fixed"; hex: string[] };
  outline: "none" | "dark" | "selective";      // mặc định "selective"
  cell: "auto" | { w: number; h: number };     // khóa kích thước ô để đồng bộ giữa các nhân vật
  fps: number | "fromClip";                    // mặc định "fromClip"
}
```

---

## 5. Asset: KayKit Adventurers

### 5.1 Nguồn
- **GitHub (tải được bằng script):** `https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0`, ghim commit `672074b73ba276876a19e8816ecdc5241817ab47`.
  - Gồm 4 nhân vật, 75 animation, hơn 25 phụ kiện.
  - Texture là **một atlas dải màu (gradient atlas) 1024×1024**.
  - Giấy phép CC0.
  - Thư mục glTF dự kiến là `addons/kaykit_character_pack_adventures/Characters/gltf`. Cần xác minh.
- **Bản mới trên itch.io (người dùng tải tay):**
  - Trang nhân vật: `https://kaylousberg.itch.io/kaykit-adventurers`. Bản miễn phí có 5 nhân vật, FBX/glTF.
  - Gói animation: `https://kaylousberg.itch.io/kaykit-character-animations`. Hơn 100 animation, CC0, chia theo `Rig_Medium` / `Rig_Large`.
  - `fetch-assets` cần nhận thêm tham số đường dẫn tới file zip tải tay.
- Ghi nguồn, commit và giấy phép vào `assets/LICENSES.md`. KayKit là CC0 nên được commit asset vào repo.

### 5.2 Khảo sát asset (bắt buộc làm trước, đừng đoán)

`scripts/inspect-assets.ts` dùng `@gltf-transform/core`, chạy trên Node, không cần render. Kết quả ghi vào `docs/ASSET_REPORT.md`, gồm:
- Danh sách file nhân vật. Với mỗi file: cây node, các mesh, skin, tên và số lượng xương.
- Phụ kiện:
  - Là mesh con có sẵn trong file nhân vật, có thể bật/tắt?
  - Hay là file riêng cần gắn vào xương?
  - Ghi rõ tên xương dùng để gắn (ví dụ các xương "hand slot"). Xác minh tên thật.
- Animation: tên, thời lượng, có root motion hay không (đo độ dịch ngang của xương gốc/hông qua clip).
- Chiều cao bounding box của từng nhân vật trong tư thế nghỉ.
- Mesh nào dùng chung material hoặc atlas, để quyết định cách đổi màu ở mục 6.7.

### 5.3 Catalog

`scripts/build-catalog.ts` gộp kết quả khảo sát với file nhãn viết tay `scripts/catalog-labels.yaml` (tên tiếng Việt, mô tả ngắn, tag), rồi sinh `packages/shared/catalog.json`:

```json
{
  "version": 1,
  "characters": [
    { "id": "knight", "file": "Knight.glb", "label_vi": "Hiệp sĩ", "tags": ["giáp", "cận chiến"] }
  ],
  "slots": [
    { "id": "hand_right", "label_vi": "Tay phải" }
  ],
  "parts": [
    { "id": "sword_1handed", "slot": "hand_right", "label_vi": "Kiếm một tay",
      "tags": ["kiếm", "cận chiến"], "characters": ["*"] }
  ],
  "colorTargets": [
    { "id": "body", "label_vi": "Thân/áo" }
  ],
  "animations": [
    { "id": "walk", "clip": "Walking_A", "label_vi": "Đi bộ", "loop": true, "defaultFrames": 8 }
  ]
}
```

Các ID trên chỉ là ví dụ. ID và tên clip thật lấy từ `ASSET_REPORT.md`. Validate catalog bằng zod trong test.

### 5.4 Giới hạn đã biết
- Mỗi nhân vật KayKit là một model nguyên khối. MVP chỉ "ghép" được: **nhân vật gốc + phụ kiện + màu + animation**. Chưa tráo được đầu/thân giữa các nhân vật.
- Kiến trúc slot/catalog vẫn phải đủ tổng quát để sau này thêm bộ phận modular thật, từ bộ kit riêng hoặc từ Quaternius Modular Character Outfits (cần kiểm tra giấy phép QAL của từng gói).

---

## 6. Pipeline render pixel (lõi kỹ thuật)

### 6.1 Camera isometric 2:1
- `THREE.OrthographicCamera`, góc ngẩng **θ = 30°** (vì `asin(0.5)`), phương vị **45°**.
  - Vị trí camera: `(cosθ·sin45°, sinθ, cosθ·cos45°) · d`, nhìn về gốc tọa độ.
  - Kết quả: một ô vuông trên mặt đất chiếu ra hình thoi tỷ lệ đúng 2:1.
- **Không xoay camera.** Hướng thứ k: `yaw = yaw_S + k·45°`.
  - Hướng S là nhân vật nhìn về phía camera (đi xuống dưới màn hình).
  - Thứ tự hàng: `S, SW, W, NW, N, NE, E, SE`, chạy theo chiều kim đồng hồ khi nhìn từ trên xuống.
  - Kiểm chứng bằng một frame test có mũi tên đánh dấu.
- **Đèn gắn theo camera:**
  - Một `DirectionalLight` chiếu từ phía trên-trái màn hình, cộng `AmbientLight`.
  - Hướng nào cũng có hướng sáng giống nhau trên màn hình.

### 6.2 Tỷ lệ và điểm neo
- **`pixelsPerMeter` (PPM) cố định cho cả dự án.** Tính từ nhân vật tham chiếu (Knight):
  - `PPM = characterHeightPx / (h_ref · cosθ)`.
  - Mọi nhân vật dùng chung PPM này, nên nhân vật to sẽ to hơn thật trong game.
- **Frustum** được đặt sao cho gốc tọa độ (chân nhân vật) rơi đúng vào pixel neo:
  - `left = -pivotX/PPM`, `right = (W - pivotX)/PPM`
  - `top = pivotY/PPM`, `bottom = -(H - pivotY)/PPM`
  - Chọn một quy ước căn tâm pixel (góc pixel hay tâm pixel, ví dụ lệch 0.5px) và ghi vào `DECISIONS.md`.
- **Bỏ root motion** theo phương ngang ở các clip lặp, để chân luôn ở gốc tọa độ.

### 6.3 Render và đọc pixel
- `WebGLRenderer({ antialias: false, alpha: true })`, `setPixelRatio(1)`.
- `WebGLRenderTarget` cỡ nhỏ, `NearestFilter`, `samples: 0`.
- Đọc bằng `readRenderTargetPixels`, lật trục Y, rồi chuyển cho pixel-core.
- **Cạm bẫy màu:**
  - Render target lưu giá trị **linear**.
  - Phải chuyển sang sRGB trước khi giảm màu, nếu không màu sẽ bị nhạt.
  - Viết test so màu của một vùng phẳng giữa viewer và ảnh xuất.
- **Cắt khung:**
  - Render mọi frame lên canvas tạm đủ lớn, giữ nguyên pivot.
  - Lấy hình chữ nhật bao (union bbox) của tất cả frame, cộng 1px lề cho viền, làm tròn lên số chẵn.
  - Cắt mọi frame theo cùng hình chữ nhật đó, nên pivot giữ nhất quán.
  - Nếu `cell` bị khóa cứng mà nội dung tràn ra ngoài thì cảnh báo.

### 6.4 Shading
- **MVP:**
  - Thay material bằng `MeshToonMaterial`, giữ texture atlas gốc.
  - `gradientMap` 3 bậc là một `DataTexture` dùng `NearestFilter`.
- **Sau MVP:** dùng shader tra dải màu của palette trực tiếp.

### 6.5 Hậu xử lý (`packages/pixel-core`, theo thứ tự)
1. **Ngưỡng alpha:** `a ≥ 128` thì đặt 255, ngược lại đặt 0. Không để lại pixel bán trong suốt.
2. **Bảng màu:**
   - `auto`: median-cut trong OKLab trên **toàn bộ frame của nhân vật**, chỉ tính **một lần** rồi dùng chung cho mọi frame. Không tính bảng màu riêng cho từng frame, vì sẽ gây nhấp nháy.
   - `fixed`: dùng danh sách hex người dùng dán vào.
   - Ánh xạ về màu gần nhất theo khoảng cách OKLab.
   - Có nút "Khóa bảng màu này cho cả dự án".
3. **Viền 1px bên ngoài:**
   - Mỗi pixel trong suốt có láng giềng 4 hướng đặc thì thành pixel viền.
   - Chế độ `dark`: lấy màu tối nhất trong palette.
   - Chế độ `selective`: lấy màu láng giềng làm tối trong OKLab, rồi ánh xạ lại về palette.
4. **Dọn pixel lẻ** (tùy chọn, mặc định bật):
   - Pixel đứng một mình, khác màu với cả 8 láng giềng và không phải viền, thì thay bằng màu chiếm đa số quanh nó.
   - Phải bảo toàn các chi tiết 2px như mắt. Có test fixture riêng cho trường hợp này.
5. **Không dùng dithering khuếch tán lỗi** (Floyd–Steinberg), vì gây nhấp nháy giữa các frame.

### 6.6 Animation và hướng
- **Lấy mẫu frame:**
  - Clip lặp: `t_i = i·D/N`.
  - Clip không lặp: `t_i = i·D/(N−1)`.
- **Số frame mặc định:** idle 4, walk 8, run 8, attack 6, hit 3, death 6. Đọc từ catalog.
- **Thời lượng frame:** `D/N` làm tròn tới 10ms, hoặc theo fps cố định trong style.
- **Chế độ `5+mirror`:**
  - Render S, SE, E, NE, N.
  - Lật ngang SE thành SW, E thành W, NE thành NW.
  - Hiện cảnh báo trong UI: chi tiết bất đối xứng (vũ khí tay phải) sẽ bị đổi tay.

### 6.7 Đổi màu
- Mỗi bộ phận cần đổi màu được clone material riêng, vì atlas đang dùng chung.
- Hai cách cần thử trên asset thật, chọn cách tốt hơn và ghi vào `DECISIONS.md`:
  - **(A)** Xoay hue trong OKLCh từ màu chủ đạo của bộ phận sang màu đích, chỉnh chroma và độ sáng. Cách này giữ được khác biệt giữa các chi tiết.
  - **(B)** Tô theo độ sáng của texel lên dải màu đích. Cách này ra màu sạch nhưng các chi tiết sẽ cùng một hue.
- Làm qua `onBeforeCompile`.
- **Rủi ro:** nếu một mesh chứa cả da lẫn áo thì đổi màu sẽ ảnh hưởng cả da.
  - Cách khắc phục: chia nhóm màu theo vùng UV trên atlas dải màu (các dải màu có vị trí cố định).
  - MVP được phép chấp nhận giới hạn này, nhưng phải ghi rõ.

---

## 7. Định dạng xuất

- **Bố cục sheet:**
  - Mỗi animation là một PNG: **hàng = hướng** (theo thứ tự 6.1), **cột = frame**.
  - Mọi animation của một nhân vật dùng **chung cỡ ô và pivot**.
  - Có thêm tùy chọn gộp tất cả animation vào một atlas.
- **Tên file:** `{character}_{animation}.png` và `{character}_{animation}.json`. Thêm `{character}_preview.gif`.
- **JSON** theo dạng "array" của Aseprite, cộng một khối `meta.pixiso`. Đối chiếu với file JSON xuất từ Aseprite thật để tương thích tối đa.

```json
{
  "frames": [
    {
      "filename": "knight_walk_S_0",
      "frame": { "x": 0, "y": 0, "w": 48, "h": 56 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 48, "h": 56 },
      "sourceSize": { "w": 48, "h": 56 },
      "duration": 100
    }
  ],
  "meta": {
    "app": "pixiso",
    "version": "0.1.0",
    "image": "knight_walk.png",
    "format": "RGBA8888",
    "size": { "w": 384, "h": 448 },
    "scale": "1",
    "frameTags": [
      { "name": "walk_S", "from": 0, "to": 7, "direction": "forward" }
    ],
    "slices": [
      {
        "name": "pivot",
        "color": "#0000ffff",
        "keys": [
          { "frame": 0, "bounds": { "x": 0, "y": 0, "w": 48, "h": 56 }, "pivot": { "x": 24, "y": 52 } }
        ]
      }
    ],
    "pixiso": {
      "cell": { "w": 48, "h": 56 },
      "pivot": { "x": 24, "y": 52 },
      "directions": ["S", "SW", "W", "NW", "N", "NE", "E", "SE"],
      "pixelsPerMeter": 21.3,
      "palette": ["#1a1c2c", "#5d275d", "#b13e53"]
    }
  }
}
```

- Nén ZIP bằng `fflate`, tạo GIF bằng `gifenc`. GIF dùng đúng palette đã khóa.
- Thêm `apps/web/dev/player.html`: một trang thuần canvas, nạp PNG + JSON vừa xuất và phát lại theo từng hướng. Trang này dùng để tự kiểm tra định dạng.

---

## 8. Giao diện

| Vùng | Nội dung |
|---|---|
| Trên cùng | Ô **Mô tả nhân vật** và nút **Tạo**. Kết quả trả về hiện câu tóm tắt và các nhãn "Chưa có trong thư viện". Có lịch sử để hoàn tác |
| Trái | **Nhân vật gốc** (thẻ có ảnh), **Phụ kiện** theo slot, **Màu** theo `colorTargets` (17 màu có tên, dạng ô màu) |
| Giữa | **Preview pixel** trên lưới iso (phóng to nearest ×4 đến ×8, chọn hướng, play/pause). Viewport 3D thu gọn để tham chiếu |
| Phải | **Phong cách dự án** (chiều cao, bảng màu, viền, số hướng, cỡ ô, fps), **Animation** (checkbox kèm số frame) |
| Dưới | **Xuất**: ZIP, PNG+JSON, GIF |

- Lưu `ProjectStyle` và config gần nhất vào `localStorage`, bọc trong try/catch. Có nút xuất/nhập style ra file JSON.
- Mọi chuỗi UI tiếng Việt gom vào `apps/web/src/i18n/vi.ts`.

---

## 9. Tích hợp Claude API (`POST /api/describe`)

### 9.1 Hợp đồng
- **Request:** `{ text: string, current?: CharacterConfig }`. Có `current` nghĩa là chế độ **sửa**: giữ nguyên mọi thứ người dùng không nhắc tới.
- **Response 200:** `{ config: CharacterConfig, missing: string[], summary: string }`.
- **Lỗi:**
  - `503 { error: "describe_disabled" }` khi không có key.
  - `422` khi output không hợp lệ so với catalog.
  - `429` khi vượt rate limit (ví dụ 20 request/phút/IP).
  - `502` khi Claude từ chối hoặc output bị cắt cụt.

### 9.2 Gọi API
- **Model:** `process.env.CLAUDE_MODEL ?? "claude-haiku-5-5"`. Có thể đổi sang `claude-sonnet-5-5` qua biến môi trường.
- **Structured outputs:** truyền `output_config: { format: { type: "json_schema", schema } }`.
  - Nếu kiểu dữ liệu của SDK chưa có trường này thì nâng cấp SDK.
  - Đối chiếu với tài liệu chính thức: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- **System prompt gồm hai khối:**
  - Khối 1: luật.
  - Khối 2: catalog thu gọn (id + nhãn + tag), bật **prompt caching** cho khối này. Kiểm tra cú pháp và độ dài tối thiểu trong tài liệu.
- **Luật trong system prompt (tóm tắt):**
  - Chỉ chọn ID có trong catalog. Không phù hợp thì chọn `"none"` hoặc `"original"`.
  - Món người dùng yêu cầu mà không có thì ghi vào `missing`, viết bằng lời của người dùng.
  - Ở chế độ sửa, giữ nguyên các trường không được nhắc tới.
  - Nếu người dùng không nói gì về animation, mặc định chọn `idle` và `walk`.
  - `summary`: một câu tiếng Việt mô tả nhân vật.

### 9.3 Schema sinh động từ catalog
Đây là ví dụ đã thu gọn, ID chỉ để minh họa. Giữ schema **phẳng, mọi trường đều `required`, không dùng union type**, để nằm trong giới hạn độ phức tạp: tối đa 24 tham số tùy chọn và 16 tham số union.

```json
{
  "type": "object",
  "properties": {
    "config": {
      "type": "object",
      "properties": {
        "baseCharacter": { "type": "string", "enum": ["knight", "barbarian", "mage", "rogue"] },
        "parts": {
          "type": "object",
          "properties": {
            "hand_right": { "type": "string", "enum": ["none", "sword_1handed", "axe_1handed", "staff", "crossbow_1handed", "dagger"] },
            "hand_left": { "type": "string", "enum": ["none", "shield_round", "shield_badge", "dagger", "spellbook"] }
          },
          "required": ["hand_right", "hand_left"],
          "additionalProperties": false
        },
        "colors": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "target": { "type": "string", "enum": ["body", "hand_right", "hand_left"] },
              "color": { "type": "string", "enum": ["original", "red", "dark_red", "orange", "yellow", "gold", "green", "forest_green", "teal", "blue", "navy", "purple", "pink", "brown", "white", "gray", "black"] }
            },
            "required": ["target", "color"],
            "additionalProperties": false
          }
        },
        "animations": {
          "type": "array",
          "items": { "type": "string", "enum": ["idle", "walk", "run", "attack_1h", "hit", "death"] }
        }
      },
      "required": ["baseCharacter", "parts", "colors", "animations"],
      "additionalProperties": false
    },
    "missing": { "type": "array", "items": { "type": "string" } },
    "summary": { "type": "string" }
  },
  "required": ["config", "missing", "summary"],
  "additionalProperties": false
}
```

Ví dụ response:

```json
{
  "config": {
    "baseCharacter": "knight",
    "parts": { "hand_right": "sword_1handed", "hand_left": "shield_round" },
    "colors": [{ "target": "hand_left", "color": "gold" }],
    "animations": ["idle", "walk", "attack_1h"]
  },
  "missing": ["áo choàng đỏ"],
  "summary": "Hiệp sĩ cầm kiếm một tay và khiên tròn màu vàng."
}
```

### 9.4 Kiểm tra sau khi nhận kết quả
- Kiểm tra `stop_reason`:
  - `"refusal"`: output có thể không đúng schema → trả 502 kèm thông báo thân thiện.
  - `"max_tokens"`: output bị cắt → tăng `max_tokens` một lần rồi thử lại.
- **So enum không phân biệt chữ hoa/thường**, vì API không bảo đảm chữ hoa. Chuẩn hóa về ID gốc.
- Validate lại bằng zod và catalog. Ví dụ: phụ kiện có `characters` không khớp nhân vật gốc thì chuyển món đó sang `missing`.
- Không log nội dung có thể chứa API key. Log được: số token và độ trễ.

### 9.5 Chi phí (để ghi vào README)
- Giá Haiku 5.5 từ khoảng $0.10 / $0.50 cho mỗi triệu token (vào/ra). Mỗi lượt cỡ vài nghìn token, phần lớn là catalog đã được cache, nên chi phí rất nhỏ.
- Đo thực tế và ghi lại trong `PROGRESS.md`.

---

## 10. Các phase và tiêu chí nghiệm thu

### Phase 0: Khung dự án và asset
- Dựng monorepo theo `CLAUDE.md`. Cấu hình ESLint, Prettier, Vitest, Playwright. Thêm `.env.example` với `ANTHROPIC_API_KEY=` và `CLAUDE_MODEL=claude-haiku-5-5`.
- Viết `fetch-assets` (từ GitHub, ghim commit, hoặc từ zip cục bộ), `inspect-assets` và `build-catalog`.

**Nghiệm thu:**
- Từ một bản clone sạch, `pnpm assets:fetch && pnpm assets:inspect && pnpm assets:catalog` chạy thành công.
- `ASSET_REPORT.md` liệt kê đủ nhân vật, phụ kiện, clip (kèm cờ root motion) và tên xương gắn phụ kiện.
- `catalog.json` qua được test zod.

### Phase 1: Viewer 3D và bộ ghép
- Nạp nhân vật, gắn hoặc bật/tắt phụ kiện, đổi màu (thử cả 2 cách ở 6.7), phát clip.
- `CharacterConfig` là nguồn sự thật duy nhất, đồng bộ hai chiều với UI và scene.

**Nghiệm thu:**
- Mọi thay đổi phụ kiện/màu/clip hiện ra trong khoảng 100ms.
- Config chuyển qua lại JSON không mất thông tin.
- Đổi nhân vật gốc thì phụ kiện không hợp lệ tự chuyển về `"none"`.

### Phase 2: Lõi render pixel (1 hướng, 1 frame, rồi 1 clip) ⟵ DỪNG ĐỂ DUYỆT
- `IsoCameraRig`, `PixelRenderer`, xử lý sRGB, pixel-core (6.5), preview pixel trực tiếp.

**Nghiệm thu tự động:**
- Có unit test cho từng hàm pixel-core, dùng fixture nhỏ.
- **Test tất định:** render cùng config 2 lần trong cùng môi trường ra cùng byte.
- Ảnh ra có ≤ N màu và 0 pixel bán trong suốt.
- Chiều cao nhân vật lệch tối đa ±1px so với `characterHeightPx`.
- Một ô vuông 1×1m đặt trên mặt đất render ra hình thoi đúng tỷ lệ 2:1.

**Bàn giao để duyệt:**
- Ảnh mẫu (phóng to ×8) của 2 nhân vật × hướng S và E × 3 frame walk.
- Đặt ở `test-output/review-phase2/` và gửi cho người dùng.

### Phase 3: 8 hướng, frame, sprite sheet, xuất file
- 8 hướng và `5+mirror`, lấy mẫu frame, cắt khung chung, pivot cố định, palette auto tính một lần.
- Xuất PNG + JSON + ZIP + GIF, thêm trang `player.html`.

**Nghiệm thu:**
- Mọi `frame` rect nằm trong ảnh.
- `frameTags` phủ hết các frame.
- Pivot giống nhau ở mọi frame.
- **Test rung:** ở clip idle và walk, tâm theo trục X của 2 hàng pixel đặc thấp nhất (bàn chân) không trôi quá ±1px giữa các frame. Với tư thế tĩnh thì phải giống hệt nhau.
- `player.html` phát đúng file vừa xuất.

### Phase 4: Lưới iso và phong cách dự án
- Preview vẽ lưới hình thoi: `TILE_W = 2·TILE_H`, và cạnh ô bằng `TILE_W/(√2·PPM)` mét. Nhân vật đứng đúng tâm ô.
- Panel phong cách đầy đủ, khóa bảng màu cho dự án, xuất/nhập style.

**Nghiệm thu:**
- Đổi `characterHeightPx` thì cả preview lẫn file xuất đổi theo nhất quán.
- Palette đã khóa được áp dụng cho mọi nhân vật tạo sau đó.

### Phase 5: Mô tả bằng Claude
- Làm endpoint theo mục 9: UI mô tả, chế độ sửa, nhãn `missing`, các trạng thái lỗi, rate limit.

**Test:**
- Snapshot schema builder.
- Validator: enum lệch chữ hoa, ID lạ, phụ kiện không hợp với nhân vật.
- Client Anthropic dùng mock.
- Một smoke test chạy thật, tự bỏ qua khi không có key.

**Nghiệm thu:**
- 10 câu mẫu dưới đây đều cho config hợp lệ.
- Món không có trong thư viện nằm ở `missing`.
- Khi không có key, app vẫn chạy, nút Tạo bị vô hiệu và có giải thích.

**Câu mẫu:**
1. "Hiệp sĩ cầm kiếm và khiên"
2. "Pháp sư áo tím cầm gậy phép"
3. "Cung thủ dùng nỏ, áo xanh lá"
4. "Tên trộm hai tay cầm dao găm"
5. "Chiến binh man rợ cầm rìu, tông đỏ"
6. (sửa, dựa trên câu 1) "Đổi khiên sang màu vàng"
7. (sửa) "Bỏ vũ khí, chỉ cần đứng yên và đi bộ"
8. "Lính đánh thuê từng trải, trông nguy hiểm"
9. "Một con rồng nhỏ" → nhân vật gần nhất, `missing` có "rồng"
10. "Pháp sư cầm đàn guitar" → `missing` có "đàn guitar"

### Phase 6: Hoàn thiện
- README: cài đặt, chạy, ảnh chụp màn hình, cách nhập sprite vào engine, chi phí API, giấy phép.
- Hoàn tất `docs/PROGRESS.md`, kèm danh sách việc đề xuất cho vòng sau (mục 12).

---

## 11. Chiến lược kiểm thử
- **pixel-core:** hàm thuần trên mảng RGBA, test bằng Vitest với fixture nhỏ (8×8 đến 32×32) viết thẳng trong code.
- **Render:** Playwright với Chromium headless (WebGL qua SwiftShader).
  - Chỉ so sánh tất định *trong cùng một môi trường*.
  - Ảnh golden (nếu có) cho phép dung sai, vì GPU khác nhau có thể cho kết quả khác.
- **Tự xem bằng mắt:** sau mỗi phase có thay đổi render, xuất ảnh vào `test-output/` và tự xem (phóng to nearest ×8).

---

## 12. Rủi ro và lưu ý
- **Màu linear/sRGB sai** làm ảnh nhạt. Đã có test ở 6.3.
- **Rung sub-pixel** do root motion hoặc frustum lệch. Xử lý theo 6.2, kiểm bằng test rung ở Phase 3.
- **Đổi màu ăn sang da** do atlas dùng chung. Xem 6.7.
- **Giấy phép:**
  - KayKit là CC0.
  - Không đóng gói Mixamo: Adobe cấm phân phối lại file gốc dưới dạng asset pack.
  - Palette của bên thứ ba: kiểm tra giấy phép trước khi đóng gói sẵn.
- **Model và giá của Claude có thể thay đổi:** model ID để trong biến môi trường. Kiểm tra tại https://platform.claude.com/docs/en/models/overview

## 13. Sau MVP (đã chừa chỗ trong kiến trúc)
1. `POST /api/review`:
   - Gửi sheet đã phóng to nearest ×4 cho Sonnet để kiểm tra ngữ nghĩa ("có đúng như mô tả không?").
   - Claude dễ nhìn sai với ảnh dưới 200px, nên phải phóng to trước khi gửi.
2. Bộ phận modular thật: bộ kit riêng hoặc Quaternius (kiểm tra giấy phép từng gói).
3. AI tạo đồ vật cứng gắn vào slot tay/đầu: TRELLIS.2 / Pixal3D chạy qua ComfyUI.
4. Tạo động tác từ chữ: HY-Motion 1.0 hoặc Kimodo, retarget về rig chuẩn. Kiểm tra giấy phép trọng số model.
5. Backend PixelLab tùy chọn, vẫn đi qua pixel-core và exporter chung.
6. Đường viền trong (depth/normal pass), bóng đổ, tile/môi trường.

## 14. Tham khảo
- KayKit Adventurers: https://kaylousberg.itch.io/kaykit-adventurers
- KayKit Adventurers trên GitHub: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
- KayKit Character Animations: https://kaylousberg.itch.io/kaykit-character-animations
- three.js RenderPixelatedPass (tham khảo cách tính cạnh từ depth/normal): https://threejs.org/docs/pages/RenderPixelatedPass.html
- Claude: Structured outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Claude: Vision (chi phí ảnh, giới hạn với ảnh nhỏ): https://platform.claude.com/docs/en/build-with-claude/vision
- Claude: Models và giá: https://platform.claude.com/docs/en/models/overview
