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

| Số đo        | Ý nghĩa                                                                                                                                    | Ảnh mẫu                                                                   | Ta (trung vị 130 sprite)                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------- |
| `colors`     | số màu sau khi gộp màu gần nhau (OKLab 0,03)                                                                                               | 25                                                                        | 17                                                |
| `materials`  | số chất liệu nhìn thấy: mẫu đo trong ảnh (gom họ hue); sprite của ta đếm từ ô, họ ≥ 2 % số ô, gộp khi hue trong 32° và L trong 0,2 (D-072) | 5                                                                         | 4                                                 |
| `tones`      | số bậc sáng trong một họ                                                                                                                   | áo 6, tóc 6, quần 5, da 3                                                 | mọi chất liệu 3 (giới hạn của định dạng ô)        |
| `lineDens`   | ô đường nét bên trong (tối, mảnh, không phải viền ngoài) trên 100 ô                                                                        | 6,9                                                                       | 6,6                                               |
| `lines`      | số đoạn nét bên trong ≥ 2 ô (cổ áo, túi, cổ tay, thắt lưng, nếp gấp)                                                                       | 6                                                                         | 6                                                 |
| `flat <mat>` | mảng phẳng cùng màu lớn nhất của từng chất liệu, % số ô của chất liệu đó (viền và nét không tính; mảng ≤ 8 ô bỏ qua)                       | da trần 26,1 (mannequin); da mặc đồ 14,3; tóc 10,6; áo 17,4; quần đen 5,2 | sau D-069: tóc 0 sprite rớt; áo rớt 5/130; quần 0 |
| da `hl / sh` | % ô sáng hơn / tối hơn tông nền của da (xem ghi chú dưới bảng)                                                                             | 17 / 25 (mannequin trần: 24 / 26)                                         | 19 / 22                                           |
| áo `hl / sh` | % ô sáng hơn / tối hơn tông nền của chất liệu áo lớn nhất                                                                                  | 38 / 19 (áo mẫu lấy tông tối làm nền, gân sáng)                           | 13 / 35 (sau cắt may; trước: 20 / 17)             |

Con số in đậm là khoảng cách lớn nhất còn lại: **mảng phẳng của ta to gấp 2 lần** (chủ yếu
là tóc một tông và quần). Tỉ lệ sáng/tối tính so với tông nền của từng chất liệu: tông dùng nhiều nhất, trừ khi hai tông dùng nhiều nhất đều chiếm ≥ 25 % (màu vải với khối bóng, hoặc với mảng sáng rộng) thì tông nền là tông gần độ sáng trung vị của các tông có mặt hơn (D-060; lấy tông dùng nhiều nhất đơn thuần làm số đo lật ngược khi khối bóng vượt 50 %),
bỏ qua viền và nét vẽ, nên hai lối tô đều đo được: áo mẫu lấy tông tối làm nền và điểm sáng
bằng gân/khoá (38 % sáng hơn nền), áo của ta sau cắt may lấy tông gốc làm nền và khối bóng
(35 % tối hơn nền); trước cắt may áo của ta gần như phẳng (20 / 17 với mảng sáng thừa hưởng
từ da). Hàng `tones`: định dạng ô đã mở lên 5 bậc (D-057); mẫu dùng 5–6 bậc cho áo và tóc.

## 2. Ngưỡng đạt (tự động, `pnpm qa:score`)

Một sprite đạt khi **không có cờ nào** trong:

- `colors` ≤ 1,2 × mẫu (30); `materials` ≥ 0,75 × mẫu (4); `lineDens` ≥ 0,6 × mẫu (4,1);
  `lines` ≥ 0,6 × mẫu (4); `flat <mat>` ≤ 1,3 × số mẫu của loại chất liệu đó (da trần 34 %, da 18,6 %, tóc 13,8 %, mọi món áo quần giày 22,6 %; D-061).
- Da: ≥ 3 tông, sáng hơn nền 8–32 %, tối hơn nền 12–40 %, tổng ≥ 25 %. Áo: ≥ 3 tông, sáng 5–45 %,
  tối 12–55 %, tổng ≥ 30 % (một món gần phẳng rớt ở tổng). Dải lấy từ hai hình mẫu nới ±8 điểm.
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

## 7. Biên bản chấm độc lập vòng 2 (18/10/2026, sau D-057…D-066)

Cùng cách làm như §6 (phiên riêng, chỉ xem ảnh mẫu ×12 và các bảng ×6/×12 của ta, chấm theo
checklist §3). Kết quả theo nhóm — dàn chính **5/10**, lính **6/10**, zombie **5/10**, thể hình lớn
**5/9**: đều chưa đạt, nhưng so với §6 các mục mắt (dàn chính), áo, góc ngang, góc sau và nhận diện
nhân vật đã chuyển sang đạt. Mục còn rớt và lý do giám khảo nêu:

