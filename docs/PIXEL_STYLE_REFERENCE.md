# Phân tích ảnh tham chiếu và quy tắc vẽ pixel cho Pixiso

Tài liệu này rút quy tắc vẽ từ **4 ảnh pixel art tham chiếu** do người dùng cung cấp
(đảo isometric kiểu Pokémon, làng nhìn từ trên xuống với quán cà phê, hai cửa hàng,
đảo biển), bằng **phép đo** chứ không chỉ nhìn cảm tính, rồi đối chiếu với các
skill/công cụ mã nguồn mở về pixel art. Phần cuối là cách áp vào `sprite-kit`.

Ảnh gốc không được commit (không rõ bản quyền). Script đo nằm ở
`scripts/research/` và chạy lại được trên bất kỳ ảnh nào:

```bash
python3 -I scripts/research/study_reference.py OUT_DIR anh1.webp anh2.png ...
python3 -I scripts/research/study_crops.py OUT_DIR THU_MUC_ANH   # cắt vật thể, đếm màu, đo viền
```

Cần `python3` với Pillow và numpy (chỉ dùng cho nghiên cứu, không phải dependency của app).

## 1. Cách đo

| Đại lượng          | Cách đo                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tỉ lệ phóng gốc    | Tự tương quan của số lần đổi màu theo cột/hàng; đỉnh đầu tiên là kích thước 1 pixel gốc. Sau đó lấy mẫu tâm mỗi ô để về lưới gốc.                   |
| Số màu             | Gộp các màu cách nhau dưới 0,03 trong OKLab (khử nhiễu nén webp), đếm số màu phủ 90/95/99 % điểm ảnh.                                               |
| Dải màu            | Nhóm màu theo họ hue 30°, trong mỗi họ xếp theo L (OKLCh), đo bước L, chiều dịch hue, biến thiên chroma.                                            |
| Viền               | Điểm ảnh tối (L < 0,32) kề điểm sáng hơn 0,25: màu, tỉ lệ đen tuyệt đối, tỉ lệ chạy 2 px. Kiểm tra lại bằng bản đồ ASCII độ sáng của từng sinh vật. |
| Dithering          | Tỉ lệ ô bàn cờ 2×2; điểm ảnh mồ côi (không có hàng xóm cùng màu).                                                                                   |
| Kích thước vật thể | Hộp bao của thành phần liên thông lớn nhất khác nền.                                                                                                |
| Hướng sáng         | Nhìn vị trí dải sáng/tối trên cây, đá, mái; vector tâm sáng–tâm tối chỉ dùng để kiểm tra chéo (nhiễu khi nền lẫn vào).                              |

## 2. Kết quả đo

### 2.1 Tổng quan

| Ảnh                 | Kích thước | Phóng                   | Lưới gốc | Màu toàn cảnh n90 / n95 / n99 | Bàn cờ (dither) | Viền                                         |
| ------------------- | ---------- | ----------------------- | -------- | ----------------------------- | --------------- | -------------------------------------------- |
| 1 đảo Pokémon       | 1408×960   | ×4 (tự tương quan 0,93) | 352×240  | 24 / 50 / 128                 | 0,1 %           | gần đen pha màu vật liệu, 47 % đen tuyệt đối |
| 2 làng, quán cà phê | 1788×1792  | ×2 (0,68)               | 894×896  | 28 / 48 / 126                 | 0,1 %           | xám nâu ấm `#2e2428`, chỉ 6 % đen            |
| 3 hai cửa hàng      | 2000×1053  | ×4 (0,64)               | 500×263  | 42 / 67 / 132                 | 0,1 %           | xám nâu ấm `#382828`, 1 % đen                |
| 4 đảo biển          | 1408×960   | ×2 (0,92)               | 704×480  | 22 / 54 / 162                 | 0,1 %           | gần đen pha xanh `#080818`, 31 % đen         |

Kết luận nhanh: **không có dithering**, **không anti-alias ra nền**, mỗi cảnh chỉ cần
~50 màu cho 95 % điểm ảnh. Hai phong cách viền: "Pokémon" (đen pha màu) và "làng ấm"
(xám nâu, không đen).

