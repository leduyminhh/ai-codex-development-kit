# Danh mục refactoring backend — dấu hiệu, move, cách giữ hành vi

Tài liệu tham chiếu cho `backend-refactor`. Trung tính stack ở phần nguyên tắc; dấu hiệu minh hoạ
bằng Java/Spring và Python. Kiến trúc nền + Dependency Rule + quy tắc đặt tầng: `architecture/ARD.md`
(mục 1, 5, 7) + blueprint `<stack>-<kiểu>.template.md`. Mỗi move dưới đây **giữ nguyên hành vi quan
sát được**; đổi hành vi là việc riêng của `backend-implement`.

Nguyên tắc chung cho MỌI move:
- **Dời/đổi/tách trước, đổi hành vi sau (bước riêng).** Không trộn dọn code với sửa logic.
- **Bước nhỏ, XANH sau mỗi bước** (build + test + lint). Đỏ → revert bước đó.
- **Đặt đúng tầng.** Trước khi gom/dời, hỏi: chỗ đến có vi phạm Dependency Rule không? (vd không kéo
  logic nghiệp vụ ra util hạ tầng; không đẩy import framework vào domain.)
- **Có công cụ thì dùng.** IDE refactoring (Rename/Extract) an toàn hơn sửa tay; ArchUnit/import-linter
  chứng minh boundary còn nguyên sau khi dời.

## 1. Trùng lặp (duplicated code)
- **Dấu hiệu:** khối gần giống nhau ở nhiều method/class; sửa một chỗ phải nhớ sửa các chỗ kia; copy
  logic validate/format/map ở nhiều adapter.
- **Move:** Extract Method (trùng trong một class) → Pull Up / gom về **một nơi đúng tầng** (trùng
  giữa nhiều class): tiện ích kỹ thuật thuần → util/shared; quy tắc nghiệp vụ → domain (domain service
  / method trên aggregate), **KHÔNG** đẩy vào util. Quyết định nơi đặt: xem [design-patterns.md](design-patterns.md)
  mục "shared/dedup".
- **Rủi ro / giữ hành vi:** hai khối "giống" nhưng khác tinh vi (biên, null, thứ tự) — đọc kỹ trước
  khi gộp; gộp nhầm là đổi hành vi. Trùng lặp *tình cờ* (giống hiện tại nhưng lý do thay đổi khác
  nhau) thì ĐỪNG gộp — gộp tạo phụ thuộc giả. Sau gộp: chạy test của mọi call-site cũ.

## 2. Method/function quá dài
- **Dấu hiệu:** hàm vài chục–vài trăm dòng; nhiều đoạn có comment "// bước 1/2/3"; nhiều mức lồng.
- **Move:** Extract Method theo từng đoạn có tên rõ; Replace Temp with Query (biến tạm tính lại bằng
  hàm nhỏ) khi giúp đọc; tách nhánh lớn thành method riêng.
- **Rủi ro / giữ hành vi:** biến chia sẻ giữa các đoạn → truyền tham số/trả về rõ ràng, không dùng
  field ẩn để "lách". Cẩn thận `return`/`break`/exception giữa chừng khi tách. Java: chú ý biến
  mutable capture. Python: chú ý closure và biến vòng lặp.

## 3. Class quá lớn / God class
- **Dấu hiệu:** class ôm nhiều trách nhiệm (service vài trăm dòng làm cả validate + orchestrate +
  gọi DB + format); nhiều field chỉ dùng bởi một nhóm method; tên class chung chung (`Manager`,
  `Helper`, `Util` khổng lồ).
- **Move:** Extract Class theo cụm trách nhiệm/field; tách application service (điều phối) khỏi domain
  logic (đưa quy tắc về aggregate/domain service — xem ARD mục 2); tách phần I/O về adapter đúng tầng.
- **Rủi ro / giữ hành vi:** dời method có thể đổi thứ tự khởi tạo/side-effect; giữ nguyên chuỗi gọi.
  Đừng biến God class thành nhiều class rỗng nghĩa (anemic) — nhóm theo **trách nhiệm nghiệp vụ**,
  không theo tầng kỹ thuật một cách máy móc. Sau tách: DI wiring cập nhật ở bootstrap/composition root.

## 4. Điều kiện phức tạp
- **Dấu hiệu:** if-else/switch lồng sâu; điều kiện boolean dài khó đọc; switch theo type/enum lặp lại
  ở nhiều nơi (mỗi khi thêm loại phải sửa nhiều switch).
