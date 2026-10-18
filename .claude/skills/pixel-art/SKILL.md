---
name: pixel-art
description: Quy tắc cầm bút và quy trình kiểm tra khi vẽ hoặc sửa template pixel ASCII trong packages/sprite-kit (thân, đầu, dáng, góc nhìn, món đồ). Đọc trước khi chạm vào bất kỳ ma trận nào; đi kèm pnpm qa:pixel và scripts/hero-qa.ts.
---

# Vẽ pixel cho sprite-kit

Áp dụng cho mọi ma trận ASCII trong `packages/sprite-kit/src/hero64*.ts`, `views64*.ts`,
`cast64.ts` và các script sinh trong `scripts/research/` (`gen_poses.py`,
`gen_pose_views.py`, `gen_view_items.py`). Số đo gốc (bảng màu, bước L, viền, nguồn sáng)
nằm ở `docs/PIXEL_STYLE_REFERENCE.md` §3; file này là phần "cầm bút": đặt từng ô thế nào
để không lặp lại các lỗi người dùng đã bắt.

Nguyên tắc nền: **code quyết định pixel**. Không sinh ảnh bằng AI, không scale lẻ, không
để script "tự sửa đẹp" ngoài các phép suy đã khai báo (lật, nhân cột, san bóng).

## 1. Từ vựng ô

Một ô = vật liệu × bậc sáng. Năm bậc: **sâu** (tối nhất) – **tối** – **gốc** – **sáng** – **chói**.
Chữ thường = gốc, chữ hoa = tối, ký hiệu = sáng; cặp chữ thứ hai của mỗi vật liệu là sâu
(thường) và chói (hoa). Da chỉ dùng 3 bậc giữa như mannequin mẫu; vải, tóc, đồ da dùng cả 5
(áo mẫu: L 0,17 / 0,31 / 0,40 / 0,59 / 0,71).

| Vật liệu | sâu | tối | gốc | sáng | chói |
| -------- | --- | --- | --- | ---- | ---- |
| da       | `z` | `S` | `s` | `$`  | `Z`  |
| tóc      | `j` | `H` | `h` | `#`  | `J`  |
| vải 1    | `v` | `C` | `c` | `^`  | `V`  |
| vải 2    | `q` | `K` | `k` | `&`  | `Q`  |
| quần     | `y` | `P` | `p` | `+`  | `Y`  |
| giày     | `g` | `B` | `b` | `!`  | `G`  |
| kim loại | `n` | `M` | `m` | `w`  | `N`  |
| da thuộc | `i` | `L` | `l` | `\|` | `I`  |
| gỗ       | `t` | `D` | `d` | `%`  | `T`  |
| nhấn     | `r` | `A` | `a` | `*`  | `R`  |

`o` viền, `.` trống, `E` mống mắt trên (navy), `e` mống mắt dưới (xanh), `x` trắng. Thân vẽ bằng
da; áo quần là phép đổi vật liệu theo vùng (`outfit64.ts`), nên **bóng/sáng của thân chính là
bóng/sáng của áo**: vẽ thân sai là mọi nhân vật mặc trên thân đó sai theo. Bảng màu: da theo
`HERO_RAMP_OPTIONS` (bước nhỏ như mẫu), mọi vật liệu khác theo `HERO_CLOTH_RAMP_OPTIONS`
(bước rộng: tối −0,10, sâu −0,24, sáng +0,16, chói +0,29); gọi `buildPalette(colors, HERO_RAMPS)`.

## 2. Tạo hình (silhouette trước)

1. Đổ đen ở ×1 phải đọc ra dáng (đứng, vươn tay, khom, bò) trước khi tô một ô bóng nào.
2. Viền ngoài 1 ô, khép kín; mỗi hàng viền bước ngang **≤ 1 cột**; bước 2 cột chỉ cho sườn
   dốc 2:1 của hình khổng lồ (D-047). Bước 2 cột ở vai, cằm, gót là nguồn ô da hở.
3. Không "viền đôi" (khối 2×2 `o`) trên silhouette. Chấp nhận ở chỗ hai bộ phận chạm nhau
   (bàn tay chạm đùi, hai bàn chân, nách), vì ở đó đường kẻ bên trong gặp viền ngoài.