| Mục                 | Dàn chính                                                                   | Lính                                                        | Zombie                                           | Thể hình lớn                                                                       |
| ------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 1 Mắt               | đạt                                                                         | không: mống nâu xám, ở 1× thành vệt đen                     | không: chấm đỏ 1 ô, không mống, không điểm trắng | không: chỉ Đột Biến đạt                                                            |
| 2 Tóc               | không: Sơn, Kẻ Bắt Chước là nhiễu ô xám không lọn, mép mái thẳng            | không: đầu đinh nhiễu                                       | không: 4/8 tóc đen cùng pattern nhiễu            | —                                                                                  |
| 4 Bậc tông          | không: Ông Tư dải sáng 1 ô mép ngoài hai tay, hai ống quần                  | đạt                                                         | đạt                                              | đạt                                                                                |
| 5 Góc 45°           | không: rộng S/SW 17/16, mắt xa vẫn 2 cột, bàn chân trùng từng ô             | không                                                       | không (7/8)                                      | không (quái mai còn rộng hơn ở 45°)                                                |
| 8 Chấm lẻ           | không: máu 1 ô trên váy Kẻ Bắt Chước, chấm gấu Ny                           | đạt                                                         | không: máu chấm 1 ô rải rác                      | không: mụn vàng 1 ô                                                                |
| 9 Nhất quán 8 hướng | không: Sơn khối nâu 2×3 lơ lửng cạnh đầu ở NW/N/NE; dây túi Ny mất ở W/NW/N | không: súng lính 1 mất ở NW/N/NE; gậy lính 3 cách tay 1–2 ô | không: dải phản quang công nhân 1/2/0 theo hướng | không: Kẻ Thính mất tai ở W/E; Kẻ Bám Trần đứng ở S/N (34 ô) nhưng bò ở W/E (23 ô) |

Lỗi xếp hạng (B1–B12): (1) góc 45° là góc S dịch mặt — thu vai xa 2 ô, tay xa vào 1 ô, chân xa lùi
1 ô, mắt xa 1 ô mống không trắng, chừa 1 ô da giữa viền và mắt gần; (2) súng lính 1 mất ở ba góc
sau; (3) khối nâu lơ lửng cạnh đầu Sơn ở góc sau; (4) máu/mụn/cúc là chấm 1 ô (đã sửa ở D-065, sau
khi ảnh được chụp); (5) tóc "nhiễu camo" trên tóc sẫm — cần 3 lọn theo hướng mọc, mỗi lọn một đường
sáng một đường tối, mái răng cưa; (6) Ông Tư sáng đối xứng, râu hình hộp đọc như khẩu trang; (7) mống
mắt lính không bão hoà; (8) dải phản quang công nhân (đã sửa D-065); (9) tai Kẻ Thính ở W/E, dáng Kẻ
Bám Trần; (10) mắt zombie 1×1; (11) gậy lính 3 không có nắm tay; (12) quần/giày dàn chính nghèo chi
tiết (thắt lưng, gấu, đế sáng). Đã ngang hoặc hơn mẫu: công thức mắt dàn chính, da mannequin 4 tông,
tóc Ny/Dương/Lan, góc W của thân người, dây + túi quân y, đuôi ngựa, mai/gai, silhouette dàn zombie.
Kết luận của giám khảo: _từ cổ trở lên đã là nhân vật được vẽ; từ cổ trở xuống phần lớn vẫn là một
thân mannequin nhuộm màu_ — sửa B1–B5 rồi chấm lại.

## 8. Biên bản chấm độc lập vòng 3 (18/10/2026, sau D-067…D-072)

Cùng cách làm (agent riêng, chỉ nhận đề bài + ảnh: crop nhân vật mẫu, hai bảng 8 hướng ×1/×6 và
27 dải hàng ×12; cấm đọc DECISIONS/PROGRESS/§5–§7, cấm sửa repo). Khác vòng 2: giám khảo này đọc
ma trận ô ×1 của cả 27 nhân vật ở S/SW/W/N, **đếm ô lẻ bằng script**, đo ΔL từng ramp, đo bề rộng
S–SW và hàng chân, và dựng lại ảnh mẫu về 1× (mẫu 18×41 ô, cùng cỡ sprite của ta) — nên nghiêm hơn
hẳn và điểm không so trực tiếp với §7 được. Đề bài và toàn văn: `docs/reviews/2026-10-18-round3*.md`.

Kết quả: dàn chính **4/10**, lính **4/10**, zombie **1/10**, thể hình lớn **2/9** — cả bốn chưa đạt.

