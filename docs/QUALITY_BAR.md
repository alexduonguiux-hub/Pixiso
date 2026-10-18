# Chuẩn chất lượng pixel và cách chấm

Người dùng nhận xét sprite "vẫn không đạt" sau nhiều vòng sửa theo mắt. Tài liệu này thay
cảm tính bằng **một thước đo lấy từ ảnh mẫu** và **một bảng nghiệm thu bằng mắt có tiêu chí
rõ**. Một sprite chỉ được báo "đạt" khi qua cả hai.

## 1. Thước đo: ảnh mẫu đo thế nào thì sprite của ta đo y như thế

Nhân vật mặc đồ trong ảnh mẫu (17×40 kể cả viền) được đưa về lưới 1× từ bản lớn của tờ
mẫu (`scripts/research/resample_ref.py`, bước điểm ảnh 11,58 px) rồi đo bằng
`scripts/research/score.py --ref`. Số đo lưu trong `scripts/research/reference_figure.json`
(tờ mẫu không commit vì chưa rõ bản quyền). Mọi sprite của ta được `scripts/hero-score-dump.ts`
xuất ra PNG 1× và đo **trong không gian ảnh bằng cùng hàm** (không dựa vào ô ngữ nghĩa của
ta, trừ tỉ lệ tông vì ta biết chính xác ô nào là da/áo).

| Số đo        | Ý nghĩa                                                                  | Ảnh mẫu                   | Ta (trung vị 130 sprite)                   |
| ------------ | ------------------------------------------------------------------------ | ------------------------- | ------------------------------------------ |
| `colors`     | số màu sau khi gộp màu gần nhau (OKLab 0,03)                             | 25                        | 17                                         |
| `materials`  | số họ màu (gom theo hue 22°, xám tách tối/sáng) ≈ số chất liệu nhìn thấy | 5                         | 4                                          |
| `tones`      | số bậc sáng trong một họ                                                 | áo 6, tóc 6, quần 5, da 3 | mọi chất liệu 3 (giới hạn của định dạng ô) |
| `lineDens`   | ô đường nét bên trong (tối, mảnh, không phải viền ngoài) trên 100 ô      | 6,9                       | 6,6                                        |
| `lines`      | số đoạn nét bên trong ≥ 2 ô (cổ áo, túi, cổ tay, thắt lưng, nếp gấp)     | 6                         | 6                                          |
| `flatMax`    | mảng phẳng cùng màu lớn nhất, % diện tích                                | 5,3                       | **12,6**                                   |
| da `hl / sh` | % ô sáng / ô tối trong da                                                | 21 / 6,5                  | 18 / 26                                    |
| áo `hl / sh` | % ô sáng / ô tối trong chất liệu áo lớn nhất                             | 10 / 40                   | **20 / 17**                                |

Hai con số in đậm là khoảng cách lớn nhất: **mảng phẳng của ta to gấp 2,4 lần** (áo là một
khối màu trơn) và **áo của ta sáng và phẳng** trong khi áo mẫu chủ yếu là tông giữa và tông
tối với rất ít điểm sáng. Hàng `tones` cho thấy một giới hạn cấu trúc: ô của ta chỉ có 3 bậc
(sáng/giữa/tối) nên không thể tái tạo 5–6 bậc mà mẫu dùng cho áo và tóc.

## 2. Ngưỡng đạt (tự động, `pnpm qa:score`)

Một sprite đạt khi **không có cờ nào** trong:

- `colors` ≤ 1,2 × mẫu (30); `materials` ≥ 0,75 × mẫu (4); `lineDens` ≥ 0,6 × mẫu (4,1);
  `lines` ≥ 0,6 × mẫu (4); `flatMax` ≤ 1,3 × mẫu (6,9 %).
- Da: 3 tông, sáng 12–32 %, tối 4–20 %. Áo: 3 tông, sáng 4–22 %, tối 28–52 % (dải của mẫu nới
  ±10 điểm).
- Lint cầm bút (`pixel_lint.py`: viền đôi, bậc giật, dải thẳng hàng, sọc ôm viền) ≤ 2 cảnh báo.
- Kiểm tra chéo: hai nhân vật cùng thân không được có silhouette S trùng nhau quá 92 %
  (1 − IoU < 0,08 là "chỉ khác màu"); chiều cao và diện tích S/N, SW/NW lệch ≤ 8 %.

Vector sáng (trọng tâm ô sáng trừ trọng tâm ô tối) chỉ ghi nhận, không chấm: trên cả hình,
ánh sáng ở bụng và đùi kéo nó xuống ngay cả trên mẫu.

