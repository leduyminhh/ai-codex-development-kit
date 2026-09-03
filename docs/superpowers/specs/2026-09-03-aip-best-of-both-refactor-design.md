# Thiết kế: Refactor `aip` theo hướng best-of-both (nền kit ngoài + graft riêng)

- Ngày: 2026-09-03
- Trạng thái: Đã hiện thực — merged vào `master` ngày 2026-09-03 (PR #22). Ghi lại làm bản thiết kế lịch sử.
- Phạm vi: Kiến trúc — thay nền engine + content model, thu gọn nội dung, giữ branding hiện tại.

## 1. Mục tiêu & tiêu chí thành công

Đưa `ai-engineering-platform` (CLI `aip`) lên nền engine + content model trưởng thành của
bộ kit ngoài `@mld/ai-devkit` (`E:\Company\IOC\Shared\cowork-code-workflow-kit`), nhưng
**thu gọn nội dung** xuống đúng phần cần dùng và **giữ 2 năng lực riêng** của repo hiện tại.

Thành công khi:

1. `npm test` xanh (validate + install + wizard + managed-block + pack-guard).
2. `npm run build` sinh đủ đầu ra cho claude/cursor/codex/antigravity, đạt parity (mọi
   adapter đều ship `references/`, `AGENTS.template.md`, `templates/`).
3. CLI vẫn là `aip` / `ai-engineering-platform`; state file vẫn `.ai-engineering/manifest.json`;
   env override vẫn `$AIE_INSTALL_ROOT`.
4. **Zero runtime dependency** (bỏ `js-yaml` và `@iarna/toml`).
5. Nội dung còn đúng: `core` + 4 skill `*-init` + `backend-migrate-architecture` +
   `backend-migrate-vault-consul`. Không còn luồng pipeline, không còn plugin trừu tượng cũ.
6. `install` vẫn chèn/gỡ được khối baseline (managed-block) trong `AGENTS.md`/`CLAUDE.md`.
7. `npm publish` bị pack-guard chặn file thừa.

## 2. Quyết định đã chốt

| Quyết định | Lựa chọn |
|---|---|
| Chiến lược | **A** — lấy kit ngoài làm nền, graft phần riêng của current lên |
| Branding | Giữ **`aip` / `ai-engineering-platform`** |
| Plugin trừu tượng cũ | **Thay** bằng nội dung kit ngoài |
| Pipeline | **Bỏ** — mọi skill giữ lại là recipe on-demand |
| Nội dung giữ | `core/` + **cả 4** skill `*-init` + `backend-migrate-architecture` + `backend-migrate-vault-consul` |
| Nhánh | **Tạo nhánh mới từ `master`**; nhánh `refactor/platform-contract-foundation` bỏ (giữ để tham chiếu) |
| Zero-dep / MCP | **Zero-dep + bỏ MCP** (bỏ js-yaml, bỏ đường ống MCP nên không cần TOML) |

## 3. Kiến trúc đích (end state)

```
core/                         # từ kit ngoài, nguyên vẹn
├── agents/AGENTS.template.md  # baseline chung (nguồn cho managed-block + init)
├── principles/principles.md   # loader gộp mọi *.md
└── skills/git-workflow/       # SKILL.md + references/ + scripts/

plugins/                      # từ kit ngoài, ĐÃ THU GỌN
├── _marketplace.json          # rebrand: name/owner = ai-engineering-platform
├── _cowork.json               # skills[] = danh sách skill còn giữ
├── backend/
│   ├── .manifest.json
│   ├── shared/principles.md
│   ├── templates/architecture/            # giữ (sharedAssets của init + migrate-architecture)
│   └── skills/
│       ├── backend-init/                  # + stack/ + references/
│       ├── backend-migrate-architecture/
│       └── backend-migrate-vault-consul/
├── frontend/    { .manifest.json, shared/principles.md, skills/frontend-init/(+framework/) }
├── oltp-database/ { .manifest.json, shared/principles.md, skills/oltp-database-init/(+engine/+references/) }
└── olap-warehouse/ { .manifest.json, shared/principles.md, skills/olap-warehouse-init/(+references/) }

templates/                    # từ kit ngoài
├── init/                      # scaffold project (ship bởi *-init)
└── skills/skill.template.txt  # scaffold skill

adapters/                     # từ kit ngoài (auto-discover): _shared, claude, codex, cursor, antigravity

cli/
├── index.mjs                 # GIỮ tên (bin aip); nạp logic của cwf.mjs (parse/route/wizard-gate + update + pack)
├── build.mjs                 # auto-discover adapter (kit ngoài)
└── lib/
    ├── plugins.mjs           # loader zero-dep + .manifest.json (kit ngoài)
    ├── install.mjs           # install robust (kit ngoài) + GRAFT managed-block
    ├── managed-block.mjs     # GIỮ từ current
    ├── pack.mjs              # zip skill cho Cowork (kit ngoài)
    ├── pack-guard.mjs        # GIỮ từ current (allowlist npm publish)
    ├── prompt.mjs wizard.mjs paths.mjs write.mjs  # kit ngoài

test/                         # validate.mjs (re-scope) + install.test + wizard.test + managed-block.test + pack-guard.test
package.json                  # name/bin = ai-engineering-platform/aip; dependencies: {} (zero-dep)
```

## 4. Bảng đổi tên (kit ngoài → repo `aip`)

| Hạng mục | Kit ngoài | Repo `aip` |
|---|---|---|
| package name | `@mld/ai-devkit` | `ai-engineering-platform` |
| bin | `ai-devkit`/`cwckit`/`cwf` | `aip` + `ai-engineering-platform` |
| entry | `cli/cwf.mjs` | `cli/index.mjs` |
| state file | `.cowork-install.json` (scope root) | `.ai-engineering/manifest.json` |
| env override | `$COWORK_INSTALL_ROOT` | `$AIE_INSTALL_ROOT` |
| marketplace name/owner | (mld) | ai-engineering-platform |
| completions | — | cập nhật `completions/aip.{bash,zsh}` theo lệnh mới (thêm update/pack) |

State file: giữ **tên + đường dẫn** của current (`.ai-engineering/manifest.json`) nhưng dùng
**shape giàu hơn** của kit ngoài (`{version, installs:[{provider,plugins[],scope,files[],links[],installedAt}]}`,
additive, phân tách files/links).

## 5. Thu gọn nội dung & vô hiệu hoá pipeline

- **Giữ**: `core/*`; `backend/{backend-init, backend-migrate-architecture, backend-migrate-vault-consul}` +
  `backend/templates/architecture`; `frontend/frontend-init`; `oltp-database/oltp-database-init`;
  `olap-warehouse/olap-warehouse-init`; mỗi plugin giữ `.manifest.json` + `shared/principles.md`.
- **Bỏ**: mọi skill khác của kit ngoài (analysis/contract/erd/implement/example/share-contract/
  validate/concurrency/security/server/migration/state-model/ui-contract…); toàn bộ plugin trừu
  tượng cũ của current (application/architecture/data/knowledge/platform/quality/security).
- **Vô hiệu hoá pipeline**: các skill giữ lại đặt frontmatter `pipeline: false`, `next: null`
  (init hiện là `pipeline: true, next: *-analysis` → sửa). Giữ `order` chỉ để sắp xếp hiển thị.
- `_cowork.json.skills[]` cập nhật về đúng tập skill còn giữ (hoặc để auto-derive theo `runsIn: plan`).

## 6. Graft năng lực riêng (2 mảnh)

### 6.1 Managed-block (chèn baseline vào file chỉ dẫn có sẵn)
- Là **bước install-time**, không phải việc của adapter. Sau khi kit-ngoài-install đặt/link file
  xong, chạy merge khối "AI Engineering Baseline" vào `AGENTS.md` (và `CLAUDE.md` khi có) tại
  scope-root, nguồn nội dung = `core/agents/AGENTS.template.md` giữa 2 marker.
- Dùng lại `cli/lib/managed-block.mjs` của current (rewrite chỉ vùng giữa marker, giữ nguyên
  ngoài marker).
- Ghi vào manifest file nào mang managed-block; `uninstall` chỉ gỡ khối, không xoá phần còn lại.
- **Phân biệt với init**: skill `*-init` drop nguyên `AGENTS.md` template khi scaffold *project mới*;
  managed-block chèn baseline vào file *đã có* của target repo khi cài platform. Hai luồng khác thời điểm, cùng tồn tại.

### 6.2 pack-guard (chặn file thừa khi npm publish)
- Bê nguyên `cli/lib/pack-guard.mjs` + `pack.config.json`; cập nhật `allowTop` = `core, plugins,
  templates, adapters, cli` và `allowFile`/`deny`/`required` theo layout mới.
- Wire lại script `prepack` + `prepublishOnly` + `pack:verify`/`pack:show`.
- Cùng tồn tại với `cli/lib/pack.mjs` của kit ngoài (khác mục đích): `pack.mjs` = zip skill cho
  Cowork upload; `pack-guard.mjs` = allowlist nội dung gói npm. Đặt tên rõ để tránh nhầm.

## 7. Zero-dep

- Bỏ `js-yaml`: loader kit ngoài đã tự `parseFrontmatter`; manifest là JSON (`.manifest.json`) nên
  không parse YAML nữa.
- Bỏ `@iarna/toml`: (a) codex adapter kit ngoài sinh native skill, không đọc agent `.toml`;
  (b) MCP bỏ nên không ghi TOML. `package.json.dependencies = {}`.
- Xác nhận không còn `import ... yaml`/`toml` nào trong `cli/`.

## 8. Provider & antigravity

- `install` hỗ trợ `claude, cursor, codex` (theo `PROVIDERS` kit ngoài). `build` sinh cả 4 (kể cả
  antigravity). antigravity là **PENDING**: không hiện trong wizard, không cài khi chọn "all",
  nhưng cài được khi gọi tường minh `--provider antigravity` (giữ `PROVIDER_LAYOUT`).
- Đây là **thay đổi kỳ vọng** so với current (current liệt kê antigravity trong PROVIDERS). Ghi rõ
  trong MIGRATION.md.

## 9. Kiểm thử

- Bê `test/validate.mjs`, `test/install.test.mjs`, `test/wizard.test.mjs` của kit ngoài.
- **Re-scope `validate.mjs`** (việc lớn nhất): bỏ các deep-check cho skill không còn (OpenAPI 5-skill,
  FastAPI skeleton, React default-stack, migration expand-contract theo pipeline…); bỏ ràng buộc
  "pipeline liền mạch 1..N + đúng 1 terminal"; GIỮ: manifest 4-trường, prefix skill id, parity
  `references/` qua mọi adapter, strip workflow-metadata ở output, drift guard `AGENTS.md ==
  core/agents/AGENTS.template.md`, `templates/init` đủ file.
- Port + chỉnh `managed-block.test` và `pack-guard.test` từ current.
- `npm test` = validate(--build) + install.test + wizard.test + managed-block.test + pack-guard.test.

## 10. Các pha thực thi (writing-plans sẽ chi tiết)

0. **Branch**: tạo `refactor/best-of-both` từ `master`.
1. **Engine**: copy `cli/`, `adapters/`, `core/`, `templates/` từ kit ngoài; đổi tên identifiers
   (aip, `.ai-engineering/manifest.json`, `$AIE_INSTALL_ROOT`, marketplace); bỏ dep; verify zero-dep.
2. **Content**: copy tập skill/plugin còn giữ; vô hiệu hoá pipeline frontmatter; rebrand
   `_marketplace.json`/`_cowork.json`; xoá plugin trừu tượng cũ.
3. **Graft managed-block** vào install + manifest + uninstall.
4. **Graft pack-guard** + `pack.config.json` + scripts.
5. **Test**: re-scope `validate.mjs`; port 2 test; `npm test` xanh + `npm run build` parity.
6. **Docs**: rebrand `README(_VI).md`, `CLAUDE.md`, `AGENTS.md`, `SHELL_SETUP.md`, completions;
   cập nhật `MIGRATION.md` (đổi tên state, antigravity pending, bỏ pipeline/plugin cũ).

## 11. Rủi ro & giảm thiểu

- **Re-scope `validate.mjs`** dễ sót/gãy (1104 dòng bám nội dung đầy đủ). Giảm thiểu: viết lại phần
  deep-check theo tập skill nhỏ, chạy `--build` để tự bắt drift; ưu tiên rẽ nhánh "skip khi skill
  không tồn tại".
- **Encoding**: current có file UTF-8 BOM; engine kit ngoài normalize CRLF→LF. Giảm thiểu: nguồn mới
  ghi LF, không BOM (đồng bộ kit ngoài); commit cấu hình `.gitattributes` nếu cần.
- **managed-block vs init cùng chạm `AGENTS.md`**: đã tách rõ thời điểm/luồng (mục 6.1).
- **Đứt git-history**: chấp nhận theo quyết định nhánh mới; nhánh cũ giữ để tham chiếu.
- **antigravity pending**: có thể gây hiểu nhầm "mất provider" — ghi rõ trong MIGRATION.md.

## 12. Ngoài phạm vi

- Tái lập luồng pipeline (analysis/contract/model/implement) — để tương lai.
- MCP registration — đã bỏ; có thể thêm lại sau bằng bộ ghi TOML zero-dep.
- Thêm domain plugin/skill ngoài tập đã chốt.
- Xuất bản npm thực tế (chỉ đảm bảo pack-guard sẵn sàng).

## 13. Câu hỏi mở

Không còn câu hỏi chặn. Điểm nhỏ có thể quyết khi thực thi: giữ hay bỏ alias CLI phụ (mặc định chỉ
`aip` + `ai-engineering-platform`); tập `_cowork.json.skills[]` khai tường minh hay auto-derive.
