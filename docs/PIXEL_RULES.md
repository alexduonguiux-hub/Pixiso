# Quy tắc tạo hình pixel art cho Pixiso

> Bộ quy tắc rút ra từ các tài liệu pixel art được cộng đồng công nhận (Pixel Joint tutorial, Lospec, Pixel Parmesan, Pixelblog của Raymond Schlitter, Pixel Logic của Michafrar, các tutorial GIF của Pedro Medeiros/Saint11) và từ cách các game render 3D → pixel (Dead Cells, kỹ thuật t3ssel8r, `RenderPixelatedPass` của three.js). Mỗi quy tắc ghi rõ **pipeline Pixiso làm gì** để tuân theo. Tham số mặc định nằm ở `DEFAULT_LOOK` (`packages/pixel-core/src/look.ts`) và `DEFAULT_RAMP_OPTIONS` (`ramps.ts`).

## 0. Tại sao render 3D "thẳng" trông không giống pixel art

Một khung 3D lấy mẫu ở độ phân giải thấp cho ra ba lỗi kinh điển mà mọi tutorial pixel art đều cảnh báo:

| Lỗi                                             | Nguyên nhân khi render 3D                        | Thuật ngữ                  |
| ----------------------------------------------- | ------------------------------------------------ | -------------------------- |
| Rìa răng cưa không đều (bước 1-3-1-2)           | lấy mẫu điểm (point sampling) silhouette         | _jaggies_                  |
| Pixel lẻ, đốm sáng/tối rải rác trong vùng phẳng | texture gradient × ánh sáng mịn rồi mới giảm màu | _noise / orphans_          |
| Dải màu bám theo viền thay vì theo nguồn sáng   | shading mịn, cắt bậc sau                         | _banding / pillow shading_ |

Pixiso tách **màu** và **ánh sáng** ở GPU, rồi dựng lại khung hình bằng quy tắc của họa sĩ pixel thay vì bằng phép trung bình.

## 1. Đường nét (lines)

**Quy tắc.** Đường pixel đẹp có bước đều (2-2-2 hoặc 1-2-1-2), không có _doubles_ (pixel thừa làm dày nét 1px), không có _orphans_ (pixel đứng một mình chìa ra ngoài hình). Pixel art truyền thống **không** anti-alias rìa ngoài vì nền game thay đổi; AA chỉ dùng chọn lọc cho nét trong.

**Pixiso làm gì.**

- Render hai pass (màu, ánh sáng) ở **4× độ phân giải** rồi hạ xuống 1× bằng **độ phủ**: ô 4×4 có ≥ 50 % điểm đặc thì thành pixel đặc. Rìa vì thế bám đúng hình thật, bước răng cưa đều hơn lấy mẫu điểm, và ít rung giữa các frame.
- Không bao giờ có pixel bán trong suốt (alpha chỉ 0 hoặc 255).
- **Bắc cầu mảnh mỏng**: ô chỉ phủ 30–50 % vẫn thành pixel nếu nó nối hai ô đặc ở hai phía (trái–phải hoặc trên–dưới), để vây mũ, lưỡi kiếm, gậy mỏng liền mạch thay vì đứt thành vụn. Không bao giờ bịa pixel ở nơi không có hình học.
- Mảnh rời (đảo pixel 8-liên-thông) nhỏ hơn 6 px bị xoá: đó là vây mỏng hoặc dải lẹm rơi dưới ngưỡng độ phủ, không phải chi tiết.
- Chưa làm AA nét trong (ngoài MVP, xem §6).

## 2. Cụm (clusters), không phải hạt

**Quy tắc.** "Pixel art is made of clusters": mỗi mảng màu là một cụm có hình dạng chủ ý. Pixel rải rác là nhiễu, làm sprite khó đọc ở 1×. Nguyên tắc kiểm tra: nếu không nhận ra sprite ở 1× thì sprite thất bại.

**Pixiso làm gì.**

- Khi hạ 4× → 1×, màu của pixel là **màu chiếm đa số** trong ô (cặp _vật liệu + bậc sáng_), không phải trung bình. Không bao giờ sinh màu mới.
- **Dọn cụm nhỏ**: mọi cụm 4-liên-thông nhỏ hơn 3 px nhận màu của láng giềng phổ biến nhất quanh nó (`minCluster = 3`).
- **Giữ chi tiết chủ ý**: cụm nhỏ nhưng khác biệt mạnh về độ sáng (ΔL > 0.3 trong OKLab, ví dụ mắt đen trên da, khóa thắt lưng) được giữ lại.
- **Mảng sáng lớn**: trong cùng một vật liệu, pixel có bậc sáng khác với đa số rõ rệt của láng giềng cùng vật liệu nhận bậc của đa số (lọc mode 2 lượt), và đảo bậc sáng nhỏ hơn 4 px bị hòa vào mảng xung quanh. Ranh giới vật liệu không bao giờ bị vượt qua.
- Pixel viền không bao giờ bị dọn.
- Không dùng dithering (spec §6.5.5): dithering ở sprite nhỏ là nhiễu.

