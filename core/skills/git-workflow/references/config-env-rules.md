# Quy tắc config & môi trường trong commit

## Khi nào mục Important notes / Breaking impact là BẮT BUỘC

Luôn thêm `Important notes / Breaking impact` khi staged change chạm:

- `.env`, `.env.example`
- runtime flag, profile, port, URL
- placeholder credential, feature toggle
- config deploy, Docker/K8s, biến CI/CD
- tham số runtime (vd FFmpeg), endpoint dịch vụ ngoài
- file cấu hình ứng dụng (`application.yml`, `application-*.yml`, `config.yaml`,
  `docker-compose.yml`...)

Mục này phải nói rõ: hành động migration/setup cần làm, rủi ro tương thích ngược,
tác động deploy.

## Khai báo biến môi trường bắt buộc

Khi staged change THÊM / GỠ / ĐỔI TÊN / đổi hành vi của giá trị cấu hình bắt buộc,
commit message phải liệt kê TỪNG biến bị ảnh hưởng, và nói rõ mỗi biến là:
mới / đổi tên / bị xoá / optional / bắt buộc / deprecated. Nêu tác động deploy/setup
khi có; chỉ nêu default value khi nó thật sự tồn tại trong hành vi runtime.

Tránh mơ hồ kiểu:

```text
- update env configuration
- add some new variables
```

Mẫu diễn đạt tường minh:

```text
Important notes / Breaking impact:
- Thêm biến môi trường bắt buộc:
  • JWT_SECRET
  • JWT_EXPIRE_MINUTES
  • RTSP_RECONNECT_DELAY
- Đổi tên:
  • REDIS_HOST -> REDIS_URL
- Xóa:
  • LEGACY_AUTH_MODE
- Staging và production cần cập nhật .env trước khi deploy.
```

## Quy tắc breaking

Nếu ứng dụng KHÔNG chạy đúng khi thiếu giá trị cấu hình mới, commit BẮT BUỘC có mục
`Important notes / Breaking impact:` — kể cả khi phần còn lại của thay đổi rất nhỏ.

## Kiểm tra trước khi chốt message

- Soát staged change về config/môi trường.
- Phát hiện key bắt buộc mới thêm; key bị đổi tên hoặc xoá.
- Đưa TỪNG key bị ảnh hưởng vào body — không bao giờ bỏ sót tên biến bắt buộc.
