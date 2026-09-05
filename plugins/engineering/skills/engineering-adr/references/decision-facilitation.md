# Điều phối quyết định — bộ câu hỏi làm rõ forces / phương án / đánh đổi

Mục tiêu của bước này: **làm rõ đủ để quyết định có truy vết**, KHÔNG phải để agent tự chốt. Agent *điều phối*
(facilitate): đặt câu hỏi, tổng hợp phương án, phân tích đánh đổi, có thể **khuyến nghị** — nhưng **con người
chốt** và đặt `Status`. Hỏi **TỪNG câu** khi thiếu; xác nhận hiểu đúng; đánh dấu mọi **[giả định]**. KHÔNG bịa
để lấp chỗ trống.

## 1. Vấn đề & lực đẩy (forces)

- Quyết định cần chốt là gì? Phát biểu ở **một câu** dạng "chọn X cho Y".
- Vì sao phải quyết **bây giờ**? Điều gì sẽ hỏng/tắc nếu không có quyết định này?
- **Ràng buộc** đang tác động: kỹ thuật (stack, hệ có sẵn, hiệu năng), nghiệp vụ (deadline, ngân sách, tuân
  thủ), tổ chức (kỹ năng team, vận hành)?
- **Mục tiêu / tiêu chí ưu tiên**: điều gì quan trọng nhất khi chọn (tốc độ giao hàng, chi phí, khả năng mở
  rộng, đơn giản vận hành, khả năng đảo ngược)? Có xung đột giữa các mục tiêu không?
- Quyết định này **khó đảo ngược** tới đâu? (đảo ngược khó → cần cân nhắc kỹ hơn, thường để `Proposed` chờ
  duyệt.)
- Có ADR/quyết định cũ liên quan hoặc sẽ bị thay thế không? (→ supersede.)

## 2. Các phương án (2–4 phương án thực chất)

- Có những cách nào khả dĩ để giải bài toán? Liệt kê **2–4 phương án thực chất** — mỗi phương án là một hướng
  giải khác nhau, KHÔNG phải "phương án rơm" chỉ để loại.
- Phương án **giữ nguyên hiện trạng / không làm gì** có phải một lựa chọn hợp lệ không? (thường nên xét.)
- Với mỗi phương án: nó hoạt động thế nào ở mức đủ để so sánh? Đã có ai trong team/hệ dùng chưa?
- Nếu người dùng chỉ đưa **một** phương án: hỏi thêm ít nhất một phương án đối chiếu; nếu thực sự không có →
  ghi rõ "không có phương án thay thế khả dĩ vì <lý do>" thay vì bịa.

## 3. Đánh đổi (trade-offs) của từng phương án

- Với mỗi phương án, soi theo các **forces** ở mục 1: nó **được** gì và **mất** gì?
- Chi phí: triển khai ban đầu, vận hành lâu dài, nợ kỹ thuật, chi phí học của team.
- Rủi ro: điểm dễ hỏng, phụ thuộc bên ngoài, độ chín của công nghệ.
- Khả năng đảo ngược & chi phí rời bỏ (lock-in) nếu sau này đổi.
- Tránh so sánh mơ hồ ("nhanh hơn", "tốt hơn") — quy về **tiêu chí đo được** khi có thể (ngưỡng, số, điều kiện
  kiểm được). Chưa có số → ghi thành **[giả định]** hoặc câu hỏi mở, không bịa con số.

## 4. Tiêu chí chọn & khuyến nghị

- Dựa trên forces + đánh đổi, tiêu chí nào **quyết định** việc chọn (trọng số các mục tiêu ở mục 1)?
- Agent có thể **khuyến nghị** một phương án kèm lý do soi chiếu tiêu chí — nhưng nêu rõ đây là *đề xuất*.
- **Con người chốt**: nếu chưa có xác nhận chốt cho quyết định lớn → ghi ADR với `Status: Proposed`, KHÔNG tự
  đặt `Accepted`.

## Nguyên tắc — tránh quyết thay con người

- Skill **facilitate**, không **decide** cho quyết định lớn. Vai trò: làm rõ, tổng hợp, phân tích đánh đổi,
  khuyến nghị.
- Quyết định lớn (khó đảo ngược, chạm kiến trúc/chi phí/tuân thủ) **luôn để con người chốt** `Status`.
- Khi thiếu thông tin để so sánh công bằng → **hỏi**, không suy đoán rồi chốt.
- Mọi phần chưa chắc chắn → **[giả định]** + đưa vào Context/hệ quả để con người quyết, không âm thầm điền.
- Không bịa phương án, không bịa số liệu đánh đổi để câu chuyện "gọn".
