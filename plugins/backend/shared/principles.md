# Nguyên tắc riêng — Backend

> Phần này BỔ SUNG cho `core/principles/` (4 nguyên tắc cốt lõi, 3 tầng tài liệu,
> ranh giới an toàn nền, nguồn sự thật nền). Chỉ mô tả phần ĐẶC THÙ backend.

## Phân tầng mã nguồn backend
Layout `src/` theo **KIẾN TRÚC chọn khi init** (Layered thường / Onion+DDD / Hexagonal+DDD /
Hexagonal-Clean+CQRS — chốt ở ADR-0004; mô tả tầng thực tế ở `project-knowledge/architecture.md` +
`source-structure.md` = **NGUỒN SỰ THẬT layout**, mọi skill downstream đọc từ đó, KHÔNG hardcode tên tầng).
INVARIANT chung mọi kiến trúc — **Dependency Rule**: tầng trên gọi tầng dưới, KHÔNG ngược lại; lõi
nghiệp vụ (domain) không biết hạ tầng (framework/DB/giao thức). Code dùng chung ở `src/shared/`; module
chỉ giao tiếp qua API công khai hoặc shared (no reach-in). Layered thường = `api/`→`service/`→`repository/`.

## Pipeline backend (thứ tự bắt buộc)
**Contract** (REST API + mock) → **ERD/Repository** → **Implement đầy đủ**.
Chốt giao diện API trước, rồi mô hình dữ liệu, rồi mới nối nghiệp vụ thật.

Contract của backend là **REST API contract**: chốt trước endpoint (method + path), request/response
schema theo từng mã trạng thái, mã lỗi + điều kiện, quy tắc validate; kèm mock data khớp contract
để chốt hình dạng trước khi đụng schema/nghiệp vụ. `openapi.json` (OpenAPI 3.1, JSON) là nguồn sự thật máy-đọc-được cho ERD + implement; `contract.md`
bổ sung prose validate/nghiệp vụ và trỏ tới `openapi.json`.

## Ranh giới an toàn — bổ sung backend
- Không chạy migration / lệnh phá hủy dữ liệu khi chưa được duyệt.

## Khởi tạo & migration — bổ sung backend
- Init theo stack: stack có template đầy đủ (hiện tại Python/FastAPI) → init ship **skeleton HẠ TẦNG
  chạy được** (main/shared/health, best-practice tối thiểu), KHÔNG chỉ folder rỗng; **module nghiệp vụ
  do bước chọn kiến trúc scaffold theo layout kiến trúc đã chọn** (từ template `architecture/<stack>-<kiểu>`),
  team đổi tên thành module thật và điền nghiệp vụ. Stack trung tính (chưa có template) → folder rỗng + tài liệu.
- Migration tiến hóa schema theo **expand-contract**: thêm (nullable/default) → backfill → đổi code →
  xóa cũ (qua nhiều release cho thay đổi breaking); up/down reversible; KHÔNG tự chạy migration phá hủy
  dữ liệu khi chưa duyệt.

## Nguồn sự thật — bổ sung backend
- Hợp đồng API máy-đọc-được là `openapi.json` (OpenAPI 3.1): nguồn sự thật cho endpoint/shape/error.
- `docs/contracts/openapi.json` là bản GỘP đầy đủ, luôn-hiện-hành của API đã công bố; mỗi
  `docs/requests/<...>/openapi.json` là delta của yêu cầu, merge vào bản gộp khi duyệt.
- Thứ tự: schema/migration thực của DB > `data-model.md`; `openapi.json` > mock > prose. Response
  thực phải khớp `openapi.json` — lệch thì DỪNG, quay lại contract.
