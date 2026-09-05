# Golden signals + SLI / SLO / error budget

Mục tiêu: đo **đúng thứ người dùng cảm nhận** thay vì đo mọi thứ. Bắt đầu từ **4 golden signals**, chọn
**SLI** phản ánh trải nghiệm, đặt **SLO** đo được + **error budget**, và áp **RED/USE** tùy đối tượng.

## 4 golden signals

| Signal | Đo gì | Ví dụ chỉ số |
|---|---|---|
| **Latency** | Thời gian phục vụ request | p50 / p95 / p99 (ms); **tách latency request lỗi khỏi request thành công** để tránh làm đẹp số |
| **Traffic** | Lượng nhu cầu vào hệ thống | requests/giây (QPS), số kết nối, message/giây |
| **Errors** | Tỉ lệ request thất bại | error rate % (5xx, timeout, lỗi nghiệp vụ), tách theo loại lỗi |
| **Saturation** | Mức "đầy" của tài nguyên giới hạn | CPU/mem/disk %, độ sâu hàng đợi, mức dùng connection pool |

- **Latency** đo bằng **phân vị (percentile)**, KHÔNG dùng trung bình (trung bình che giấu đuôi chậm).
- **Errors** phải định nghĩa rõ "thế nào là lỗi" (mã HTTP nào, timeout, lỗi logic) — nhất quán với SLI.
- **Saturation** hữu ích để **dự báo** cạn tài nguyên trước khi thành lỗi (leak, hàng đợi ứ dần).

## SLI — chọn chỉ số phản ánh trải nghiệm

- **SLI (Service Level Indicator)** = một tỉ lệ đo được về chất lượng dịch vụ, thường dạng
  **sự kiện tốt / tổng sự kiện** trong một cửa sổ. Ví dụ:
  - Availability SLI = (số request không lỗi) / (tổng request).
  - Latency SLI = (số request nhanh hơn ngưỡng, vd < 300ms) / (tổng request).
- Chọn SLI **từ góc nhìn người dùng** (request có được phục vụ đúng và đủ nhanh không), không phải từ chỉ số
  nội bộ dễ đo nhưng vô nghĩa với người dùng (vd CPU% không phải SLI tốt — nó là saturation).
- Mỗi SLI nêu rõ: **nguồn đo** (metric/log nào), **cửa sổ** (rolling 28 ngày…), **định nghĩa sự kiện tốt**.

## SLO + error budget

- **SLO (Service Level Objective)** = mục tiêu cho SLI trong một cửa sổ, vd "99.9% request thành công /
  28 ngày". Đặt SLO **đạt được và có ý nghĩa** — không nhắm 100% (bất khả thi và tốn kém vô ích).
- **Error budget** = phần được phép hỏng = **100% − SLO**. Với SLO 99.9% / 28 ngày → budget ≈ 0.1% request
  (hoặc ~40 phút downtime). Budget là **ngân sách rủi ro đo được**:
  - Còn budget → có thể đẩy nhanh thay đổi/release.
  - Cạn budget → siết thay đổi, ưu tiên độ ổn định.
- **Burn rate** (tốc độ tiêu budget) là cơ sở tốt cho alert (xem [alerting-rules.md](alerting-rules.md)):
  budget cháy nhanh bất thường → cảnh báo sớm.

## RED vs USE (hai lăng kính bổ sung)

- **RED** — cho **service xử lý request** (API, web): **R**ate (traffic), **E**rrors, **D**uration
  (latency). Trả lời "dịch vụ phục vụ người dùng tốt không".
- **USE** — cho **tài nguyên** (CPU, disk, pool, hàng đợi): **U**tilization, **S**aturation, **E**rrors.
  Trả lời "tài nguyên nào sắp thành nút thắt".
- Dùng **RED** để phát hiện ảnh hưởng người dùng, **USE** để tìm tài nguyên gây ra — hai lăng kính khớp với
  quan hệ symptom (RED) ↔ cause (USE) trong alerting.

## Ranh giới

- Docs-only + đề xuất: đề xuất **SLI/SLO + ngưỡng đo được**; con người chốt mục tiêu kinh doanh và áp dụng.
- SLO là **cam kết đo được**, không phải lời hứa tuyệt đối; nêu **residual risk** (dữ liệu lịch sử để chọn
  ngưỡng còn thiếu, tải thật khác baseline, `[giả định]` khi suy luận thiếu dữ liệu).
