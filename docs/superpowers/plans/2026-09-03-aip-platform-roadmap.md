# AIP Platform Roadmap — Implementation Plan (master)

> **For /loop / agentic workers:** thực thi theo PHASE, trong mỗi phase làm từng task chưa tick (`- [ ]`). Mỗi **skill = 1 task = 1 commit**. Mỗi task chạy **"Definition of Done mỗi skill"** (mục dưới) rồi tick. Có thể dispatch 1 subagent/skill. Push/PR là bước ra ngoài → **chờ người xác nhận**. Loop tới khi hết task của phase đang chạy.

**Goal:** Nâng `ai-engineering-platform` thành AI platform "chuẩn chỉnh" phục vụ 3 vai trò: fullstack dev, maintain server, teamlead/manager.

**Architecture:** Docs-only recipe skills (SKILL.md + references/) project ra 4 provider. Phân vai plugin: **domain plugin (backend/frontend/oltp-database/olap-warehouse) = luồng DEV theo stack**; **engineering = luồng MANAGER/teamlead**; **ops (mới) = maintain server**; **core = principles + git-workflow**.

**Tech Stack:** Markdown skills; zero-dep `aip` CLI; harness `npm test` + `npm run build`; harvest từ `origin/release/skill-framework-v1`.

**Spec:** self-contained (chốt trong phiên 2026-09-03). **Model quyết định (giả định — báo nếu sai):** review/refactor/testing/api-contract/DB = dev-skill → vào **backend/frontend/oltp/olap**; release-notes/adr/convention-enforce = manager → **engineering**; deploy/incident/observability = **plugin ops mới**.

## Global Constraints

- Skill DOCS-ONLY Markdown; hướng dẫn agent, KHÔNG code chạy được.
- **Prefix bắt buộc** (`test/validate.mjs`): skill name + thư mục phải bắt đầu bằng `<plugin-id>-`.
- UTF-8 **không BOM**, **LF** (strip `\r`: `tr -cd '\r' < f | wc -c` = 0). Nội dung **tiếng Việt CÓ DẤU**.
- REALITY FILTER: đo được; KHÔNG "đảm bảo/loại bỏ/chặn triệt để"; nêu residual risk / `[giả định]`.
- **Commit BẮT BUỘC qua `core:git-workflow`**: branch từ master; header EN Conventional + body VI có dấu; message ra file UTF-8 → `core/skills/git-workflow/scripts/test-commit-message-encoding.ps1` → `git commit -F`; **không** `Co-authored-by`.
- KHÔNG sửa test/adapters/cli trừ khi task nói rõ. Push/PR chờ người xác nhận.
- Harvest chỉ đọc: `git show origin/release/skill-framework-v1:skills/<name>/<file>`; drop scaffolding cũ (.ps1, npx-skills CLI, openai.yaml, per-type subagents).

## Definition of Done — MỖI skill (chạy cho từng task skill)

- [ ] a. (Nếu có nguồn) harvest essence qua `git show origin/release/skill-framework-v1:...`, condense sang VN.
- [ ] b. Viết `SKILL.md` (frontmatter: `name` đúng prefix, `order` kế tiếp trong plugin, `stageNumber`, `title`, `runsIn`, `invoke`, `pipeline: false`, `next: null`) + `references/` (docs-only, VN, đo được).
- [ ] c. Strip CR + kiểm no-BOM.
- [ ] d. `npm test` PASS + `npm run build` OK + `find build -path '*<skill>*' -name SKILL.md` ra 4 provider.
- [ ] e. Commit qua `core:git-workflow` (1 skill = 1 commit).

> Plugin MỚI (vd ops): task đầu tạo `.manifest.json` (`{id,name,description,version}`) + `shared/principles.md` trước, gộp vào commit skill đầu tiên của plugin.

---

## Phase 1 — Plugin `ops` (maintain server · trống nhất · ưu tiên #1)

Tạo `plugins/ops/` (manifest + shared/principles). Skills prefix `ops-`. Author fresh (kit cũ không có nguồn ops).

- [ ] **Task 1.1 — ops-deploy-release** (order 1)
  Purpose: hướng dẫn deploy/rollback an toàn (checklist release, chiến lược blue-green/canary, health-check, rollback trigger); đọc CI/CD + config; **KHÔNG tự deploy prod** — chờ xác nhận, con người duyệt.
  references: `release-checklist.md` (tiền/hậu deploy), `rollback-strategies.md` (blue-green/canary/rollback + tiêu chí), `deploy-safety.md` (ranh giới: không secret, không lệnh phá huỷ, dừng chờ xác nhận). → DoD.

