# SonarQube — thu thập, phân loại, và quyết định sửa

Mục tiêu của bước Sonar: rút một danh sách findings chất lượng/bảo mật **có vị trí file:line** để gộp cùng
Black Duck rồi triage. Có **hai cách thu thập, KHÔNG dùng web API**.

## Cách thu thập

### (a) Chạy `sonar-scanner` tại chỗ

Điều kiện: có `sonar-project.properties` (hoặc cấu hình tương đương trong `pom.xml`/`build.gradle`/CI) và
token cấp qua **biến môi trường**. Skill chỉ nêu **tên biến**, KHÔNG đọc/in giá trị:

- `SONAR_HOST_URL` — URL server SonarQube/SonarCloud.
- `SONAR_TOKEN` — token phân tích (analysis token).

Chạy scanner đúng theo stack (thường là lệnh `sonar-scanner`, hoặc goal `mvn sonar:sonar` /
`gradle sonar`). Sau khi phân tích xong, kết quả nằm trên server; để lấy findings về **không qua web API**,
ưu tiên **xuất report ra file** (xem (b)) hoặc đọc **quality gate status** mà scanner in ra cuối run.
Thiếu `sonar-project.properties` hoặc thiếu token → **không đoán mò**: nói rõ và chuyển sang (b) nếu có
report, hoặc đề nghị người bổ sung cấu hình/biến môi trường.

### (b) Đọc report đã xuất sẵn

Khi project (hoặc CI) đã xuất findings ra file, đọc trực tiếp — đây là đường an toàn nhất, không cần token:

- **Issues JSON** (kết xuất từ Sonar) — danh sách issue kèm rule, type, severity, `component`, `line`.
- **SARIF** (`*.sarif`) — chuẩn chung; đọc `runs[].results[]` (ruleId, level, `locations[].physicalLocation`).
- **Quality gate status** — JSON/log nêu `status` (`OK`/`ERROR`) + các điều kiện không đạt (coverage,
  duplication, new issues...).

Dò các đường thường gặp: thư mục `.scannerwork/`, output CI, hoặc file report người dùng chỉ định. Không
thấy → hỏi đường dẫn, đừng bịa findings.

## Phân loại finding

Với mỗi finding, rút các trường sau để triage nhất quán:

- **Type:** `Bug` · `Vulnerability` · `Code Smell` · `Security Hotspot`.
- **Severity:** `Blocker` · `Critical` · `Major` · `Minor` · `Info`.
- **Rule:** ruleId (vd `java:S2095`) — dùng để hiểu ý lỗi và cách sửa chuẩn.
- **Vị trí:** map `component` (path) + `line` → **`file:line`** trong repo. Với SARIF là
  `physicalLocation.artifactLocation.uri` + `region.startLine`.

Ngoài issue-level, ghi lại **quality gate status** và các chỉ số cổng nếu report có: **coverage**,
**duplication**, **new issues / new coverage** trên nhánh mới. Những chỉ số này quyết cổng đạt/không đạt,
nên đưa vào report dù không phải "lỗi" sửa được bằng một diff.

## Tự sửa an toàn vs cần người review

| Nhóm | Ví dụ | Hành động |
|------|-------|-----------|
| **Tự sửa an toàn** | Code smell rõ (unused import/var, dead code), đặt tên vi phạm convention, format, bug đơn giản không đổi hành vi quan sát được (thiếu `close()` tài nguyên có pattern chuẩn, so sánh sai kiểu hiển nhiên) | Áp fix theo `code-convention`, giữ nguyên hành vi nghiệp vụ, kèm test/lint xanh |
| **Cần người review** | `Security Hotspot` (cần đánh giá ngữ cảnh: có thật sự là lỗ hổng không), fix làm **thay đổi hành vi** mà **thiếu test** bảo chứng, sửa động tới logic nghiệp vụ / luồng auth / crypto | **KHÔNG auto-fix** — đề xuất hướng + đánh dấu để người quyết trong report |
| **Không thuộc phạm vi một diff** | Coverage/duplication dưới ngưỡng cổng | Báo trong report như điều kiện cổng; đề xuất bổ sung test là việc riêng |

Nguyên tắc: một fix chỉ "an toàn để tự áp" khi **không đổi hành vi quan sát được** hoặc **có test bảo
chứng**. Còn nghi ngờ → hạ xuống nhóm "cần người review".

## Ranh giới (nhắc lại)

- Token qua biến môi trường; KHÔNG in/log giá trị.
- KHÔNG đổi quality gate profile hay cấu hình server.
- Ngôn ngữ đo được: mỗi finding có type + severity + `file:line` (hoặc rule + component). Findings phản
  ánh **thời điểm quét**, có thể sót — nêu **residual risk** trong report, không tuyên bố tuyệt đối.

Sau khi có findings Sonar, gộp cùng Black Duck ([blackduck.md](blackduck.md)) rồi theo vòng chung ở
[triage-and-fix.md](triage-and-fix.md).
