# AI Engineering Platform

`ai-engineering-platform` (CLI: `aip`) là nền tảng plugin giữ **một nguồn sự thật
duy nhất** cho nội dung năng lực AI-agent và chiếu (project) nó ra layout gốc của
**Codex, Claude Code, Cursor, và Google Antigravity**. Viết năng lực MỘT LẦN dưới
`plugins/` và `core/`; CLI sinh skill/marketplace/rules/workflow cho từng provider
vào project đích, và chèn khối baseline "AI Engineering" vào `AGENTS.md` / `CLAUDE.md`
của project đó.

Pure ESM, **zero runtime dependency**, không có bước build. Node.js 20+.

> English: xem [README.md](README.md).

## Bắt đầu nhanh

```bash
git clone https://github.com/leduyminhh/ai-development-kit.git
cd ai-development-kit
npm install        # không biên dịch gì — chỉ cài dev tooling
npm test           # mọi suite phải pass
npm link           # đưa `aip` lên PATH
```

Cài năng lực vào project khác:

```bash
cd /duong-dan/project
aip                                   # wizard tương tác
# hoặc non-interactive:
aip install --provider claude --plugin backend --yes
aip install --provider all --plugin all --yes
aip install --provider codex --plugin all -g   # scope global
```

`aip` và `ai-engineering-platform` gọi cùng một CLI. `aip --help` in hướng dẫn.

## Cấu trúc

| Đường dẫn | Vai trò |
| --- | --- |
| `plugins/` | Nguồn năng lực: `<id>/.manifest.json` + `shared/principles.md` + `skills/<skill>/SKILL.md`, cùng `_marketplace.json` và `_cowork.json`. |
| `core/` | Baseline dùng chung: `agents/AGENTS.template.md`, `principles/`, và recipe dùng chung `skills/git-workflow/`. |
| `templates/` | `init/` khung project (do skill `*-init` drop ra) và `skills/` khung viết skill. |
| `adapters/` | Chiếu theo provider (`<provider>/adapter.mjs`), auto-discover. `_shared/lib.mjs` chứa logic dùng chung. |
| `cli/` | CLI `aip` (`index.mjs` + `lib/*.mjs` + `build.mjs`). Pure ESM, zero-dep. |
| `test/` | Validator hợp đồng + test install/wizard/managed-block/pack-guard. |
| `docs/` | Bản thiết kế và spec. |
| `completions/` | Shell completion cho `aip` (xem [SHELL_SETUP.md](SHELL_SETUP.md)). |

## Danh mục plugin

Nội dung được giữ gọn: `core` cộng bốn domain plugin, với skill là **recipe độc lập,
gọi-khi-cần** (KHÔNG có pipeline bắt buộc).

| Plugin | Năng lực | Skill |
| --- | --- | --- |
| `core` | Baseline mọi plugin phụ thuộc. | `principles`, `git-workflow` |
| `backend` | Project backend (REST API / service). | `backend-init`, `backend-migrate-architecture`, `backend-migrate-vault-consul` |
| `frontend` | Project frontend (web app / SPA). | `frontend-init` |
| `oltp-database` | Project CSDL OLTP. | `oltp-database-init` |
| `olap-warehouse` | Project data pipeline / warehouse. | `olap-warehouse-init` |

Mỗi skill `*-init` là **bộ scaffold TÀI LIỆU**: drop cây `templates/init` +
`AGENTS.template.md`, hỏi thông tin nền (stack / framework / engine / nguồn), rồi điền
`project-knowledge/`. Hai recipe `migrate-*` của backend tái cấu trúc codebase có sẵn
(kiến trúc; hoặc config → Vault/Consul).

Gọi skill trong Claude Code: `/<plugin>:<skill>` (vd `/backend:backend-init`).

## CLI

Mọi lệnh chạy `node cli/index.mjs`.

