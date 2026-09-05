# Versioning & backward-compat — SemVer contract

API contract là mặt published mà consumer (FE, service khác) phụ thuộc. Đổi contract mà không quản version
sẽ **phá client đang chạy**. Nguyên tắc: **version theo góc nhìn consumer** — thứ consumer thấy đổi thế nào
quyết định mức bump, không phải độ lớn công sức phía provider. Đồng bộ với `../architecture/ARD.md` mục 6.1.

## SemVer cho contract

`MAJOR.MINOR.PATCH` khai ở `info.version` của OpenAPI:

| Mức | Khi nào | Ví dụ |
|-----|---------|-------|
| **PATCH** | Sửa mô tả/ví dụ/typo, không đổi shape hay hành vi | Sửa `description`, thêm `example` |
| **MINOR** | Thêm mà **không phá** client cũ (tương thích ngược) | Thêm endpoint mới; thêm field **optional** vào response; thêm giá trị enum vào output; thêm param optional |
| **MAJOR** | Thay đổi **phá** client cũ (breaking) | Bỏ/đổi tên field; đổi kiểu; thêm field **required** vào request; siết validation; đổi nghĩa; bỏ endpoint; đổi status code |

> Provider giữ tương thích ngược **trong cùng MAJOR**; breaking thì bump MAJOR và **chạy song song bản cũ**
> tới khi consumer chuyển xong.

## Thay đổi tương thích vs breaking

**Tương thích ngược** (MINOR — client cũ vẫn chạy):

- Thêm endpoint/operation mới.
- Thêm field **optional** vào response hoặc request.
- Nới lỏng validation (bỏ bớt ràng buộc).
- Thêm giá trị enum ở **output** (client cũ đã phải chấp nhận giá trị lạ một cách an toàn).

**Breaking** (MAJOR — client cũ có thể hỏng):

- Bỏ hoặc đổi tên field/endpoint/param.
- Đổi kiểu dữ liệu hoặc `format` của field.
- Thêm field **required** vào request, hoặc siết validation (thu hẹp miền giá trị).
- Đổi `required` từ optional → bắt buộc.
- Thêm giá trị enum ở **input** mà server bắt buộc xử lý khác, hoặc bỏ giá trị enum đang dùng.
- Đổi status code / cấu trúc lỗi.

> Ranh giới optional↔required và mở rộng↔thu hẹp enum là chỗ dễ đánh giá nhầm nhất — khi phân vân, coi là
> breaking (an toàn hơn cho consumer) và nêu `[giả định]` để người duyệt xác nhận.

## Deprecate có lộ trình

Không xoá đột ngột. Trước khi gỡ một field/endpoint:

1. Đánh dấu `deprecated: true` trên operation/field trong contract.
2. Ghi **note thay thế** (dùng gì thay) trong `description` + mốc dự kiến gỡ.
3. Giữ song song bản cũ + mới đủ thời gian cho consumer chuyển.
4. Chỉ gỡ (bump MAJOR) sau khi xác nhận không còn consumer dùng — theo mức đo được (log/traffic), KHÔNG đoán.

## Ghi note thay đổi

- Mỗi lần bump: cập nhật `info.version` + ghi thay đổi (changelog contract, hoặc ADR nếu là quyết định biên
  lớn — `docs/decisions/`).
- Breaking **phải** có version mới + note nêu rõ điểm phá và đường di trú; KHÔNG sửa contract published breaking
  mà giữ nguyên version.

## Đa-service (liên-repo)

Khi contract là artifact publish (`<bc>-api-contract`), theo `../architecture/ARD.md` mục 6.1: toạ độ
`com.acme.<bc>:<bc>-api-contract:<version>`, provider là nguồn duy nhất phát hành, consumer khai version một
chỗ (`dependencyManagement`/BOM). `SNAPSHOT` chỉ khi tích hợp nội bộ chưa chốt; release phải version cố định.
