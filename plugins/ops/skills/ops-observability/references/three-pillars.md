# Ba trụ cột: metrics / logs / traces

Mục tiêu: chọn **đúng trụ cột cho đúng câu hỏi**, rồi **nối chúng lại** bằng correlation id / trace
context để đi từ "có gì đó sai" tới "sai ở đâu, trong request nào". Không trụ cột nào thay thế được trụ
cột kia; observability tốt là ba trụ cột **bổ sung** cho nhau.

## Phân vai (dùng cái gì cho việc gì)

| Trụ cột | Trả lời câu hỏi | Đặc điểm | Chi phí giữ |
|---|---|---|---|
| **Metrics** | "Có gì bất thường không? Xu hướng ra sao?" | Số tổng hợp theo thời gian, ít chiều (dimension) | Rẻ, giữ được lâu |
| **Logs** | "Chuyện gì đã xảy ra trong sự kiện này?" | Chi tiết từng sự kiện, nhiều ngữ cảnh | Đắt, thường giữ ngắn |
| **Traces** | "Request này đi qua đâu, chậm/lỗi ở chặng nào?" | Đường đi end-to-end qua nhiều service | Trung bình, hay lấy mẫu (sampling) |

Luồng điều tra điển hình: **metrics phát hiện** bất thường → **traces khoanh** chặng/service lỗi → **logs
giải thích** chi tiết dòng lỗi. Thiết kế observability nên hỗ trợ được cả ba bước này.

## Metrics

- Ưu tiên metrics phản ánh **golden signals** (latency, traffic, errors, saturation — xem
  [signals-and-slo.md](signals-and-slo.md)) thay vì đo mọi thứ.
- **Cardinality có kiểm soát:** nhãn (label) nhiều giá trị (user id, request id, email) làm bùng nổ số
  chuỗi metric và tốn tài nguyên — **KHÔNG** đưa id định danh cao / PII vào nhãn. Định danh chi tiết thuộc
  về log/trace, không phải metric.
- Phân biệt loại: **counter** (đếm tích luỹ, vd số request/lỗi), **gauge** (giá trị tức thời, vd số
  connection), **histogram** (phân phối, để tính p95/p99 latency).

## Logs

- **Structured logging (bắt buộc để quan sát tốt):** log dạng key–value / JSON thay vì chuỗi tự do, để
  truy vấn/tổng hợp được. Trường tối thiểu nên có: `timestamp`, `level`, `service`, `message`, và
  **`trace_id` / `correlation_id`**.
- **Level nhất quán:** ERROR (cần chú ý / có thể alert), WARN (bất thường chịu được), INFO (mốc nghiệp vụ),
  DEBUG (chi tiết, thường tắt ở prod). Đặt level đúng để lọc nhiễu và làm cơ sở alert.
- **Không lộ secret/PII:** KHÔNG log token, mật khẩu, API key, connection string, hay PII (email, SĐT, số
  tài khoản). Khi trích log vào output phải **mask** (`Authorization: Bearer ****`, `DB_PASSWORD=****`,
  `user=a***@***`). Phát hiện secret bị log plaintext → coi là khoảng trống cần khắc phục, KHÔNG chép giá trị.

## Traces

- Một **trace** gồm nhiều **span** (mỗi span = một chặng: gọi DB, gọi service ngoài, xử lý nội bộ), nối
  bằng **trace context** truyền qua header giữa các service.
- Dùng trace để trả lời **"chậm/lỗi ở chặng nào"**: so sánh trace request lỗi vs thành công cùng loại.
- **Sampling:** trace thường lấy mẫu (không phải 100%) để kiểm soát chi phí — chấp nhận có request không có
  trace; nêu `[giả định]` khi kết luận dựa trên mẫu thưa.

## Correlation / trace context (chất keo nối ba trụ cột)

- Sinh (hoặc nhận từ đầu vào) một **trace id / correlation id** cho mỗi request ở biên (gateway/edge), rồi
  **truyền xuyên suốt** qua log và các lời gọi downstream (chuẩn phổ biến: **W3C Trace Context** qua header
  `traceparent`).
- Ghi cùng id đó vào **cả log lẫn trace** → từ một dòng log lỗi nhảy được sang trace tương ứng và ngược lại.
- Đây là điều kiện để observability "đi xuyên" ba trụ cột; thiếu nó, mỗi trụ cột là một ốc đảo → ghi nhận
  là **khoảng trống** trong checklist độ phủ.

## Ranh giới

- Docs-only + đề xuất: mô tả **cần đo/log/trace gì** và **cấu trúc ra sao**; KHÔNG tự đổi cấu hình thu thập
  hay hạ tầng prod — người áp dụng.
- Ngôn ngữ đo được; nêu **residual risk** (độ trễ thu thập, sampling bỏ sót, `[giả định]` khi thiếu dữ liệu).