**Kết quả hiện tại (18/10/2026): 0 / 130 sprite đạt.** Số sprite rớt theo từng tiêu chí: áo tối
119, mảng phẳng 113, da tối 92, lint 82, áo sáng 66, chất liệu 42, da sáng 32, đường nét 32,
đoạn nét 27. 28 cặp nhân vật có silhouette gần trùng (Ny, Sơn, Ông Tư, Bác sĩ Lan, năm lính:
khác nhau dưới 8 %; hai lính nón sắt trùng 100 %). Báo cáo đầy đủ: `test-output/score/report.md`.

## 3. Nghiệm thu bằng mắt (bắt buộc, ×6 trên nền xám trung tính, cạnh ảnh mẫu cùng tỉ lệ)

Chấm từng sprite theo 10 mục, mỗi mục đạt/không; dưới 9/10 là không đạt:

1. **Đổ đen ở ×1 nhận ra nhân vật** (tóc, mũ, áo khoác, vật cầm đổi silhouette), không chỉ
   nhận ra "một người".
2. **Mắt đọc được ở ×1**: 2 ô rộng, có điểm trắng; lông mày hoặc hốc mắt tách khỏi tóc.
3. **Tóc có khối**: ≥ 4 lọn/khối với sáng ở trên–trái từng khối, không phải một mảng + một dải.
4. **Áo có cấu trúc may**: cổ áo (chữ V hoặc bẻ) với áo trong lộ ra, đường vai, cổ tay/gấu, túi
   hoặc khuy; ít nhất 3 trong 5.
5. **Nếp gấp**: mỗi mảng vải lớn (ngực, bụng, đùi) có 1–2 vạch tối ngắn hoặc cụm bóng phá
   mảng phẳng; không mảng nào quá 7 % diện tích.
6. **Tông áo**: tối chiếm 30–50 %, sáng ≤ 20 %, sáng chỉ ở vai và mép trên–trái.
7. **Ba lớp trước–sau**: tay, thân, chân phân biệt bằng viền hoặc bóng tiếp xúc (bóng dưới
   tay lên sườn, dưới gấu áo lên quần).
8. **Chân và giày**: quần có bóng mặt trong đùi, giày tách khỏi quần bằng tất hoặc đường
   cổ giày, mũi giày có sáng.
9. **Không lỗi cầm bút**: không sọc dọc chi, không dải bằng nhau, không viền đôi ngoài chỗ
   tiếp xúc, không ô lẻ ngoài điểm sáng.
10. **8 hướng nhất quán**: cùng chiều cao chân, đầu cùng cỡ, món đồ đúng chỗ, bóng theo
    cùng nguồn sáng (hướng lật chấp nhận theo D-042).

## 4. Quy trình

```bash
pnpm qa:score            # dump 1x + chấm; đọc test-output/score/report.md
pnpm qa:pixel && pnpm qa:hero
# xem ảnh ×6 cạnh mẫu, chấm 10 mục ở §3 cho từng nhân vật đã sửa
```

Mọi lần sửa phải ghi số sprite đạt trước/sau vào `docs/PROGRESS.md`; không báo "xong" khi
số đạt không tăng.

## 5. Khoảng cách cấu trúc cần quyết định (không sửa bằng vẽ lại được)

1. **Số bậc sáng mỗi chất liệu.** Mẫu dùng 5–6 bậc cho áo và tóc; định dạng ô của ta cố định
   3 bậc (`Shade 0..2`), bảng màu sinh 3 màu/chất liệu. Muốn chạm mức mẫu cần mở rộng ô lên
   5 bậc (sáng đậm, sáng, giữa, tối, tối đậm), đổi `pixel-core` ramps, `paint`, lint và mọi
   template; là thay đổi lõi, cần chủ dự án chốt.
2. **Cách mặc đồ.** Hiện áo là phép đổi vật liệu trên thân nên thừa hưởng mảng sáng của da
   (ngực, bụng) và không có cấu trúc may. Mẫu vẽ áo như một vật riêng (cổ, vai, túi, gấu, nếp).
   Cần một lớp "cắt may" cho từng kiểu áo (overlay cổ/vai/gấu + quy tắc tông riêng cho vải:
   sáng ít, tối nhiều ở dưới–phải) thay vì chỉ remap.
3. **Silhouette riêng từng nhân vật.** Dàn chính dùng chung một thân và tóc gần nhau nên 28
   cặp "chỉ khác màu". Cần quyết định đặc điểm silhouette cho từng người (kiểu tóc có khối,
   áo khoác dài, mũ, vật cầm).