## 3. Bảng màu theo dải (ramps) và dịch hue

**Quy tắc.** Họa sĩ pixel không tô một màu rồi làm tối/sáng. Mỗi vật liệu có một **dải** 2–4 bậc; bậc tối **dịch hue về phía lạnh (xanh/tím)** và **bão hòa hơn**, bậc sáng **dịch về phía ấm (vàng)** và **nhạt hơn**; mỗi bậc dịch tối đa khoảng 20°. Màu xám (kim loại) không xoay hue mà chỉ được **nhuộm** nhẹ lạnh/ấm. Giá trị (value) quan trọng hơn hue cho khả năng đọc.

**Pixiso làm gì.**

- Pass **albedo** (texture × đổi màu, chưa có ánh sáng) của **mọi frame** được median-cut trong OKLab thành **K vật liệu gốc**, `K = ⌊0.55·(N − 1)⌋` (N = số màu người dùng chọn; 16 màu → 8 vật liệu, 24 → 12, 32 → 17). Vật liệu được phân biệt bằng **hue/chroma** (trọng số a, b ×2, L ×0.5 khi chọn ô để tách) vì độ sáng là việc của dải; dân số texel được làm phẳng (count^0.6) để mắt, da, viền nhỏ vẫn có ô riêng; màu đại diện của ô là **texel phổ biến nhất** (màu thật của vật liệu, không phải trung bình).
- **Chia ngân sách như họa sĩ**: mọi vật liệu có màu trung bình; ngân sách còn lại (N − 1 − K) cấp **trọn dải 3 bậc cho các mảng lớn nhất trước** (≥ 3 % diện tích), rồi bậc bóng cho mảng kế tiếp; điểm nhấn nhỏ (mắt, khóa, đá quý) giữ **một màu phẳng**. 16 màu → 3 dải đầy đủ + 1 dải hai bậc + 4 màu phẳng + 1 màu nét.
- Mỗi dải sinh bằng `buildRamp`: bóng `L − 0.16`, hue xoay tối đa 20° về 264° (xanh), chroma ×1.15; sáng `L + 0.08`, hue về 110° (vàng), chroma ×0.85. Xám (chroma < 0.025) được nhuộm chroma 0.02. Mọi màu kẹp vào gamut bằng cách giảm chroma, giữ L và hue.
- Pass **ánh sáng** là shading toon 3 bậc theo `dot(N, L)`: bóng khi < 0.15, trung bình đến 0.8, điểm sáng chỉ khi > 0.8 (dải sáng hẹp, dải bóng vừa; tránh "ba dải đều nhau" trông như nhựa và tránh mảng sáng loá trắng).
- Một bảng màu cho **cả clip** (mọi hướng, mọi frame), không nhấp nháy.
- Chế độ `fixed`: dựng theo dải rồi mới ánh xạ sang bảng màu người dùng khóa.

## 4. Viền (outline)

**Quy tắc.** Viền ngoài tối giúp sprite tách khỏi mọi nền. **Selective outline (selout)**: viền sáng hơn ở phía đón sáng, tối hơn phía bóng, dùng chính màu tối hơn một bậc của mảng kế bên để nét "thuộc về" hình thay vì là miếng dán đen. Viền trong chỉ dùng khi cần tách mảng, thường là màu tối hơn một bậc.

**Pixiso làm gì.**

- `dark`: viền 1 px ngoài bằng **màu nét** (tối và lạnh hơn bóng tối nhất, tính từ bảng màu).
- `selective` (mặc định): pixel viền lấy **bậc bóng của chính vật liệu láng giềng** khi láng giềng đang sáng và bậc bóng đó thật sự tối hơn (ΔL ≥ 0.12 và L < 0.55); nếu không thì dùng màu nét, để nét luôn đọc là nét. Chọn láng giềng tối nhất trong 4 hướng để nét bám theo phía bóng.
- `none`: không viền.
- Viền được bảo vệ khỏi dọn cụm.
- **Nét trong theo độ sâu**: pass thứ ba ghi độ sâu 16 bit; ở nơi bề mặt gần che bề mặt xa hơn 12 cm, pixel phía xa dọc mép nhận màu nét của chính vật liệu đó (bậc bóng nếu đủ tối, nếu không thì màu nét). Nhờ vậy tay tách khỏi thân, đầu tách khỏi vai bằng một nét 1 px ở phía bóng, giống cách họa sĩ kẻ nét trong tối hơn một bậc.

## 5. Ánh sáng và hình khối

**Quy tắc.** Một nguồn sáng, cố định, thường từ trên-trái. Không _pillow shading_ (shading bám theo viền). Shading theo mảng (cel) dễ đọc hơn gradient. Tỷ lệ chibi, đầu to, chi tiết lớn đọc tốt ở 32–64 px.

