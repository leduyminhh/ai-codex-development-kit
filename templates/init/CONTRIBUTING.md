# Đóng góp / Quy ước làm việc

## Code convention (BẮT BUỘC)
- Chuẩn code nằm ở `project-knowledge/code-convention.md` — đọc và tuân thủ TRƯỚC khi viết code.
- Chạy formatter + linter trước mỗi commit; KHÔNG commit code fail lint/format.
- Đặt tên, cấu trúc file, xử lý lỗi, comment, test… theo đúng convention; lệch = phải sửa.
- Muốn đổi convention: mở ADR mới, cập nhật code-convention.md, rồi mới áp dụng.

## Commit
- Theo Conventional Commits: feat / fix / docs / refactor / test / chore / perf.
- Mỗi task trong plan.md = 1 commit logic.
- Message rõ ràng: `<type>(<scope>): <mô tả ngắn>`.

## Branch & PR
- Mỗi yêu cầu một nhánh: feat/<ten-ngan>.
- Mở PR/issue trỏ tới docs/requests/<...>/ và ADR liên quan.

## Checklist trước khi commit
- [ ] Tuân thủ code-convention.md (đặt tên, cấu trúc, xử lý lỗi…)
- [ ] Format pass (đã chạy formatter)
- [ ] Lint pass
- [ ] Test pass
- [ ] Đã review diff
- [ ] Đã tick task tương ứng trong plan.md
