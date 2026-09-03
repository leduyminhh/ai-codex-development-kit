# ARD — Kiến trúc hướng miền cho backend

> Architecture Reference Document — **khái niệm + cách chọn dùng chung cho mọi stack**. Gộp từ bộ tài liệu onboarding (chuẩn & bối cảnh, so sánh, cách chọn, checklist review, quy ước module, hệ nhiều service). Mục 1–4 và 7 là NGUYÊN TẮC chung không ràng buộc ngôn ngữ; mục 5–6 minh hoạ bằng Java (Maven module, ArchUnit, Feign) — bản Python diễn giải sang package/`Protocol`/`import-linter` trong file `python-*`.
>
> Chi tiết cấu trúc + code skeleton của từng kiến trúc nằm ở file template cạnh đây, **mỗi kiến trúc có 2 biến thể theo stack** (`java-*` cho Java/Spring, `python-*` cho Python/FastAPI) — ARD này **không lặp lại** phần đó:
>
> - **Onion + DDD** — vòng đồng tâm, repository interface ở domain. **Mặc định của kit** (domain nhiều quy tắc, ít kênh I/O). → [java-onion-ddd.template.md](java-onion-ddd.template.md) · [python-onion-ddd.template.md](python-onion-ddd.template.md)
> - **Hexagonal + DDD** — Ports & Adapters. Chọn khi có nhiều kênh vào/ra dùng chung một lõi. → [java-hexagonal-ddd.template.md](java-hexagonal-ddd.template.md) · [python-hexagonal-ddd.template.md](python-hexagonal-ddd.template.md)
> - **Hexagonal/Clean + CQRS** — tách luồng ghi/đọc. → [java-hexagonal-clean-cqrs.template.md](java-hexagonal-clean-cqrs.template.md) · [python-hexagonal-clean-cqrs.template.md](python-hexagonal-clean-cqrs.template.md)

## 1. Quy tắc nền — Dependency Rule

Tất cả xoay quanh một quy tắc: **mã nguồn phụ thuộc chỉ được trỏ *vào trong*, hướng về nghiệp vụ**. Tầng trong không bao giờ biết gì về tầng ngoài.

Cụ thể trong Java:

- Package `domain` **không được** `import org.springframework.*`, `jakarta.persistence.*`, hay JDBC.
- Nếu domain cần lưu dữ liệu, nó **khai báo một interface** và để tầng ngoài hiện thực (Dependency Inversion).
- Trong cấu trúc multi-module, quy tắc này do **trình biên dịch ép**: pom của `domain`/`application` không khai báo dependency Spring, vi phạm là lỗi compile.

> **Quy tắc vàng:** Đổi database, đổi giao thức, đổi framework — không được chạm vào một dòng logic nghiệp vụ nào. Đó là thước đo duy nhất để biết bạn có làm đúng hay không.

## 2. Bốn khối kiến thức

### Onion Architecture — Palermo, 2008

Hệ thống là các vòng đồng tâm, **Domain Model làm lõi tuyệt đối**; phụ thuộc luôn hướng vào tâm:

```
Infrastructure / UI → Application Services → Domain Services → Domain Model
```

Nét đặc trưng: tách rõ **Domain Services** (nghiệp vụ thuần) khỏi **Application Services** (điều phối, transaction); interface repository/gateway **khai báo ở vòng trong**, hiện thực ở Infrastructure ngoài cùng.

### Clean Architecture — Martin, 2012

Tổng quát hoá Onion, Hexagonal thành các vòng: **Entities** (quy tắc nghiệp vụ cốt lõi) → **Use Cases** (luồng nghiệp vụ của ứng dụng) → **Interface Adapters** (controller, presenter, gateway) → **Frameworks & Drivers**. Điểm mạnh: tầng use case rõ ràng, có tên riêng — dễ làm khuôn mẫu chung cho cả team.

### Hexagonal (Ports & Adapters) — Cockburn, ~2005

Ứng dụng ở giữa; quanh nó là các **port** (interface), mỗi port có một hay nhiều **adapter** cắm vào:

- **Driving / primary port** — thế giới gọi *vào* lõi: REST, CLI, message consumer, scheduler.
- **Driven / secondary port** — lõi gọi *ra*: database, email, payment, service khác.