- [ ] **Task 1.2 — ops-incident-troubleshooting** (order 2)
  Purpose: triage sự cố prod: đọc log/metric/trace, khoanh vùng, giả thuyết → kiểm chứng, mitigation tạm + RCA; **read-only + đề xuất**, không tự sửa prod.
  references: `triage-workflow.md` (khoanh vùng → giả thuyết → kiểm chứng), `log-metric-reading.md` (đọc tín hiệu theo tầng), `rca-template.md` (RCA + hành động khắc phục, đo được). → DoD.

- [ ] **Task 1.3 — ops-observability** (order 3)
  Purpose: thiết lập/đánh giá metrics–logs–traces + alerting (SLI/SLO, golden signals), không lộ secret.
  references: `signals-and-slo.md` (golden signals, SLI/SLO), `alerting-rules.md` (ngưỡng, chống noise), `observability-checklist.md`. → DoD.

## Phase 2 — Testing (fullstack · hằng ngày · #2)

Stack-specific theo model. Harvest: `test-automation-validate`, `test-qa-review`.

- [ ] **Task 2.1 — backend-testing** (plugin backend, order kế tiếp)
  Purpose: chiến lược test BE theo kiến trúc đã chọn — unit lõi (mock/fake port, không DB), integration adapter (Testcontainers), characterization khi đụng code cũ; pyramid, đặt test đúng tầng.
  references: `test-strategy.md` (pyramid + đặt test theo tầng Onion/Hexagonal), `characterization.md` (viết test khoá hành vi), `java-python-testing.md` (JUnit/pytest idiom + mock port). → DoD.

- [ ] **Task 2.2 — frontend-testing** (plugin frontend, order kế tiếp)
  Purpose: test React — render/interaction (Testing Library), custom hook, mock mạng (msw), snapshot có kiểm soát; test theo boundary Layered/FSD.
  references: `test-strategy.md` (cái gì test ở tầng nào), `react-testing-patterns.md` (render/interaction/hook/msw), `characterization.md`. → DoD.

## Phase 3 — Review + Refactor (fullstack · hằng ngày · vào backend/frontend)

Stack-specific. Harvest: `test-qa-review` (review), `code-design-pattern` + `code-shared-design` (refactor).

- [ ] **Task 3.1 — backend-code-review** (plugin backend)
  Purpose: review diff/PR BE — correctness (bug/edge/error/concurrency/tx), bám Dependency Rule (domain thuần, inbound≠outbound, 1 tx/aggregate), simplify/reuse, naming, test coverage, convention. Defer security/tool → `engineering-quality-gate`; cần refactor → `backend-refactor`. Read-only mặc định.
  references: `review-dimensions.md` (trục + checklist BE), `review-output-template.md` (severity/file:line/rationale/fix, đo được). → DoD.

- [ ] **Task 3.2 — backend-refactor** (plugin backend)
  Purpose: refactor GIỮ hành vi (extract, dedupe→shared, guard clause, tách god class, introduce param object, đảo phụ thuộc qua port), tôn trọng boundary; cổng baseline→characterization→bước nhỏ→verify; pattern chỉ khi gỡ phức tạp thật. KHÁC đổi kiểu kiến trúc → `backend-migrate-architecture`.
  references: `refactor-catalog.md` (move BE + dấu hiệu/rủi ro), `design-patterns.md` (harvest; tránh lạm dụng), `refactor-workflow.md` (gate giữ-hành-vi). → DoD.

- [ ] **Task 3.3 — frontend-code-review** (plugin frontend)
  Purpose: review React — correctness, boundary Layered/FSD (presentational không fetch/store, import chỉ xuống, không cross-import), server-state React Query, đơn giản/tái dùng, a11y, naming, test coverage, convention. Defer security → `engineering-quality-gate`; refactor → `frontend-refactor`.
  references: `review-dimensions.md` (trục + checklist FE), `review-output-template.md`. → DoD.

- [ ] **Task 3.4 — frontend-refactor** (plugin frontend)
  Purpose: refactor React giữ hành vi (extract component/hook, nâng state, bỏ prop drilling, tách presentational/logic, gom style/token, memo hợp lý), giữ boundary; cổng behavior-preserving. KHÁC đổi kiến trúc → `frontend-migrate-architecture`.
  references: `refactor-catalog.md` (move FE), `refactor-workflow.md` (gate + characterization render/interaction). → DoD.

## Phase 4 — Luồng manager (engineering · #3)

Prefix `engineering-`. Harvest: `naming-rule-validate` + `codex-structure-validate` (convention), `doc-write` (nếu cần).

