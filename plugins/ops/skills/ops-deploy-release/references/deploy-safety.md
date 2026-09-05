# Ranh giới an toàn khi deploy / release

Vận hành trên môi trường chạy thật là tác động **khó đảo**. Nguyên tắc: **read-only + đề xuất là mặc
định**, con người duyệt trước mọi tác động production. Ngôn ngữ **đo được**; luôn nêu **residual risk**.

## KHÔNG tự tác động production
- **KHÔNG tự chạy lệnh deploy/rollback prod.** Agent **trình bày kế hoạch + lệnh cụ thể + thứ tự bước +
  điểm health-check**, rồi **chờ xác nhận rõ ràng** của người mới để người thực thi (hoặc thực thi khi được
  xác nhận đúng scope).
- Staging: có thể thực thi khi được xác nhận, vẫn health-check sau mỗi bước và dừng khi vượt ngưỡng.
- Một xác nhận chỉ cho **một hành động, một scope**; KHÔNG suy rộng sang bước/môi trường khác.

## KHÔNG lệnh phá huỷ
- Không xoá dữ liệu, `drop`/`truncate`/`reset`, force-push, đổi schema **không thể đảo**, hay restart hàng
  loạt khi **chưa xác nhận** và **chưa có điểm khôi phục**.
- Migration đụng dữ liệu: yêu cầu backup đã verify + kế hoạch đảo/forward-fix trước khi đề xuất chạy.

## KHÔNG lộ secret
- Secret (token, mật khẩu, khoá, connection string) đi qua **biến môi trường / secret store**; skill chỉ nêu
  **tên biến**, KHÔNG đọc/in giá trị.
- **Mask** mọi giá trị secret trong log/report/lệnh mẫu (vd `--token=****`, `DB_PASSWORD=****`).
- KHÔNG commit secret vào repo/manifest; nếu phát hiện secret hardcode → cảnh báo (mask), đề xuất tách ra env.

## Scope-bound
- Chỉ triển khai đúng **version/artifact/service + môi trường** người dùng nêu; KHÔNG đụng service anh em hay
  môi trường khác.
- Chỉ **ĐỌC** cấu hình CI/hạ tầng làm ràng buộc; **KHÔNG sửa** pipeline/manifest ngoài scope; muốn đổi → đề
  xuất, chờ người quyết.

## Mẫu trình bày kế hoạch (chờ xác nhận)

```markdown
## Kế hoạch deploy — <service> <version> → <môi trường>
- Chiến lược: <rolling | blue-green | canary> — lý do: <...>
- Điểm rollback: <tag/artifact cũ> · Backup: <ID/thời điểm nếu đụng dữ liệu>
- Secret cần (tên biến, KHÔNG giá trị): <VD DB_PASSWORD, REGISTRY_TOKEN>

### Các bước + lệnh (chờ người xác nhận trước khi chạy trên prod)
1. <bước> — lệnh: `...`  → health-check: <endpoint/metric + ngưỡng>
2. ...

### Tiêu chí tiến/lùi
- Tiến: <metric trong ngưỡng ...>
- Lùi (rollback): <điều kiện ...> → <cách rollback theo chiến lược>

### Residual risk
- <phần chưa verify được / [giả định] về môi trường thật / cửa sổ theo dõi>
```

## Fail-loud
- Thiếu cấu hình/điểm rollback/backup/quyền → **nói rõ**, KHÔNG tự suy diễn rồi tác động; đề nghị người cung cấp.
- Không tuyên bố "đảm bảo / loại bỏ / chặn triệt để sự cố" — quy trình giảm rủi ro, môi trường thật vẫn có thể khác.
