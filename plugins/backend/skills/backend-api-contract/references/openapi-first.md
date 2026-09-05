# OpenAPI-first — thiết kế contract TRƯỚC khi code

Nguyên tắc: **chốt API contract trước, hiện thực sau**. Contract (OpenAPI 3.1) là bản khai mặt biên mà cả
frontend và backend cùng bám vào — không bên nào tự đoán shape của bên kia. Đây là **nguồn sự thật FE↔BE**;
mọi thay đổi biên đi qua sửa contract trước, rồi code mới theo.

## Vì sao design-first

- **Một điểm hẹn duy nhất:** FE sinh client/type, BE dựng controller — cả hai đọc cùng một file, giảm lệch do
  mỗi bên hiểu khác.
- **Chốt biên trước khi tốn công code:** phát hiện thiếu field / sai kiểu / thiếu mã lỗi ở giai đoạn thiết kế
  rẻ hơn sửa sau khi đã code hai đầu.
- **Contract ổn định, domain tự do:** contract chỉ mô tả mặt published (theo `../architecture/ARD.md` mục 5:
  "chỉ hợp đồng, không logic, không domain"); đổi aggregate/domain nội bộ không buộc đổi contract.

> Ngoại lệ code-first: một số stack sinh OpenAPI TỪ code (FastAPI tự sinh `/openapi.json`; Java `springdoc`
> sinh từ controller). Khi đó contract vẫn là nguồn đối chiếu FE↔BE, nhưng chiều đồng bộ là **code → contract
> export → FE**. Ghi rõ project theo design-first hay code-first ở bước 0 để chọn đúng chiều ở bước kiểm drift.

## Đặt contract ở đâu

- Vị trí chuẩn của kit: `docs/contracts/openapi.json` (hoặc theo project đã chọn ở `backend-init`). `backend-init`
  có thể đã tạo bản rỗng-hợp-lệ:
  `{"openapi":"3.1.0","info":{"title":"<API>","version":"0.1.0"},"paths":{},"components":{"schemas":{}}}`.
- Một Bounded Context → một contract. Đa-service: mỗi BC có contract riêng, KHÔNG gộp nhiều BC vào một file
  (theo `../architecture/ARD.md` mục 6.1).

## Cấu trúc tối thiểu mỗi operation

Khi thêm/cập nhật một endpoint, khai đủ:

- **`paths.<path>.<method>`:** một operation = một path + method (vd `POST /orders`).
- **`operationId`:** định danh ổn định để FE sinh tên hàm client — đặt theo động từ nghiệp vụ, giữ nguyên qua
  các version tương thích.
- **Request:** `parameters` (path/query/header) + `requestBody` trỏ `$ref` tới schema ở `components.schemas`.
- **Response:** mỗi status code (`200`/`201`/`4xx`/`5xx`) → schema; nêu cả mã lỗi nghiệp vụ chính, KHÔNG chỉ
  happy path.
- **Schema ở `components.schemas`, tham chiếu bằng `$ref`:** DTO request/response khai một chỗ, tái dùng bằng
  `$ref` — KHÔNG lặp inline (tránh lệch khi sửa).

## Quy ước schema (đồng bộ với biên code)

- **Tên DTO khớp danh xưng template** (theo `../architecture/ARD.md` mục 8): response là `*Response`/`*View`
  của tầng `api-contract`; request theo kênh (`*Request`). KHÔNG chế tên rời rạc giữa contract và code.
- **`required` khai tường minh:** field bắt buộc vào `required`; còn lại là optional. Đây là điểm drift hay gặp
  nhất — contract nói optional nhưng code bắt buộc (hoặc ngược lại).
- **Kiểu + format rõ:** `integer`/`string`/`boolean`/`array`/`object`; dùng `format` (`date-time`, `uuid`,
  `int64`) và `enum` khi có miền giá trị cố định.
- **Nullable theo 3.1:** OpenAPI 3.1 dùng `type: ["string","null"]` (JSON Schema), KHÔNG dùng `nullable: true`
  kiểu 3.0 — giữ đúng phiên bản đã khai ở `openapi`.

## Sau khi chốt contract

1. Kiểm hợp lệ: parse được, không `$ref` gãy, mỗi operation có response (bước 5 của SKILL).
2. Đồng bộ hai bên (bước 2 SKILL): BE dựng controller/`@HttpExchange` theo contract; FE sinh client/type.
3. Thay đổi về sau đi qua [versioning.md](versioning.md); soát khớp code bằng
   [contract-drift-check.md](contract-drift-check.md).
