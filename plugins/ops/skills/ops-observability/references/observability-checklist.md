# Checklist độ phủ observability + khoảng trống

Mục tiêu: chấm **độ phủ đo được** cho mỗi service (đã có metrics / log có cấu trúc / trace / alert /
dashboard chưa), chỉ ra **khoảng trống**, và **ĐỀ XUẤT bổ sung** ưu tiên theo rủi ro. Chỉ đánh dấu **đạt**
khi có bằng chứng từ cấu hình/dependency đọc được; chưa xác minh → ghi **chưa đạt** (fail-loud), KHÔNG coi
là "có". Observability **tăng khả năng phát hiện**, không loại bỏ sự cố.

## Bảng độ phủ (một dòng mỗi service)

| Service | Metrics (golden signals) | Structured log + trace_id | Trace (context truyền suốt) | Alert (symptom + SLO) | Dashboard | Runbook |
|---|---|---|---|---|---|---|
| `<service>` | đạt / chưa | đạt / chưa | đạt / chưa | đạt / chưa | đạt / chưa | đạt / chưa |

Ghi kèm **bằng chứng** cho mỗi ô đạt (file cấu hình / dependency / dashboard nào), và **lý do** cho ô chưa đạt.

## Tiêu chí từng cột (đo được)

### 1. Metrics
- [ ] Có export **4 golden signals** (latency theo percentile, traffic, errors, saturation) — không chỉ
      metric mặc định của framework.
- [ ] Nhãn (label) **không chứa** id định danh cao / PII (tránh bùng nổ cardinality + lộ dữ liệu).
- [ ] Latency đo bằng **histogram/percentile**, không phải trung bình.

### 2. Logs
- [ ] **Structured logging** (JSON/key–value), có `timestamp`, `level`, `service`, `message`.
- [ ] Có **`trace_id` / `correlation_id`** trong mỗi dòng để nối sang trace.
- [ ] **Không** log secret/PII (kiểm mẫu; phát hiện plaintext → khoảng trống nghiêm trọng, mask khi trích).

### 3. Traces
- [ ] Có instrumentation trace (OpenTelemetry hoặc tương đương) và **trace context truyền qua** các service
      downstream (vd `traceparent`).
- [ ] Chiến lược **sampling** rõ ràng (tỉ lệ + lý do); chấp nhận mẫu thưa nhưng ghi nhận `[giả định]`.

### 4. Alert
- [ ] Alert **theo triệu chứng** (ảnh hưởng người dùng), **ngưỡng bám SLO/error budget**.
- [ ] Mỗi alert có **severity + link runbook**; có biện pháp **chống noise** (khử rung/gộp/ức chế).
- [ ] Không alert "chỉ để biết" (không hành động được) — đã rà bỏ.

### 5. Dashboard
- [ ] Có dashboard thể hiện **golden signals + SLO/error budget** cho service, đối chiếu **baseline**.
- [ ] Phân tách theo chiều hữu ích (endpoint / instance / version) khi cần khoanh vùng.

### 6. Health & SLO
- [ ] Có **health endpoint** (liveness/readiness) và nó được giám sát.
- [ ] Có **SLI/SLO** định nghĩa đo được (nguồn đo + cửa sổ + ngưỡng) cho luồng chính.

## Khoảng trống + đề xuất

Với mỗi ô **chưa đạt**, ghi một dòng đo được:
- **Khoảng trống:** vd "service X chưa có trace context truyền suốt", "alert error rate chưa gắn SLO".
- **Rủi ro:** khó phát hiện/khoanh vùng loại sự cố nào (đo được: MTTD/MTTR tăng ở kịch bản nào).
- **Đề xuất:** hành động cụ thể + **mức ưu tiên** (theo mức độ rủi ro & tần suất sự cố).
- **Ai áp dụng:** con người áp vào hạ tầng thật — agent chỉ đề xuất cấu hình mẫu.

## Residual risk (luôn nêu)

- Phần **chưa xác minh được** từ cấu hình (vd instrumentation có nhưng chưa rõ chạy đúng ở prod).
- **Độ trễ thu thập / sampling** có thể bỏ sót sự kiện hiếm.
- Ngưỡng/SLO chọn từ **dữ liệu lịch sử hạn chế**; tải thật có thể khác — `[giả định]` khi thiếu baseline.
