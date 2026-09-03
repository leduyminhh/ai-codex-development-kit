# Report template — kết quả quality gate

Xuất report sau khi verify. Ngôn ngữ **đo được** (đếm được, có `file:line`, có CVE/CVSS); LUÔN có mục
**Residual risk**. KHÔNG tuyên bố "chặn / đảm bảo / loại bỏ / sửa triệt để" — findings phản ánh **thời điểm
quét** với dữ liệu sẵn có, có thể sót.

## Mẫu

```markdown
# Quality Gate — <project> — <ngày>

## Tóm tắt
- Chế độ: <chạy scanner | đọc report> (Sonar) · <chạy detect | đọc BOM> (Black Duck)
- Quality gate (Sonar): <OK | ERROR> — điều kiện không đạt: <coverage/duplication/new issues nếu có>
- Tổng findings: <n> (Sonar <a> · Black Duck <b>) — Đã sửa <x> · Hoãn <y>

## Findings theo mức độ
| Nguồn | Loại | Severity | Vị trí | Trạng thái |
|-------|------|----------|--------|-----------|
| Sonar | Bug/Vuln/Smell/Hotspot | Blocker/Critical/Major/Minor/Info | file:line (rule) | Đã sửa / Hoãn |
| Black Duck | CVE-XXXX-NNNN | Critical/High/Medium/Low (CVSS x.x) | component@version → fixed x.y.z | Đã sửa (bump) / Hoãn |

## Đã sửa
- <mô tả ngắn> — <file:line hoặc component@version> — verify: <build/test/lint/rescan xanh>
- ...

## Hoãn (kèm lý do)
- <finding> — lý do: <thiếu test đổi hành vi | hotspot cần đánh giá | chưa có bản vá | bump major rủi ro | license>
- <vuln không bản vá> — hướng: <workaround | replace | accept-with-note + ngày rà lại>
- ...

## Residual risk
- <rủi ro còn lại sau vòng này: finding hoãn, phần không tự verify được, độ phủ quét>
- Findings phản ánh thời điểm quét (<ngày>) và dữ liệu report/BOM sẵn có; có thể còn sót.

## Bước verify đã chạy
- build: <lệnh + kết quả>
- test: <lệnh + kết quả>
- lint: <lệnh + kết quả>
- rescan (nếu có): <kết quả>

## Cần người quyết
- <danh sách item Propose/Defer chờ người: hotspot, breaking-change, bump major, license>
- Con người DUYỆT DIFF trước khi commit.
```

## Quy tắc viết

- Mỗi finding có **severity + vị trí** cụ thể; tránh mô tả mơ hồ ("một vài lỗi", "nhìn chung ổn").
- Mục **Đã sửa** đi kèm bằng chứng verify (lệnh + kết quả), không chỉ khẳng định suông.
- Mục **Hoãn** luôn có **lý do** ánh xạ về bảng quyết định trong [triage-and-fix.md](triage-and-fix.md).
- Mục **Residual risk** là **bắt buộc**: nêu finding còn treo, phần không tự verify được (vd đánh giá
  hotspot cần ngữ cảnh), và phạm vi/độ tin cậy của lần quét.
- Nếu bỏ qua kiểm tra nào (không chạy được test/rescan) → **nói rõ** ở "Bước verify đã chạy" (fail-loud).