Mạnh nhất khi nhiều kênh vào/ra cùng dùng một lõi: thêm kênh mới chỉ là thêm adapter.

### DDD — tactical patterns (ghép vào cả ba kiến trúc)

DDD không phải kiến trúc phân tầng — nó là cách *mô hình hoá lõi*:

| Pattern | Vai trò |
|---------|---------|
| **Aggregate Root** | Cụm đối tượng xử lý như một khối; root là cửa ngõ duy nhất, bảo vệ invariant. Sửa entity con phải qua root. |
| **Entity** | Có định danh và vòng đời (Order, Customer). |
| **Value Object** | Bất biến, so sánh theo giá trị (Money, OrderId) — dùng `record`. |
| **Domain Event** | Điều nghiệp vụ *đã xảy ra*; đồng bộ giữa các aggregate qua event. |
| **Domain Service** | Logic liên nhiều đối tượng, không thuộc riêng aggregate nào. |
| **Repository** | Theo aggregate — một repository cho một aggregate root. |
| **Factory / Specification** | Dựng aggregate phức tạp / đóng gói điều kiện nghiệp vụ tái sử dụng. |
| **Bounded Context** | Ranh giới nơi một mô hình & Ubiquitous Language có hiệu lực. Mỗi context là một module/service. |

> **Nguyên tắc aggregate:** Một transaction chỉ sửa **một** aggregate; tham chiếu aggregate khác **bằng định danh** (VO id), không giữ con trỏ trực tiếp. Phần còn lại đồng bộ qua domain event. (Code mẫu aggregate: xem file template.)

### TDD — cách xây, không phải cách xếp

Vòng lặp **Red → Green → Refactor**. Ăn khớp tự nhiên với ba kiến trúc vì lõi đã tách khỏi hạ tầng — test nghiệp vụ **không cần bật Spring/DB**:

| Tầng | Loại test | Công cụ | Đặc điểm |
|------|-----------|---------|----------|
| Domain / Use case | Unit test thuần | JUnit 5 + Mockito (mock port) | Nhanh, nhiều, chạy mỗi lần lưu file |
| Adapter | Integration test | JPA với H2/Testcontainers, MockMvc | Ít hơn, chậm hơn |
| Contract giữa service | Consumer-driven contract test | Spring Cloud Contract | Rất ít, chạy ở CI |

Kim tự tháp test: nhiều unit ở lõi, ít integration ở adapter, rất ít end-to-end. Kiến trúc hướng miền làm đáy kim tự tháp rộng ra.

## 3. So sánh chi tiết

| Tiêu chí | Onion | Clean | Hexagonal |
|----------|-------|-------|-----------|
| Hình ẩn dụ | Củ hành đồng tâm | Vòng tròn đồng tâm | Lục giác + cổng |
| Tác giả / năm | Palermo · 2008 | Martin · 2012 | Cockburn · ~2005 |
| Trọng tâm | Domain model làm lõi tuyệt đối | Tầng use case rõ ràng | Cô lập lõi khỏi mọi I/O |
| Khái niệm đặc trưng | Domain vs Application Service | Entities / Use Cases / Adapters | Port & Adapter, driving/driven |
| Vị trí interface hạ tầng | Khai báo ở vòng trong (domain) | Ở ranh giới use case | Là driven port (outbound) |
| Số kênh vào/ra | Không nhấn mạnh | Vừa phải | Nhấn mạnh — nhiều adapter |
| Mạnh nhất khi | Domain phức tạp, nhiều quy tắc | Cần khung tổng quát có tầng | Nhiều REST/queue/cron/CLI cùng lõi |
| Rủi ro dễ mắc | Lẫn Domain vs Application Service | Tầng adapter phình to | Bùng nổ số port/adapter nhỏ |

**Điểm chung:** Dependency Rule · đảo ngược phụ thuộc · domain không biết hạ tầng · lõi test được không cần DB.

Cùng một class, ba tên gọi:

| | Onion | Clean | Hexagonal |
|---|-------|-------|-----------|
| Class điều phối | Application Service | Use Case / Interactor | Application Service implements driving port |
| Interface lưu trữ | `OrderRepository` (ở domain) | Gateway ở ranh giới use case | `SaveOrderPort` (driven port ở application) |
| Controller | UI vòng ngoài | Interface Adapter | Driving adapter |
| JPA implementation | Infrastructure | Frameworks & Drivers | Driven adapter |

