# Chiến lược test — chọn loại, đặt đúng tầng, tránh test giòn

Tài liệu tham chiếu cho `backend-testing`. Trung tính stack; idiom cụ thể xem
[java-python-testing.md](java-python-testing.md). Kiến trúc nền: `architecture/ARD.md`.

## 1. Test pyramid — vì sao đáy rộng

Kiến trúc hướng miền tách **lõi (domain + application)** khỏi **hạ tầng (adapter)**. Hệ quả trực
tiếp cho test: lõi test được **không cần bật framework/DB**, nên phần đáy kim tự tháp rộng ra.

```
        e2e (rất ít) — vài luồng giá trị cao, đắt + dễ giòn
     integration (ít) — adapter chạm DB/broker/HTTP thật
  unit lõi (nhiều) — domain + application thuần, mock port, không DB
```

- **Nhiều unit ở lõi:** nhanh (mili-giây), chạy mỗi lần lưu file, khoanh lỗi sát điểm sai.
- **Ít integration ở adapter:** chậm hơn (dựng container/DB), chỉ dùng khi hành vi hạ tầng
  (persistence, mapping, transaction, serialize HTTP) là thứ đang cần chứng minh.
- **Rất ít e2e:** chỉ cho luồng người dùng giá trị cao **không** chứng minh được ở tầng thấp.

Chống lộn ngược kim tự tháp: mỗi lần định thêm e2e/integration, hỏi "rủi ro này có test được rẻ
và ổn định hơn ở tầng thấp không?" — nếu có, hạ xuống tầng đó.

## 2. Đặt test đúng tầng theo kiến trúc

| Tầng kiến trúc | Loại test | Có bật framework/DB? | Trọng tâm chứng minh |
|---|---|---|---|
| Domain (aggregate, VO, domain service) | Unit thuần | Không | Invariant, quy tắc nghiệp vụ, tính toán, nhánh rẽ |
| Application (use-case / application service) | Unit thuần, **mock/fake driven port** | Không | Điều phối: gọi port đúng thứ tự, map input→output, nhánh nghiệp vụ, xử lý lỗi từ port |
| Adapter RA — persistence | Integration (Testcontainers / DB in-memory) | Có (DB) | Mapping entity↔aggregate, query, transaction/rollback, ràng buộc unique/khoá |
| Adapter RA — HTTP client / messaging | Integration / contract | Có (mock server / broker) | Serialize request, đọc response, retry/timeout, ánh xạ lỗi |
| Adapter VÀO — web controller | Web slice (use-case mock) | Một phần (chỉ tầng web) | Validation, mã lỗi HTTP, serialize/deserialize, ánh xạ exception |
| Luồng xuyên hệ thống | e2e (mỏng) | Toàn bộ | Vài kịch bản giá trị cao đầu-cuối |

**Onion/Hexagonal/CQRS:** lõi = unit-no-DB mock **driven port**; adapter = integration; CQRS
tách rõ luồng ghi (aggregate) và luồng đọc (read model) → test riêng từng luồng theo cấu trúc
`write/`, `read/` của template.

**Layered đơn giản:** service = unit (mock repository); repository = integration; controller =
web slice. Không ép DDD/port nếu project chọn layered.

## 3. Cái gì đáng test (ưu tiên rủi ro)

Đáng test — nơi lỗi hay nấp:
- Quy tắc nghiệp vụ + invariant aggregate; case biên (null/rỗng/0/âm/tràn, biên miền giá trị).
- Nhánh rẽ điều kiện, chuyển trạng thái, xử lý lỗi và rollback.
- Ranh giới tích hợp: mapping ở biên, transaction, serialize/deserialize, hợp đồng API.
- Vùng vừa sửa/refactor và vùng hồi quy quanh nó.
- Khi liên quan: concurrency, idempotency, retry, thời gian/timezone, độ chính xác số.

Ít/không đáng viết test riêng:
- Getter/setter, DTO thuần, code do framework sinh, cấu hình tĩnh.
- Kịch bản đã được một test tầng thấp hơn phủ chắc (tránh trùng lặp tốn kém).

## 4. Assert hành vi, không assert chi tiết cài đặt

- Assert **kết quả + side-effect quan sát được** (giá trị trả về, trạng thái aggregate sau thao
  tác, việc một port ĐƯỢC gọi với dữ liệu đúng), không assert bước nội bộ private.
- **Không mock chính class đang test.** Mock/fake các cộng tác ở ranh giới (driven port), không
  mock giá trị/aggregate thuần — dựng thật.
- Snapshot/so khớp toàn khối chỉ dùng khi shape ổn định; ưu tiên assert đúng trường có ý nghĩa
  nghiệp vụ để test không vỡ vì thay đổi vô hại.

## 5. Tránh test giòn (brittle/flaky)

Test giòn = đỏ vì lý do không liên quan đến hành vi đang test → mất niềm tin vào suite.

| Dấu hiệu giòn | Vì sao hại | Cách tránh (đo được) |
|---|---|---|
| Phụ thuộc **thứ tự** chạy / trạng thái chia sẻ toàn cục | Đổi thứ tự → đỏ; song song → đỏ | Mỗi test tự dựng + dọn dữ liệu; không dùng static mutable dùng chung |
| Phụ thuộc **thời gian thực** (`now()`, sleep, timeout ngắn) | Máy chậm/nhanh → đỏ ngẫu nhiên | Tiêm clock/thời gian cố định; chờ theo điều kiện, không `sleep` cứng |
| Phụ thuộc **mạng / dịch vụ ngoài** thật | Mạng lỗi → đỏ; chậm | Mock ở unit; Testcontainers/mock server ở integration |
| Assert **chi tiết cài đặt** (thứ tự gọi private, chuỗi log) | Refactor vô hại → đỏ | Assert hành vi/kết quả quan sát được |
| Dữ liệu test **trùng khoá** giữa lần chạy | Chạy lại → đỏ do ràng buộc unique | Sinh id/khoá duy nhất; rollback hoặc dọn sau mỗi test |
| So khớp float bằng `==` | Sai số dấu phẩy động | So khớp có sai số (delta) hoặc kiểu thập phân |

Khi phát hiện test giòn: sửa **nguyên nhân gốc** (tính bất định), không "chạy lại tới khi xanh"
và không nới assert tới mức không còn chứng minh gì.

## 6. Ranh giới của độ phủ

Phần trăm phủ là **chỉ báo vùng CHƯA chạm tới**, không phải bằng chứng đúng: một dòng "được
chạy qua" chưa nghĩa là hành vi của nó đã được assert. Đọc phủ theo **nhánh + case biên nghiệp
vụ**, không chạy theo con số tổng. LUÔN nêu nhánh/đường đi còn hở và residual risk; độ phủ phản
ánh thời điểm chạy với các case đã nghĩ ra, có thể sót.
