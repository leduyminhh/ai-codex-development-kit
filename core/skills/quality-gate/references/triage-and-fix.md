# Triage & Fix — vòng dùng chung cho cả hai công cụ

Sau khi thu thập findings từ SonarQube ([sonarqube.md](sonarqube.md)) và Black Duck
([blackduck.md](blackduck.md)), chạy một vòng chung để triage và xử lý nhất quán. Con người giữ chốt:
**duyệt diff trước khi commit**.

## Vòng xử lý

1. **Gộp findings 2 công cụ** vào một danh sách chung, mỗi mục có: nguồn (Sonar/Black Duck), loại, severity,
   vị trí (`file:line` hoặc `component@version` + CVE), và (nếu có) hướng sửa / fixed version.
2. **Phân loại severity** và gom theo file/component để thấy điểm nóng. Chuẩn hoá thang severity giữa hai
   công cụ về một trục chung (Blocker/Critical → High → Medium → Low/Info) cho dễ xếp ưu tiên.
3. **Quyết mỗi finding: fix / propose / defer** theo bảng quyết định bên dưới. Ưu tiên **blocker/critical**
   và **vulnerability có bản vá**.
4. **Áp fix an toàn** theo `code-convention` của project (đặt tên, cấu trúc, format). Giữ nguyên hành vi
   nghiệp vụ; fix từng nhóm nhỏ, dễ review.
5. **Verify:** chạy build/test/lint; **rescan nếu nhanh** để xác nhận finding đã đóng và không phát sinh
   mới. Bump version phụ thuộc → bắt buộc chạy build/test.
6. **Cập nhật report** theo [report-template.md](report-template.md): Đã sửa / Hoãn (kèm lý do) / Residual
   risk + các bước verify đã chạy.

## Bảng quyết định: tự sửa vs người quyết

| Tình huống | Quyết định | Lý do |
|------------|-----------|-------|
| Code smell rõ, dead code, unused import, đặt tên sai convention, format | **Tự sửa** | Không đổi hành vi quan sát được |
| Bug đơn giản có pattern sửa chuẩn (rò tài nguyên, null-check hiển nhiên) + có/ thêm được test | **Tự sửa** | Hành vi đúng hơn, có test bảo chứng |
| Vulnerability phụ thuộc **có bản vá** (patch/minor) | **Tự sửa** (bump) + build/test | Bump tối thiểu, verify xanh |
| Fix **đổi hành vi** mà **thiếu test** bảo chứng | **Propose**, chờ người | Rủi ro hồi quy không đo được |
| **Security Hotspot** nhạy cảm (auth, crypto, input handling) | **Propose / defer**, người đánh giá ngữ cảnh | Cần phán đoán ngoài phạm vi một diff |
| Vulnerability **không có bản vá** | **Defer**: workaround / replace / accept-with-note | Không bump liều |
| Bump **major** rủi ro, thiếu test | **Propose**, chờ người | Major thường breaking |
| **License risk** | **Defer** (advisory), người quyết | Tác động pháp lý/chính sách |
| Coverage/duplication dưới ngưỡng cổng | **Defer**, ghi trong report | Không sửa bằng một diff |

Nguyên tắc bao trùm: một fix chỉ "an toàn để tự áp" khi **không đổi hành vi quan sát được** hoặc **có test
bảo chứng**. Còn nghi ngờ → hạ xuống **Propose/Defer** thay vì tự áp.

## Ranh giới an toàn (nhắc lại)

- **Token qua biến môi trường**, chỉ nêu **tên biến** (vd `SONAR_TOKEN`, `BLACKDUCK_API_TOKEN`); KHÔNG
  nhập/in/log giá trị.
- **Không** chạy lệnh phá huỷ; không đổi cấu hình server / quality gate profile / CI.
- **Breaking-change thiếu test = KHÔNG auto-fix.** Security-hotspot nhạy cảm = flag cho người.
- **Không tự commit** — con người **duyệt diff** trước.
- Ngôn ngữ **đo được**; LUÔN nêu **residual risk**. Findings phản ánh thời điểm quét, có thể sót — không
  tuyên bố "chặn / đảm bảo / loại bỏ / sửa triệt để".