> **Sự thật cần nhớ:** Ba cái này *không loại trừ nhau* — Clean tổng quát hoá hai cái kia. Thực tế người ta lấy port/adapter của Hexagonal đặt ranh giới, tổ chức lõi theo tactical pattern DDD, gọi tên tầng theo Clean. Đừng tranh cãi "cái nào đúng".

## 4. Chọn kiến trúc nào

| Đặc điểm dự án | Lựa chọn | Template |
|----------------|----------|----------|
| App CRUD nhỏ, đội ít người, tải nhẹ | **Layered thường** — mọi thứ khác là over-engineer | (không cần) |
| Domain nhiều quy tắc, ít kênh I/O | **Onion + DDD** | `<stack>-onion-ddd` |
| Nhiều đầu vào/ra cùng một lõi | **Hexagonal + DDD** | `<stack>-hexagonal-ddd` |
| Muốn khuôn mẫu tổng quát cả team theo | **Clean** với tầng use case đặt tên rõ | `<stack>-hexagonal-ddd` (đổi tên tầng) |
| Đọc/ghi lệch nặng, read model khác hẳn write model | Thêm **CQRS** lên Hexagonal/Clean | `<stack>-hexagonal-clean-cqrs` |

> Cột Template: `<stack>` = `java` hoặc `python` theo stack đã chọn ở bước 0b của backend-init.
| Cần audit/replay trạng thái đầy đủ | **Event Sourcing** — nặng đô, chỉ khi thật cần | (chưa có) |

**Tín hiệu nâng cấp** (bắt đầu đơn giản nhất, nâng khi có tín hiệu thật):

- *Domain phình* — service vài trăm dòng toàn if/else nghiệp vụ, quy tắc trùng lặp rải rác → tách domain model (Onion/Hexagonal + DDD).
- *Nhiều kênh I/O* — thêm queue consumer, cron, CLI dùng chung logic → port/adapter.
- *Đọc/ghi lệch* — trang danh sách join 5 bảng trong khi luồng ghi đụng 1 aggregate → CQRS. Ngược lại: đọc/ghi cùng shape, tải nhẹ → CQRS là thừa.
- *Cần audit đầy đủ* — replay "ai đổi gì lúc nào" → Event Sourcing.

> **Cảnh báo — cái bẫy phổ biến nhất:** chọn kiến trúc phức tạp hơn nhu cầu. Kiến trúc là để **phù hợp**, không phải để "đúng".

**Quy trình chọn (cho lead):** liệt kê số quy tắc nghiệp vụ / số kênh I/O / tỉ lệ đọc-ghi / yêu cầu audit → đối chiếu bảng, chọn mức đơn giản nhất thoả mãn → ghi ADR kèm tín hiệu nâng cấp → scaffold từ template tương ứng.

## 5. Quy ước module chung (cả ba template)

Chia module Maven để **trình biên dịch ép ranh giới**:

| Module | Vai trò | Được phụ thuộc gì |
|--------|---------|-------------------|
| `:domain` | Lõi POJO thuần — aggregate, VO, domain event, domain service | Không gì cả (JUnit/Mockito chỉ scope test) |
| `:application` | Điều phối use case, khai báo port | `:domain` |
| `:infrastructure` | Adapter RA/driven: JPA, HTTP client, messaging. Web controller (inbound) ở đây với **Onion**; **Hexagonal (Java) tách sang `:web-api`** — xem lưu ý dưới bảng | `:application`, `:domain`, `:api-contract`, Spring |
| `:api-contract` | DTO + khai báo endpoint mà service khác dùng để gọi. **Chỉ hợp đồng, không logic, không domain** | (độc lập, nhẹ) |
| `:bootstrap` | `main()`, `@SpringBootApplication`, cấu hình, lắp ráp bean. **Module duy nhất "thấy" tất cả** | Tất cả |

Vì sao tách:

- **`:bootstrap`** giữ Spring và cấu hình ra khỏi lõi; toàn bộ wiring bean một chỗ (`BeanConfig`, constructor injection).
- **`:api-contract`** là hợp đồng chia sẻ được — service khác phụ thuộc nó để gọi bạn, **không service nào phụ thuộc aggregate nội bộ của bạn**; đổi domain thoải mái, giữ contract ổn định.

