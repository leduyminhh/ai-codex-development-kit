# Quy trình triage — khoanh vùng theo tầng

Mục tiêu: từ **triệu chứng** thu hẹp nhanh về **tầng nghi ngờ**, không đoán mò toàn hệ thống. Điều tra
ở chế độ **read-only**; mọi mitigation chỉ **ĐỀ XUẤT**, chờ người xác nhận. Ngôn ngữ **đo được**; luôn
phân biệt **bằng chứng chắc** vs **nghi ngờ** và nêu **residual risk**.

## Bước 0 — Chốt phạm vi trước khi đào

- **Triệu chứng đo được:** cái gì lỗi (5xx / timeout / chậm / sai dữ liệu), số liệu (error rate, p95/p99
  latency, QPS), so với baseline.
- **Thời điểm bắt đầu:** mốc thời gian lỗi bắt đầu (càng hẹp càng tốt) — đây là **neo** để đối chiếu thay đổi.
- **Blast radius:** phạm vi ảnh hưởng (bao nhiêu % request/user/region/endpoint) — phân biệt sự cố toàn cục
  vs cục bộ một phần.
- **Service + môi trường:** đúng service nào, prod hay staging, phiên bản đang chạy.

Thiếu bất kỳ mục nào và không truy được nguồn tín hiệu → **nói rõ (fail-loud)**, đề nghị người cung cấp;
KHÔNG suy diễn rồi kết luận.

## Bước 1 — Đối chiếu "thay đổi gần đây"

Phần lớn sự cố production tương quan với một **thay đổi gần thời điểm bắt đầu**. Rà theo timeline:

- **Deploy / release** (mã, image tag) quanh mốc bắt đầu.
- **Đổi config / feature flag / secret rotation**.
- **Migration schema / thay đổi dữ liệu**.
- **Scale up/down, đổi hạ tầng, thay đổi mạng/DNS/cert**.
- **Tăng traffic bất thường** (chiến dịch, bot, retry storm) hoặc **sự cố dependency ngoài**.

Nếu mốc lỗi khớp sát một thay đổi → đó là **giả thuyết đầu tiên** cần kiểm chứng (chưa phải kết luận).
Nếu không có thay đổi nội bộ nào khớp → nghi hướng **dependency ngoài / tài nguyên / traffic**.

## Bước 2 — Khoanh vùng theo tầng

Đi từ ngoài vào trong, loại nhanh tầng không khớp timeline/triệu chứng:

| Tầng | Tín hiệu điển hình | Kiểm nhanh |
|------|--------------------|-----------|
| Edge / LB / gateway | 502/503/504, TLS/cert lỗi, timeout trước khi tới app | Access log LB, tỉ lệ 5xx tại edge vs tại app, trạng thái healthcheck upstream |
| Application | 500 nội bộ, exception, tăng latency xử lý, memory/GC | App error log, trace span chậm, số instance unhealthy, thay đổi deploy |
| Database / cache | Query chậm, lock/deadlock, connection pool cạn, timeout DB | Metric DB (connections, slow query), log lỗi kết nối, đổi schema/migration gần đây |
| Dependency ngoài | Lỗi/timeout gọi API bên thứ ba, hàng đợi ứ | Trace span gọi ngoài, error/latency theo dependency, status page bên thứ ba |
| Infra / tài nguyên | OOM, CPU/disk/network bão hoà, node/pod restart | Metric tài nguyên host/pod, event orchestrator (evict/restart), quota |

**Nguyên tắc loại trừ:** một tầng chỉ bị loại khi có **bằng chứng** nó bình thường trong cửa sổ lỗi
(không chỉ vì "trông có vẻ ổn"). Lỗi ở tầng dưới thường tạo **lỗi thứ cấp** ở tầng trên — bám **thời điểm
bắt đầu sớm nhất** để tìm nguồn, không nhầm triệu chứng lan truyền với nguyên nhân.

## Bước 3 — Chuyển sang đọc tín hiệu

Khi đã có tầng nghi ngờ, chuyển sang [log-metric-reading.md](log-metric-reading.md) để đọc log/metric/trace
của đúng tầng đó và **tương quan timeline**, rồi đặt **giả thuyết → kiểm chứng**.

## Mitigation tạm — ĐỀ XUẤT, KHÔNG tự thực thi trên prod

Khi cần giảm thiệt hại trước khi có RCA đầy đủ, **trình bày phương án** kèm rủi ro; **chờ người xác nhận**:

- **Rollback deploy nghi ngờ:** đưa về version trước mốc bắt đầu — rủi ro: mất tính năng mới; điều kiện:
  migration/dữ liệu tương thích ngược; kiểm sau: error rate về baseline.
- **Scale tài nguyên:** thêm instance/replica khi bão hoà tài nguyên — rủi ro: chỉ giảm triệu chứng nếu
  nguyên nhân là tải, không sửa lỗi logic; kiểm sau: saturation/latency giảm.
- **Feature flag:** tắt phần tính năng rủi ro — rủi ro: ảnh hưởng người dùng đang dùng tính năng đó;
  điều kiện: phần lỗi có flag bọc sẵn.
- **Circuit breaker / giảm tải:** cắt/degrade lời gọi dependency lỗi — rủi ro: giảm chức năng phụ thuộc;
  kiểm sau: latency/hàng đợi hồi phục.

Mẫu trình bày (chờ xác nhận):

```markdown
## Đề xuất mitigation — <service> / <môi trường>
- Giả thuyết hiện tại: <X gây Y> — mức tin: <chắc | nghi ngờ>, bằng chứng: <log/metric>
- Phương án đề xuất: <rollback | scale | flag | breaker>
  - Rủi ro: <...> · Điều kiện áp dụng: <...>
  - Lệnh/kế hoạch (chờ người xác nhận trước khi chạy prod): `...`
  - Kiểm tra sau khi áp: <metric/ngưỡng>
- Residual risk: <phần chưa verify / [giả định]>
```

## Fail-loud

- Thiếu tín hiệu/quyền truy cập/thời điểm bắt đầu → **nói rõ**, không suy diễn nguyên nhân.
- KHÔNG tuyên bố "đã tìm ra chắc chắn / đảm bảo hết lỗi" khi chưa kiểm chứng — nêu mức tin + bằng chứng.
