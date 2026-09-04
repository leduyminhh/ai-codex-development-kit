# Chọn loại diagram

Quy tắc chọn: dùng diagram trả lời câu hỏi của người dùng bằng **ít notation nhất**. Chỉ hỏi thêm scope khi
chọn sai loại sẽ gây hiểu lầm; còn lại thì **[giả định]** rồi tiếp tục.

## Bảng chọn loại

| Loại (PlantUML) | Dùng khi cần diễn tả | Start tag |
|-----------------|----------------------|-----------|
| **Sequence** | Thứ tự message giữa actor/service/API/queue/job; luồng gọi + đường lỗi | `@startuml` |
| **Use Case** | Mục tiêu người dùng, actor hệ thống, phạm vi chức năng cấp cao | `@startuml` |
| **Class** | Mô hình domain, cấu trúc OO, interface, kế thừa, phụ thuộc | `@startuml` |
| **Object** | Instance runtime cụ thể + liên kết cho một ví dụ | `@startuml` |
| **Activity** | Quy trình nghiệp vụ, luồng quyết định, pipeline, thuật toán | `@startuml` |
| **Component** | Ranh giới service/module/package + phụ thuộc, ownership | `@startuml` |
| **Deployment** | Node, container, đặt hạ tầng, topology runtime | `@startuml` |
| **State** | Vòng đời, chuyển trạng thái, finite-state | `@startuml` |
| **Timing** | Tín hiệu, clock, đổi trạng thái theo thời gian | `@startuml` |
| **Gantt** | Lịch dự án, phụ thuộc, milestone | `@startgantt` |
| **MindMap** | Cây ý tưởng, khám phá khái niệm, taxonomy | `@startmindmap` |
| **WBS** | Phân rã công việc, cây delivery/kế hoạch | `@startwbs` |
| **JSON / YAML** | Payload dữ liệu, config, manifest, tài liệu mẫu | `@startjson` / `@startyaml` |
| **Network (nwdiag)** | Thiết bị mạng, nhóm, địa chỉ, kết nối | `@startuml` (nwdiag) |
| **Wireframe / Salt** | UI screen/form độ nét thấp | `@startsalt` |
| **Archimate** | Kiến trúc doanh nghiệp: business / application / technology | `@startuml` |
| **ER / IE** | Entity database, quan hệ, cardinality | `@startuml` (entity) |
| **Grammar** | EBNF, regex, notation hướng parser | `@startuml` |

## Ưu tiên theo danh từ chính người dùng nói

- "flow", "call", "API", "request", "event" → **Sequence** trước.
- "process", "approval", "pipeline" → **Activity** trước.
- "service", "module", "architecture" → **Component** trước.
- "server", "cluster", "container" → **Deployment** trước.
- "database", "entity", "table" → **ER/IE** trước.
- "state", "status", "lifecycle" → **State** trước.
- "timeline", "deadline", "roadmap" → **Gantt** trước.
- "UI", "screen", "form" → **Wireframe/Salt** trước.

## Khi nào dùng 2 diagram

Chỉ khi cùng một câu trả lời cần 2 góc nhìn — không quá 2 trừ khi người dùng xin "bộ diagram":

- **Sequence + Component:** tương tác service + ownership service.
- **Activity + State:** bước workflow + luật vòng đời.
- **ER + Class:** mô hình lưu trữ + mô hình ứng dụng.
- **Deployment + Network:** đặt runtime + chi tiết mạng.