### 2.2 Kích thước vật thể trên lưới gốc

| Vật thể                 | Hộp bao (px) | Màu phủ 95 % (đã trừ nền ≈ 3 màu)       |
| ----------------------- | ------------ | --------------------------------------- |
| sinh vật lá (ảnh 1)     | 24×22        | ~14                                     |
| hươu (ảnh 1)            | 27×32        | ~18                                     |
| chim vàng (ảnh 1)       | 31×27        | ~18                                     |
| rùa (ảnh 1)             | 34×28        | ~22                                     |
| chuột (ảnh 1)           | 27×26        | ~14                                     |
| cá + sóng (ảnh 1)       | 47×43        | ~28                                     |
| rương (ảnh 4)           | 43×44        | ~40 (nhiều kim loại, gỗ, mắt phát sáng) |
| cây tròn (ảnh 1)        | ~50×55       | 4 xanh + viền                           |
| thông (ảnh 1)           | ~36×56       | 4 xanh + viền                           |
| nhà quán cà phê (ảnh 2) | 340×292      | 35                                      |
| bàn ghế gỗ (ảnh 2)      | 180×94       | 19                                      |

Sinh vật kiểu Pokémon nằm trong **24–34 px rộng, 22–32 px cao** — đúng cỡ khung
24×32 mà `sprite-kit` đang dùng. Mỗi sinh vật dùng **12–20 màu** kể cả viền, mắt, điểm sáng.

### 2.3 Dải màu theo vật liệu (OKLCh: L độ sáng 0–1, C chroma, h hue độ)

| Vật liệu                 | Bóng sâu                    | Bóng                        | Gốc                         | Sáng                                                   | Nhận xét                                                                                   |
| ------------------------ | --------------------------- | --------------------------- | --------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Lá cây (ảnh 1)           | `#255a48` L0,43 C0,065 h168 | `#3d8757` L0,56 C0,105 h153 | `#6fb45b` L0,70 C0,141 h139 | `#79c068` L0,74 C0,141 h140                            | bước L ≈ 0,14; bóng dịch **+15°/bước về cyan–lam**, chroma giảm ×0,75 mỗi bước             |
| Gỗ (ảnh 2)               | `#3e211b` L0,28 C0,046 h33  | —                           | `#7f5543` L0,49 C0,063 h44  | `#ba8555` L0,66 C0,091 h62 → `#d9a277` L0,75 h59       | sáng dịch **+18° về vàng**, chroma tăng ×1,4; bóng dịch −11° về đỏ, chroma ×0,73           |
| Nước (ảnh 1)             | `#264e8c` L0,43 C0,112 h259 | —                           | `#3f72a5` L0,54 C0,098 h250 | `#519ec6` L0,67 C0,096 h233 → bọt `#b7fbfd` L0,94 h198 | sáng dịch −17° về cyan; bóng dịch +9° về lam, chroma **tăng** ×1,14 (ngoại lệ của màu lam) |
| Lông vàng (chim, ảnh 1)  | —                           | `#e6b03e` L0,79 C0,140 h82  | `#fee267` L0,91 C0,145 h97  | `#feeeb8` L0,95 C0,071 h94                             | bóng của **vàng dịch về cam** (−15°), không về xanh lục                                    |
| Mái ngói xám lam (ảnh 2) | `#3b475e` L0,40             | `#4a566d` L0,45             | `#637087` L0,54 C0,039 h262 | `#707c94` L0,59                                        | chroma thấp nên **không dịch hue**, bước L nhỏ 0,05–0,09                                   |
| Cỏ (ảnh 2)               | —                           | `#557047` L0,51 C0,070 h135 | `#6aa053` L0,65 C0,122 h137 | `#6fb45d` L0,70                                        | bóng đổ trên cỏ = bóng của cỏ (−0,14 L)                                                    |
| Cát (ảnh 4)              | —                           | `#c49c6c` L0,72             | `#eccc8c` L0,85 C0,086 h82  | —                                                      | cát ướt mép nước `#ac9c8c` xám hơn                                                         |

Quy luật chung đo được:

