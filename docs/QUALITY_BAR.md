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

Xử lý sau biên bản (theo thứ tự B8 → B4 → B1 → B2 → B5 → B3): **B8 xong**, **B4 phần lớn** (D-073: ô lẻ theo đúng thước của giám khảo 664 → 357, đạt 73 → 76/130; phần còn lại gộp vào B1/B2/B5), **B1 xong** (D-074: tóc chải thành ba mảng chéo có đường lọn ngay khi mặc, đạt 77/130, ô lẻ 338), **B2 xong** (D-075: thắt lưng, cổ tay, băng gối, mảng sáng áo một khối, gấu, cổ chữ V, thân trần vẽ lại; đạt 80/130), **B5 xong** (D-076: mắt W một ô trắng, xương mày zombie ở thái dương, Đột Biến hai mắt cùng mô-đun; đạt 82/130, ô lẻ 332), **B3 xong** (D-077: chân xa lùi một hàng ở mọi thân 3/4, dáng vươn tay một tư thế; đạt 83/130). Còn B6, B7, B9. Thước `scripts/research/lone_pixels.py` giữ lại để số này không tăng.

## 9. Biên bản chấm độc lập vòng 4 (18/10/2026, sau D-073…D-077)

Cùng cách làm vòng 3 (agent riêng, chỉ nhận đề bài + ảnh: crop nhân vật mẫu, hai bảng 8 hướng ×1/×6 và
27 dải hàng ×12; cấm đọc DECISIONS/PROGRESS/§5–§8, cấm sửa repo). Giám khảo này đổ ASCII toàn bộ ô,
đo bề rộng từng hàng S so với SW, quét ô đơn 8-lân-cận, đo ΔL\* từng ramp áo, tỉ lệ và trọng tâm mảng
sáng/tối từng chất liệu. Da được miễn mục 4 (mẫu cũng dùng bậc sáng da +8); mục 2 không xét người đội
mũ kín; mục 1 không xét Kẻ Thính. Đề bài và toàn văn: `docs/reviews/2026-10-18-round4*.md`.

Kết quả: dàn chính **5/10**, lính **5/10**, zombie **4/10**, thể hình lớn **4/9** (vòng 3: 4 · 4 · 1 · 2) —
cả bốn chưa đạt.

| Mục                 | Dàn chính | Lính  | Zombie | Thể hình lớn | Bằng chứng chính giám khảo nêu                                                                                                        |
| ------------------- | --------- | ----- | ------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Mắt               | không     | không | đạt    | không        | Kẻ Bắt Chước mắt 1 ô đỏ trong hốc 2×3; lính đội mũ không miệng, không mày dưới vành; Đột Biến khối 2×2 một tông, không trắng          |
| 2 Tóc               | đạt       | không | đạt    | —            | Lính nữ tóc một tông hai dải + đuôi 2 ô; đầu đinh chân tóc 4 ô đơn; dàn chính và zombie 5 tông, lọn rõ, mái chạm mày                  |
| 3 Áo                | đạt       | đạt   | đạt    | đạt          | cổ V, nút, thắt lưng + khoá, dây chéo, ly váy, dải phản quang, băng gối — nhiều hơn mẫu; Kẻ Bám Trần yếu nhất (chỉ cổ hở)             |
| 4 Bậc tông          | không     | đạt   | không  | không        | áo Lan sáng +8 L, Kẻ Bắt Chước +11; áo văn phòng +4; cảnh sát sáng 7 %, công nhân 27 %; quần Đột Biến không có sáng, tối là cột 1 ô   |
| 5 Góc 45°           | không     | không | không  | không        | SW của 27/27: vai 15→14, lõi thân 7→7 (chỉ hàng tay 17→15); zombie quân đội SW là bản sao S kể cả mắt xa 2 ô; Đột Biến SW hai mắt y S |
| 6 Góc ngang         | đạt       | đạt   | không  | không        | zombie văn phòng W mép mặt thẳng, không mũi, hai mắt đỏ; Đột Biến W không bướu mũi, tay không vạch ngón; ô mũi giày (33,60) khác đế   |
| 7 Góc sau           | đạt       | đạt   | đạt    | đạt          | gáy tối, cổ áo dải tối, tóc sau ≥4 tông; ghi chú: 4 zombie có ô lục đơn thủng ở cổ sau, cảnh sát N dải cổ chỉ nửa trái                |
| 8 Chấm lẻ           | không     | không | không  | không        | chấm sáng vai X·X (27,37)(29,37) ở mọi áo; rằn ri lính là ô đơn; ô dùng một lần Kẻ Phun W (24,45), Kẻ Thính W (35,29); quai Sơn rời   |
| 9 Nhất quán 8 hướng | không     | không | không  | đạt          | dây chéo Ny chỉ có S/SW; gậy Sơn mất ở NW/N; nòng súng nón sắt mất trên vai ở NW/N; công nhân 1 dải phản quang ở S, 2 ở N/W           |
| 10 Nhận ra ở 1×     | đạt       | đạt   | không  | đạt          | cảnh sát zombie đọc như lính đội mũ; zombie quân đội ~ Lính Nhiễm; 24/27 còn lại nhận ra ngay                                         |