4. Đường cong bậc đơn điệu: 1-2-3 hoặc 3-2-1, không 2-1-2, 3-1-3, 1-2-1 (lint `jaggies`).
5. Bên trong chỉ kẻ `o` ở ranh giới bộ phận (cổ, nách, đũng, cổ tay) và nét mặt. Không kẻ
   đường bóng dài bằng `o`.
6. Khe 1–2 ô giữa hai chi là ánh sáng lọt, cho phép; lỗ kín ≥ 3 ô là lỗi.
7. Mọi hình ≥ 3 ô một cụm; điểm 1 ô chỉ cho sáng mắt, răng, vết máu, đinh kim loại.

## 3. Đổ bóng (không sọc, không dải thẳng hàng)

Nguồn sáng trên–trái cho mọi góc vẽ tay. Mỗi vật liệu đúng 3 tông: sáng 15–30 % ở trên–trái,
bóng 25–40 % ở dưới–phải, còn lại gốc. Cách đặt:

- **Cụm, không cột.** Bóng sườn, bóng dưới ngực, bóng dưới cằm là cụm 2–3 ô dày 2 ô; không
  bao giờ là một cột `S` chạy dọc sát viền suốt thân. Một dải 1 ô ôm viền ≥ 7 ô với tông khác
  ở phía trong đọc thành "đường mờ" song song viền (lint `outline-band`).
- **Không hai dải bằng nhau xếp chồng.** Hai dải cùng vật liệu, khác tông, cùng đầu cùng cuối,
  dài ≥ 3, đặt sát nhau (hàng hoặc cột) là `banding`: mép tông đọc thành nét vẽ. Dải vòm phải
  lớn dần/nhỏ dần từng ô mỗi hàng; dải chéo lệch nhau ít nhất một ô.
- **Không pillow.** Bóng không bọc quanh viền ở phía sáng (trên, trái); sáng không nằm giữa
  khối như bị chiếu đèn từ trước.
- **Chi (tay, chân):** 3–4 hàng trên cùng của bắp có 1–2 ô `$` phía trái, khuỷu/gối trơn tông
  gốc, cẳng tay một vệt sáng ngắn 2–3 ô, bóng `S` chỉ ở mép dưới–phải của cổ tay và nách.
  Không vệt sáng/bóng suốt chiều dài chi.
- **Ngực/lưng:** thân trần: khối sáng 3×3 ở ngực trái với đuôi 2 cột, khối tối 3×4 ở sườn phải,
  không dải sáng bụng, cổ giữ bóng dưới cằm (D-075); lưng (góc N) san hết `$`/`S` trong khung ngực
  về `s`, chỉ giữ cụm bóng dưới bả vai.
- **Đầu:** sáng ở trán trái, bóng dưới cằm và dưới mái tóc; đầu trọc dùng `BALD_V` để bỏ mảng
  bóng gáy của đầu gốc (nếu không người trọc nhìn như có tóc).
- **Tóc:** chỉ vẽ silhouette một tông (`h` + viền); tông do `hair64.ts` (`combHair`) chải khi mặc:
  ba mảng chéo sáng/gốc/tối theo trường sáng trên–trái, đường lọn sẫm 4-liên thông toả từ ngôi lệch,
  vùng vượt ngưỡng phẳng bị cắt, không bậc thang (D-074). Không tô tay tông tóc; râu vẽ tay thì giữ.