```bash
aip                 # menu wizard: install | uninstall | build | check
aip install   --provider all|<p>... --plugin all|<id>... [-g] [--yes]
aip uninstall [--provider ...] [--plugin ...] [-g] [--yes]
aip build     --provider all|<p>...
aip check     [-g]
aip update    [-g]        # git pull + build lại + cài lại các install đã ghi
aip list                  # adapter + plugin phát hiện được
```

- **Scope**: `project` (mặc định, cwd) hoặc `global` (`-g` / `--scope global`, thư mục home).
- **Install** ưu tiên symlink (junction trên Windows) + fallback copy, và **cộng dồn** —
  cài thêm plugin sẽ hợp với cái đã có. Đồng thời chèn khối baseline vào file chỉ dẫn của project.
- **Uninstall** chỉ gỡ path đã track (không đụng target của link), prune thư mục rỗng, và
  đếm-tham-chiếu khối managed dùng chung.
- Provider cài mặc định: `claude`, `cursor`, `codex`. `antigravity` có build nhưng chỉ cài
  khi gọi tường minh (`--provider antigravity`).

State mỗi lần cài nằm ở `<scope-root>/.ai-engineering/manifest.json`.

## Đầu ra theo provider

`aip build` ghi một cây cho mỗi provider dưới `build/<provider>/`:

| Provider | Đầu ra build | Cài vào (scope project) |
| --- | --- | --- |
| Claude | `.claude-plugin/marketplace.json` + `plugins/<id>/` (core là plugin dependency) | `.claude/skills/<skill>`; khối baseline → `CLAUDE.md` |
| Cursor | `<id>/.cursor/rules/<id>-00-principles.mdc` + `.cursor/skills/<skill>/` | `.cursor/rules` + `.cursor/skills` |
| Codex | `<id>/skills/<skill>/SKILL.md` (native skills) | `.codex/skills/<skill>` (global: `~/.codex/skills`); khối baseline → `AGENTS.md` |
| Antigravity | `<id>/AGENTS.md` + `docs/workflow/<skill>/` | khi cài tường minh; khối baseline → `AGENTS.md` |

Skill nào ship thư mục `references/` thì ship tới **mọi** provider (parity, do
`test/validate.mjs` bắt buộc).

## Viết nội dung

- **Skill mới** → thêm `plugins/<id>/skills/<skill-id>/SKILL.md` với frontmatter (`name`,
  `description`, `order`, `title`, `runsIn`, `invoke`, `pipeline: false`, `next: null`).
  Tự động được phát hiện — không phải khai vào manifest. File tham chiếu đặt dưới
  `skills/<skill>/references/`.
- **Hành vi provider mới** → sửa `adapters/<provider>/adapter.mjs`; giữ là hàm thuần
  `build(plugins, { outDir, marketplace, core }) -> fileEntry[]` với entry là
  `{path, content}` | `{path, copyFrom}` | `{path, copyDir}`.
- Chạy `npm run build` và `npm test` (đã gồm `test/validate.mjs --build`).

## Maintainer

```bash
npm test            # validate --build + install + wizard + managed-block + pack-guard
npm run build       # build tất cả provider vào build/
npm run validate    # hợp đồng source + build-output
npm run pack:verify # kiểm tập file npm-publish nằm trong pack.config.json
```

Cowork upload: `cli/lib/pack.mjs` đóng gói tập skill khai trong `_cowork.json` thành
`build/cowork/<skill>.zip` tất định cho Customize → Skills → Upload.

## Tài liệu

- [CHANGELOG.md](CHANGELOG.md) — lịch sử phiên bản.
- [MIGRATION.md](MIGRATION.md) — hướng dẫn nâng cấp.
- [docs/superpowers/specs/](docs/superpowers/specs/) — bản thiết kế.

## Checklist thay đổi

- Cập nhật `README.md` trước, rồi đồng bộ [README_VI.md](README_VI.md).
- Giữ danh mục plugin và bảng provider khớp `plugins/` và `adapters/`.
- Chạy `npm test` sau mọi thay đổi cấu trúc, nội dung, hoặc projection.
