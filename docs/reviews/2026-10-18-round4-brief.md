# Chấm độc lập vòng 4 — Pixiso, dàn nhân vật 64 px

Bạn là giám khảo pixel art độc lập. Bạn KHÔNG phải người vẽ và không được biết kết luận của người vẽ:
chỉ xem ảnh trong thư mục này và chấm theo checklist dưới đây. Không đọc `docs/DECISIONS.md`,
`docs/PROGRESS.md`, hay `docs/QUALITY_BAR.md` §5–§8 của repo (chúng chứa kết luận của người vẽ).
Không sửa file nào trong repo. Viết biên bản bằng tiếng Việt vào `report_round4.md` trong thư mục này.

## Ảnh

- `reference_dressed.png`, `reference_dressed_zoom.png`: nhân vật mặc đồ của ảnh mẫu (chuẩn cần đạt), và
  `reference_mannequin.png` (mannequin mẫu). Đây là mức chất lượng đích.
- `hero_views_x6.png` (×6), `hero_views_x1.png` (×1), `hero_views_rowNN_x12.png` (từng hàng ×12):
  dàn đứng, 8 cột theo thứ tự **S, SW, W, NW, N, NE, E, SE** (NE/E/SE là lật của NW/W/SW).
  Hàng: 0 mannequin trần; 1 Dương; 2 Ny; 3 Sơn; 4 Ông Tư; 5 Bác sĩ Lan; 6 Kẻ Bắt Chước;
  7 Lính nón sắt; 8 Lính mũ nồi; 9 Lính đầu đinh; 10 Lính nữ; 11 Lính quân y.
- `hero_pose_views_x6.png`, `hero_pose_views_x1.png`, `hero_pose_views_rowNN_x12.png`: cùng 8 cột.
  Hàng: 0 Zombie dân thường nam; 1 Zombie dân thường nữ; 2 Zombie công nhân; 3 Zombie cảnh sát;
  4 Zombie quân đội; 5 Lính Nhiễm; 6 Zombie vận động viên nam; 7 Zombie vận động viên nữ;
  8 Zombie nhân viên văn phòng; 9 Kẻ Thính; 10 Kẻ Bám Trần; 11 Kẻ Phun (mập); 12 Hùng (to con);
  13 Kẻ Mang Vỏ (to con, mai giáp); 14 Đột Biến (khổng lồ ×1,5).
- Cần soi ô: dùng Python/PIL để crop và phóng (nearest) bất kỳ vùng nào; nền xám trung tính là
  nền xem, không phải sprite. Ở ×6 một ô gốc = 6 px; ở ×12 = 12 px.

## Nhóm chấm

A. Dàn chính (hàng 1–6 của hero_views). B. Lính (hàng 7–11). C. Zombie (hero_pose_views hàng 0–10,
gồm Lính Nhiễm, Kẻ Thính, Kẻ Bám Trần). D. Thể hình lớn (hàng 11–14; mục 2 tóc không áp dụng).

## Checklist (mỗi mục đạt/không cho từng nhóm; một nhân vật rớt là nhóm rớt mục đó; dưới 9/10 là chưa đạt)

1. **Mắt**: cột mống mắt màu bão hoà, 3 ô cao, tông tối ở trên; đúng một điểm trắng phản chiếu
   (ảnh mẫu: trắng 2 ô ở phía ngoài hai hàng dưới, không phải một cột trắng suốt chiều cao);
   ở S/SW có nét miệng hoặc bóng lông mày.
2. **Tóc**: ≥ 3 tông tô ngoài viền; ≥ 3 lọn phân biệt được; mái chờm xuống hàng lông mày/mắt ít
   nhất 1 ô ở đâu đó (không phải cái mũ đặt trên mặt); tông tô sáng hơn viền ≥ 12 điểm L.
3. **Áo**: mỗi món có ≥ 1 chi tiết cấu trúc ngoài silhouette (lớp áo trong ở cổ, cột khoá/đường
   may, cổ tay, gấu, thắt lưng, băng gối), vẽ bằng một giá trị ngoài dải 3 tông của món đó.
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

## Biên bản cần có (report_round4.md)

1. Bảng 10 mục × 4 nhóm: đạt/không, kèm bằng chứng cụ thể (nhân vật, góc, mô tả ô: ví dụ
   "Sơn@SW: mắt xa 2 cột", "Ny@N: 3 ô đỏ rời ở gấu"). Điểm từng nhóm x/10 (D: x/9).
2. Xếp hạng lỗi B1…Bn theo mức ảnh hưởng tới cảm giác "nhân vật được vẽ" so với ảnh mẫu, mỗi lỗi
   một đơn thuốc ở mức ô (thêm/bớt ô nào, ở đâu).
3. Những gì đã ngang hoặc hơn ảnh mẫu (để không làm lại).
4. Kết luận một đoạn: so với ảnh mẫu, dàn này đọc như gì ở 1× và ở ×6.

Chấm khắt khe như người sẽ mua sprite: nghi ngờ thì soi ô rồi mới kết luận; không cho điểm
vì "gần đạt".