- **Vật liệu xám** (kim loại, đá): bước tông nhỏ, không dịch hue.
- **Áo quần không thừa hưởng bóng của da.** Sau remap, `tailor64.ts` tô lại món theo hộp của nó:
  vải chủ yếu tông gốc và tối (áo mẫu 10 % sáng / 40 % tối), khối bóng có ranh bậc thang, sáng
  chỉ ở vai–ngực trái, nếp gấp ngắn, khuy/túi chỉ ở góc thấy mặt trước, tay xa tối toàn bộ. Khi
  thêm kiểu áo mới, khai báo `Garment` trong `build()` thay vì vẽ bóng tay vào remap. Kết cấu là luật
  (D-075): mảng sáng một khối chữ L ≈ 12 % món áo, nếp bắt sáng 3 ô, gấu sâu một hàng, thắt lưng là
  hàng may đổi sang da giày + khoá 2 ô, cổ tay vải 2 bóng, băng gối 2 ô sáng, cổ thun chữ V; thân trần
  vẫn có đường cạp quần. Viền chói là cặp 2 ô trên hàng vai; trong một món không có ô sâu/sáng/chói
  đứng một mình (tailor tự lùi một bậc); ô vải rời giữa vật liệu vải khác bị vật liệu đó nuốt, ô chói
  rời hạ xuống sáng, ô viền lẻ màu lấy màu viền kề; da không bị nuốt (D-078).

## 4. Đầu và dáng

- **Dáng = mannequin + đúng những gì dáng đó làm thay đổi.** Thân 7 ô, tay 3 ô, chân 3 ô,
  đũng ở hàng 29, chân 11 hàng là bất biến; chỉ vai, tay, đầu, bàn chân di chuyển. Không vẽ
  lại thân từ đầu; không nới thân cho khỏi chồng chi: chi che lên thân hay đùi thì vẽ nó
  **trước** (nắm tay rủ trước hông, tay buông trước mép đùi). Đầu hạ n hàng thì thân mất n
  hàng, chân giữ nguyên.
- **Thể hình** (mập, to con) lấy tỉ lệ từ form nhân hàng/cột đã duyệt; bản vẽ tay chỉ sửa
  cách tô. **Người khổng lồ**: silhouette theo tỉ lệ mannequin, nhưng viền 1 ô, mắt 2–3 ô,
  chân mày 2 ô, một đường ngón, một hàng đốt ngón, bóng là cụm đặt tay (D-055); sinh bằng
  `scripts/research/gen_giants.py`, khoá silhouette, đổi hàng nào phải khai báo `allow`.

- Lưới đầu 17 cột, hàng mắt `HEAD_EYE_ROW = 10`; mắt S/SW: mống 3 ô dọc (tối trên) + 2 ô trắng phía
  ngoài hai hàng dưới; góc W: mống 3 ô + **một** ô trắng thấp phía sau (D-076); quái: khối 2×2 + 1 ô
  trắng góc trên–ngoài, hai mắt cùng hình ở mọi góc. Không bao giờ một cột trắng suốt chiều cao mắt.
  Mặt thường có miệng 2 ô viền dưới mảng sáng cằm (S (7,12), SW (6,12), W khía (3,12)); mắt đặc biệt (hốc
  trũng, quái) vẫn dùng cột mống 3 ô + trắng ngoài–dưới, chỉ thêm bóng quanh (D-080, D-081). Chân tóc không
  chạm hàng mày: ô mày kề tóc lấy màu viền tóc và thành chấm đen.
  Gốc lưới đầu là `headX` của dáng (chỉ zombie gục đầu vẽ từ cột 0).
- Nghiêng đầu bằng `shift` theo hàng, và **chỉ ở hàng 3, 5, 6, 7, 9** của sọ (chỗ cạnh sọ
  thẳng đứng); nghiêng ở hàng khác làm đứt viền sọ.
- Mũ/nón là lớp cứng (`rigid`) rộng hơn sọ, dịch theo hàng mắt; mọi overlay trong không gian
  đầu nằm trong phạm vi **một cột** ngoài lưới đầu mỗi bên (khung hẹp nhất 19 cột cắt phần
  thừa và hình mất viền).
- Thứ gì che đầu từ phía sau (bướu, mai giáp) vẽ thân với `headUnder` + `FormSpec.front`;
  không "xóa" đầu bằng tay.

## 5. Quy tắc theo góc nhìn

Vẽ tay S, SW, W, NW, N; SE/E/NE lật thường (D-042, chấp nhận sáng từ phải).

