---
name: quality-gate
description: "Skill dùng chung (core) để chạy quality gate: quét chất lượng & bảo mật bằng hai công cụ SonarQube (bug / vulnerability / code smell / security hotspot / quality gate) và Black Duck (lỗ hổng CVE + license của dependency), gộp findings, phân loại (triage), tự sửa các lỗi rõ ràng theo code-convention (con người DUYỆT DIFF trước khi commit), rồi xuất report có residual risk. Hai chế độ truy cập (KHÔNG dùng web API): chạy scanner tại chỗ qua CLI (sonar-scanner, detect) khi có cấu hình + token qua biến môi trường; hoặc đọc report/BOM đã xuất sẵn. Dùng skill NÀY khi người dùng muốn \"quét sonar\", \"chạy sonarqube\", \"check black duck\", \"quét bảo mật phụ thuộc\", \"quality gate\", \"sửa lỗi sonar\", \"review chất lượng code\", \"kiểm tra lỗ hổng dependency\" — kể cả khi không nói chính xác chữ \"skill\". KHÔNG thuộc pipeline bắt buộc; gọi khi cần ở bất kỳ giai đoạn nào cần kiểm chất lượng/bảo mật."
order: 3
stageNumber: "03"
title: "Quality Gate — quét SonarQube + Black Duck, triage, fix, report (dùng chung)"
runsIn: execute
invoke: per-request
pipeline: false
next: null
---

# Quality Gate (skill dùng chung)

Điều phối một vòng quality gate: **thu thập** findings chất lượng (SonarQube) và bảo mật phụ thuộc
(Black Duck), **triage** theo severity, **áp fix cho lỗi rõ ràng** theo `code-convention` của project, rồi
**xuất report** có residual risk. Skill này là **hướng dẫn cách agent chạy/đọc công cụ và hành động**
(docs-only recipe), KHÔNG phải scanner/CI code, cũng KHÔNG phải công cụ codegen.

Có **hai chế độ truy cập, KHÔNG dùng web API**: (a) **chạy scanner tại chỗ qua CLI** khi project có cấu
hình + token qua biến môi trường; (b) **đọc report/BOM đã xuất sẵn**. Chọn chế độ theo cái đang có.

Skill này KHÔNG thuộc chuỗi pipeline bắt buộc của plugin nào; gọi khi cần ở bất kỳ giai đoạn nào cần kiểm
chất lượng/bảo mật. Con người giữ chốt: **duyệt diff trước khi commit**.

## Khi nào dùng

- Người dùng yêu cầu quét Sonar / chạy SonarQube, check Black Duck, quét bảo mật phụ thuộc, chạy quality gate.
- Cần sửa lỗi Sonar, review chất lượng code, kiểm tra lỗ hổng dependency, hay xử lý report đã xuất.
- Cần bump version một dependency có lỗ hổng đã có bản vá và xác nhận build/test không vỡ.

KHÔNG dùng skill này để tự cấu hình server/CI, hay gọi web API của SonarQube/Black Duck (ngoài phạm vi).

## Ranh giới an toàn

- **KHÔNG** nhập, in, hay log token/secret. Token đi qua **biến môi trường**; skill chỉ nêu **tên biến**
  (vd `SONAR_TOKEN`, `SONAR_HOST_URL`, `BLACKDUCK_URL`, `BLACKDUCK_API_TOKEN`) — không đọc giá trị ra output.
- Không chạy lệnh phá huỷ; không đổi cấu hình server, quality gate profile, hay CI pipeline.
- **Áp fix** chỉ cho lỗi **rõ ràng** theo `code-convention`; giữ nguyên hành vi nghiệp vụ. Breaking-change
  thiếu test và security-hotspot nhạy cảm → **đánh dấu để người quyết**, KHÔNG auto-fix.
- Không tự bump **major** rủi ro khi thiếu test bảo chứng; không tự commit — con người **duyệt diff** trước.
- Ngôn ngữ report **đo được** (đếm được, có file:line, có CVE/CVSS); LUÔN nêu **residual risk**. KHÔNG
  tuyên bố "chặn / đảm bảo / loại bỏ / sửa triệt để" lỗ hổng — findings phản ánh thời điểm quét, có thể sót.
