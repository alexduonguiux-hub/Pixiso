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

Bảng này là bảng của người chấm độc lập (một phiên Claude khác, chỉ xem ảnh, không biết kết
luận của người vẽ; biên bản ở §6), đối chiếu với ảnh mẫu. Chấm từng sprite ở 1×; mỗi mục
đạt/không; dưới 9/10 là không đạt.

1. **Mắt**: cột mống mắt màu bão hoà, 3 ô cao, tông tối ở trên; đúng một điểm trắng phản chiếu
   (ảnh mẫu: trắng 2 ô ở phía ngoài hai hàng dưới, không phải một cột trắng suốt chiều cao);
   ở S/SW có nét miệng hoặc bóng lông mày.
2. **Tóc**: ≥ 3 tông tô ngoài viền; ≥ 3 lọn phân biệt được; mái chờm xuống hàng lông mày/mắt ít
   nhất 1 ô ở đâu đó (không phải cái mũ đặt trên mặt); tông tô sáng hơn viền ≥ 12 điểm L.
3. **Áo**: mỗi món có ≥ 1 chi tiết cấu trúc ngoài silhouette (lớp áo trong ở cổ, cột khoá/đường
   may, cổ tay, gấu, thắt lưng, băng gối), vẽ bằng một giá trị **ngoài** dải 3 tông của món đó.
4. **Bậc tông**: sáng ≥ +12 L và tối ≥ −12 L so với tông gốc; sáng chiếm 10–25 % chất liệu và nằm
   trên–trái; tối là một hình khối, không phải dải 1 ô bám viền.
5. **Góc 45°**: bề rộng thân hoặc vai khác góc chính ≥ 2 ô; mắt xa chỉ 1 ô hoặc khuất; một bàn
   chân nhích lên/xuống 1 ô.
6. **Góc ngang**: tay tách khỏi thân bằng đường tối hoặc khe 1 ô; thấy bàn tay; mũi nhô 1 ô; mắt
   lùi ≥ 2 ô khỏi mép mặt; không ô lạc ở chân.
7. **Góc sau**: không có mảng sáng ở gáy trừ khi cố ý là da; tóc sau ≥ 2 tông; cổ áo là một dải tối.
8. **Không chấm lẻ**: không ô đơn màu nào ngoài điểm sáng mắt; máu, bẩn, rằn ri, mụn vẽ thành
   hình 2–4 ô bám theo khối.
9. **Nhất quán 8 hướng**: mọi phụ kiện/đặc điểm (sọc, túi, miếng vá) xuất hiện ở mọi hướng
   nhìn thấy được nó, cùng một hình.
10. **Nhận ra nghề/nhân vật ở 1×** bằng silhouette + một màu nhấn (mũ, nón, túi, áo gi-lê).

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

## 6. Biên bản chấm độc lập (18/10/2026)

Một phiên Claude riêng chỉ nhận ảnh mẫu và bốn tấm sheet của ta (dàn đứng 8 hướng, sáu zombie,
bốn thể hình lớn, dàn thể hình), được yêu cầu chấm khắt khe và xếp hạng lỗi. Kết luận: _silhouette,
tỉ lệ, viền 1 ô, điểm neo chân và hướng sáng ngang mức ảnh mẫu; phần vẽ bề mặt thì không. Của ta
đọc như một mannequin được nhuộm màu, của mẫu đọc như một nhân vật được vẽ._ Lỗi xếp hạng:

1. **Mặt trống**: mắt của ta là một cột trắng nhạt 3 ô cạnh một cột xanh; không miệng, không bóng
   lông mày; mọi người cùng một mặt. (Đối chiếu ô: mannequin mẫu có mống mắt 1 cột, 2 ô trên màu
   navy, ô dưới xanh, trắng chỉ ở hai hàng dưới phía ngoài; bản chép của ta để trắng cả 3 hàng và
   mống một tông: **lỗi chép**, sửa được ngay.) Zombie lặp lỗi với khe đỏ 1 ô.
2. **Tóc là silhouette tô đặc**: một tông + viền, "sáng" chỉ hơn gốc 4 điểm L; tóc xoăn là quả bóng
   rắc chấm 1 ô. Mẫu: 5–6 lọn, 4 tông, sáng ở trên–trái từng lọn, một lọn chờm qua mắt.
3. **Áo không có cấu trúc**: 3 tông một hue, mảng sáng tròn ở ngực trái, dải tối 1 ô mép phải, cổ V
   lộ da. Không cổ tay, gấu, khuy, túi, thắt lưng, đường may, lớp trong. Mẫu: cổ V lộ áo trong
   đen, cột khoá xám với mũi chỉ trắng, hàng gân xen tông, nẹp vai, miếng khuỷu tối, vá đỏ, băng
   gối xám trên quần đen, quai dép hở da.
4. **Bậc tông rụt rè**: áo gốc L35 → sáng L42 (+7); mẫu gốc L28, tối L17 (−10), điểm nhấn L65–100
   và L4. Ở 1× thân ta phẳng thành một giá trị.
5. **Góc 45° không xoay thân**: thân SW 16 ô so với S 17, hai mắt bằng nhau, vai và chân đối xứng.
   Bộ 8 hướng thực chất là 3 hình. Cần vai xa thu 2–3 ô, mắt xa 1 ô hoặc khuất, cổ V lệch, một chân
   nhích 1 ô.
6. **Góc ngang là một cột**: tay cùng tông và dính thân, không khuỷu; mắt sát mép trước, không mũi.
   Hùng góc W: áo ba lỗ thành tấm xám nuốt cả tay.
7. **Nhiễu thay cho chất liệu**: máu, mụn, rằn ri, vệt da trên khổng lồ ×2 là chấm 1–2 ô rải rác;
   ở 1× đọc như bẩn hoặc lỗi nén.
8. Zombie lính: hai tay buông trước là chất liệu sáng nhất sprite, đọc như "chân trắng".
9. Gi-lê công nhân đổi hình theo hướng (S một dải gấu, W hai sọc ngang, N không có).
10. Thể hình to/mập là mannequin nới rộng: da Hùng cam bão hoà như nhựa, áo ba lỗ là hình chữ nhật
    xám với hai vạch; bụng không có khối.
11. Góc sau: mảng sáng trong cổ áo đọc như lỗ áo; tóc sau một tông.
12. Tóc sẫm lẫn vào viền (L14 trên viền L0): đầu thành khối đen với hai khe trắng; giữ ≥ 12–15 L
    giữa tô và viền.

Đã đạt, không làm lại: tỉ lệ thân, viền 1 ô, điểm neo chân, giày; khổng lồ ×1,5/×2 vẽ đúng; mũ
nón và phụ kiện đọc được ở 1× (nón sắt, nón bảo hộ, mũ nồi, túi y tế, mai rùa, gai đột biến); mặt
Đột Biến là mặt duy nhất đạt; kỷ luật ánh sáng và bảng màu (20–26 màu/sprite); dáng zombie đọc ra
zombie ở 1×.