> **Inbound web — Onion vs Hexagonal (nguồn sự thật: "Cây thư mục" của template).** Bảng trên là
> baseline 5 module. **Onion + DDD** giữ web controller trong `:infrastructure` (`infrastructure/in/web`).
> **Hexagonal + DDD** và **Hexagonal/Clean + CQRS** (bản Java) **tách adapter web VÀO (driving) ra module
> riêng `:web-api`** (thư mục `<bc>-web-api`, package `webapi`) → 6 module; khi đó `:infrastructure` chỉ
> còn adapter RA (driven), **KHÔNG** chứa controller và **KHÔNG** giữ `spring-boot-starter-web` cho inbound
> (Maven ép inbound↮outbound). Bản Python mọi kiến trúc giữ inbound trong `infrastructure/inbound/web`.
> Khi scaffold/sinh example, đặt file theo cây thư mục của template `<stack>-<kiểu>` đã chọn, **không**
> theo mỗi bảng tổng quan này.

Quy ước kỹ thuật: Java 17 · Spring Boot 3.3.x · parent pom import BOM `spring-boot-dependencies` · chạy `mvn test` ở gốc, `mvn spring-boot:run -pl bootstrap` (H2 in-memory) · unit test domain/application không cần Spring context.

**Quy ước folder outbound persistence (Java):** adapter persistence chia **4 folder chuẩn** —
`persistence/adapter/` (adapter class hiện thực port/repository), `persistence/entity/` (JPA entity
RIÊNG khỏi aggregate), `persistence/mapper/` (MapStruct), `persistence/repository/` (Spring Data JPA).
Adapter KHÔNG đặt trực tiếp dưới `persistence/`. (CQRS: `write/{adapter,entity,mapper,repository}`;
`read/adapter/` chỉ SQL thuần.)

**Quy tắc mapper (Java):** mỗi khi một adapter cần map giữa hai model, **TẠO folder `mapper/` cạnh
adapter đó** + một **interface MapStruct RIÊNG** (`@Mapper(componentModel = "spring")`) — KHÔNG map
tay inline trong adapter, KHÔNG gom mapper dùng chung (ngoại lệ: ACL map tay để dịch ngữ nghĩa). Bản
Python cùng kiến trúc: mapper là **module hàm thuần** (không MapStruct) — xem file `python-*`.

## 6. Hệ nhiều service — contract · shared · ACL

```
acme-platform/
  ordering-api-contract/ # contract của Ordering: DTO + endpoint. KHÔNG logic/domain.
  billing-api-contract/  # contract của Billing
  ordering-service/      # domain đầy đủ; phụ thuộc billing-api-contract để GỌI billing
  billing-service/       # domain đầy đủ; publish billing-api-contract
  common-web/            # (tuỳ chọn, nhỏ) error handling, tracing — thuần kỹ thuật
  common-core/           # (tuỳ chọn, nhỏ) base type kỹ thuật — KHÔNG nghiệp vụ
```

Chiều phụ thuộc: `ordering-service → billing-api-contract`, **không bao giờ** `ordering-service → billing-service`.

**HTTP client luôn ở vòng ngoài cùng** (infrastructure/adapter), hiện thực một port do lõi khai báo. Adapter đó là **Anti-Corruption Layer**: dịch DTO của contract sang value object của domain, để DTO service khác không rò vào lõi. (Code mẫu: mục "ACL adapter" trong [java-hexagonal-ddd.template.md](java-hexagonal-ddd.template.md) / [python-hexagonal-ddd.template.md](python-hexagonal-ddd.template.md).) Lợi ích: service kia đổi schema chỉ sửa adapter; test use case mock port không cần service kia chạy; chuẩn hoá kiểu dữ liệu "lạ" một chỗ duy nhất.

> **Cái bẫy lớn nhất:** đừng gộp DTO contract, HTTP client và domain vào một "shared jar" cho tiện — nối chặt các service, phá vỡ Bounded Context. Triệu chứng: nâng version shared jar buộc mọi service redeploy cùng lúc; class trong shared jar mang tên nghiệp vụ (Order, Invoice); đổi quy tắc của service A phải sửa code ngoài module của A.

