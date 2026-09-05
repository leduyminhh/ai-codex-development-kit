# Idiom test theo stack — Java/Spring và Python

Tài liệu tham chiếu cho `backend-testing`, bước 2. Chỉ nêu **idiom + cách đặt test đúng tầng**;
chiến lược chung ở [test-strategy.md](test-strategy.md). Luôn theo `code-convention` + test runner
THẬT của project (bước 0), không áp mặc định của tài liệu này khi repo đã có quy ước khác.

## Bảng đối chiếu nhanh

| Nhu cầu | Java/Spring | Python |
|---|---|---|
| Test runner | JUnit 5 (surefire = unit, failsafe = `*IT`) | pytest |
| Assertion | AssertJ (`assertThat`) | `assert` + pytest |
| Mock/fake cộng tác | Mockito (`mock`, `when`, `verify`) | `unittest.mock` / `monkeypatch` / fake thủ công |
| Driven port để mock | `interface` | `Protocol` / abstract base |
| DB/broker thật | Testcontainers (JUnit 5 ext) | `testcontainers-python` / fixture |
| Web slice controller | `@WebMvcTest` + MockMvc | `TestClient` (FastAPI) / test client Flask |
| Kiểm chiều phụ thuộc | ArchUnit (test) | import-linter (`lint-imports`) |
| Đo phủ | JaCoCo | `coverage.py` / `pytest-cov` |

## Java / Spring

### Unit lõi (domain + application) — KHÔNG bật Spring/DB
- Test POJO thuần bằng JUnit 5 + AssertJ; **không** `@SpringBootTest`, không context.
- **Mock driven port qua interface** bằng Mockito: `when(...).thenReturn(...)` dựng đầu vào,
  `verify(...)` khẳng định lõi gọi ra đúng. Với port đơn giản, ưu tiên **fake thủ công** (một
  class hiện thực interface, lưu vào `Map`) — đọc dễ hơn, ít giòn hơn chuỗi mock dài.
- Test invariant aggregate + domain service như hàm thuần: input → trạng thái/ngoại lệ mong đợi.
- KHÔNG mock aggregate/VO; dựng thật. KHÔNG mock class đang test.

### Integration adapter persistence — Testcontainers
- Dựng DB thật bằng Testcontainers (ví dụ `PostgreSQLContainer`), trỏ datasource vào container;
  test mapping entity↔aggregate, query, transaction/rollback, ràng buộc unique/khóa.
- Đặt tên `*IT` để failsafe chạy ở `mvn verify` (tách khỏi unit ở `mvn test`).
- Mỗi test tự dựng + dọn dữ liệu (rollback theo transaction test, hoặc truncate sau test); không
  dựa dữ liệu sẵn có. Dùng DB in-memory (H2) chỉ khi đủ đại diện cho DB thật (cẩn trọng khác biệt
  dialect/kiểu dữ liệu).

### Web slice controller
- `@WebMvcTest(XxxController.class)` chỉ nạp tầng web; **mock use-case/application service** bên
  dưới (`@MockBean`). Dùng MockMvc test: status code, body JSON, validation lỗi, ánh xạ exception
  → mã lỗi. Không kéo cả stack chỉ để test một controller.

### Kiểm chiều phụ thuộc (khi cần chốt kiến trúc thành hình)
- ArchUnit trong test suite: domain không phụ thuộc infrastructure/framework; adapter chỉ phụ
  thuộc port. Đây là gate ranh giới, không thay cho test hành vi.

## Python

### Unit lõi (domain + application) — KHÔNG bật framework/DB
- pytest hàm thuần; `assert` trực tiếp. Không khởi động app/DB cho test lõi.
- **Mock driven port qua `Protocol`/abstract base**: fake thủ công (class hiện thực Protocol, lưu
  vào `dict`) cho port đơn giản; `unittest.mock.Mock`/`MagicMock` khi cần khẳng định lệnh gọi;
  `monkeypatch` để thay phụ thuộc ở ranh giới. Không patch chính hàm/đối tượng đang test.
- Cố định nguồn bất định: tiêm clock, `freeze` thời gian, seed random để test tái lập.

### Integration adapter — DB/broker thật
- `testcontainers-python` (hoặc fixture dựng DB dùng-một-lần) cho repository/persistence; test
  mapping, query, transaction. Đánh dấu chậm bằng marker (ví dụ `@pytest.mark.slow`) để tách khỏi
  vòng unit nhanh.
- Mỗi test tự dựng dữ liệu qua fixture và dọn sau (transaction rollback / truncate); dùng
  factory/fixture để dữ liệu rõ ràng, khóa/`id` duy nhất tránh trùng giữa lần chạy.

### Web slice controller
- FastAPI: `TestClient` + **override dependency** (`app.dependency_overrides`) để thay use-case
  bằng fake/mock; test status, JSON, validation (422), ánh xạ lỗi. Flask: test client tương ứng.

### Kiểm chiều phụ thuộc
- import-linter (`lint-imports`) với contract theo kiểu kiến trúc: cấm domain/application import
  tầng ngoài. Gate ranh giới, chạy cùng lint.

## Fixture / factory (cả hai stack)
- Ưu tiên **factory/builder** dựng đối tượng test rõ ràng, lộ đúng tiền điều kiện quan trọng,
  giấu phần không liên quan bằng mặc định hợp lý — thay vì literal lặp lại khắp nơi.
- Tái dùng fixture/helper/base class **đã có** trong repo trước khi tạo mới (bước 0 đã đọc test
  hiện có). Fixture phải deterministic: không đọc thời gian thực/mạng, không phụ thuộc test khác.