- **Move:** Guard clause (đảo điều kiện, return sớm) làm phẳng lồng nhau; Decompose Conditional (tách
  điều kiện + nhánh thành hàm có tên); Replace Conditional with Polymorphism khi switch-theo-type lặp
  lại (mỗi loại một class con / Strategy — chỉ khi thật sự lặp, xem [design-patterns.md](design-patterns.md)).
- **Rủi ro / giữ hành vi:** guard clause đổi luồng return — kiểm side-effect ở cuối hàm cũ có bị bỏ
  không; giữ đúng thứ tự đánh giá điều kiện có side-effect. Polymorphism là move LỚN → cân nhắc chi
  phí, HỎI trước khi áp (SKILL bước 4). Đừng thay một switch dùng-một-lần bằng cả cây class.

## 5. Tham số dài / kiểu dữ liệu sơ khai
- **Dấu hiệu:** method 5+ tham số; nhiều tham số luôn đi cùng nhau qua nhiều lời gọi; dùng
  `String`/`long` trần cho khái niệm nghiệp vụ (tiền, id, khoảng thời gian).
- **Move:** Introduce Parameter Object / Preserve Whole Object (gom nhóm tham số đi cùng thành một
  kiểu); Replace Primitive with Value Object (VO bất biến cho khái niệm nghiệp vụ — `Money`, `OrderId`;
  ARD mục 2).
- **Rủi ro / giữ hành vi:** VO nên **bất biến** và so sánh theo giá trị (Java `record`, Python
  `@dataclass(frozen=True)`); giữ nguyên semantics cũ (làm tròn tiền, timezone). Đừng bọc VO cho kiểu
  không mang bất biến nghiệp vụ nào (bọc thừa).

## 6. Magic value
- **Dấu hiệu:** số/chuỗi "trần" rải rác (`if status == 3`, `"ACTIVE"`, `86400`); cùng literal ở nhiều
  nơi.
- **Move:** Replace Magic Number/String with Named Constant / Enum; gom về nơi đúng tầng (hằng nghiệp
  vụ ở domain, hằng cấu hình hạ tầng ở tầng ngoài).
- **Rủi ro / giữ hành vi:** giữ nguyên GIÁ TRỊ và kiểu (đừng đổi `3` int thành enum mà quên nơi
  serialize sang DB/JSON đang dựa vào số). Kiểm mọi nơi đọc/ghi giá trị đó (persistence, contract).

## 7. Feature envy / đặt logic sai tầng
- **Dấu hiệu:** method dùng dữ liệu của class khác nhiều hơn của chính nó; application service "móc"
  field aggregate ra tính rồi set lại (nghiệp vụ rò ra ngoài lõi); mapper chứa quy tắc nghiệp vụ.
- **Move:** Move Method về nơi giữ dữ liệu (đưa quy tắc vào aggregate/domain service — mọi thay đổi
  bên trong aggregate qua Aggregate Root, ARD mục 2, 7); tách quy tắc khỏi mapper (mapper chỉ dịch
  kiểu).
- **Rủi ro / giữ hành vi:** dời logic vào domain phải giữ nguyên điều kiện/thứ tự; coi chừng vòng phụ
  thuộc mới. Đây cũng là move giúp bám Dependency Rule (lõi giữ nghiệp vụ, biên chỉ điều phối/dịch).

## 8. Đảo phụ thuộc qua port (giữ trong kiểu kiến trúc hiện tại)
- **Dấu hiệu:** class lõi (domain/application) gọi thẳng lớp hạ tầng cụ thể (repository JPA, HTTP
  client, `sqlalchemy`, `requests`); khó test vì phải bật DB/mạng.
- **Move:** Extract Interface tại ranh giới → khai **port** ở tầng trong, impl xuống tầng ngoài (Java
  `interface` + `@Repository`/`@Component`; Python `Protocol`/ABC + adapter); wiring ở composition root.
- **Rủi ro / giữ hành vi:** đây là đảo phụ thuộc **trong cùng kiểu kiến trúc** (làm sạch một ranh
  giới), KHÔNG phải đổi *kiểu* kiến trúc — nếu là tái tổ chức toàn bộ phân tầng thì DỪNG, route
  `backend-migrate-architecture`. Giữ nguyên chữ ký gọi để hành vi không đổi; chạy characterization
  test qua điểm vào.

## Chống nợ mới khi refactor
- Không thêm trừu tượng "phòng xa" chưa có nhu cầu thật (YAGNI) — trừu tượng chỉ khi gỡ phức tạp
  hiện tại hoặc khớp điểm mở rộng đã chứng minh.
- Không đổi format log/metric/contract công khai khi refactor (đó là hành vi quan sát được).
- Dọn code cũ còn sót của giai đoạn "cùng tồn tại" trước khi tuyên bố xong.
