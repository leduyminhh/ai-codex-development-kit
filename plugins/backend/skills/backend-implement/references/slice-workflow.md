# Slice workflow — sinh vertical slice, DEFER cây/naming/boundary cho blueprint

Sau khi chốt phạm vi ([use-case-intake.md](use-case-intake.md)), sinh slice xuyên mọi tầng. **Nguồn sự thật
cho vị trí file + ranh giới + đặt tên là blueprint kiến trúc đã chọn** — `architecture/<stack>-<kiểu>.template.md`
+ [ARD.md](../architecture/ARD.md). File này **KHÔNG chép lại cây thư mục** — chỉ nêu cách vận dụng blueprint
cho một slice và các điểm dễ sai.

## Nguyên tắc nền: đọc blueprint, đừng chế

- Mở đúng template theo `project-knowledge/architecture.md`: `<stack>` ∈ {`java`, `python`}, `<kiểu>` ∈
  {`onion-ddd`, `hexagonal-ddd`, `hexagonal-clean-cqrs`}; kiểu **layered** đơn giản thì theo
  `source-structure.md` của project.
- Trong template, **annotation cạnh mỗi package/file trong "Cây thư mục" nói rõ vai trò** (AGGREGATE ROOT,
  VALUE OBJECT, driving/driven port, adapter, mapper, controller…). Đặt mỗi file của slice vào đúng folder
  theo annotation đó — **một file cho mỗi folder mà use-case đi qua**, không bỏ tầng, không gộp tầng.
- Đặt tên **đúng danh xưng của template** (đừng mặc định gọi "DTO"): xem mục "Standards"/"Naming" của template
  và [ARD.md](../architecture/ARD.md) mục 8.

## Luồng một slice (đi qua các tầng)

Theo hợp đồng "một use-case xuyên mọi tầng" của [ARD.md](../architecture/ARD.md) mục 8:

1. **Inbound adapter** (controller/route) nhận **kiểu ở biên** (request/params) → **mapper biên** đổi sang
   **command** → gọi use-case qua **driving port** (Hexagonal: `application/port/in`; Onion/layered: gọi
   thẳng application service).
2. **Use-case / application service** (tầng `application`) **điều phối**: dựng/nạp aggregate, gọi quy tắc
   nghiệp vụ, gọi **driven port**. KHÔNG chứa quy tắc nghiệp vụ (ở domain), KHÔNG chi tiết hạ tầng.
3. **Aggregate + quy tắc** (tầng `domain`): invariant/chuyển trạng thái nằm trong aggregate root / value
   object / domain service. Thuần POJO/Python, không import hạ tầng.
4. **Driven port + adapter** (persistence/gateway): adapter hiện thực port, **mapper** đổi aggregate↔row.
5. **Wiring** (bootstrap/DI): nối port → adapter. Đây là nơi duy nhất "thấy" framework.

**Nhánh Query (CQRS):** bỏ qua aggregate — read repository/adapter trả **read model (`*View`) trực tiếp**,
KHÔNG qua command, KHÔNG mapper command. Xem template `<stack>-hexagonal-clean-cqrs`.

## Map ở biên (recap — chi tiết ở template mục "Implementation"/"Standards")

Lõi luôn sạch nhờ **map ở biên bằng mapper thủ công**, KHÔNG map inline trong adapter, KHÔNG trộn một class
cho cả DTO/aggregate/row:

| Ranh giới | Map ở | Java | Python |
|-----------|-------|------|--------|
| DTO biên ↔ command | inbound adapter **delegate** mapper | interface **MapStruct** RIÊNG cạnh controller (`*DtoMapper`) | **module hàm thuần** `web/mapper.py` |
| aggregate ↔ row/entity | persistence adapter **delegate** mapper | **MapStruct** `*EntityMapper` ở `persistence/mapper/` | `persistence/mapper.py` |
| DTO hệ ngoài ↔ VO domain | ACL adapter (gateway) | **map tay** (dịch ngữ nghĩa, không MapStruct) | **map tay** trong adapter |

Entity/row **RIÊNG** khỏi aggregate; aggregate KHÔNG mang annotation ORM (`@Entity`/mapping). DTO của hệ
ngoài **không rời** adapter ACL.

## Đặt driven port đúng chỗ theo kiểu

Điểm phân biệt chắc chắn giữa các kiểu là **vị trí repository/port** (quy ước đóng gói, không phải luật gốc —
xem [ARD.md](../architecture/ARD.md)):

- **Onion + DDD:** repository interface khai ở **`domain/repository`** (Java) / **`domain/repository/`**
  (Python) — để Domain Service cũng gọi được; gateway không thuộc domain ở `application/port(s)`.
- **Hexagonal + DDD / Hexagonal-Clean + CQRS:** driven port khai ở **`application/port/out`** (Java) /
  **`application/ports/outbound.py`** (Python); driving port ở `application/port(s)/in(bound)`.
- Hiện thực của **mọi** port nằm ở vòng ngoài cùng (`infrastructure` / adapter driven).

## Ranh giới transaction

- **Đặt ở use-case, KHÔNG ở adapter.** Rải `@Transactional`/commit lẻ ở từng adapter cho use-case ghi nhiều
  bước → nhiều transaction rời, mất nguyên tử. Java: `TransactionPort`/proxy ở bootstrap; Python: unit-of-work
  ở application.
- **Một transaction = một aggregate** (Vernon, dẫn trong [ARD.md](../architecture/ARD.md)): cần đổi nhiều
  aggregate → eventual consistency qua **domain event**, không nới transaction.
- Domain event: aggregate ghi event nội bộ; application service **phát sau khi lưu, trong cùng transaction**;
  ra hệ ngoài đáng tin cậy → transactional outbox (ngoài phạm vi slice tối thiểu, chỉ nêu khi cần).

## Điểm khác Java vs Python (chỉ nêu điểm lệch — chi tiết ở template)

| Khía cạnh | Java/Spring | Python/FastAPI |
|-----------|-------------|-----------------|
| Ép ranh giới | **ArchUnit** (test) + cô lập Maven multi-module (compiler) | **import-linter** (`lint-imports`), không có compiler cô lập |
| Khai port | `interface` | `typing.Protocol` (structural — adapter không import ngược lõi) |
| Mapper | MapStruct interface RIÊNG (`@Mapper(componentModel = "spring")`) | module hàm thuần |
| Inbound web (Hexagonal) | tách module `<bc>-web-api` (package `webapi`) | giữ trong `infrastructure/inbound/web` |

## Ranh giới an toàn khi sinh

- KHÔNG import framework/ORM/web trong `domain`/`application`; inbound adapter KHÔNG gọi thẳng outbound
  adapter (đi qua use-case/port).
- KHÔNG chạy DB migration thật, KHÔNG externalize config/secret, không đụng secret — ngoài phạm vi slice.
- Đánh dấu file là ví dụ/slice mới rõ ràng; giữ **tối giản, không phình** (một aggregate, một use-case).

## Sau khi sinh

Chuyển sang [checklist.md](checklist.md) để verify Definition of Done trước khi báo xong.