- **3 tông cho mỗi vật liệu** (bóng / gốc / sáng), đôi khi thêm bóng sâu ở vật thể lớn. Không có vật liệu nào quá 4 tông.
- **Bước L ≈ 0,11–0,17** (trung vị 0,14). Vật liệu xám (chroma < 0,05) dùng bước nhỏ hơn và không dịch hue.
- **Dịch hue 10–18° mỗi bước.** Sáng luôn hướng về vàng (h ≈ 100°). Bóng đi **ngược hướng với sáng**: lục → cyan/lam, nâu/cam → đỏ, lam → tím, và **vàng → cam** (không bao giờ đi qua lục).
- **Chroma:** bóng _giảm_ ×0,7–0,85 (lục, nâu, vàng); chỉ màu lam giữ hoặc tăng nhẹ. Sáng giữ chroma (×1,0), riêng gỗ tăng. Điều này **ngược với giả định "bóng bão hoà hơn"** trong `PIXEL_RULES.md` §3; số đo thắng.
- Không dùng đen thuần cho bóng, không dùng trắng thuần cho sáng (trừ điểm bóng mắt và bọt nước).

### 2.4 Viền

| Phong cách         | Màu đo được                                                                           | Độ dày                               | Khép kín?                                             |
| ------------------ | ------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------- |
| Pokémon (ảnh 1, 4) | gần đen L ≈ 0,10–0,14, C 0,02–0,05: `#080808`, `#083828` trên lá, `#080818` trên nước | 1 px (chạy 2 px chỉ 11–16 %, là góc) | **Khép kín toàn bộ silhouette**, kể cả cạnh phía sáng |
| Làng ấm (ảnh 2, 3) | xám nâu ấm `#2e2428` (L 0,28, C 0,02, h ≈ 330°), 1–6 % đen                            | 1 px, 2 px ở chỗ hai đường gặp nhau  | khép kín                                              |

Bản đồ ASCII độ sáng của hươu, chim, chuột (ảnh 1) xác nhận viền đen bao **trọn**
silhouette, kể cả đỉnh đầu và tai; **không có selout** (viền sáng ở phía ánh sáng).
Bên trong sprite: đường phân tách bộ phận (chân, cổ, cánh) cũng là đường tối 1 px nhưng
thưa; phần còn lại phân tách bằng tông.

Màu viền **không phải một màu duy nhất**: viền trên lá hơi lục, trên nước hơi lam,
trên da thú hơi nâu — tức là màu đen pha chút hue vật liệu bên cạnh. Mắt: khối đen
2×2 hoặc 2×3 với **1 px trắng** điểm sáng; má hồng 1–2 px ở sinh vật dễ thương.

### 2.5 Ánh sáng

- Một nguồn sáng **trên–trái** (ảnh 1, 4): tán cây có dải sáng ở phần tư trên trái, dải tối ở dưới phải; vách đá mặt trái sáng, mặt phải tối; thác nước sáng ở mép trái.
- Ảnh 2, 3 (nhìn từ trên xuống): sáng từ **trên, hơi lệch trái**; mái có đường sáng ở gờ trên, bóng sâu dưới mái hiên.
- **Bóng đổ** là hình elip/đốm bằng tông bóng của mặt đất (cỏ tối hơn 0,14 L), đặt dưới vật thể lệch phải–dưới 1–2 px; không phải đốm đen mờ.
- Không có pillow shading: tông tối không bám đều quanh viền, chỉ ở phía xa nguồn sáng.

### 2.6 Kết cấu

- Dither 2×2 ≈ 0 % ở cả 4 ảnh. Chuyển tông bằng **ranh giới cứng giữa các cụm**.
- Cụm cùng màu thường ≥ 3 px; điểm đơn lẻ chỉ là điểm sáng mắt, hoa nhỏ, hạt bọt.
- Tán cây vẽ bằng các "vỏ sò" chồng nhau: mỗi vỏ là một cụm 4–8 px có viền tối phía dưới, tông sáng phía trên.
- Đường cong theo bậc đều (1,1,2,3…), không có bậc nhảy 1,3,1.

## 3. Quy tắc rút ra (áp cho Pixiso)

