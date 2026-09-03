# ADR-0002: Chuẩn code convention + lint/format

- Trạng thái: Accepted
- Ngày: <yyyy-mm-dd>

## Bối cảnh
Cần một bộ quy ước code thống nhất, ràng buộc cho cả người và AI (Cowork/Code) để
diff sạch, dễ review, giảm tranh luận style. Chi tiết đầy đủ ở
project-knowledge/code-convention.md.

## Các lựa chọn đã cân nhắc
1. Theo style guide chuẩn của ngôn ngữ/cộng đồng (vd <...>) — phổ biến, ít tranh cãi.
2. Convention tuỳ biến nội bộ — linh hoạt nhưng tốn công bảo trì.
3. Không ràng buộc — mỗi người một kiểu (loại, gây diff bẩn).

## Quyết định
- Chốt bộ convention: <tên style guide / tuỳ biến> + formatter `<...>` + linter `<...>`.
- Chi tiết quy ước: project-knowledge/code-convention.md (nguồn sự thật).
- Bắt buộc: format + lint pass trước commit; CI chặn nếu fail.

## Hệ quả
- (+) Code đồng nhất, review nhanh, AI sinh code đúng chuẩn ngay.
- (−) Cần cấu hình tool + CI ban đầu; mọi người phải cài hook/format.
- Việc phải làm: thêm config formatter/linter, (tuỳ chọn) pre-commit hook + bước CI.