Phép thử nhanh khi phân vân đặt class ở đâu:

| Câu hỏi | Đặt ở |
|---------|-------|
| Là *ngôn ngữ giao tiếp giữa hai service*? | `<bc>-api-contract` |
| Là *tiện ích kỹ thuật không mang nghiệp vụ*? | `shared` / `common-*` |
| *Biết về quy tắc nghiệp vụ của một context*? | Ở lại trong service đó — **không bao giờ ra ngoài** |

*Lưu ý Feign:* Spring Cloud OpenFeign đang ở chế độ bảo trì; Spring khuyến nghị HTTP Interface Clients (`@HttpExchange`). Cách tổ chức như nhau — chỉ đổi cách khai báo interface client. Khi hai service tích hợp, thêm consumer-driven contract test (Spring Cloud Contract) ở CI.

### 6.1 Publish & versioning contract (chia sẻ liên-repo)

Module `<bc>-api-contract` ở sơ đồ trên (vd `billing-api-contract`) chính là tầng `api-contract` của service — cùng một thứ với đơn-service. Ở đa-repo, nó phải là **artifact đã publish** để service khác `dependency`:

- **Toạ độ:** `com.acme.<bc>:<bc>-api-contract:<version>` (vd `com.acme.billing:billing-api-contract:1.3.0`). Một artifact cho một Bounded Context; KHÔNG gộp nhiều BC vào một jar.
- **Publish:** `mvn deploy` module `<bc>-api-contract` lên registry nội bộ (Nexus/Artifactory/GitLab Package Registry) từ CI của **service provider** — provider là nguồn duy nhất phát hành contract của chính nó.
- **Versioning = semver theo góc nhìn consumer:** thêm field optional / endpoint mới = **MINOR**; đổi/bỏ field, đổi nghĩa, siết validation = **MAJOR**. Provider giữ tương thích ngược trong cùng MAJOR; breaking thì bump MAJOR và chạy song song bản cũ tới khi consumer chuyển xong.
- **Consumer khai version một chỗ:** `<dependencyManagement>` (hoặc BOM contract) ở parent pom để mọi module dùng cùng version. `SNAPSHOT` chỉ khi tích hợp nội bộ chưa chốt; release phải version cố định.

### 6.2 Service khác implement thế nào (consumer — tái dùng `@HttpExchange`)

Provider publish `<bc>-api-contract` gồm **DTO + interface `<Bc>Api` (`@HttpExchange`)**. Consumer (vd `ordering` gọi `billing`):

1. **Chỉ module `ordering-infrastructure`** khai `dependency` `com.acme.billing:billing-api-contract` — Maven ép `domain`/`application` KHÔNG thấy contract của billing.
2. Khai **driven port riêng** ở `ordering-application/port/out` bằng ngôn ngữ domain của ordering (`CustomerCreditPort`, trả VO của ordering) — KHÔNG dùng thẳng `BillingApi` ở lõi.
3. Ở `ordering-infrastructure/out/billing/`: đăng ký **proxy bean tái dùng interface contract** (Spring Boot 3.x `HttpServiceProxyFactory` + `RestClient`, base-url từ config); `BillingCreditAdapter implements CustomerCreditPort` = **ACL** gọi `BillingApi` rồi **map tay** DTO billing → VO ordering. DTO billing **không rời** adapter này.
4. Wiring bean ở `bootstrap`. Đổi provider/giao thức chỉ đụng adapter; lõi bất động. (Code shape đầy đủ: recipe `backend-share-contract`.)

> ArchUnit của consumer nên thêm rule: `..domain..`/`..application..` **KHÔNG** phụ thuộc `com.acme.<provider>..` — chỉ `infrastructure.out.<provider>` được import contract của service khác.

### 6.3 Cross-cutting cho client nội bộ

- **Config:** base-url + timeout đọc từ Consul/env (KHÔNG hardcode), một client một base-url.
- **Propagate:** token (JWT service-to-service) + trace header (traceId/B3) qua interceptor của `RestClient`/Feign — không đứt chuỗi trace/authz.
- **Chịu lỗi:** timeout + retry idempotent + circuit-breaker (Resilience4j) ở tầng adapter, KHÔNG ở lõi; lỗi HTTP map sang exception domain trong ACL.
- **Contract test:** consumer-driven contract (Spring Cloud Contract) ở CI cả hai bên để bắt breaking change trước deploy.

