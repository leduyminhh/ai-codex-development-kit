# Security review source-first — phương pháp + nhóm rule

Chiều bảo mật của quality-gate **lấy review source làm gốc**; scanner (SonarQube / Black Duck / Trivy) chỉ
là **enrichment**. **Im lặng của scanner KHÔNG phải bằng chứng an toàn** — vẫn phải review source theo các
nhóm rule dưới đây, rồi ánh xạ finding qua [owasp-asvs-cwe-mapping.md](owasp-asvs-cwe-mapping.md).

## Nguyên tắc review

1. **Chốt scope + stack trước khi phán.** Đọc manifest (`pom.xml`, `build.gradle`, `package.json`,
   `requirements.txt`, `pyproject.toml`, `go.mod`, `Dockerfile`, CI config) để biết công nghệ + attack surface.
2. **Xác định input người dùng và trust boundary**, rồi trace tới các **sink** nhạy cảm (query, shell,
   template, deserialize, file, HTTP client, redirect).
3. **Evidence-driven:** mỗi finding phải trích **code path / config key / manifest entry** cụ thể. Tách
   **finding đã chứng minh** khỏi **pattern nghi ngờ** cần verify runtime.
4. **Ưu tiên exploitability + impact** hơn đếm checklist. Thiếu authorization coi là **rủi ro cao** trừ khi
   có bằng chứng ngược lại; hardcoded secret, crypto yếu, auth bypass, injection sink là **ưu tiên top**.
5. **Read-only mặc định.** KHÔNG auto-fix bảo mật trừ khi người dùng yêu cầu fix rõ ràng (xem
   [triage-and-fix.md](triage-and-fix.md)).

## Nhóm rule theo stack (cần review, không phụ thuộc scanner)

**Java / Spring:** SQL/JPQL injection · command injection · path traversal · XXE · SSRF · hardcoded secret ·
JWT ký/verify yếu · thiếu authorization (`@PreAuthorize`…) · thiếu validate · unsafe reflection · CORS lỏng ·
CSRF tắt vô cớ · endpoint public không kiểm soát.

**React / Frontend:** `dangerouslySetInnerHTML` · XSS sink · token trong `localStorage` · redirect không an
toàn · thiếu ghi chú CSP · log dữ liệu nhạy cảm · lộ API key.

**Python:** `subprocess(..., shell=True)` · `os.system` · `eval` / `exec` · `pickle.loads` · `yaml.load`
thiếu `SafeLoader` · credential hardcoded · path traversal · upload file không an toàn.

**Docker:** chạy bằng root · tag `latest` · privileged mode · secret trong `ENV` · thiếu `HEALTHCHECK` ·
mở cổng nhạy cảm · filesystem ghi được.

**Secrets:** các marker `password=` `secret=` `apikey=`/`api_key=` `token=` · private key · `AWS_ACCESS_KEY_ID`
/ `AWS_SECRET_ACCESS_KEY`.

**Architecture:** luồng authentication · ranh giới authorization · trust service-to-service · biên input
validation · luồng dữ liệu nhạy cảm · logging nhạy cảm · vòng đời token/session · ranh giới dependency ·
độ lộ API công khai.

Chi tiết key check theo 5 vùng review: [security-review-areas.md](security-review-areas.md).

## Quy tắc mask secret

**KHÔNG BAO GIỜ** in giá trị secret đầy đủ. Report chỉ được nêu **tên khoá + file + line + severity + giá trị
đã mask** (vd `sk_live_****1234`). Không "chứng minh" bằng cách dán nguyên secret.

## Enrichment từ scanner

- **SonarQube** — bổ sung finding chất lượng/hotspot (xem [sonarqube.md](sonarqube.md)).
- **Black Duck** (SCA mặc định) / **Trivy** (thay thế) — bổ sung CVE dependency (xem [blackduck.md](blackduck.md)).
- Chỉ chạy scanner khi có cấu hình + token qua **biến môi trường**; không có thì bỏ qua enrichment và **nói
  rõ** trong report (fail-loud), KHÔNG coi là đã "sạch".
