# Template: React · Layered (Presentational/Container + Hooks + Data)

## Summary

Blueprint **cấu trúc** cho một web app/SPA viết bằng **React + TypeScript** theo kiến trúc **phân tầng
Presentational/Container + Hooks + Data**: UI thuần (presentational) ← container/hook (state) ← data
layer (API client + React Query). Phụ thuộc **chỉ trỏ xuống**; presentational là lá, không biết
fetch/store. Ranh giới ép bằng **`eslint-plugin-boundaries`** (React/TS không có compiler cô lập module).
File mô tả cây thư mục, vai trò & ranh giới từng tầng, chiều phụ thuộc, ranh giới state và quy ước đặt
tên. Cây minh hoạ bằng domain `invoices` cho dễ hình dung — thay bằng domain thật theo bảng ở
[Context](#context). **Không chứa code skeleton** — chỉ blueprint để scaffold; code viết theo blueprint này.

## Context

- **Stack:** React 18+ · TypeScript · Vite · **Tailwind CSS + component library** (shadcn/MUI/antd —
  đọc `package.json`/`design-system.md` của dự án). Data-fetching: **TanStack Query (React Query)**.
- **Phạm vi file:** chỉ mô tả **CẤU TRÚC**. Biến thể quy mô lớn hơn: [react-fsd.template.md](react-fsd.template.md).
- **Khi nào dùng:** SPA vừa/nhỏ, ít domain, muốn đơn giản-đủ-dùng. **Mặc định** của kit frontend; chọn
  FSD khi app nhiều domain, nhiều team, cần ranh giới slice cứng hơn.
- **Đối chiếu domain minh hoạ ↔ vai trò:** cây dùng domain `invoices`; cột phải là "chỗ trống" cần thay.

| Vai trò (chỗ trống) | Ý nghĩa | Ví dụ trong cây `invoices` |
|---------------------|---------|----------------------------|
| Màn hình (route) | một trang gắn với path | `InvoiceListPage` (`/invoices`) |
| Container | nối data/state vào UI | `InvoiceListContainer` |
| Presentational | UI thuần, props in/events out | `InvoiceList`, `InvoiceRow` |
| Hook | logic/state tái dùng | `useInvoices`, `useDisclosure` |
| API fn (data) | gọi backend | `getInvoices()`, `createInvoice()` |
| DTO API | kiểu dữ liệu backend trả | `InvoiceDto` |
| View model | kiểu UI dùng (nếu khác DTO) | `InvoiceVM` |
| Client store | state toàn cục không phải server-state | `uiStore` (theme, sidebar) |

## Problem

Trong React, logic và data-fetching rất dễ lẫn thẳng vào component: `fetch()` trong `useEffect` giữa JSX,
state rải khắp nơi, component vừa gọi API vừa render vừa giữ business rule. Hệ quả: khó test (phải mock
mạng để render UI), khó tái dùng UI (dính chặt nguồn dữ liệu), đổi API là sửa cả component hiển thị, và
"server-state" (cache, refetch, loading) bị nhét vào `useState` thủ công dễ sai.

## Solution

Tách 4 tầng, phụ thuộc **chỉ trỏ xuống**:

1. **Presentational** (`components/`): thuần UI — nhận `props` (data + callback), render bằng Tailwind +
   component-lib, **không** fetch/không store/không business rule. Dễ test bằng render + props.
2. **Container** (`containers/`): nối tầng dưới vào presentational — gọi hook, truyền data + handler
   xuống. Ít/không markup.
3. **Hook** (`hooks/`): logic & state tái dùng — bọc React Query (`useQuery`/`useMutation`) gọi data layer,
   hoặc client-state (`useDisclosure`).
4. **Data** (`services/`): API client + hàm gọi backend + kiểu DTO. Nơi **duy nhất** biết HTTP.

Server-state do **React Query** quản (cache/refetch/stale ở tầng hook+data), tách khỏi client-state
(`store/`). Presentational stateless → tái dùng và test độc lập. Ép chiều phụ thuộc bằng
`eslint-plugin-boundaries` (fail lint nếu presentational import service/store).

## Architecture

### Cây thư mục

Cây minh hoạ domain `invoices`. Ở **thư mục lá** chỉ nêu **một file tượng trưng**; `+ …` báo còn file
cùng loại — quan trọng là **cây thư mục** và ranh giới, không phải liệt kê hết file. File component
PascalCase (`InvoiceList.tsx`), hook/util camelCase (`useInvoices.ts`).

```
src/
├── main.tsx                          # entry — mount <App/>
├── app/                              # APP SHELL: providers + router + layout gốc
│   ├── App.tsx
│   ├── providers.tsx                 #   QueryClientProvider, RouterProvider, ThemeProvider
│   └── routes.tsx                    #   khai báo route -> pages (lazy import)
│
├── pages/                            # TẦNG ROUTE: compose container + layout cho MỘT màn hình
│   └── invoices/
│       └── InvoiceListPage.tsx       #   chỉ compose: <PageLayout><InvoiceListContainer/></PageLayout>
│
├── containers/                       # CONTAINER: nối state/data vào presentational (logic, ít markup)
│   └── invoices/
│       └── InvoiceListContainer.tsx  #   gọi useInvoices(); truyền {invoices, loading, onSelect} xuống <InvoiceList/>
│
├── components/                       # PRESENTATIONAL: THUẦN UI — props in / events out, KHÔNG fetch/store
│   ├── invoices/
│   │   ├── InvoiceList.tsx           #   nhận invoices + onSelect qua props; render Tailwind + component-lib
│   │   └── InvoiceRow.tsx            #   (+ InvoiceStatusBadge.tsx …)
│   └── ui/                           #   primitive/wrapper quanh component-lib (Button, Card…) tái dùng
│
├── hooks/                            # LOGIC/STATE tái dùng
│   └── invoices/
│       └── useInvoices.ts            #   useQuery(getInvoices) — server-state qua React Query
│
├── services/                         # DATA LAYER: nơi DUY NHẤT biết HTTP
│   ├── api-client.ts                 #   wrapper fetch/axios: baseURL, header, xử lý lỗi/interceptor
│   └── invoices/
│       ├── invoice.api.ts            #   getInvoices()/createInvoice() -> gọi api-client
│       └── invoice.types.ts          #   InvoiceDto (kiểu backend) + map -> view model nếu cần
│
├── store/                            # CLIENT STATE toàn cục (Zustand/Context) — KHÔNG server-state
│   └── ui.store.ts                   #   theme, sidebar mở/đóng…
│
└── shared/                           # DÙNG CHUNG, không theo domain
    ├── lib/                          #   cấu hình lib (queryClient, tailwind helpers)
    ├── types/                        #   kiểu dùng chung
    └── utils/                        #   hàm thuần (format tiền/ngày…)
```

> **Ánh xạ tư duy:** `pages` = màn hình, `containers` = "thông minh" (nối dữ liệu), `components` = "ngu"
> (chỉ hiển thị), `hooks`+`services` = nguồn dữ liệu/logic. Router khai ở `app/routes.tsx`.

### Vai trò & ranh giới từng tầng

Ranh giới do `eslint-plugin-boundaries` ép (không có compiler cô lập như Maven).

- **`app`** — dựng providers (QueryClient, Router, Theme) + layout gốc + khai route. Chỉ compose, không
  business logic. "Thấy" pages.
- **`pages`** — một màn hình = một route; **chỉ compose** layout + container. Không fetch, không markup
  chi tiết. Import: containers, components (layout), shared.
- **`containers`** — nối tầng dưới vào presentational: gọi `useInvoices()`, xử lý điều hướng/handler,
  truyền props xuống. **Ít hoặc không JSX phức tạp.** Import: hooks, components, shared. **KHÔNG** gọi
  thẳng `services` (đi qua hook).
- **`components`** — **PRESENTATIONAL, thuần UI**: nhận props, render bằng Tailwind + component-lib, phát
  sự kiện qua callback. **KHÔNG** `import` services/store/hooks; **KHÔNG** fetch; không business rule.
  State cục bộ **chỉ** cho UI (vd input controlled) — không giữ dữ liệu domain. Lá của đồ thị phụ thuộc.
- **`hooks`** — logic/state tái dùng: bọc React Query gọi `services` (server-state), hoặc client-state.
  Import: services, store, shared.
- **`services`** — **data layer**: `api-client` + hàm API + kiểu DTO. Nơi **duy nhất** biết HTTP/endpoint.
  Import: shared. Không import React/UI.
- **`store`** — client-state toàn cục (theme, UI flags). **KHÔNG** cache server-state (đó là việc React
  Query). Import: shared.
- **`shared`** — util/type/lib config dùng chung, không theo domain, không phụ thuộc tầng nào ở trên.

### Chiều phụ thuộc

Phụ thuộc chỉ trỏ **xuống**: `app → pages → containers → {hooks, components}`, `hooks → services → shared`,
`store → shared`. Presentational (`components`) chỉ import `shared` (+ `components/ui`). Ép bằng
`eslint-plugin-boundaries` — vi phạm là **fail lint**:

```jsonc
// .eslintrc — sketch KHỞI ĐIỂM, chỉnh theo dự án
{
  "settings": {
    "boundaries/elements": [
      { "type": "app",       "pattern": "src/app/*" },
      { "type": "page",      "pattern": "src/pages/*" },
      { "type": "container", "pattern": "src/containers/*" },
      { "type": "component", "pattern": "src/components/*" },
      { "type": "hook",      "pattern": "src/hooks/*" },
      { "type": "service",   "pattern": "src/services/*" },
      { "type": "store",     "pattern": "src/store/*" },
      { "type": "shared",    "pattern": "src/shared/*" }
    ]
  },
  "rules": {
    "boundaries/element-types": ["error", {
      "default": "disallow",
      "rules": [
        { "from": "app",       "allow": ["page", "component", "shared"] },
        { "from": "page",      "allow": ["container", "component", "shared"] },
        { "from": "container", "allow": ["hook", "component", "shared"] },
        { "from": "component", "allow": ["component", "shared"] },
        { "from": "hook",      "allow": ["service", "store", "shared"] },
        { "from": "service",   "allow": ["service", "shared"] },
        { "from": "store",     "allow": ["shared"] },
        { "from": "shared",    "allow": ["shared"] }
      ]
    }]
  }
}
```

> `eslint-plugin-boundaries` chặn **chiều import**, KHÔNG chặn naming — quy ước tên (`*Page`/`*Container`/
> `use*`/`*.api`) vẫn giữ bằng review hoặc một rule tên riêng.

### Ranh giới state

| Loại state | Ở đâu | Công cụ |
|-----------|-------|---------|
| Server-state (dữ liệu từ API: list, detail, cache, refetch) | `hooks/` bọc `services/` | **React Query** (`useQuery`/`useMutation`) — KHÔNG copy vào `useState` |
| Client-state toàn cục (theme, sidebar, auth UI) | `store/` | Zustand/Context |
| UI-state cục bộ (input, mở/đóng menu) | trong component | `useState`/`useReducer` |

## Implementation

Map ở biên để presentational luôn sạch, DTO backend không rò vào UI:

| Ranh giới | Map ở | Quy tắc |
|-----------|-------|---------|
| DTO API → view model | `services/invoices/invoice.types.ts` (hàm `toInvoiceVM`) | Nếu shape backend khác nhu cầu UI, map ở data layer; presentational chỉ thấy view model. Shape trùng thì dùng thẳng DTO, khỏi lớp thừa. |
| Data/handler → presentational | `containers/*Container.tsx` | Container gọi hook, truyền `{data, loading, error, onX}` xuống presentational qua props. Presentational không tự lấy dữ liệu. |
| Gọi API | `services/*/invoice.api.ts` qua `api-client.ts` | Mọi HTTP tập trung ở `api-client` (baseURL, header auth, map lỗi); hàm API không gọi `fetch` trực tiếp rải rác. |

## Standards

- **Presentational stateless:** `components/` chỉ props in / events out; không import service/store/hook.
- **Container mỏng:** nối hook → presentational; không nhồi markup lớn, không business rule.
- **Server-state = React Query:** không tự quản cache bằng `useState`/`useEffect`.
- **Data layer cô lập:** chỉ `services/` biết endpoint/HTTP; UI không thấy URL.
- **Đặt tên:** trang `*Page`, container `*Container`, hook `use*`, API `*.api.ts`, kiểu DTO `*Dto`, view
  model `*VM`, store `*.store.ts`. Component PascalCase, hook/util camelCase.
- **Styling:** Tailwind cho layout/tuỳ biến; ưu tiên tái dùng component-lib (Button/Card/Dialog…) trước
  khi tự dựng; không style inline rời rạc.

## Best Practices

- Bắt đầu presentational thuần với dữ liệu giả (props), rồi mới bọc container nối data — dễ test/preview.
- Một domain = một thư mục con ở mỗi tầng (`components/invoices`, `hooks/invoices`, `services/invoices`).
- Giữ `api-client` là điểm chèn header auth, retry, map lỗi → hàm API ngắn gọn.
- View model chỉ tạo khi thật sự cần (shape lệch); tránh lớp map thừa.
- Đặt `queryClient` + key convention ở `shared/lib`; key theo domain (`['invoices', params]`).

## Anti-patterns

- `fetch()`/`axios` trong component presentational hoặc `useEffect` giữa JSX (phải ở `services` qua hook).
- Presentational `import` từ `services`/`store`/`hooks` (fail `eslint-plugin-boundaries`).
- Container gọi thẳng `services` không qua hook (mất chỗ quản server-state).
- Nhồi business rule vào component hiển thị.
- Copy dữ liệu React Query sang `useState` rồi tự đồng bộ (nguồn sự thật đôi → lệch).
- Store client giữ luôn cache API (trộn client-state với server-state).
- DTO backend dùng thẳng khắp UI khi shape thực sự lệch nhu cầu hiển thị.

## Examples

Luồng màn hình `/invoices` (danh sách hoá đơn):

1. `app/routes.tsx` map `/invoices` → `InvoiceListPage`.
2. `InvoiceListPage` (page) compose layout + `<InvoiceListContainer/>`.
3. `InvoiceListContainer` gọi `useInvoices()` → `{data, isLoading, error}`, truyền xuống
   `<InvoiceList invoices={data} loading={isLoading} onSelect={…}/>`.
4. `useInvoices` = `useQuery(['invoices'], getInvoices)`; `getInvoices()` ở `services/invoices/invoice.api.ts`
   gọi `api-client`.
5. `InvoiceList`/`InvoiceRow` (presentational) render bằng Tailwind + component-lib từ props; bấm dòng →
   gọi `onSelect` (callback), không tự điều hướng/không tự fetch.

## Checklist

Scaffold coi là đúng khi:

- [ ] `eslint-plugin-boundaries` xanh; `components/` **không** import `services`/`store`/`hooks`.
- [ ] Không có `fetch`/`axios` ngoài `services/`.
- [ ] Server-state đi qua React Query (không `useState` giữ cache API).
- [ ] Container mỏng (nối hook→presentational), presentational nhận đủ data/handler qua props.
- [ ] Một domain có thư mục con nhất quán ở `components`/`hooks`/`services`.
- [ ] `tsc` + `eslint` xanh; component test được bằng render + props (không cần mock mạng).

## References

- Ghi **lựa chọn kiến trúc này thành ADR** (Nygard) ở `docs/decisions/` — vì sao Layered, phương án đã
  cân nhắc, hệ quả.
- `eslint-plugin-boundaries` — ép chiều import theo tầng (fitness function; tương đương ArchUnit/import-linter
  của backend). Cấu hình trong file là khởi điểm, chỉnh theo dự án.
- TanStack Query — quản server-state (cache/refetch/mutation) thay cho `useEffect` thủ công.

## Related

- [react-fsd.template.md](react-fsd.template.md) — biến thể quy mô lớn: chia theo layer/slice
  (app/pages/widgets/features/entities/shared), ranh giới slice cứng, public API `index.ts`.
