# <Tên project>

<mô tả ngắn project + cách chạy>

## Onboarding cho người mới clone
Repo dùng workflow Cowork → Code. Bộ skill workflow KHÔNG nằm trong repo này — nó ở KIT
nguồn riêng (hỏi team leader đường dẫn/repo kit). Sau khi clone, lấy skill theo một trong các cách:

- Claude Code (user-level, mọi project): chạy `bash <kit>/scripts/install-skills.sh` (hoặc `.bat`/`.ps1`) một lần.
- Claude Code (project-level, riêng repo này): `bash <kit>/scripts/install-skills.sh --update --to .`
  để đồng bộ skill vào `.claude/skills/`. Cân nhắc gitignore `.claude/skills/`.
- Cowork: upload ZIP skill `*-init` qua Customize → Skills.

> Khi mở repo bằng Claude Code mà skill chưa khả dụng, Claude sẽ HỎI bạn có muốn cài từ kit không
> (xem mục Onboarding trong CLAUDE.md).
