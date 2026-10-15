# Đánh giá hướng đi sau Phase 2 (15/10/2026)

> Viết sau phản hồi "kết quả này thì dự án sẽ thất bại, nên tìm cách khác". Mục tiêu: nói thẳng vì sao cách hiện tại chạm trần, và các hướng thay thế kèm chi phí, rủi ro, việc tái sử dụng được.

## 1. Chẩn đoán

Cách hiện tại là **render 3D rồi rút gọn** (render → giảm màu → viền → dọn). Cách này làm tốt mọi việc "cơ học" (bảng màu, cụm, viền, nét trong, tất định) nhưng **không thể trừu tượng hoá**. Pixel art ở 32–48 px là nghệ thuật trừu tượng hoá: mắt 2–3 px, miệng 1 px, dáng phóng đại, chi tiết bị lược bỏ có chủ ý. Một bộ render không "biết" bỏ gì, giữ gì; nó chỉ lấy mẫu hình học có sẵn.

Hình học có sẵn là KayKit: chibi đầu to, mũ giáp che gần hết, mặt là chi tiết texture nhỏ. Ở 48 px, mặt Hiệp sĩ rộng 6 px. Không pipeline nào cứu được điều đó.

**Bằng chứng** (`test-output/pivot/`): cùng pipeline, cùng nhân vật, ở **96 px và 128 px** cho kết quả sạch và đọc tốt (tóc Rogue, mặt Pháp sư, giáp Hiệp sĩ đều rõ). Vậy yếu tố giới hạn là **cỡ sprite và thiết kế asset**, không phải hậu xử lý. Các studio làm 3D → pixel (Dead Cells) cũng làm ở cỡ lớn và vẫn sửa tay.

## 2. Các hướng

### A. Giữ 3D → pixel, đổi mục tiêu thành "HD pixel" (96–128 px)

- Phong cách: Dead Cells, Eastward-scale, HD-2D. Vẫn là pixel art có bảng màu, viền, cụm, nhưng không phải "retro 16-bit".
- Việc phải làm: đổi mặc định chiều cao sang 96 (cho phép 64/96/128), đi tiếp Phase 3–6 như kế hoạch. **Không tốn thêm thời gian xây lại.**
- Ưu: tất định, chạy offline, CC0, rẻ, mọi thứ đã xây dùng được nguyên vẹn, Claude vẫn là "bộ não" cấu hình.
- Nhược: nếu thị trường của bạn mong sprite 32–48 px kiểu cổ điển thì lệch kỳ vọng. Ở 48 px chất lượng vẫn như hiện tại.

### B. Backend pixel-native (PixelLab) do rig 3D của ta điều khiển

- PixelLab là mô hình sinh pixel art có **xương**: sinh nhân vật từ mô tả hoặc ảnh tham chiếu, xoay 4/8 hướng, **animate theo keypoint khung xương** (canvas đến 128×128). Đây chính là "backend PixelLab" mà HANDOFF §13 đã chừa chỗ.
- Cách ghép với những gì đã có: catalog + Claude vẫn tạo `CharacterConfig`; rig KayKit cung cấp **tư thế từng frame** (chiếu xương ra keypoint 2D) và ảnh tham chiếu sạch ở 128 px từ pipeline hiện tại; PixelLab sinh frame pixel-native; `pixel-core` vẫn làm thống nhất bảng màu, viền, xếp sheet, JSON Aseprite, GIF, ZIP.
- Ưu: kết quả trông như pixel art vẽ tay ở 48–64 px, đúng kỳ vọng "retro"; khớp với luồng "mô tả → nhân vật".
- Nhược: trả phí theo ảnh (giá niêm yết khoảng $0.01/ảnh; một nhân vật 8 hướng × 5 animation × 8 frame ≈ 320 ảnh ≈ $3–4); độ trễ giây đến phút; không tất định tuyệt đối (seed trong cùng phiên bản mô hình); phụ thuộc dịch vụ ngoài và điều khoản sử dụng đầu ra; nhất quán giữa frame/hướng tốt nhưng không hoàn hảo (tay, vũ khí nhỏ). **Vi phạm hai nguyên tắc trong CLAUDE.md** ("code quyết định pixel", "tất định") nên cần bạn quyết định rõ.
- Thời gian: spike 2 ngày để đo chất lượng thật trên Hiệp sĩ (tham chiếu → xoay 8 hướng → walk theo keypoint của ta). Nếu đạt, tích hợp 2–3 tuần (ánh xạ xương KayKit → nhãn keypoint PixelLab, cache, kiểm soát chi phí, trạng thái lỗi).
- Cần từ bạn: API key PixelLab và ngân sách thử nghiệm.

