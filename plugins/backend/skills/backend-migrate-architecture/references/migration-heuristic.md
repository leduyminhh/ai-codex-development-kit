# Heuristic nhận diện kiến trúc + ánh xạ file→tầng

## A. Nhận diện kiến trúc hiện trạng (bước 2)

Dò các TÍN HIỆU trong code thật (không chỉ tài liệu):

| Tín hiệu quan sát | Gợi ý kiến trúc |
|---|---|
| Chỉ có controller + service + gọi thẳng ORM/DAO, không interface repository | Layered đơn giản |
| Domain model thuần (không annotation framework) + repository là interface, impl ở tầng ngoài | Onion / Hexagonal |
| Có thư mục `ports/` (interface) + `adapters/{inbound,outbound}` | Hexagonal |
| Tách rõ luồng ghi (Command → aggregate) và đọc (Query → read model/DTO) | CQRS (overlay trên Hexagonal/Clean — không loại trừ các dòng trên) |
| Domain import `jakarta.persistence` / `sqlalchemy` / framework web | Vi phạm phụ thuộc (chưa Onion/Hexagonal thật) |

Đối chiếu chiều phụ thuộc: liệt kê import của package `domain` — nếu có import
`infrastructure`/`web`/ORM/framework thì domain CHƯA độc lập (dù thư mục có thể đã đặt tên
"đúng"). Đây là input chính cho cột (c) của bảng ánh xạ.

## B. Quy tắc ánh xạ file → tầng đích (bước 4)

Đối chiếu với `architecture/<stack>-<kiểu>.template.md`. Quy ước chung:

| Loại phần tử hiện tại | Tầng đích (Onion/Hexagonal) | Ghi chú |
|---|---|---|
| Entity/model nghiệp vụ thuần | `domain/model` | Bỏ annotation ORM khỏi domain khi đích là Onion/Hexagonal (dùng mapping ở infrastructure) |
| Business rule/service điều phối | `application` (use case) | Không chứa chi tiết hạ tầng |
| Interface repository | `domain` (Onion) hoặc `application/ports` (Hexagonal) | Là port do lõi sở hữu |
| Impl repository (JPA/SQLAlchemy) | `infrastructure` (persistence adapter) | Phụ thuộc port, không ngược lại |
| Controller/router HTTP | `infrastructure` inbound / adapter web | Gọi vào application |
| DTO request/response | tầng adapter/inbound | Không rò rỉ vào domain |
| Cấu hình/DI wiring | `bootstrap`/composition root | Nơi DUY NHẤT nối interface↔impl |
| Mapper (DTO↔command / aggregate↔entity/row) | `infrastructure/.../mapper` (co-locate cạnh adapter) | Java: MapStruct interface `@Mapper`; Python: module hàm thuần. KHÔNG ở domain/application. |

Phân loại mỗi phần tử vào một trong ba cột hành động:
- **(a) DỜI:** đã đúng tinh thần, chỉ sai vị trí → đổi package + import.
- **(b) TÁCH/ĐẢO:** cần trích interface hoặc đảo chiều phụ thuộc (vd tách repository interface
  ra domain, đẩy impl xuống infrastructure).
- **(c) VI PHẠM:** domain đang phụ thuộc hạ tầng → phải cắt phụ thuộc (mapping/anti-corruption)
  trước khi coi là đạt.

## C. Thứ tự thực thi gợi ý (bước 7)

Mặc định lõi→ngoài (domain → application → infrastructure → bootstrap). Nếu phần lớn vi phạm
nằm ở ranh giới repository, tách interface repository TRƯỚC để cắt phụ thuộc sớm, rồi mới dời
phần còn lại. Luôn giữ mỗi bước build+test XANH; cho phép adapter tạm giữ cả đường cũ lẫn mới.

Khi migrate, tách phần map INLINE trong controller/adapter (field-by-field) ra mapper co-locate
cạnh adapter là một hành động thuộc cột **(b) TÁCH**. Read-side CQRS giữ nguyên RowMapper/
JdbcTemplate, không tách mapper riêng cho luồng đọc.
