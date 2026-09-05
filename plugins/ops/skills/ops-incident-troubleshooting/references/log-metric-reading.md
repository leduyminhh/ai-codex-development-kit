# Đọc log / metric / trace theo tầng

Mục tiêu: biến tín hiệu thô thành **bằng chứng đo được** cho giả thuyết. Nguyên tắc: **tương quan timeline**,
**không kết luận từ một tín hiệu đơn lẻ**, và **mask secret** trước khi đưa bất cứ dòng nào vào output.

## Nguyên tắc chung

- **Neo theo thời điểm bắt đầu.** Mọi truy vấn log/metric xoay quanh cửa sổ lỗi (trước–trong–sau mốc bắt
  đầu) để phân biệt nguyên nhân với triệu chứng lan truyền.
- **Cần ít nhất hai nguồn khớp.** Một log line hay một điểm metric đơn lẻ **chưa** đủ kết luận; đối chiếu
  log ↔ metric ↔ trace, hoặc nhiều instance, mới coi là **bằng chứng chắc**.
- **Phân biệt tương quan vs nhân quả.** Hai thứ cùng tăng chưa chứng minh cái này gây cái kia; tìm cơ chế
  và thứ tự thời gian (cái nào xảy ra trước).
- **Đo được.** Ghi số cụ thể (error rate %, p95/p99 ms, số connection, tần suất log lỗi/phút), không nói chung chung.

## Đọc log

- **Phân loại nguồn:** access log (LB/gateway), app log (error/exception), audit/security log — mỗi loại
  trả lời câu hỏi khác nhau (ai gọi vào vs lỗi xử lý bên trong).
- **Tìm lỗi gốc, không phải lỗi cuối:** lỗi đầu tiên theo thời gian trong cửa sổ thường gần nguyên nhân
  hơn stack trace cuối cùng; theo dõi **request id / trace id** để nối chuỗi.
- **Lọc nhiễu:** gộp log lặp (cùng message), tách **lỗi thứ cấp** (do lỗi gốc kéo theo) khỏi lỗi gốc,
  bỏ qua warning nền không liên quan cửa sổ lỗi.
- **Đếm, đừng chỉ đọc mẫu:** tần suất một lỗi (lần/phút) và thời điểm nó **bắt đầu** quan trọng hơn một
  dòng ví dụ đẹp.

## Đọc metric

- **Bốn nhóm hay soi:** error rate, latency (p50/p95/p99), throughput (QPS), saturation (CPU/mem/disk/
  connection pool). Đối chiếu với **baseline** cùng khung giờ ngày thường.
- **Hình dạng biểu đồ:** bậc thang đột ngột → gợi ý một **thay đổi rời rạc** (deploy/config); dốc dần →
  gợi ý **rò rỉ/tích luỹ** (memory leak, hàng đợi ứ, connection cạn).
- **Phân tách chiều (dimension):** theo endpoint / instance / region / version để thấy lỗi **toàn cục hay
  cục bộ** — một instance lỗi khác hẳn toàn bộ fleet lỗi.

## Đọc trace

- Dùng trace để tìm **span chậm/lỗi** trong một request end-to-end: đâu là chặng tốn thời gian (app tự xử
  lý vs chờ DB vs chờ dependency ngoài).
- So sánh trace **request lỗi vs request thành công** cùng loại để thấy điểm khác biệt.
- Trace thưa/không đủ mẫu → nêu `[giả định]`, không kết luận chắc từ vài trace.

## Tương quan timeline (cốt lõi)

1. Dựng **một trục thời gian** chung: mốc thay đổi (deploy/config) · mốc metric đổi · mốc log lỗi đầu tiên.
2. Cái xảy ra **trước** và khớp sát mốc bắt đầu là ứng viên nguyên nhân; cái sau thường là hệ quả.
3. Nếu nhiều tín hiệu đổi cùng lúc, tách theo dimension để xem cái nào **dẫn** cái nào.

## Mask secret (bắt buộc)

- Trước khi trích log/metric vào output: **mask** token, mật khẩu, API key, connection string, và **PII**
  (email, SĐT, số tài khoản) → ví dụ `Authorization: Bearer ****`, `DB_PASSWORD=****`, `user=a***@***`.
- Chỉ nêu **tên biến/khoá** khi cần chỉ nguồn cấu hình, KHÔNG in giá trị.
- Nếu phát hiện secret bị log ra plaintext → cảnh báo (đã mask trong report), coi đó là một phát hiện cần
  khắc phục, KHÔNG chép nguyên giá trị.

## Chống kết luận vội

- Một tín hiệu đơn lẻ → **giả thuyết**, chưa phải kết luận. Đánh dấu mức tin: **chắc** (đo được, nhiều
  nguồn, tái lập) vs **nghi ngờ** (một nguồn, tương quan chưa chứng minh).
- Không có bằng chứng phủ định một tầng thì **chưa loại** tầng đó.
- Luôn kèm **residual risk**: phần log/metric thiếu, cửa sổ chưa quan sát đủ, `[giả định]` khi suy luận thiếu dữ liệu.
