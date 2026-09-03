# Thiết kế: Thư viện template kiến trúc frontend + làm giàu `frontend-init`

- Ngày: 2026-09-03
- Trạng thái: Đã hiện thực (2026-09-03) — `npm test` xanh, `npm run build` ship template ra cả 4 provider.
- Phạm vi: Nội dung — thêm bộ template kiến trúc UI chi tiết cho plugin `frontend` (ngang backend) và wire vào `frontend-init`. Không đổi engine/adapter/CLI.

## 1. Mục tiêu & tiêu chí thành công

Plugin `backend` có thư viện `plugins/backend/templates/architecture/` rất chi tiết (cây `src`, trách
nhiệm tầng, Dependency Rule, đặt tên, cơ chế ép bằng ArchUnit/import-linter). Plugin `frontend` **chưa
có gì tương đương** — `frontend-init` chỉ viết prose vào `project-knowledge/`. Mục tiêu: dựng thư viện
template kiến trúc **frontend** ngang độ sâu backend và cho `frontend-init` offer/ship nó.

Thành công khi:

1. Có `plugins/frontend/templates/architecture/` với **2 template** chi tiết: `react-layered` và
   `react-fsd`, theo đúng bố cục 13 mục của template backend.
2. `frontend-init` khai `sharedAssets: templates/architecture` → template ship cạnh skill ra **cả 4
   provider** (claude/cursor/codex/antigravity), parity `references/`.
3. Thân `frontend-init` có bước **chọn kiến trúc UI (Layered / FSD)** trỏ tới template tương ứng
   (đối xứng bước chọn kiến trúc của `backend-init`).
4. `frontend/.manifest.json` mô tả **đúng source hiện tại** (docs-only, không pipeline 5-giai-đoạn,
   không React skeleton) và nêu năng lực offer template kiến trúc.
5. `npm test` xanh (validate + install + wizard + managed-block + pack-guard); `npm run build` không vỡ.
6. **Docs-only** — template chỉ mô tả cấu trúc + quy tắc + cơ chế ép bằng lint, **không** sinh code skeleton.

## 2. Phạm vi

- **Trong phạm vi:** 2 kiểu kiến trúc UI cho **React SPA**: Layered (Presentational/Container + hooks +
  data) và Feature-Sliced Design (FSD). Styling giả định **Tailwind + component-library**
  (shadcn/MUI/antd) theo lựa chọn người dùng.
- **Ngoài phạm vi (mở sau, không đổi cơ chế):** Atomic Design; Next.js App Router (RSC); skill
  `frontend-implement`/`frontend-migrate-architecture` (thư viện này là nền cho chúng sau).

## 3. Kiến trúc đích

```
plugins/frontend/
├── .manifest.json                         # SỬA description cho khớp source
├── shared/principles.md
├── templates/architecture/                # MỚI — song song backend/templates/architecture
│   ├── react-layered.template.md          # MỚI
│   └── react-fsd.template.md              # MỚI
└── skills/frontend-init/
    └── SKILL.md                           # + frontmatter sharedAssets; + bước chọn kiến trúc
```

Cơ chế ship: `loadSkills` (cli/lib/plugins.mjs) đọc frontmatter `sharedAssets` (danh sách path tương
đối so với thư mục plugin, phân tách dấu phẩy) → mỗi path thành một dirAsset tên = basename. Khai
`sharedAssets: templates/architecture` trên `frontend-init` → thư mục ship cạnh SKILL.md ra mọi adapter,
tên đích `architecture/` (đúng cách `backend-migrate-architecture` đang làm). `frontend-init` là init-skill
đầu tiên có `sharedAssets`; tên `architecture` không đụng `templates` (init scaffold auto-attach).

## 4. Nội dung mỗi template (13 mục ngang backend)

Mỗi template minh hoạ bằng domain `invoices` (đổi khi áp domain thật), gồm: **Summary · Context**
(stack React/TS/Vite/Tailwind+lib, phạm vi CHỈ cấu trúc, khi-nào-dùng, bảng đối chiếu vai trò) **·
Problem · Solution · Architecture** (cây `src/`, vai trò & ranh giới từng tầng, chiều phụ thuộc + cấu
hình ép ranh giới bằng `eslint-plugin-boundaries`/Steiger, State boundary) **· Implementation** (bảng map
biên: API DTO ↔ view model; container nối hook+service→presentational) **· Standards · Best Practices ·
Anti-patterns · Examples** (luồng một màn hình) **· Checklist · References · Related**.

- **`react-layered`**: 4 tầng `presentational (components) ← container ← hook ← data (services)`; server-state
  ở React Query trong `services`, client/UI-state ở `hooks`/`store`, presentational **stateless** (chỉ
  props in / events out). Import chỉ xuống; presentational không import service/store/hook.
- **`react-fsd`**: 6 tầng `app > pages > widgets > features > entities > shared`; import chỉ **xuống**,
  **cấm cross-import cùng tầng**, chỉ qua **public API `index.ts`**; segment `ui/model/api/lib/config`.
  Ép bằng Steiger (linter FSD chính thức) + `eslint-plugin-boundaries`.

Cấu hình lint trong template là **khởi điểm cần chỉnh theo dự án** (nhãn rõ), tương đương cách backend
đưa `[tool.importlinter]`/ArchUnit làm sketch.

## 5. Wire `frontend-init`

- Frontmatter: thêm `sharedAssets: templates/architecture`.
- Thân, bước 2: hỏi framework (React) **+ chọn kiến trúc UI (Layered mặc định / FSD)**; trỏ
  `architecture/react-<layered|fsd>.template.md` (ship cạnh skill) làm blueprint; điền
  `project-knowledge/architecture.md` + `source-structure.md` theo template đã chọn; ghi ADR chọn kiến trúc.
- Giữ nguyên các bước khác; vẫn **docs-only**.

## 6. Sửa `frontend/.manifest.json`

Bỏ mô tả pipeline 5-giai-đoạn + React skeleton (react-router/React Query/react-hook-form/zod) — đều đã
gỡ ở re-platform. Thay bằng mô tả đúng: workflow frontend docs-first, `frontend-init` scaffold tài liệu
nền + **offer template kiến trúc UI (Layered/FSD)**, không pipeline bắt buộc.

## 7. Kiểm thử & verification

- `npm test`: `validate.mjs` ép parity `references/`/sharedAssets qua 4 adapter, frontmatter contract,
  strip workflow-metadata, `templates/init` đủ file, drift `AGENTS.md == template`. Phải xanh.
- `npm run build`: sinh đủ 4 provider, `architecture/` xuất hiện trong output frontend của mọi adapter.
- Kiểm bằng mắt: template có đủ 13 mục, cây `src` + Dependency Rule + cấu hình lint + checklist.

## 8. Ranh giới / ngoài phạm vi

- Không sinh code skeleton (docs-only) — chỉ blueprint cấu trúc.
- Không đụng CLI/adapter/pipeline/engine; chỉ nội dung plugin `frontend`.
- Không xử lý `frontend-implement` (thread khác, tạm gác).
- Atomic/Next để mở rộng sau (thêm file template + 1 lựa chọn ở init).

## 9. Các pha thực thi

1. Viết `plugins/frontend/templates/architecture/react-layered.template.md`.
2. Viết `plugins/frontend/templates/architecture/react-fsd.template.md`.
3. Sửa `frontend-init/SKILL.md`: frontmatter `sharedAssets` + bước chọn kiến trúc.
4. Sửa `frontend/.manifest.json` description.
5. `npm test` + `npm run build`; xác nhận `architecture/` ship qua 4 provider.