1. **Lưới gốc 24×32 cho nhân vật**, xuất ×2 hoặc ×4 nearest; không bao giờ phóng lẻ.
2. **Ngân sách màu:** ≤ 16 màu một nhân vật (3 tông × 4–5 vật liệu + viền + mắt + trắng); ≤ 32 cho cả bảng dự án.
3. **Mỗi vật liệu đúng 3 tông**; tông sáng chiếm 15–30 % diện tích ở phía trên–trái, tông bóng 25–40 % ở dưới–phải, còn lại là gốc.
4. **Dải màu:** bước L 0,13–0,14; sáng dịch ≤ 16° về vàng (h 100°) giữ chroma; bóng dịch ≤ 16° _ngược hướng sáng_, chroma ×0,85.
5. **Vật liệu xám** (kim loại, đá): không dịch hue, chỉ nhuốm lạnh rất nhẹ; bước L nhỏ hơn (0,08–0,10).
6. **Viền 1 px khép kín toàn silhouette**, màu gần đen (L 0,12) pha hue của vật liệu kề bên; bên trong chỉ kẻ đường tối ở ranh giới bộ phận.
7. **Hai preset viền** cho `ProjectStyle`: `outline: 'ink'` (đen pha) và `outline: 'soft'` (xám nâu ấm `#2e2428`, không đen).
8. **Một nguồn sáng trên–trái** cho mọi góc nhìn vẽ tay (S, SW, W, NW, N). Hướng lật (SE, E, NE) chấp nhận sáng từ bên phải (D-042); vì vậy góc nhìn ngang chỉ đổ bóng ngang nhẹ, chủ yếu đổ bóng theo chiều dọc.
9. **Bóng đổ** 1 elip tông bóng của nền, rộng bằng thân, lệch phải–dưới 1 px; không đốm đen.
10. **Không dither, không AA ra nền, không alpha trung gian.**
11. **Cụm ≥ 3 px**; điểm 1 px chỉ cho điểm sáng mắt/kim loại.
12. **Mắt:** 2×2 (hoặc 2×3) đen + 1 px trắng ở góc trên; đặt ở ~60 % chiều cao đầu.
13. **Silhouette trước, chi tiết sau:** kiểm tra sprite đổ đen ở ×1 trước khi tô; chi tiết cần > 3 màu ở cỡ 24×32 thì bỏ.
14. **Đường cong** theo bậc đơn điệu; góc không nhân đôi pixel.

## 4. Áp vào `sprite-kit` — đã thử nghiệm

| Tham số                        | Trước (DEFAULT_RAMP_OPTIONS)                     | Theo số đo (REFERENCE_RAMP_OPTIONS)                                           |
| ------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| shadowL / highlightL           | −0,16 / +0,08                                    | −0,14 / **+0,13** (sáng rõ hơn hẳn)                                           |
| hướng dịch bóng                | cung ngắn về 264° → **vàng bị kéo về lục** (sai) | ngược hướng sáng (`shadowAwayFromHighlight`) → vàng về cam                    |
| maxHueShiftDeg                 | 20                                               | 16                                                                            |
| shadowChroma / highlightChroma | ×1,15 / ×0,85                                    | ×0,85 / ×1,0                                                                  |
| màu viền                       | một màu phẳng `#1c1824` (L 0,20)                 | per-material `buildTintedLine`: L 0,12, C ≤ 0,05, hue vật liệu nghiêng về lam |
| selout                         | không                                            | **không** (đúng với ảnh), có cờ `selout` để thử phong cách khác               |

Kết quả: `pnpm tsx scripts/spike-sprite-kit.ts` xuất thêm `*_ref_x8.png` và
`test-output/spike-matrix/compare_ramps_x8.png` (trái: trước, phải: sau). Viền tối
và pha màu làm sprite "dính" hơn, tông sáng trên tóc/vai đọc được ở ×1. Số màu không
đổi (32/bộ). Việc còn lại thuộc về **ma trận** chứ không phải bảng màu: các template hiện
mới dùng 1–2 tông mỗi vật liệu; cần vẽ dải sáng trên–trái và bóng dưới–phải theo quy tắc 3.

## 5. Skill và công cụ mã nguồn mở đã khảo sát