## 7. Checklist review PR

Dán vào mô tả review. **Một mục fail nghĩa là ranh giới kiến trúc đang bị rò.**

**Ranh giới & phụ thuộc**

- [ ] Package `domain` có `import org.springframework.*`, `jakarta.persistence.*`, hay JDBC? → phải là **không**.
- [ ] Mũi tên phụ thuộc luôn hướng vào trong — không vòng trong nào biết tên class ở vòng ngoài?
- [ ] Repository/gateway là **interface** ở tầng trong, hiện thực (`@Repository`/`@Component`) ở tầng ngoài?
- [ ] Đổi một adapter (DB, mail, HTTP client) có buộc sửa file trong `domain` không? → phải là **không**.

**DDD**

- [ ] Mọi thay đổi bên trong aggregate đi qua **Aggregate Root**; không sửa entity con từ ngoài?
- [ ] Tham chiếu aggregate khác bằng **định danh** (VO id), không giữ con trỏ trực tiếp?
- [ ] Một transaction chỉ sửa **một aggregate**; đồng bộ phần còn lại qua domain event?
- [ ] Entity tự bảo vệ trạng thái hợp lệ (không setter công khai tuỳ tiện)?
- [ ] Đặt tên theo **Ubiquitous Language**, không theo thuật ngữ kỹ thuật?

**Application & DI**

- [ ] Use case/service nhận phụ thuộc qua **constructor injection** (không `@Autowired` field, không tự `new` class hạ tầng)?
- [ ] Application service chỉ điều phối, **không chứa quy tắc nghiệp vụ**?
- [ ] DTO của web/contract không rò vào domain (adapter chịu trách nhiệm map)?

**Test (TDD)**

- [ ] Có unit test cho use case chạy được **không cần Spring context / DB**?
- [ ] Adapter có integration test riêng (JPA/web)?
- [ ] Contract giữa service có test (consumer-driven) khi có tích hợp?

**Cách dùng hiệu quả:** reviewer duyệt mục "Ranh giới & phụ thuộc" trước (rò ranh giới là lỗi đắt nhất — xem import của `domain/` ngay đầu diff); tác giả PR tự tick trước khi mở, mục không áp dụng ghi "N/A + lý do". Mục import cấm nên tự động hoá bằng ArchUnit hoặc multi-module (trình biên dịch tự chặn); checklist chỉ giữ những gì máy không bắt được:

```java
@AnalyzeClasses(packages = "com.acme.ordering")
class DependencyRuleTest {
    @ArchTest
    static final ArchRule domainKhongPhuThuocHaTang =
        noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat()
            .resideInAnyPackage("org.springframework..", "jakarta.persistence..", "java.sql..");
}
```

## 8. Sinh example minh hoạ khi init (backend-init)

Khi `backend-init` đã chốt kiến trúc (bước 0c) và scaffold cây `src/` theo template `<stack>-<kiểu>`,
init **SINH một example tối giản BIÊN DỊCH/CHẠY ĐƯỢC** minh hoạ đúng structure đã chốt. **KHÔNG có
"example template" lưu sẵn để copy** — Claude ĐỌC blueprint (chính file template `<stack>-<kiểu>`) và
tự sinh theo domain THẬT của dự án. Blueprint là nguồn chỉ dẫn: **annotation cạnh mỗi package/file
trong "Cây thư mục" nói rõ vai trò** (AGGREGATE ROOT, VALUE OBJECT, driving/driven port, adapter,
mapper, controller…) — mỗi folder AI đọc-hiểu và điền đúng loại file cho use case đang sinh.

Hợp đồng sinh (mọi stack + mọi kiến trúc):

- **Một use case duy nhất, xuyên suốt mọi tầng** của kiến trúc đã chọn: inbound adapter (controller/route —
  đặt ĐÚNG module theo cây template: Java Hexagonal ở module `<bc>-web-api` package `webapi`, **KHÔNG**
  `infrastructure/in/web`) → mapper biên (cạnh controller) đổi **kiểu-ở-biên → command** → use case/service
  (application, gọi qua driving port `port/in`) → aggregate + quy tắc (domain) → driven port + adapter
  (persistence, kèm mapper aggregate↔entity) → wiring (bootstrap/DI). CQRS: nhánh **Command** như trên (ghi
  qua aggregate, trả id); nhánh **Query** bỏ qua aggregate, **trả read model (`*View`) trực tiếp** — KHÔNG
  qua command, KHÔNG mapper command.