- Chỉ thêm nội dung `core`; không đụng CLI/adapter/engine.

## Luồng quality gate

1. **Nạp context + dò cấu hình (BẮT BUỘC — trước khi quét).**
   Đọc CLAUDE.md / project-knowledge để nắm **ranh giới an toàn** + `code-convention.md`. Dò:
   `sonar-project.properties`, cấu hình Black Duck (`detect` project settings), **file report có sẵn**
   (issues JSON, SARIF, BOM SPDX/CycloneDX), và **tên biến môi trường** chứa token. Từ đó **chọn chế độ**:
   chạy scanner (nếu có cấu hình + token) vs đọc report (nếu chỉ có file đã xuất). Thiếu cả hai → nói rõ
   (fail-loud), đề nghị người cung cấp cấu hình/report thay vì tự bịa.

2. **Thu thập findings.**
   Chạy `sonar-scanner` và Black Duck `detect` nếu có cấu hình + token; hoặc đọc report đã xuất. **Gộp**
   findings từ cả hai công cụ vào một danh sách chung. Chi tiết từng công cụ:
   [references/sonarqube.md](references/sonarqube.md) + [references/blackduck.md](references/blackduck.md).

3. **Triage.**
   Phân loại severity, gom theo file/component, ưu tiên **blocker/critical** và **vulnerability có bản vá**.
   Quyết mỗi finding sẽ **fix / propose / defer** theo bảng quyết định trong
   [references/triage-and-fix.md](references/triage-and-fix.md).

4. **Fix (người duyệt diff).**
   Áp fix cho **lỗi rõ ràng** (code smell rõ, dead code, đặt tên, bug đơn giản) theo `code-convention`.
   Vuln phụ thuộc có bản vá → **bump version** trong manifest đúng hệ + kiểm build/test. **KHÔNG** auto-fix
   breaking-change thiếu test hay security-hotspot nhạy cảm — đánh dấu để người quyết. Xem
   [references/triage-and-fix.md](references/triage-and-fix.md).

5. **Verify + report.**
   Chạy lại build/test/lint (rescan nếu nhanh) xác nhận không vỡ. Xuất report theo
   [references/report-template.md](references/report-template.md): quality-gate status, bảng findings theo
   tool/severity/file, mục **Đã sửa / Hoãn (kèm lý do) / Residual risk**, các bước verify đã chạy. Con người
   **duyệt diff** trước khi commit.

## Verification (trước khi báo hoàn thành)

- Đã dò cấu hình và **nêu rõ chế độ** đang dùng (chạy scanner hay đọc report).
- Findings gộp từ cả hai công cụ, mỗi finding có severity + vị trí (file:line hoặc component@version).
- Fix đã áp bám `code-convention`; build/test/lint xanh, hoặc phần bị bỏ qua đã báo rõ.
- Report có đủ **Đã sửa / Hoãn (lý do) / Residual risk**; ngôn ngữ đo được, không tuyên bố tuyệt đối.
- Không token/secret nào lọt vào output; con người duyệt diff trước commit.

## Bản đồ tài liệu

Nạp đúng file khi cần, đừng nạp tất cả:

- [references/sonarqube.md](references/sonarqube.md): cách thu thập Sonar (chạy `sonar-scanner` / đọc report),
  phân loại type + severity + quality gate, map finding → file:line, bảng "tự sửa an toàn vs cần người review".
- [references/blackduck.md](references/blackduck.md): cách thu thập Black Duck (chạy `detect` / đọc BOM),
  phân loại component vulnerability (CVE + CVSS) + license risk, triage vuln (bump version theo hệ), quy tắc
  không bump major rủi ro khi thiếu test.
- [references/triage-and-fix.md](references/triage-and-fix.md): vòng dùng chung (gộp → phân loại → quyết
  fix/propose/defer → áp fix → verify → cập nhật report) + bảng quyết định "tự sửa vs người quyết" + nhắc
  lại ranh giới an toàn.
- [references/report-template.md](references/report-template.md): mẫu report (status + bảng findings + Đã
  sửa / Hoãn / Residual risk + bước verify) với ngôn ngữ đo được, không tuyên bố tuyệt đối.