| Dự án                                                                                                                                                                                                      | Loại                                                      | Giấy phép                           | Dùng được gì                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Gamezxz/pixel-art-studio](https://github.com/Gamezxz/pixel-art-studio)                                                                                                                                    | Claude skill + thư viện Pillow, vẽ từng pixel bằng script | MIT                                 | **Hữu ích nhất.** Phương pháp "build script là nguồn sự thật", vòng lặp xem → phê bình → sửa, checklist `validations.md`, `ramp()` dịch hue, công thức "shifted-shape" để đổ bóng khối lồi, `study.py` học từ ảnh (cùng ý tưởng với script của ta), ngân sách 8–12 màu/nhân vật, tỉ lệ chibi 32 px: đầu y 2–13, thân 14–22, chân 23–29. Không dùng code Python trong app (stack TS), nhưng mượn quy trình và checklist. |
| [willibrandon/pixel-plugin](https://github.com/willibrandon/pixel-plugin) (pixel-art-professional/creator/animator/exporter)                                                                               | Claude skills, cần Aseprite qua MCP (`pixel-mcp`, Go)     | MIT                                 | Lý thuyết chung (dither Bayer, ramp 5 bước, pillow shading, nguồn sáng). Phụ thuộc Aseprite (trả phí, không open source đầy đủ) nên không áp dụng trực tiếp.                                                                                                                                                                                                                                                            |
| [diivi/aseprite-mcp](https://github.com/diivi/aseprite-mcp)                                                                                                                                                | MCP server 104 tool cho Aseprite                          | MIT                                 | Ý tưởng cho bước kiểm tra chất lượng: `generate_color_ramp`, `outline_cel`, `audit_animation` (kiểm tra cel/overlap giữa các frame). Cần Aseprite nên chỉ tham khảo.                                                                                                                                                                                                                                                    |
| [Universal LPC Spritesheet Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)                                                                                  | web ghép layer nhân vật 64×64                             | code GPL, asset CC-BY-SA/GPL/OGA-BY | Cấu trúc layer + offset theo animation giống hướng `sprite-kit`. **Không đóng gói asset** (CC-BY-SA, phải ghi công).                                                                                                                                                                                                                                                                                                    |
| [SpriteBat](https://fatbatstudio.itch.io/spritebat), [RetroSprite](https://theodor908.itch.io/retrosprite)                                                                                                 | compositor sheet (GPL-3), editor Python                   | GPL                                 | Không liên quan trực tiếp.                                                                                                                                                                                                                                                                                                                                                                                              |
| [PalettePainter](https://github.com/chickensoft-games/PalettePainter), [ColorRampGenerator](https://github.com/Exerionius/ColorRampGenerator), [Wayline ramp](https://www.wayline.io/color-ramp-generator) | sinh dải màu dịch hue                                     | .NET / web                          | Cùng công thức Slynyrd mà `pixel-core/ramps.ts` đã cài; không cần thêm.                                                                                                                                                                                                                                                                                                                                                 |
| Lospec palettes (Endesga 32, Sweetie 16, Resurrect 64)                                                                                                                                                     | bảng màu cộng đồng                                        | tự do                               | Preset bảng màu cho `ProjectStyle` nếu muốn "khoá" màu toàn dự án.                                                                                                                                                                                                                                                                                                                                                      |

Kết luận: không có skill nào thay được việc tự vẽ ma trận; cái đáng mượn là **quy trình
và checklist** của pixel-art-studio, còn số liệu dải màu/viền thì lấy từ phép đo ở §2.

## 6. Việc tiếp theo

1. Dùng `REFERENCE_RAMP_OPTIONS` + `REFERENCE_PAINT_OPTIONS` làm mặc định khi `sprite-kit` thành lõi (M1 trong `PIVOT.md`), thêm preset viền `soft`.
2. Vẽ lại template thân/đầu/tóc với đủ 3 tông theo quy tắc 3 và 8; kiểm tra silhouette đổ đen ở ×1.
3. Thêm checker tự động (Vitest) cho sprite: số màu ≤ 16, không điểm mồ côi ngoài mắt, viền khép kín, không alpha trung gian — tương đương `validations.md` của pixel-art-studio.
4. Bóng đổ elip và điểm sáng mắt theo quy tắc 9, 12.
