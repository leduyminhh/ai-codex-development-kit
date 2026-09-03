# Nguyên tắc riêng — OLTP Database

> Phần này BỔ SUNG cho `core/principles/` (4 nguyên tắc cốt lõi, 3 tầng tài liệu,
> ranh giới an toàn nền, nguồn sự thật nền). Chỉ mô tả phần ĐẶC THÙ oltp-database.

## Thẻ nhận diện — oltp-database
- **Là ai:** workflow sở hữu một cơ sở dữ liệu VẬN HÀNH (OLTP) dùng chung như một SẢN PHẨM độc
  lập; chốt schema vật lý làm HỢP ĐỒNG công bố cho consumer, rồi migration versioned, rồi áp thật
  + test toàn vẹn.
- **Viết tắt:** OLTP = Online Transaction Processing (xử lý giao dịch trực tuyến) — CRUD độ trễ
  thấp, chuẩn hoá cao, toàn vẹn giao dịch (ACID).
- **Phục vụ:** app backend / service khác là CONSUMER đọc-ghi trực tiếp trên database này qua
  schema contract đã công bố.
- **KHÁC ai:** KHÁC `olap-warehouse` (OLAP — ĐỌC dữ liệu TỪ các nguồn, gồm chính oltp-database, để
  phân tích; không sở hữu giao dịch vận hành) và KHÁC ERD nhúng trong một app backend (mô hình dữ
  liệu của riêng service đó, phục vụ repository nội bộ — không phải DB dùng chung).

## Phân tầng mã nguồn database
Schema/migration/DB object nằm trong root riêng (mặc định `db/`): `db/schema/` (DDL nguồn sự
thật của trạng thái HIỆN TẠI) → thư mục migration THEO cơ chế đã chọn (mặc định `db/migrations/`;
Liquibase `db/changelog/`, Flyway `db/migration/`, ORM dir framework — xem ADR-0004) · `db/seeds/`
(seed cho DB dev) · `db/queries/` (query dùng chung) · `db/functions/` (view/function/trigger),
tách hẳn khỏi tài liệu. `docs/contracts/` chứa SCHEMA CONTRACT đã CÔNG BỐ cho consumer (app
backend, service khác tiêu thụ cùng database).

> Lưu ý 2 chốt con người với database đặc biệt quan trọng: một migration sai có thể làm mất
> dữ liệu thật hoặc phá vỡ mọi consumer đang đọc/ghi chung một database.

## Pipeline database (thứ tự bắt buộc)
**Schema Contract** (schema vật lý: bảng/cột/kiểu/ràng buộc/khóa/index + seed mẫu) →
**Migration** (kế hoạch versioned, expand-contract, reversible) → **Implement đầy đủ** (áp
migration + DB object thật + test toàn vẹn). Chốt HÌNH DẠNG schema trước (tên bảng/cột, kiểu,
nullability, khóa chính/khóa ngoại, unique/check, index), rồi mới lập kế hoạch thay đổi
(migration), rồi mới áp dụng lên DB thật.

Contract của database là **SCHEMA CONTRACT**: chốt TRƯỚC schema vật lý của database vận hành
dùng chung — tên bảng/cột, kiểu dữ liệu theo engine đã chọn, nullability/default, PK/FK/
unique/check, index kèm lý do theo access pattern, grain/khóa tự nhiên vs surrogate — kèm
seed/sample khớp schema. Đây là HỢP ĐỒNG công bố cho consumer, KHÁC với ERD/mô hình phác thảo
ở giai đoạn phân tích (chỉ mô tả Ý ĐỊNH, chưa phải cam kết).

## Vòng đời & recipe on-demand
Ngoài pipeline bắt buộc (init → analysis → schema-contract → migration → implement), oltp-database
có recipe ON-DEMAND (không thuộc chuỗi) cho MAINTAIN + OPS + bảo mật + đồng thời:
- **`oltp-database-validate`** (maintain): lint + validate migration + verify schema ↔ contract + drift.
- **`oltp-database-migrate`** (evolve): đổi cơ chế quản lý / engine, baseline + diff-rỗng.
- **`oltp-database-server`** (ops): dev server + secret env/vault + áp migration per-env + backup/restore.
- **`oltp-database-security`**: role/quyền least-privilege + Row-Level Security + phân loại & bảo vệ PII.
- **`oltp-database-concurrency`**: chọn isolation theo access pattern + chiến lược locking (tránh
  deadlock/lost-update/write-skew) + ranh giới transaction & retry.
Gọi khi cần; mọi thao tác rủi ro (DDL phá hủy, đổi quyền/isolation prod) tuân ranh giới an toàn bên dưới.

## Ranh giới an toàn — bổ sung database
- Không chạy DDL phá hủy/ghi đè dữ liệu thật (DROP/TRUNCATE/ALTER làm mất dữ liệu) khi chưa
  được duyệt.
- Không tự kết nối / áp migration lên database production khi chưa được phép; ưu tiên DB
  dev/seed cho mọi thao tác thử nghiệm.
- Migration PHẢI reversible (có kịch bản down/rollback tương ứng mỗi up) trước khi áp dụng.
- Cơ chế quản lý schema chốt ở init (ADR-0004) là NGUỒN SỰ THẬT cho cách sinh + áp migration.
  Auto-DDL (`hbm2ddl.auto=update/create/create-drop` hay tương đương) trên DB dùng chung /
  production là ANTI-PATTERN (không kiểm soát, khó rollback) — ưu tiên migration versioned tường
  minh hoặc SINH RA có review; auto-DDL chỉ chấp nhận ở DB dev cá nhân.
- Secret kết nối (connection string, mật khẩu, API key của DB) qua biến môi trường / vault,
  KHÔNG hardcode và KHÔNG commit.
- Không commit migration fail test toàn vẹn (ràng buộc/khóa/index không hoạt động đúng như
  schema contract đã chốt).

## Nguồn sự thật — bổ sung database
Schema ĐANG áp dụng thực trên DB (phản ánh ở `db/schema/`, trạng thái mới nhất) >
`schema-contract.md` đã công bố > ERD/mô hình phác thảo ở giai đoạn phân tích. Contract đã
công bố ở `docs/contracts/` > suy đoán từ tài liệu cũ hoặc trí nhớ. Đổi schema đã công bố theo
hướng breaking với consumer đã biết PHẢI có version mới + ADR ghi rõ lý do và kế hoạch tương
thích ngược — KHÔNG để schema thật âm thầm trôi khỏi hợp đồng đã công bố.
