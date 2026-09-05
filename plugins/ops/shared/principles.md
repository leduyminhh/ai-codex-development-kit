# Nguyên tắc riêng — Ops (Maintain Server)

> Phần này BỔ SUNG cho `core/principles/` (4 nguyên tắc cốt lõi, 3 tầng tài liệu,
> ranh giới an toàn nền, nguồn sự thật nền). Chỉ mô tả phần ĐẶC THÙ của plugin.

## Bản chất plugin
Đây là các capability **opt-in, vận hành server** — KHÔNG thuộc pipeline bắt buộc của plugin nào,
KHÔNG có thứ tự chạy ép buộc. Gọi từng skill khi cần: `ops-deploy-release` (deploy/release + rollback).
Mỗi skill là **recipe docs-only** — hướng dẫn cách agent hành động, KHÔNG sinh code chạy được và
KHÔNG đụng CLI/adapter/engine.

## An toàn production là trên hết
- **KHÔNG tự deploy / rollback / sửa production khi chưa có xác nhận của người.** Agent trình bày
  **kế hoạch + lệnh cụ thể**, chờ người duyệt rồi mới để người thực thi (hoặc thực thi khi được
  xác nhận rõ ràng, đúng scope).
- **KHÔNG lệnh phá huỷ** (xoá dữ liệu, drop/reset, force-push, đổi schema, restart hàng loạt) khi
  chưa xác nhận và chưa có điểm khôi phục.
- Mọi tác động lên môi trường chạy thật đều **read-only + đề xuất là mặc định**: quan sát trước,
  đề xuất sau, người quyết cuối.

## Không lộ secret
- **KHÔNG** nhập, in, hay log token/mật khẩu/khoá. Secret đi qua **biến môi trường / secret store**;
  skill chỉ nêu **tên biến**, không đọc giá trị ra output.
- **Mask** mọi giá trị secret trong log/report (vd `token=****`); chỉ nêu tên khoá + vị trí.

## Defer cấu hình thật của project
- **Defer** cấu hình CI/CD, hạ tầng, quy trình release **thật** cho project — plugin này **ĐỌC**
  chúng làm ràng buộc (Dockerfile, compose, k8s manifest, CI pipeline, script release), KHÔNG dựng lại,
  KHÔNG sửa ngoài scope người dùng nêu.

## Ngôn ngữ đo được
Mọi kết luận dùng ngôn ngữ **đo được** (có ngưỡng health/metric, tiêu chí tiến/lùi kiểm được) và
LUÔN nêu **residual risk**. KHÔNG tuyên bố "đảm bảo / loại bỏ / chặn triệt để" — kế hoạch phản ánh
dữ liệu tại thời điểm làm, môi trường thật có thể khác; nêu rõ `[giả định]` khi suy luận thiếu dữ liệu.