| Góc | Cách dựng                             | Chú ý                                                                                                                                                                                                                                     |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S   | vẽ tay                                | nguồn của mọi phép suy; sửa S là sửa cả N và SW suy ra                                                                                                                                                                                    |
| SW  | thân 3/4 vẽ tay                       | phía xa = mép trái màn hình (NW: mép phải): vai xa thu 2 cột, tay xa một cột khuất sau thân với nắm tay 2 cột, bàn chân xa cao hơn một hàng, mắt xa 1 ô mống cách viền 1 ô da; sườn gần là cụm bóng 2–3 ô; đầu đặt đúng chỗ của S (D-072) |
| W   | vẽ tay                                | nét đặc trưng (tay vuốt, tay vươn) đặt phía gần; ngực/bụng nhô ra **trước** tay, tay buông giữa sườn; tay ngang 2 ô là chấp nhận                                                                                                          |
| NW  | mặt sau của SW (`back_regions`)       | giữ bản vẽ tay khi lưng có khối riêng (bướu)                                                                                                                                                                                              |
| N   | S lật, san bóng ngực, đầu N hàng 0–14 | đầu N phải gồm hàng cổ, nếu không hở một hàng dưới cằm                                                                                                                                                                                    |

Dáng lật (`_m`) dùng chung W/SW/NW của dáng gốc và có N riêng.

## 6. Quy trình bắt buộc

```bash
DUMP=test-output/view_figures.json pnpm exec tsx scripts/hero-views.ts   # thân S + dáng -> JSON
python3 -I scripts/research/gen_giants.py                                  # khổng lồ ×1,5/×2 -> hero64.giant.ts (nếu sửa)
python3 -I scripts/research/gen_pose_views.py | tee test-output/gen.log   # suy mọi góc, kiểm tra
grep -q '^problems: 0' test-output/gen.log || echo 'CÒN LỖI HÌNH'          # exit code bị tee che
pnpm exec prettier --write packages/sprite-kit/src/hero64.poses.views.ts
pnpm qa:pixel                        # lint cầm bút: doubles, jaggies, banding, outline-band
pnpm qa:hero                         # mũ/tóc/da hở, viền sọ, lỗ kín, mọi nhân vật mọi góc
pnpm exec tsx scripts/hero-pose-views.ts   # lưới 8 hướng (ONLY=id, SCALE=n); hero-views.ts cho dàn đứng
pnpm typecheck && pnpm test
```

- Viết hàng ASCII dài bằng biểu thức (`'.'*7 + 'o' + 's'*8 + ...`) và để `body()` assert độ
  dài; đếm tay 20 ký tự là nguồn lỗi lệch một ô.
- Script vá bằng Python phải assert đúng một chỗ khớp; vá dở dang khi assert nửa chừng là lỗi đã
  gặp, nên chạy lại từ bản sạch chứ không vá đè.
- Đọc cảnh báo lint theo từng hình; cảnh báo là chỗ vẽ khác tay nghề của ảnh mẫu (ngưỡng hiệu
  chỉnh để mannequin chép từ mẫu sạch). Ngoại lệ được chấp nhận: viền đôi tại chỗ hai bộ phận
  chạm nhau, tay ngang 2 ô ở góc W, dải 7 ô trên tay dài của dáng vươn/khom.
- Xem ảnh ×6–×8 trên nền xám trung tính (nhân vật sáng mất hình trên nền sáng), đối chiếu
  checklist dưới, rồi mới báo xong và gửi ảnh.

## 7. Checklist trước khi gửi ảnh

Nghiệm thu theo `docs/QUALITY_BAR.md`: chạy `pnpm qa:score` (số sprite đạt không được giảm,
ghi trước/sau vào PROGRESS) và chấm 10 mục bằng mắt ở §3 của tài liệu đó, cạnh ảnh mẫu cùng
tỉ lệ. "Nhìn ổn" không phải là tiêu chí.

- [ ] `problems: 0`; `qa:hero` sạch; số cảnh báo `qa:pixel` không tăng so với trước khi sửa.
- [ ] Đổ đen ×1 đọc ra dáng và hướng; 8 hướng cùng chiều cao chân và cùng điểm neo.
- [ ] Không sọc dọc theo chi, không dải xếp bằng nhau, không "đường mờ" song song viền.
- [ ] Mũ/tóc/kính đúng chỗ ở mọi góc, không bị cắt mép, không in lên mặt.
- [ ] Món lệch một bên (túi, đuôi tóc, tay vuốt) đổi bên ở hướng lật là điều đã biết (D-042);
      nếu người dùng cần, vẽ riêng hướng đó.