- **Domain THẬT của dự án** — KHÔNG dùng `billing`/`Invoice` của blueprint (đó chỉ là minh hoạ cấu
  trúc). Nếu domain chưa rõ lúc init: hỏi nhanh MỘT aggregate + MỘT use case tiêu biểu rồi sinh theo đó.
- **Một file tối thiểu cho mỗi folder mà use case đi qua**, đúng vai trò annotation của folder đó trong
  cây template — không bỏ tầng, không gộp tầng.
- **Kiểu ở biên sinh ĐÚNG tên theo template — KHÔNG mặc định gọi "DTO":** dùng danh xưng của template đã
  chọn. Java web: request là `*Request` (RIÊNG của web-api); **response TÁI DÙNG `*Response`/`*View` của
  `:api-contract`** (xem bullet `:api-contract` — KHÔNG khai `*Response` riêng ở web-api). CQRS:
  request/command cho nhánh ghi + **`*View` (read model)** của `:api-contract` cho nhánh đọc. Python: Pydantic
  trong `schemas.py`. Request kênh web và response-contract là hai vai trò KHÁC nhau — nhưng response chỉ có
  MỘT nơi khai (`:api-contract`), không nhân bản sang web.
- **Mapper ở mỗi ranh giới model (theo "Quy tắc mapper" mục 5):** mỗi adapter đổi model sinh mapper RIÊNG
  cạnh adapter — **Java: MapStruct** (`*DtoMapper` biên↔command ở `<bc>-web-api`; `*EntityMapper`
  aggregate↔entity ở `persistence/mapper/`); **Python: module hàm thuần** (`web/mapper.py`,
  `persistence/mapper.py`). KHÔNG map tay inline (ngoại lệ: ACL). Nhánh Query CQRS trả read model trực tiếp →
  KHÔNG mapper command.
- **`:api-contract` — mặt published, nằm trên nhánh response (Java Hexagonal/CQRS/Onion):** example sinh phần
  contract tối thiểu cho đúng use case — endpoint declaration (`*Api` `@HttpExchange`, mặt published cho
  service khác gọi — dùng thật khi tích hợp qua recipe `backend-share-contract`) + **response DTO
  published** (`*Response`/`*View`, được web tái dùng ngay trong slice) ở module `:api-contract`. Adapter web **TÁI DÙNG** response DTO của
  `:api-contract` (**KHÔNG** khai lại `*Response`/`*View` trùng tên trong web-api); mapper biên map domain →
  response DTO đó (nhánh Query CQRS: read repository trả thẳng `*View` của api-contract). Chỉ khai DTO response
  RIÊNG ở web khi kênh web thật sự khác shape với contract liên-service. Vậy vertical slice chạm `:api-contract`
  ở nhánh response, KHÔNG để module contract rỗng.
- **Tối giản, không phình:** một aggregate, một–hai value object, một use case, một driven port + một
  adapter. KHÔNG sinh nhiều feature — feature nghiệp vụ thật do `backend-implement` viết.
- **Giữ ranh giới:** đúng Dependency Rule + quy ước đặt tên của template; `domain`/`application` thuần
  POJO; qua được block ép ranh giới mà template khai (ArchUnit ở Java / import-linter ở Python) và một
  unit test lõi mock port (không cần DB/Spring).
- **Đánh dấu rõ là EXAMPLE** (comment đầu file hoặc tên module ví dụ) để dễ thay bằng nghiệp vụ thật.

Đây là bản minh hoạ *structure*, KHÔNG phải nghiệp vụ thật của dự án — bổ sung/thay ở giai đoạn implement.

---

*Nguồn: Onion (J. Palermo) · Clean (R. C. Martin) · Hexagonal / Ports & Adapters (A. Cockburn) · DDD (E. Evans). Bản HTML trình bày: [architecture-guide.html](architecture-guide.html).*