- [ ] **Task 4.1 — engineering-release-notes**
  Purpose: gom lịch sử git (tag/ngày/range) → changelog + release notes hướng người dùng (nhóm New/Improve/Fix/Breaking/Security), lọc churn; git-workflow đã trỏ handoff tới skill này.
  references: `scope-and-grouping.md`, `user-facing-writing.md`, `changelog-format.md`. → DoD.

- [ ] **Task 4.2 — engineering-adr**
  Purpose: facilitation quyết định kiến trúc → ghi ADR chuẩn `docs/decisions/` (Nygard): context/decision/consequences/alternatives; đánh số tiếp, link contract/data-model.
  references: `adr-structure.md`, `decision-facilitation.md` (câu hỏi làm rõ + đánh đổi). → DoD.

- [ ] **Task 4.3 — engineering-convention-enforce**
  Purpose: kiểm/enforce naming + cấu trúc + convention của project (đối chiếu `code-convention.md`), báo lệch + đề xuất sửa; read-only mặc định.
  references: `naming-rules.md` (harvest), `structure-rules.md` (harvest), `enforce-workflow.md`. → DoD.
  > Tương lai (ngoài phase này): `engineering-review-orchestration` (điều phối review team). Ghi nhận, chưa làm.

## Phase 5 — Contracts & Data (fullstack · #4)

- [ ] **Task 5.1 — backend-api-contract** (plugin backend)
  Purpose: OpenAPI-first — chốt/đồng bộ contract FE↔BE ở `docs/contracts/`, versioning, kiểm drift contract↔code, sinh DTO/endpoint declaration theo template kiến trúc.
  references: `openapi-first.md`, `contract-drift-check.md`, `versioning.md`. → DoD.

- [ ] **Task 5.2 — oltp-database-implement** (plugin oltp-database)
  Purpose: từ data-model + schema-conventions (do init tạo) sinh DDL + **migration expand-contract, reversible** + DB object; test toàn vẹn; bám `oltp-database-init`. KHÔNG áp migration prod tự động.
  references: `schema-and-migration.md` (expand-contract/reversible), `integrity-tests.md`. → DoD.

- [ ] **Task 5.3 — olap-warehouse-implement** (plugin olap-warehouse)
  Purpose: từ data-contract + kiến trúc pipeline (init) build transform/model (source→transform→sink) + data-quality test + lineage; bám `olap-warehouse-init`.
  references: `transform-build.md`, `data-quality-tests.md`, `lineage.md`. → DoD.

## Phase 6 — Hygiene (xen kẽ · #5 · chores, KHÔNG phải skill)

Mỗi chore = verify + commit qua `core:git-workflow`.

- [ ] **Task 6.1 — .gitattributes + chuẩn hoá LF**
  Thêm `.gitattributes` ép LF cho nguồn (`*.md`, `*.mjs`, `*.json`), normalize CRLF hiện có (vd `backend/*` lẫn CRLF). Verify: `git ls-files --eol` không còn `w/crlf` ở nguồn; `npm test` PASS.

- [ ] **Task 6.2 — _cowork.json** (nếu muốn)
  Thêm skill mới vào bộ Cowork zip `plugins/_cowork.json` (hoặc auto-derive). Verify: `aip pack` (hoặc `npm run build` + pack) ra .zip đủ skill.

- [ ] **Task 6.3 — Dọn MCP legacy**
  Điều tra config 7 MCP server chết (`application/architecture/data/knowledge/platform/quality/security` — trùng tên plugin trừu tượng CŨ) trong `.mcp.json`/settings; gỡ entry legacy. **[giả định]** có thể ở settings ngoài repo → xác minh trước, báo nếu ngoài phạm vi repo.

- [x] **Task 6.4 — merge engineering** — ĐÃ XONG (PR #23 merged vào master).

---

## Self-Review

- **Coverage:** 5 hạng mục bạn liệt kê đều có phase (ops=P1, testing=P2, release-notes+adr+convention=P4, api-contract+DB=P5, hygiene=P6) + review/refactor=P3. ✓
- **Model:** dev-skill→domain plugin; manager→engineering; server→ops mới — đúng ý bạn (review/refactor vào backend/frontend). Đánh dấu là giả định ở header để bạn veto.
- **Placeholder:** mỗi task có plugin đích + purpose + references cụ thể + harvest + DoD chuẩn hoá; không TBD.
- **Naming:** mọi skill prefix đúng plugin id; order "kế tiếp trong plugin" (executor đọc skill hiện có để chọn số).
- **Thứ tự:** theo ưu tiên bạn nêu (ops→testing→…→hygiene), review/refactor chèn sau testing (cùng nhóm fullstack).
