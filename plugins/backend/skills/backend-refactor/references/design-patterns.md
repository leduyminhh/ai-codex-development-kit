# Design pattern & thiết kế shared khi refactor — khi nào áp, khi nào KHÔNG

Tài liệu tham chiếu cho `backend-refactor`. Gộp từ hai nguồn thực hành (Java/JVM design pattern +
thiết kế module shared) và diễn giải trung tính stack (Java/Spring, Python). Kiến trúc nền +
Dependency Rule: `architecture/ARD.md`.

**Nguyên tắc gốc:** design pattern là để **gỡ một áp lực thiết kế cụ thể**, KHÔNG phải để code "chuyên
nghiệp / cho đẹp". Trong lúc refactor, mặc định chọn **move đơn giản** (rename, extract method/class);
chỉ leo lên pattern khi move đơn giản không gỡ được. **HỎI người dùng duyệt TRƯỚC khi áp pattern lớn**
(thêm nhiều class/interface hoặc đổi cách các object cộng tác).

## Cổng quyết định — KHÔNG áp pattern khi
- Một rename / extract / tách method-class nhỏ đã gỡ được vấn đề.
- Chỉ có **một** điểm biến thể và chưa thấy case thứ hai gần kề (đừng khái quát hoá sớm).
- Pattern chỉ thêm interface/class mà KHÔNG giảm coupling / branching / trùng lặp.
- Codebase/team chưa dùng trừu tượng tương tự (thêm vào làm lệch convention — bám `code-convention`).
- Lý do duy nhất là "vì pattern này tồn tại".

## Cân nhắc pattern khi có áp lực thật
- Hành vi biến thiên theo **type / state / command / policy** lặp lại ở nhiều nơi.
- Tạo object có **nhiều họ / bắt buộc setup / bất biến ẩn** khó dựng đúng.
- Client cần **giao diện ổn định** che một cộng tác viên phức tạp/không tương thích.
- Workflow cần **bước tường minh, undo, thông báo, hay xử lý theo chuỗi**.
- Ranh giới ứng dụng cần khái niệm **DTO / gateway / filter / saga**.

## Bảng chọn nhanh (theo áp lực → pattern tiêu biểu)
Đây là gợi ý *diễn giải* để cân nhắc, không phải danh mục bắt buộc. Mỗi ứng viên phải trả lời:
gỡ đau gì? code nào đơn giản đi? thêm tên/class nào? test ra sao? sai thì hỏng thế nào?

| Áp lực thiết kế | Nhóm | Pattern tiêu biểu | Ghi chú chống lạm dụng |
|---|---|---|---|
| Hành vi/thuật toán đổi theo hoàn cảnh | Behavioral | Strategy, State, Template Method | Chỉ khi có ≥2 biến thể thật; 1 biến thể → if là đủ |
| Hành động cần queue/retry/undo/audit | Behavioral | Command | Đừng bọc mọi lời gọi thành Command |
| Chuyền request qua chuỗi xử lý | Behavioral | Chain of Responsibility | Đừng thay một if-else ngắn bằng chuỗi handler |
| Thông báo nhiều bên không muốn coupling | Behavioral | Observer / domain event | Trong DDD ưu tiên domain event (ARD mục 2) |
| Ghép API không tương thích, không rò vào lõi | Structural | Adapter (ACL) | Đúng vai adapter ở biên (ARD mục 6) |
| Thêm hành vi quanh object, không đổi type | Structural | Decorator | Đừng chồng nhiều decorator khó lần |
| Che subsystem phức tạp sau API hẹp | Structural | Facade | Không biến facade thành God class mới |
| Kiểm soát truy cập/lazy/cache/remote | Structural | Proxy | Nhiều framework đã lo (Spring AOP) — đừng làm tay thừa |
| Tạo object nhiều field optional/bất biến | Creational | Builder | Constructor/`record`/`dataclass` đủ thì đừng Builder |
| Chọn impl sau giao diện tạo ổn định | Creational | Factory Method | Đừng bọc factory quanh một constructor đơn |
| Tạo họ object phải tương thích nhau | Creational | Abstract Factory | Chỉ khi thật sự có nhiều họ |
| Chuyển dữ liệu qua biên không rò nội bộ | Architectural | DTO / mapper ở biên | ARD "Quy tắc mapper": mapper riêng ở mỗi ranh giới |
| Che ranh giới service/remote sau contract cục bộ | Architectural | Gateway / port + adapter | Lõi khai port, adapter ở ngoài (ARD mục 6) |

> Java thường có sẵn cơ chế thay pattern thủ công (Spring AOP thay Proxy, DI thay Service Locator);
> Python có first-class function/duck typing (một hàm/`Protocol` thường thay được Strategy/Factory
> nặng). Chọn cách **nhẹ nhất** mà stack hỗ trợ trước khi dựng cây class.

## Thiết kế shared / dedup — đặt code dùng chung ở đâu
Khi refactor gom trùng lặp (catalog mục 1) hoặc tách phần dùng chung, phân loại TRƯỚC khi dời:

| Loại | Được chứa | KHÔNG được chứa | Đặt ở |
|---|---|---|---|
| Contract chia sẻ | DTO request/response, schema, enum contract | entity DB, workflow nghiệp vụ, adapter | `<bc>-api-contract` (ARD mục 6) |
| Tiện ích kỹ thuật thuần | VO/utility tất định, mapper không I/O, helper | HTTP client, repository, transaction, IO ẩn | `shared`/`common-*` (nhỏ, không nghiệp vụ) |
| Quy tắc nghiệp vụ | logic của một bounded context | — | **Ở lại trong service đó** — không bao giờ ra shared |

Quy tắc chống "shared jar rác":
- Chỉ tách ra shared khi có **≥2 consumer thật** hoặc là contract rõ ràng — không tách "phòng khi
  dùng lại sau" (YAGNI).
- Module shared **framework-free** khi lõi (domain/application) cần import — tránh rò hạ tầng vào lõi.
- Đừng gộp DTO contract + HTTP client + domain vào một jar "cho tiện" (phá Bounded Context; triệu
  chứng: nâng version buộc mọi service redeploy; class shared mang tên nghiệp vụ).
- Phép thử đặt class ở đâu: "ngôn ngữ giao tiếp giữa hai service?" → contract; "tiện ích kỹ thuật
  không nghiệp vụ?" → shared/common; "biết quy tắc nghiệp vụ một context?" → ở lại service đó.

## Sau khi áp pattern — báo cáo (bắt buộc)
- Pattern đã dùng + **áp lực thiết kế cụ thể** nó gỡ.
- Các move đơn giản / pattern khác đã cân nhắc và LÝ DO bác.
- Cái gì đơn giản đi, cái gì trừu tượng thêm (tên/class/interface mới).
- Bằng chứng hành vi/boundary còn nguyên: test + (nếu có) ArchUnit/import-linter XANH.
- KHÔNG dùng "đảm bảo/loại bỏ"; nêu residual risk (vd pattern chọn sai thì chi phí gỡ ra sao).

## Red flag (dừng lại xét lại)
- Tên pattern xuất hiện TRƯỚC khi nêu được áp lực thiết kế.
- Pattern thêm class mà không giảm branching/coupling/trùng lặp.
- Áp pattern khi CHƯA hỏi người dùng duyệt (với pattern lớn).
- Không cân nhắc phương án đơn giản hơn.