Lỗi xếp hạng (đơn thuốc ở mức ô trong toàn văn): **B1** góc 45° chưa xoay (bỏ một cột thân, hạ vai xa
một hàng → vai 15→13, thân 17→15 mọi hàng; zombie quân đội SW vẽ lại; Đột Biến SW mắt xa một cột);
**B2** chấm lẻ hệ thống (gộp hai chấm vai thành vạch 3 ô, rằn ri thành vệt 2–4 ô bám khối bóng, bịt ô
lục cổ sau zombie, xoá ô màu dùng một lần, nối quai Sơn/túi Ny); **B3** phụ kiện biến mất giữa các
hướng (dây Ny ở W/NW/N, gậy Sơn ở NW/N, nòng súng nón sắt ở NW/N, dải phản quang công nhân thống nhất
y=43/47); **B4** mắt Kẻ Bắt Chước và Đột Biến theo công thức cột 3 ô + trắng; **B5** miệng 2 ô + mày
cho lính đội mũ; **B6** bậc sáng áo trắng/áo tối (hạ gốc áo Lan, văn phòng, Kẻ Bắt Chước; mảng sáng
quần Đột Biến ≈ 10 %, tối thành khối 2 ô; cảnh sát/công nhân/Kẻ Phun/mai chỉnh tỉ lệ); **B7** mặt W
zombie văn phòng và Đột Biến; **B8** tóc lính nữ/đầu đinh thành lọn; **B9** nhận diện cảnh sát và
quân đội zombie ở 1×; **B10** lỗi nhỏ (ô mũi giày W, dải cổ cảnh sát N, vành mũ lính nữ W, gấu quần
Lan, gấu áo Kẻ Bám Trần).

Đã ngang hoặc hơn mẫu: công thức mắt người và zombie kể cả W/SW (mẫu không có các góc này), mặt (mày,
thái dương, cằm, mũi W, miệng zombie), tóc 5 tông có lọn, da L86/+8/−22, cấu trúc trang phục nhiều
hơn mẫu, 20/24 chất liệu sáng +18…+20 L và tối −27…−30 với trọng tâm sáng lệch trên–trái, kỹ thuật
sạch, 24/27 silhouette nhận ra ở 1×. Kết luận của giám khảo: _ở 1× đọc như bộ sprite thương mại hoàn
chỉnh; ở ×6 nền tảng đã ngang mẫu, nhiều chỗ nhiều chi tiết hơn; lỗi còn lại là lỗi hoàn thiện (dọn ô
đơn, đồng bộ phụ kiện, xoay thật ở 45°, chỉnh 2–4 giá trị L) chứ không phải lỗi nền; sửa B1–B4 sẽ kéo
cả bốn nhóm lên 7–8/10._

Ghi chú của người vẽ (không phải của giám khảo), đã soi lại trên ma trận ô: mục 5 vòng này đo vai và
lõi thân chứ không đo bề rộng toàn hình như vòng 3, nên D-072/D-077 (hẹp 2 ô ở hàng tay, chân xa lùi)
được ghi nhận nhưng không đủ; hai chấm vai (27,37)(29,37) đúng là ô tông sáng nhất của vải (`V`) đặt rời
ở hàng vai trên mọi áo, cần tìm nguồn trong `tailor64`; mũ sắt và đầu của zombie quân đội ở SW giống hệt
S (dáng gục đầu chưa có góc 3/4); hai mắt Đột Biến ở SW vẫn là mô-đun đầy đủ (D-076 chỉ thu mắt xa cho
Kẻ Phun). Thứ tự sửa: B2 → B3 → B4 → B5 → B6 → B1 → B7 → B8 → B9 → B10.