### C. Bộ phận 2D vẽ tay (paper-doll) 8 hướng

- Cách cổ điển (LPC làm 4 hướng). Chất lượng thật, tất định, offline.
- Nhược: chi phí mỹ thuật rất lớn: số bộ phận × 8 hướng × số animation × số frame. Bộ CC0 8 hướng isometric miễn phí gần như không tồn tại (chỉ có base đơn, giấy phép không rõ). Cần hoạ sĩ và nhiều tháng. Chỉ hợp lý nếu bạn có ngân sách mỹ thuật; khi đó Pixiso là công cụ "ghép + đổi màu + xuất".

### D. 3D làm khung + mô hình học pixel hoá (nghiên cứu)

- Dùng render của ta làm điều kiện (ControlNet/img2img với LoRA pixel art, hoặc mạng pixelization như "Make Your Own Sprites"). Có thể rất đẹp, nhưng nhất quán giữa frame là bài toán khó (nhấp nháy), hạ tầng ML nặng, nhiều tuần R&D không chắc kết quả. **Không khuyến nghị cho MVP.**

### E. Đổi asset 3D sang kiểu thân thiện pixel hơn (khối hộp, mặt phẳng lớn)

- Rẻ để thử, nhưng ra phong cách voxel/blocky, không phải pixel art nhân vật; mặt vẫn là vấn đề. Chỉ hợp lý như một "style" phụ bên cạnh A.

## 3. Khuyến nghị

1. Quyết định đầu tiên là **cỡ sprite**, không phải thuật toán.
   - Nếu sản phẩm hứa "sprite pixel art dùng được trong game" và chấp nhận cỡ 96–128 px: chọn **A**. Đáng tin, rẻ, xong trong kế hoạch cũ.
   - Nếu phải là 32–48 px kiểu cổ điển: chọn **B** và làm spike 2 ngày trước khi cam kết. Đây là hướng duy nhất tôi dám đặt cược cho cỡ đó.
2. Không chọn C (chi phí) và D (rủi ro) cho MVP.
3. Dù chọn A hay B, phần đã xây đều dùng lại: catalog, bộ ghép 3D, đổi màu, rig/animation, `pixel-core` (bảng màu, viền, sheet, JSON), endpoint Claude, test và tài liệu. Chỉ phần "sinh pixel" đổi nguồn.

## 4. Việc cần bạn quyết

- Cỡ sprite mục tiêu: 32–48 px hay 96–128 px?
- Có chấp nhận backend trả phí, không tất định tuyệt đối (PixelLab) không? Nếu có: cấp API key và ngân sách thử.
- Nếu A: xác nhận mặc định 96 px, tôi đi tiếp Phase 3.

## Nguồn

- PixelLab API và công cụ: https://pixellab.ai/pixellab-api, https://www.pixellab.ai/docs/tools/animate-with-skeleton, https://www.pixellab.ai/docs/tools/skeleton-animation
- So sánh công cụ sinh pixel art 2026 (Cinevva): https://app.cinevva.com/guides/ai-pixel-art-generators
- Dead Cells pipeline: https://80.lv/articles/case-study-dead-cells-character-art-pipeline/