- [ ] Nhân vật to/mập/khổng lồ: khối ngực–bụng–tay đúng thứ tự trước sau ở góc W.

## 8. Lỗi đã bị bắt và quy tắc rút ra

| Góp ý                                                                                                                                     | Nguyên nhân                                                                                                                                                             | Quy tắc                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Góc sau của lính khom không ổn"                                                                                                          | góc N suy trong TS không qua kiểm tra: hở hàng dưới cằm, không có bướu                                                                                                  | mọi góc là hình đã kiểm tra trong script; khối riêng của lưng vẽ tay (`HUNCH_N`, `headUnder`)                                                                                                                                                                 |
| "Lỗi hình học quá" (Hùng 8 hướng)                                                                                                         | góc W tay che hết sườn, ngực không nhô; đầu trọc giữ bóng gáy                                                                                                           | ở W ngực/bụng trước tay; `BALD_V` cho đầu trọc                                                                                                                                                                                                                |
| "Chưa ưng chất lượng"                                                                                                                     | bóng/sáng chi là sọc dọc suốt chiều dài, dải bằng nhau xếp chồng                                                                                                        | mục 3; lint `qa:pixel`                                                                                                                                                                                                                                        |
| "Đường mờ" trên tóc sẫm                                                                                                                   | hàng/cột `H` sát viền                                                                                                                                                   | `hair64.ts` không đặt đường lọn hay ô sâu sát viền: ô sát viền lấy tông thân của dải (D-074)                                                                                                                                                                  |
| Nón góc W mất viền mép trước                                                                                                              | hình bị cắt ở cột −1                                                                                                                                                    | `dress()` tự nới canvas; overlay đầu trong một cột ngoài lưới                                                                                                                                                                                                 |
| Đỉnh tóc nhìn từ sau có "hai mắt"                                                                                                         | hai ô bóng vệt ngôi                                                                                                                                                     | bỏ vệt ngôi ở N/NW                                                                                                                                                                                                                                            |
| Tai Kẻ Thính mất viền                                                                                                                     | tai vượt khung 19 cột                                                                                                                                                   | tai dựng đứng trong một cột ngoài lưới, vẽ `under`                                                                                                                                                                                                            |
| Ô da hở ở vai/đỉnh đầu thân mập                                                                                                           | dải nhân cột nhảy 2 cột                                                                                                                                                 | mỗi hàng viền bước ≤ 1 cột; assert thân suy ra trùng `buildForm`                                                                                                                                                                                              |
| "Tạo hình bị lỗi dù có form mẫu"                                                                                                          | thân dáng vẽ tự do: thân 9 ô, chân ngắn 1–3 hàng; to con đùi ngắn                                                                                                       | mục 4: dáng = mannequin + thay đổi của dáng; thể hình theo form nhân hàng                                                                                                                                                                                     |
| "Khổng lồ vẽ chứ không scale"                                                                                                             | mannequin chép theo tỉ lệ từng ô: mắt 3–4 ô, mảng sáng nhân lên                                                                                                         | nét ở cỡ pixel, bóng đặt tay; `gen_giants.py` khoá silhouette                                                                                                                                                                                                 |
| Tóc là "khối một màu có viền" (giám khảo #2)                                                                                              | 2 tông, không lọn, mái không chờm lông mày                                                                                                                              | lọn = dải 2–3 ô gốc mở bằng ô sáng, đóng bằng ô bóng/khe `j`; chói `J` ở đỉnh; mái chờm hàng lông mày; đủ ở mọi góc (D-059)                                                                                                                                   |
| Tóc xoăn thành chấm rời (giám khảo #4)                                                                                                    | ô sáng/tối xen kẽ từng ô                                                                                                                                                | múi 3–4 ô: sáng góc trên–trái, bóng + khe sâu góc dưới–phải                                                                                                                                                                                                   |
| Tóc đen là khối đen                                                                                                                       | bóng sâu L 0,10, viền suy từ bóng sâu thành 0,00                                                                                                                        | `buildRamp5` sàn bóng sâu 0,17, viền sàn 0,10 (đo từ quần đen của mẫu)                                                                                                                                                                                        |
| Lọn tóc vẽ tay vẫn là một mảng `h` 37 ô (thước D-061)                                                                                     | vạch/chấm rời không chia được mảng gốc                                                                                                                                  | tông tóc do `hair64.ts` chải khi mặc, vùng cùng tông bị cắt dưới ngưỡng phẳng của thước (D-074); chỉ sửa silhouette bằng tay                                                                                                                                  |
| Áo quần là khối (mảng gốc 34 ô, chân quần một tông)                                                                                       | tô lại theo remap chỉ có ranh bóng, không có nếp                                                                                                                        | cấu trúc là luật trong `tailor64.ts` (D-062): nếp ngang kín bề rộng, ống quần riêng, gối, gấu, đế; không vẽ nếp bằng tay trên từng nhân vật                                                                                                                   |
| Gấu áo tạo khối viền 2×2 với viền quần                                                                                                    | đường may là ô viền đặt sát hàng viền                                                                                                                                   | `dress()` đổi ô đó thành tông sâu sau khi đặt mọi lớp                                                                                                                                                                                                         |
| Đạo cụ (súng, gậy, túi) báo "ô hở", "lỗ kín", viền đôi                                                                                    | nét 1 px vẽ bằng ô kim loại trần; vật áp sát viền thân; vật cách thân 1 ô nhưng khép kín hai đầu                                                                        | nét 1 px là ô viền `o`; khối có viền kín và nắp hai đầu; cách viền tay/đầu một cột, ngón tay bắc qua; phần khuất vẽ `under`; đoạn chạy dọc cạnh đầu phải hở một đầu (khuất sau vai) để không thành lỗ kín (D-064)                                             |
| Tóc sẫm là "nhiễu camo" (giám khảo vòng 2, B5)                                                                                            | dải 2 ô xen sáng/gốc + dải quét: mọi ô sáng rời nhau, đọc như rằn ri trên nền đen                                                                                       | ba mảng theo trường sáng, đường lọn sẫm thưa (lọn 4-4-5) thay cho cột mép sáng mỗi 3 ô; giám khảo vòng 3 vẫn đọc D-069 là "lưới chu kỳ" nên đổi sang D-074                                                                                                    |
| Râu/khăn che mặt đọc như khẩu trang (giám khảo vòng 2, B6)                                                                                | hộp chữ nhật viền kín + một vạch `o` ngang đủ bề rộng                                                                                                                   | ria tách khỏi râu má bằng ô da ở khoé môi, miệng là khe sâu 2 ô, mép dưới nhọn rủ qua cổ áo; không vẽ `o` đè lên đường may đã có (D-070)                                                                                                                      |
| Món nới rộng thân (tay áo khoác) vẽ bằng overlay tĩnh                                                                                     | dải `oC` ngoài viền tay thành viền đôi, rời khỏi tay ở góc khác, chạy xuống bàn tay                                                                                     | nới bằng luật trên hình thật (`Garment.letOut`): dời viền từng hàng, đóng viền chỗ trống, bỏ qua hàng tạo bậc 1-2-1 hay khối viền 2×2 (D-070)                                                                                                                 |
| Đặc điểm nhô ra (tai to) "mất" ở góc W (giám khảo vòng 2, B9)                                                                             | vẽ nó trong silhouette sọ bằng cùng chất liệu, chỉ còn viền                                                                                                             | cho nó nhô khỏi silhouette (lên trên/ra sau, canvas tự nới) với lòng tối hơn vành; rồi kéo các góc khác lên cùng chiều cao (thước nhất quán, D-071)                                                                                                           |
| Một dáng, hai tư thế theo góc (ngồi xổm S / bò W; tay buông S / tay duỗi W)                                                               | thân W vẽ theo ý khác với S; tay vươn về người xem vẽ thành khối bên sườn                                                                                               | cùng một tư thế ở mọi góc; thân W = thân W đứng + đúng thay đổi của dáng S; tay vươn ở S/SW là nắm tay 3×3 trước ngực (D-071, D-077)                                                                                                                          |
| Góc 45° là góc S dịch mặt (giám khảo vòng 2, B1; vòng 3, B3 cho zombie/thể hình lớn)                                                      | rộng S/SW bằng nhau, hai mắt bằng nhau, hai bàn chân trùng                                                                                                              | thân SW/NW hẹp hơn S ≥ 2 ô: vai xa −2, tay xa 1 cột, chân xa +1 hàng, mắt xa 1 ô; mọi thân đứng góc SW trong `gen_pose_views.py` qua `raise_far_foot` (D-072, D-077)                                                                                          |
| Chấm lẻ hệ thống (giám khảo vòng 3, B4/B8)                                                                                                | chi tiết 1 ô (mụn, khoá, điểm sáng đỉnh sọ, đốt ngón, mắt cá, cà vạt xen kẽ từng hàng); ô viền góc đế giày không chạm vật liệu nào nên lấy màu viền mặc định            | chi tiết nhỏ nhất là 2 ô kề nhau cùng tông; sau khi vẽ chạy `python3 -I scripts/research/lone_pixels.py all`, số ô lẻ không được tăng (357 sau D-073); ô viền lấy màu vật liệu gần nhất trong 2 vòng                                                          |
| Phụ kiện hiện rồi mất khi xoay (giám khảo vòng 4, B3): dây túi chỉ S/SW, gậy bỏ ở N/NW, nòng súng mất ở góc sau, dải phản quang khác hàng | mỗi góc vẽ riêng tay không đối chiếu với S; chi tiết neo theo ngực (khác nhau giữa mặt trước/sau)                                                                       | cùng một vật phải có ở mọi góc thấy được, lật từ S qua trục thân và cùng kích thước (nóc ba lô 15 ô cả trước lẫn sau); chi tiết trên thân neo theo gấu (`hemY`) để trước/sau/bên cùng hàng; thước nhất quán góc nhìn của `qa:score` phải 0 (D-079)            |
| Chấm lẻ hệ thống vẫn còn (giám khảo vòng 4, B2)                                                                                           | ô chói vai cố định (x0+1, x0+2) mất một ô vào cổ áo; ô sâu của luật mép xa trên cột bóng 1 ô; ô đường may → sâu da ở góc không có da kề; ô viền lấy màu vật liệu kề 1 ô | luật D-078 (cặp chói, lùi bậc ô đơn trong món, góc đường may trên da/điểm nhấn nở hoặc giữ viền, viền lẻ màu hoà với viền kề); đo thêm `lone_pixels.py all strict` (1691 sau D-078), không được tăng; không nở bóng 1 ô của thân mannequin (đã thử: điểm tụt) |

## 9. Nguồn đã khảo sát (17/10/2026)

- `docs/PIXEL_STYLE_REFERENCE.md` §3–§5: 14 quy tắc đo từ ảnh mẫu và các công cụ mã nguồn
  mở đã xét (pixel-art-studio, pixel-plugin, aseprite-mcp…).
- Skill mã nguồn mở `pixel-art`, `pixel-art-sprites` (omer-metin/skills-for-antigravity,
  qua claudeskills.info): quy tắc chung (tắt AA, scale nguyên, hue-shift, selout, không pillow
  shading, thử silhouette, số khung animation); không có gì về cách đặt ô ở cỡ 17×40.
- "Pixel Fixer" (luận văn TU Delft 2025, bộ dữ liệu 4TU): định nghĩa đo được của banding
  (cặp đoạn tông thẳng hàng) và pillow shading (dải đồng tâm theo viền), là cơ sở của
  `scripts/research/pixel_lint.py`.
- Plugin trong catalog: SpriteCook (sinh sprite bằng AI ảnh, trái nguyên tắc 1), Unity
  `2d-pixel-perfect` (cấu hình engine): không dùng.
- Canon cộng đồng (PixelJoint "The Pixel Art Tutorial", ghi chú của Pedro Medeiros / saint11,
  Slynyrd ramps): nguồn tên gọi của các lỗi doubles, jaggies, banding, pillow, selout.
