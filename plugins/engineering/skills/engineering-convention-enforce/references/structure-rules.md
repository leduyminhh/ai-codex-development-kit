# Kiểm cấu trúc — đối chiếu layout thư mục/file với kiến trúc của project

Mục tiêu: xác nhận **file nằm đúng chỗ** theo `project-knowledge/source-structure.md` và `architecture.md` —
đúng tầng/slice/module, không lệch tầng, không đặt sai loại file. Nguồn chuẩn là tài liệu **của project**;
phần dưới là *cách đối chiếu*, KHÔNG dựng cấu trúc song song hay áp kiến trúc ngoài.

## Nguyên tắc gốc

- **Layout theo kiến trúc đã chốt** của project (Layered / Onion+DDD / Hexagonal / CQRS…). Đối chiếu cây thư
  mục thực tế với template phân tầng mô tả trong `source-structure.md`/`architecture.md`.
- **Dependency Rule**: tầng trên gọi tầng dưới; **domain không phụ thuộc hạ tầng**. Import ngược chiều (domain
  import framework/DB, tầng trong biết tầng ngoài) là lệch cấu trúc — báo kèm `file:line` của import vi phạm.
- **Đặt file đúng chỗ**: mỗi loại file (entity/usecase/adapter/controller/repository/test/config) thuộc đúng
  thư mục vai trò của nó; không trộn tầng trong một thư mục nếu kiến trúc đã tách.

## Các trục cần đối chiếu

1. **File đúng tầng/slice.** Ví dụ theo Onion/Hexagonal: logic nghiệp vụ ở `domain`/`application`, chi tiết hạ
   tầng ở `infrastructure`/`adapters`. Ghi nhận file đặt sai tầng (path hiện tại → path đúng theo template).
2. **Không lệch tầng (import vi phạm Dependency Rule).** Quét import: tầng trong không được import tầng ngoài;
   domain không import framework/ORM/HTTP. Mỗi vi phạm: `file:line` của dòng import + rule.
3. **Thư mục runtime phẳng đúng quy ước.** Nếu convention yêu cầu layout phẳng cho một loại artifact (ví dụ
   skill/module runtime không lồng dưới thư mục domain), đối chiếu và báo mục bị lồng sai.
4. **Test / resource / fixture đúng chỗ.** File test đặt đúng thư mục test theo convention (co-located hay
   `tests/` tách riêng), resource/fixture của một đơn vị nằm cùng đơn vị đó; test-map/manifest (nếu project có)
   phản ánh đủ file test mới.
5. **Không có file lạc / thiếu file bắt buộc.** File không thuộc thư mục nào theo template (rác, tạm, sai vị trí)
   và thư mục bắt buộc bị thiếu theo kiến trúc — đều là lệch.

## Cờ đỏ cấu trúc (mỗi cờ cần evidence + rule nguồn)

- File nghiệp vụ nằm trong thư mục hạ tầng hoặc ngược lại (sai tầng).
- Import ngược chiều Dependency Rule (`file:line` của import).
- Artifact runtime bị lồng sai độ sâu so với layout đã chốt.
- Test tồn tại nhưng chưa được map (nếu project dùng test-map/manifest).
- Thư mục bắt buộc theo kiến trúc bị thiếu, hoặc file đặt ngoài mọi thư mục vai trò.

## Ghi nhận khi báo cáo

Mỗi điểm lệch: **path** (hoặc `file:line` với vi phạm import) · **rule nguồn** (trích ngắn từ
`source-structure.md`/`architecture.md`) · **hiện tại → đề xuất** (di chuyển tới đâu / đảo phụ thuộc thế nào).
Tái tổ chức tầng lớn (đổi kiến trúc, di chuyển hàng loạt module) **vượt phạm vi enforce** — đó là việc của
`backend-migrate-architecture` + quyết định qua `engineering-adr`; skill NÀY chỉ *chỉ ra lệch*, không tự đổi
kiến trúc. Mục `source-structure.md` không quy định rõ → **[giả định]** + **hỏi**, không tự phán.
