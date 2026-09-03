# <Tên project>

<mô tả ngắn project + cách chạy>

## Onboarding cho người mới clone
Bộ skill workflow KHÔNG nằm trong repo này — nó do **ai-engineering-platform** (CLI `aip`)
sinh ra và cài vào (hỏi team leader đường dẫn/repo kit). Sau khi clone, lấy skill bằng `aip`:

- Đưa `aip` lên PATH: trong repo kit chạy `npm link` (hoặc gọi thẳng `node <kit>/cli/index.mjs`).
- Claude Code (project-level, riêng repo này): chạy `aip install --provider claude` **tại thư mục
  project này** để đồng bộ skill vào `.claude/skills/`. Cân nhắc gitignore `.claude/skills/`.
- Claude Code (user-level, mọi project): `aip install --provider claude -g` một lần.
- Nhiều tool cùng lúc: `aip install` (mặc định `--provider all --plugin all`) hoặc mở wizard `aip`.
- Cowork: trong repo kit chạy `aip pack` để tạo `build/cowork/<skill>.zip`, rồi upload qua
  Customize → Skills.

> Khi mở repo bằng Claude Code mà skill chưa khả dụng, Claude sẽ HỎI bạn có muốn cài từ kit không
> (xem mục Onboarding trong CLAUDE.md).
