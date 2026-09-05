# Alerting — cảnh báo theo triệu chứng, bám SLO, chống noise

Mục tiêu: **mỗi alert là một việc cần con người hành động ngay**. Alert nhiều nhưng vô nghĩa còn tệ hơn ít
alert: nó gây **alert fatigue** khiến người trực bỏ qua cả cảnh báo thật. Nguyên tắc: cảnh báo **theo triệu
chứng**, **ngưỡng bám SLO**, và **cắt noise không thương tiếc**.

## Symptom-based hơn cause-based

- **Alert theo triệu chứng** = alert khi **người dùng đang chịu ảnh hưởng** (error rate vượt ngưỡng, latency
  p99 vượt SLO, request thành công tụt) — bất kể nguyên nhân gì.
- **Cause-based** (vd "CPU 90%", "một node xuống") thường **không nên là alert đánh thức người**: CPU cao mà
  người dùng vẫn ổn thì không cần dậy lúc 3h sáng. Những chỉ số nguyên nhân này để **dashboard/điều tra**,
  hoặc alert mức thấp hơn.
- Lý do: một triệu chứng có nhiều nguyên nhân; alert theo triệu chứng phủ được cả nguyên nhân chưa lường,
  và giảm số rule trùng lặp. Nguyên nhân dùng để **chẩn đoán sau khi** triệu chứng kêu.

## Ngưỡng bám SLO / error budget

- Ưu tiên đặt ngưỡng alert theo **error budget burn rate** thay vì con số tĩnh tuỳ tiện:
  - **Burn nhanh** (đốt phần lớn budget trong thời gian ngắn) → severity cao, phản ứng ngay.
  - **Burn chậm** (rò rỉ budget kéo dài) → severity thấp hơn, xử lý trong giờ hành chính.
- Dùng nhiều cửa sổ (vd cửa sổ ngắn để bắt sự cố gấp + cửa sổ dài để bắt rò rỉ) giúp vừa **nhạy** vừa **ít
  báo động giả**.
- Ngưỡng tĩnh (nếu buộc phải dùng) phải neo theo **baseline đo được**, không phải số đoán; ghi rõ nguồn số.

## Chống alert fatigue / noise

- **Chỉ alert cái cần hành động.** Nếu nhận alert mà không ai làm gì → xoá hoặc hạ thành dashboard.
- **Khử rung (for/duration):** yêu cầu điều kiện giữ trong một khoảng (vd "error rate > X trong 5 phút")
  để bỏ gai nhiễu tức thời.
- **Gộp & khử trùng (grouping/dedup):** gom alert cùng nguyên nhân/cùng service thành một thông báo, tránh
  bão alert khi một sự cố kéo theo hàng loạt.
- **Ức chế (inhibition):** khi alert cấp cao đang bật (vd service down), **nén** các alert hệ quả cấp thấp.
- **Rà định kỳ:** theo dõi tỉ lệ alert **actionable vs bỏ qua**; alert hay bị ignore là ứng viên xoá/chỉnh.

## Severity + runbook

- Gán **severity** rõ ràng và nhất quán, ví dụ:
  - **Critical (P1):** ảnh hưởng người dùng diện rộng / cháy budget nhanh → đánh thức on-call ngay.
  - **Warning (P2):** suy giảm / burn chậm → xử lý trong giờ làm.
  - **Info:** ghi nhận, không đánh thức.
- Mỗi alert **gắn link runbook**: triệu chứng nghĩa là gì, các bước kiểm tra đầu tiên, cách giảm thiểu, khi
  nào leo thang. Alert không có runbook → người trực mất thời gian mò → coi là khoảng trống cần bổ sung.
- Runbook kết nối sang [ops-incident-troubleshooting](../../ops-incident-troubleshooting/SKILL.md) khi cần
  điều tra sâu.

## Ranh giới

- Docs-only + đề xuất: đưa **rule alert mẫu + ngưỡng + severity + runbook** dạng đề xuất; **con người áp
  dụng** vào hệ thống alerting thật — agent KHÔNG tự bật/tắt/sửa alert đang chạy prod.
- Không lộ secret trong nhãn/nội dung alert (mask nếu trích); nêu **residual risk** (ngưỡng chọn từ dữ liệu
  hạn chế, khả năng báo giả/bỏ sót còn lại, `[giả định]` khi thiếu baseline).
