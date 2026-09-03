# ADR-0001: Chốt root mã nguồn + quy ước module

- Trạng thái: Accepted
- Ngày: <yyyy-mm-dd>

## Bối cảnh
Cần chốt thư mục ROOT của mã nguồn và quy ước tổ chức module để git diff sạch, scope
build/test/lint rõ, và tách tầng tài liệu khỏi tầng mã nguồn.

## Các lựa chọn đã cân nhắc
1. Một root `src/` + mỗi module một thư mục con tự chứa — rõ ràng, dễ scope.
2. Monorepo nhiều app (`apps/` + `packages/`) — phù hợp khi nhiều ứng dụng chung lib.
3. Trộn mã nguồn với tài liệu — loại (diff bẩn, khó scope).

## Quyết định
- Root mã nguồn: <`src/` hoặc `apps/`+`packages/`>.
- Mỗi module là thư mục con tự chứa; code dùng chung ở `<root>/shared/`.
- Module chỉ giao tiếp qua API công khai hoặc shared (no reach-in). Chi tiết: project-knowledge/source-structure.md.

## Hệ quả
- (+) Diff sạch, scope rõ, dễ thêm module mới.
- (−) Cần kỷ luật ranh giới module ngay từ đầu.