Xử lý sau biên bản: **B2 xong** (D-078: cặp chói vai, không ô sâu/sáng/chói đơn trong món, góc đường may
trên da/điểm nhấn, ô viền lẻ màu, thẻ bài, vết loét; đạt 83/130, ô lẻ 335 → 310, `strict` 2748 → 1691); **B3
xong** (D-079: dây túi Ny/quân y, gậy Sơn và nòng súng ở góc sau, dải phản quang cùng hàng; ô lẻ 302, lệch góc
nhìn 0); **B4 xong** (D-080: mắt Kẻ Bắt Chước và Đột Biến theo mô-đun chung; ô lẻ 303); **B5 xong** (D-081: miệng 2 ô cho
mọi mặt thường, mày đầu đinh nâu; ô lẻ 302); **B6 xong** (D-082: áo trắng hạ gốc, quần chân rộng, mai; đạt 85/130,
ô lẻ 299; cảnh sát/công nhân giữ nguyên vì đã qua ngưỡng); **B1 xong** (D-083: lõi thân SW/NW 6 ô, vai 13; đạt
84/130, lint 80); **B7 xong** (D-084: đầu W cho dáng ngoẹo cổ, mũi và vạch ngón Đột Biến W; ô lẻ 286); **B8 xong** (D-085: đuôi tóc lính nữ có tông; đầu đinh S/SW chải theo chế độ crop — ba tông thành mảng, một nét chia thẳng, ngưỡng đúng cổng của thước; W/N/NW giữ lọn vì cần ≥ 5 mảng; ô lẻ 287 / strict 1663 bằng HEAD đo lại); **B9 xong** (D-086: dải băng đỏ quanh mũ kê-pi cảnh sát, da xám-lục và lỗ áo rách của zombie quân đội; đạt 85/130, strict 1655); **B10 xong** (D-087: dải cổ áo dưới gáy @N cho dáng gục đầu, gấu may cho áo rách Kẻ Bám Trần; từ chối đế giày một tông — 15 sprite rớt `banding` — và ô gấu quần Lan — Lan@SW rớt `lineDens` 4,08 < 4,1; đạt 85/130, ô lẻ 286, strict 1642). **Hết thứ tự sửa của vòng 4**; còn lại cho vòng sau: hai mục từ chối ở D-087, W/N/NW của đầu đinh vẫn chải lọn (D-085), ô viền vành sau mũ Lính nữ @W thành tóc sâu.

## 10. Thước 1× (từ 19/10/2026, D-088) — cổng nghiệm thu

Giám khảo các vòng 1–4 chấm ở ×6; người dùng nhìn ở cỡ thật và thấy pixel rời khỏi thân, chấm da đơn, sáu bộ
quân phục lục không phân biệt được. Từ 19/10, **`pnpm qa:1x` là cổng**, §3–§9 và `qa:score` giữ làm tham khảo.

| Thước     | Định nghĩa                                                      | Mốc 19/10 (trước → sau D-088) | Luật       |
| --------- | --------------------------------------------------------------- | ----------------------------- | ---------- |
| `islands` | mảng 8-liên-thông tách khỏi thân                                | 3 → **0**                     | phải 0     |
| `skin1`   | ô da không có ô da nào trong 8 ô quanh                          | 143 → **0**                   | phải 0     |
| `frag`    | vùng cùng vật liệu 4-liên-thông dưới 3 ô (trừ viền, mắt, trắng) | 1012 → **731** → 720 (D-092) → **334** (D-093) | không tăng |
| cặp lẫn   | góc S, IoU silhouette ≥ 0,82 và ΔE sáu dải ≤ 0,075              | 7 → **7** → **0** (D-089)     | không tăng |

Báo cáo: `test-output/score/report_1x.md` (danh sách theo sprite, mảnh theo vật liệu, mọi cặp IoU ≥ 0,82).
Khi một thay đổi hạ `frag` hay số cặp, hạ `BASELINE` trong `scripts/research/qa_1x.py` cùng commit.

Mục (3) xong 19/10, D-093: dây chéo rộng 2 ô, vết máu/mụn/nhọt là mảng chữ L ba ô qua `cullSmallBlotches`, thắt
lưng hai hàng + khoá 2×2, cổ tay vải 2 ≥ 3 ô — `frag` 720 → 334; kiểm kê mảnh theo nguồn sinh bằng
`python3 -I scripts/research/frag_inventory.py [view]` trước khi sửa. 334 mảnh còn lại là ô cấu trúc (cơ thang
cạnh cằm @S/SW, khoé miệng zombie, đuôi áo @W, góc cổ áo dáng gục). Việc còn lại: (6) 5 ô lấp viền tạo khối 2×2
(ngón cái dưới cổ tay áo @N, tai dưới mũ sắt @NW); đầu gục @N/NW vẫn hạ hai hàng như mặt trước (D-092). Mục 5 (bảng màu nhận diện) xong 19/10, D-089: 7 cặp → 0. Mục 4 (nhiễu tông) xong 19/10, D-090:
tóc mảng dưới 130 ô ba tông, áo không chấm chói/sâu 2 ô, trần viền 0,22; thước ×6 còn 53/130 vì `flat hair` đòi
vùng ≤ 13 ô — thước đó không còn là đích. Ba cặp lẫn sát ngưỡng (ΔE 0,076): đổi màu nhóm lục phải đo lại.

**Góc sau là hình dựng riêng, không phải mặt trước lật** (D-092, 19/10): gáy = chén bóng ụ chẩm + cơ thang hai bên
cổ, đầu NW mang silhouette SW (tai gần, dải má), cổ áo sau chữ U cao hơn V trước hai hàng, tóc ngắn chừa tai 2×2;
kiểm bằng mắt ở ×10 cạnh khung N của ảnh mẫu, không chỉ bằng thước (thước ×6 rớt thêm 4 sprite lính đội mũ vì da
dưới mũ sắt chủ yếu là chén bóng — chấp nhận). Còn: đầu gục @N/NW vẫn hạ hai hàng như mặt trước.
