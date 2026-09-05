# Mẫu RCA — Root Cause Analysis

RCA viết **sau khi đã kiểm chứng** nguyên nhân bằng bằng chứng, không phải phỏng đoán. Ngôn ngữ **đo được**;
phân biệt **trigger** (cái kích hoạt) vs **root cause** (nguyên nhân gốc); mọi hành động khắc phục phải
**kiểm được**. Luôn có **residual risk**. KHÔNG tuyên bố "đảm bảo không tái diễn / loại bỏ triệt để".

## Cấu trúc RCA

```markdown
# RCA — <service> / <môi trường> — <ngày>

## 1. Tóm tắt
- Triệu chứng: <5xx / chậm / down ...> — mức ảnh hưởng đo được: <error rate %, latency, % user/region>
- Thời lượng: bắt đầu <t0> → khôi phục <t4> (tổng <phút>)
- Mức nghiêm trọng: <Sev? theo quy ước project nếu có>

## 2. Dòng thời gian (đo được)
| Thời điểm | Sự kiện | Nguồn bằng chứng |
|-----------|---------|------------------|
| t0 | Lỗi bắt đầu (<số liệu>) | <log/metric> |
| t1 | Phát hiện / cảnh báo kích hoạt | <alert/dashboard> |
| t2 | Bắt đầu điều tra | <...> |
| t3 | Áp mitigation (<gì>) | <...> |
| t4 | Khôi phục (metric về baseline) | <metric> |

## 3. Nguyên nhân gốc
- **Root cause:** <cơ chế thật sự gây lỗi> — bằng chứng: <log line/metric/trace cụ thể>
- **Trigger:** <cái kích hoạt: deploy/config/traffic/dependency> — phân biệt rõ với root cause
- **Vì sao không bị chặn sớm:** <thiếu test/alert/guardrail nào> (nếu xác định được)
- Mức tin: <chắc — tái lập được | nghi ngờ — tương quan chưa chứng minh> · `[giả định]` nếu còn suy luận

## 4. Đã làm gì để khôi phục (mitigation)
- <rollback / scale / flag / breaker> — kết quả đo được: <metric trước → sau>
- Lưu ý: mitigation giảm triệu chứng ≠ sửa root cause (nếu chỉ tạm thời, ghi rõ)

## 5. Hành động khắc phục & phòng ngừa (đo được, có chủ sở hữu)
| Hành động | Loại (sửa gốc / phòng ngừa / phát hiện) | Kiểm bằng | Ai / khi nào |
|-----------|------------------------------------------|-----------|--------------|
| <vd: thêm backpressure ...> | sửa gốc | <test/metric chứng minh> | <owner / hạn> |
| <vd: thêm alert ngưỡng ...> | phát hiện | <alert bắn thử> | <owner / hạn> |

## 6. Residual risk
- Phần **chưa verify được** (vd tải thật khác, dữ liệu prod khác mẫu).
- Khả năng **tái diễn** trong điều kiện nào; guardrail còn thiếu.
- `[giả định]` còn lại về nguyên nhân/môi trường khi thiếu dữ liệu.
```

## Nguyên tắc viết RCA

- **Bằng chứng đi kèm mỗi khẳng định.** Không có log/metric/trace chống lưng thì đánh dấu là **nghi ngờ**,
  không viết như sự thật.
- **Trigger ≠ root cause.** "Deploy lúc t0" thường là trigger; root cause là **vì sao thay đổi đó gây lỗi**
  (vd query thiếu index, thiếu backward-compat, connection pool cấu hình thấp).
- **Không đổ lỗi con người.** Tập trung vào **hệ thống/quy trình thiếu guardrail** để phòng ngừa lặp lại.
- **Hành động đo được.** Mỗi action phải nêu **cách kiểm chứng nó có hiệu lực** và **chủ sở hữu + hạn**;
  action không kiểm được thì không tính là hoàn thành.
- **Không tuyên bố tuyệt đối.** RCA giảm khả năng tái diễn, không "đảm bảo loại bỏ"; nêu residual risk.
- **Mask secret** trong mọi trích dẫn log/metric đưa vào RCA (xem [log-metric-reading.md](log-metric-reading.md)).