| Mục                 | Dàn chính | Lính  | Zombie | Thể hình lớn | Bằng chứng chính giám khảo nêu                                                                                                   |
| ------------------- | --------- | ----- | ------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 1 Mắt               | đạt       | đạt   | không  | không        | module S/SW trùng mẫu từng ô; ở W cột trắng 3 hàng phía trong mống (mọi người); zombie cột nhạt 3 ô; Đột Biến hai mắt khác hình  |
| 2 Tóc               | không     | không | không  | —            | lưới chu kỳ 3 cột (`c c h c c h…`), mép mái thẳng như mũ úp (Ny, Bác sĩ Lan hàng 29 kín, hàng 30 da)                             |
| 3 Áo                | không     | không | không  | không        | quần không đai/cổ tay/băng gối; áo thun Dương không cổ/gấu; áo–quần trắng của Bác sĩ Lan dính một cột                            |
| 4 Bậc tông          | không     | không | không  | không        | sáng áo lính ≈ 4 % (6–8 ô vai); sáng Kẻ Phun ở bụng dưới; tối là cột 1 ô bám viền (Dương x=35, Bác sĩ Lan x=35)                  |
| 5 Góc 45°           | đạt       | đạt   | không  | không        | A/B: rộng 17→15, mắt xa 1 cột, chân nhích; zombie/thể hình lớn: rộng bằng S, hai chân cùng hàng                                  |
| 6 Góc ngang         | không     | không | không  | không        | ô gót màu viền mặc định (28,24,36) tại (27,60) W/E trên 24/27 nhân vật; gi-lê Hùng rời trước tay                                 |
| 7 Góc sau           | đạt       | đạt   | không  | đạt          | gáy Ny/Bác sĩ Lan/Lính nón sắt dither `j r j r j`; cổ áo zombie nam là mảng sáng                                                 |
| 8 Chấm lẻ           | không     | không | không  | không        | 2 ô sáng đơn (29,42)(29,46) mép thân trên mọi áo; máu đơn Kẻ Bắt Chước; 4 ô tối chữ W đỉnh đầu hói; mụn 1 ô; 45 ô `d` lẻ Kẻ Phun |
| 9 Nhất quán 8 hướng | không     | không | không  | không        | Sơn có nút ở SW không ở S; dây đeo Lính nón sắt là vạch rời; súng đầu đinh@W đứt hàng 35–38; công nhân/Kẻ Thính @W tay duỗi      |
| 10 Nhận ra ở 1×     | đạt       | đạt   | đạt    | đạt          | nón/mũ/túi/mai/tai/dáng phân biệt được; tốt hơn mẫu (mẫu chỉ một nhân vật)                                                       |

Lỗi xếp hạng (đơn thuốc ở mức ô trong toàn văn): **B1** tóc lưới chu kỳ + mái thẳng → 3 mảng
sáng/gốc/tối, một lọn 2 ô tụt xuống hàng mắt, xoá ô sáng đơn trong khối tối; **B2** áo quần phẳng →
thắt lưng, cổ tay, băng gối ngoài dải 3 tông, mảng sáng áo thành khối 3×3 vai trái (≥ 10 %), tối là
khối không phải cột; **B3** zombie/thể hình lớn không xoay 45° (rộng bằng S, hai chân cùng hàng) và
một dáng hai tư thế (công nhân, Kẻ Thính duỗi tay ở W); **B4** chấm lẻ (ô đầu nếp, máu, mụn, chữ W
đỉnh đầu, dither); **B5** mắt W cột trắng 3 hàng, mắt zombie, Đột Biến hai mắt khác hình, Kẻ Phun
SW mắt 3 ô; **B6** phụ kiện đứt/trôi (dây đeo, súng W, nút Sơn, vạch 7 ô dưới mắt đọc như ria);
**B7** gi-lê Hùng@W rời; **B8** ô gót màu viền mặc định; **B9** dither gáy.

Đã ngang hoặc hơn mẫu: module mắt S/SW, ramp da, phối cảnh SW/W/N (hẹp 2 ô, mắt xa 1 cột, chân
nhích, mũi nhô, tay tách, bàn tay rõ), viền đơn sạch, ánh sáng trên–trái nhất quán 27 × 8, phụ kiện
bám đúng chỗ qua các hướng, nhận ra nghề/quái ở 1×. Kết luận của giám khảo: _nền tảng (thân, mắt,
góc nhìn, viền, ánh sáng) đạt mức mẫu; lớp bề mặt (tóc, kết cấu áo quần, mảng sáng tối, ô lẻ, đồng
bộ góc cho zombie) chưa — ở 1× là silhouette màu phẳng với hai chấm xanh, ở ×6 là "lắp ghép theo
luật" chứ chưa phải "vẽ tay"._

Xử lý sau biên bản (theo thứ tự B8 → B4 → B1 → B2 → B5 → B3): **B8 xong**, **B4 phần lớn** (D-073: ô lẻ theo đúng thước của giám khảo 664 → 357, đạt 73 → 76/130; phần còn lại gộp vào B1/B2/B5). Thước `scripts/research/lone_pixels.py` giữ lại để số này không tăng.
