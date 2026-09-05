# Viết release notes hướng người dùng

Mục tiêu: biến danh sách thay đổi đã phân nhóm thành **văn bản người đọc hiểu được giá trị**, không phải bản
sao commit log. Đây là hướng dẫn cách viết, KHÔNG sinh code.

## Nguyên tắc: viết theo kết quả/giá trị, không theo commit

Commit mô tả *người phát triển đã làm gì*; release notes mô tả *người dùng nay làm được gì / tránh được gì*.

- **KHÔNG lặp nguyên văn commit subject.** Viết lại từ góc người đọc.
  - Thay vì: `fix: null check trong OrderService.calculateTotal`
  - Viết: "Sửa lỗi tính sai tổng đơn khi giỏ hàng trống."
- **Gộp** các commit cùng một chủ đề thành **một mục** người dùng (giữ mọi hash/PR của mục — xem
  `scope-and-grouping.md`). Người đọc quan tâm tính năng, không quan tâm nó tốn mấy commit.
- Dùng **động từ kết quả**: "cho phép…", "tăng tốc…", "sửa lỗi…", "bỏ yêu cầu…". Mỗi mục một câu gọn, đủ để
  người đọc biết nó ảnh hưởng gì tới họ.
- Viết cho **đúng đối tượng**: người dùng cuối → ngôn ngữ nghiệp vụ, tránh thuật ngữ nội bộ; dev (thư viện/API)
  → có thể nêu tên API/tham số cụ thể.

## Ngôn ngữ đo được, không tuyên bố tuyệt đối

- Mô tả tác động theo điều **quan sát/đo được**; nếu có số từ commit/PR (ví dụ giảm thời gian phản hồi) thì
  nêu số, KHÔNG tự bịa con số.
- Tránh "đảm bảo / loại bỏ hoàn toàn / chặn triệt để / không bao giờ lỗi". Dùng "giảm", "hạn chế", "sửa trường
  hợp…", và nêu **residual risk** khi còn giới hạn ("vẫn cần… trong trường hợp…").
- Phần suy đoán tác động (không chắc chắn từ lịch sử) → đánh dấu **[giả định]** và đưa vào câu hỏi mở để con
  người xác nhận, không viết như sự thật.

## Breaking Changes + migration (bắt buộc nêu rõ)

Với mỗi breaking change, nêu đủ để người dùng nâng cấp an toàn:

1. **Cái gì thay đổi** — API/cấu hình/định dạng nào, hành vi cũ vs mới.
2. **Ai bị ảnh hưởng** — dùng tính năng/cấu hình nào thì bị.
3. **Cách migrate** — bước cụ thể để chuyển từ cũ sang mới (đổi tham số gì, thay giá trị mặc định nào, chạy
   lệnh migrate nào nếu lịch sử có nêu). Nếu lịch sử không đủ để mô tả bước migrate → ghi **[giả định]** hoặc
   câu hỏi mở, KHÔNG bịa bước.

Đặt Breaking Changes **nổi bật** (đầu bản release, hoặc mục riêng có nhãn rõ). Không giấu breaking change trong
mục Improvements.

## Security (viết vừa đủ, không lộ khai thác)

- Nêu: có vá vấn đề bảo mật, mức độ nghiêm trọng ở mức khái quát (nếu biết), khuyến nghị nâng cấp.
- KHÔNG nêu: chi tiết lỗ hổng đủ để khai thác, PoC, đường dẫn nội bộ, tên host/hạ tầng, secret.
- Nếu có mã CVE/advisory công khai → link tới đó thay vì mô tả kỹ thuật lỗ hổng.

## Văn phong & trình bày

- Tiếng Việt CÓ DẤU, câu ngắn, mỗi mục một dòng gạch đầu dòng dưới nhóm của nó.
- Nhất quán ngôi và thì trong toàn bản; ưu tiên chủ động ("Thêm…", "Sửa…").
- Không quảng cáo quá mức ("cực kỳ", "hoàn hảo"); mô tả trung tính, đúng tác động.
- Giữ mục truy vết (PR/tag) ở cuối mục hoặc theo quy ước định dạng ở `changelog-format.md`.