**Pixiso làm gì.**

- Đèn gắn với camera, từ trên-trái màn hình, giống nhau ở cả 8 hướng (spec §6.1).
- Shading toon ba bậc qua gradient map nearest; không có gradient mịn.
- **Normal được làm mịn theo vị trí** trước khi tính ánh sáng: mesh KayKit xuất với normal bị tách ở rất nhiều cạnh (Knight_Body: 540 vị trí nhưng 1025 cặp vị trí+normal), nên shading theo mặt phẳng vỡ thành mảnh ở độ phân giải sprite. Lấy trung bình normal của mọi đỉnh trùng vị trí (có trọng số diện tích) cho ra trường sáng tròn trịa và mảng sáng lớn, đúng với hình khối chibi.
- KayKit là chibi, đầu to, hợp với 48 px.

## 6. Ngoài MVP (đã chừa chỗ)

- **AA chọn lọc** cho nét trong bằng màu trung gian của dải.
- **Hiệu chỉnh nét theo frame** (giữ bước răng cưa ổn định giữa các frame) và **khóa pivot sub-pixel** sẽ được kiểm bằng "test rung" ở Phase 3.
- **Tô tay / palette đặt sẵn** (Lospec palettes) qua chế độ `fixed`.
- **Bảo lưu vật liệu theo mesh** (pass material-id): luôn giữ một ô cho màu da của mesh `_Head` để mặt không bao giờ bị gộp khi ngân sách chật (hiện ở 16 màu Pháp sư bị gộp da với tóc; 24 màu thì ổn).

## 7. Tham số và cách chỉnh

| Tham số                                          | Mặc định                                             | Ảnh hưởng                                                             |
| ------------------------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------- |
| `supersample`                                    | 4                                                    | Độ chính xác rìa; 2 nhanh hơn, 8 rất chậm                             |
| `coverage`, `bridgeCoverage`                     | 0.5, 0.3                                             | Ngưỡng độ phủ; ngưỡng thấp hơn chỉ áp dụng khi bắc cầu giữa hai ô đặc |
| `bandValues` / `DEFAULT_TOON_BANDS`              | 0.35 / 0.7 / 1.0 tại dot(N,L) ≤ 0.15 / ≤ 0.8 / > 0.8 | Tỷ lệ bóng–trung bình–sáng                                            |
| `ramp.shadowL`, `highlightL`                     | −0.16, +0.08                                         | Độ tương phản dải                                                     |
| `baseCountFor`, `BASE_AXIS_WEIGHTS`, weightPower | 55 % ngân sách; L×0.5, a×2, b×2; 0.6                 | Số vật liệu và cách tách vật liệu                                     |
| `allocateShades.minFormShare`                    | 3 %                                                  | Mảng nhỏ hơn thì không được shading                                   |
| `bands.iterations`, `bands.minIsland`            | 2, 4                                                 | Mức gom mảng sáng trong một vật liệu                                  |
| `innerLineDepth`                                 | 0.012 (12 cm / 10 m)                                 | Độ chênh sâu tạo nét trong; 0 tắt                                     |
| `minIsland`                                      | 6                                                    | Mảnh rời nhỏ hơn thì xoá                                              |
| `ramp.maxHueShiftDeg`                            | 20                                                   | Mức dịch hue                                                          |
| `minCluster`, `contrastKeep`                     | 3, 0.3                                               | Mức dọn nhiễu và ngưỡng giữ chi tiết                                  |

## Nguồn tham khảo

- Pixel Joint, "Pixel Art Tutorial" (jaggies, doubles, orphans, banding, pillow shading, clusters): https://pixeljoint.com/forum/forum_posts.asp?TID=11299
- Pixel Parmesan, "Anti-Aliasing Fundamentals for Pixel Artists": https://pixelparmesan.com/anti-aliasing-fundamentals-for-pixel-artists
- Lospec, "Pixel Art Outlines, Part 2: Using Color" (selective outlines, nét trong): https://lospec.com/articles/pixel-art-outlines-part-2-using-color
- Raymond Schlitter, "Pixelblog 1 — Color Palettes" (dải màu, hue shifting): https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes
- Wayline, "Pixel Art for Games" và "Color & Palettes for Pixel Art": https://www.wayline.io/learn/pixel-art
- Michafrar, _Pixel Logic_ (readability, clusters, clean-up): https://michafrar.gumroad.com/l/pixel-logic
- Pedro Medeiros (Saint11), tutorials "Working with lines", "Cluster sketching", "Basic shading": https://blog.studiominiboss.com/pixelart
- 80.lv, "Case Study: Dead Cells Character Art Pipeline" (render 3D cỡ nhỏ không làm mịn, normal map + cartoon shader): https://80.lv/articles/case-study-dead-cells-character-art-pipeline/
- three.js `RenderPixelatedPass` (viền từ depth/normal): https://threejs.org/docs/pages/RenderPixelatedPass.html
