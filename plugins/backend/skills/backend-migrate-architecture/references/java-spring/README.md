# Kiểm ranh giới kiến trúc bằng ArchUnit (Java/Spring)

Thêm dependency test (Maven):

```xml
<dependency>
  <groupId>com.tngtech.archunit</groupId>
  <artifactId>archunit-junit5</artifactId>
  <version>1.3.0</version>
  <scope>test</scope>
</dependency>
```

Gradle: `testImplementation 'com.tngtech.archunit:archunit-junit5:1.3.0'`.

Copy file mẫu tương ứng kiểu đích vào `src/test/java/<base>/architecture/`, đổi
`com.example` thành base package thật của project, rồi chạy trong test suite (`mvn verify` /
`./gradlew test`). Test này là CỔNG G4 (bước 8) và ở lại repo làm gate thường trực.

- Onion+DDD → `OnionArchitectureTest.java`
- Hexagonal+DDD → `HexagonalArchitectureTest.java`
- Hexagonal/Clean+CQRS → `CqrsArchitectureTest.java`

Điều chỉnh tên package (`..domain..`, `..application..`, `..infrastructure..`) cho khớp
`architecture/java-<kiểu>.template.md` của project.

Mapper dùng MapStruct (`org.mapstruct:mapstruct` + annotation processor `mapstruct-processor`),
interface `@Mapper(componentModel = "spring")` đặt cạnh adapter trong `infrastructure` (không ở
domain/application). Rule `mapperChiONgoai` trong mỗi file mẫu chặn mapper lọt ra ngoài
`infrastructure`.
