# Heuristic nhận diện cấu trúc React + ánh xạ file → tầng/slice

## A. Nhận diện cấu trúc hiện trạng (bước 2)

Dò các TÍN HIỆU trong cây `src/` thật (không chỉ tin tài liệu):

| Tín hiệu quan sát | Cấu trúc hiện trạng |
|---|---|
| `src/features/<x>/` hoặc `src/modules/<x>/` mỗi domain tự chứa (ui + hook + api) | Đã theo **feature** — gần FSD, thiếu luật layer/public API |
| `src/components/`, `src/hooks/`, `src/services/`, `src/utils/` phẳng theo **type** | Theo **type** — gần Layered, thiếu ép ranh giới |
| Component + `fetch()`/`axios` + `useState` lẫn trong một file, ít thư mục | **Phẳng** — chưa phân tầng |
| Có `pages/` + `containers/` + `components/` tách rõ | Đã gần **Layered**, kiểm ranh giới import |
| `entities/ features/ widgets/ shared/` + `index.ts` mỗi slice | Đã gần **FSD**, kiểm layer + cross-import |

Đối chiếu **chiều phụ thuộc thật** (đọc import của các file "lá"):
- Component presentational có `import` từ `services`/`store`/`fetch` không? → vi phạm Layered.
- Slice cùng layer import lẫn nhau (`features/A` → `features/B`, `entities/X` → `entities/Y`)? → vi phạm FSD.
- Import sâu vào ruột slice (`entities/invoice/model/x`) thay vì public API? → vi phạm FSD.

Đây là input chính cho cột (c) của bảng ánh xạ. Nhánh A: đối chiếu `architecture.md`/ADR; nếu tài liệu lệch
code, BÁO trước khi tiếp.

## B. Quy tắc ánh xạ file → tầng/slice đích (bước 2)

Đối chiếu với blueprint `architecture/react-<layered|fsd>.template.md`. **KHÔNG chép cây từ blueprint — dùng
bảng dưới để phân loại, blueprint giữ định nghĩa tầng/slice + luật.**

### B.1 Đích = Layered (react-layered.template.md)

| Loại phần tử hiện tại | Tầng đích | Ghi chú |
|---|---|---|
| Component thuần (props in / render) | `components/<domain>/` (presentational) | Bỏ mọi `fetch`/store khỏi component khi dời |
| Component "thông minh" nối data vào UI | `containers/<domain>/` | Tách phần nối data ra container; markup xuống presentational |
| Hook logic/state tái dùng, bọc React Query | `hooks/<domain>/` | Import: services, store, shared |
| Gọi API / `fetch` / `axios` / client HTTP | `services/<domain>/*.api.ts` + `services/api-client.ts` | Nơi DUY NHẤT biết HTTP/endpoint |
| Kiểu DTO backend / map view model | `services/<domain>/*.types.ts` | DTO không rò vào presentational |
| Component gắn với route | `pages/<domain>/*Page.tsx` | Chỉ compose layout + container |
| Client-state toàn cục (theme, sidebar) | `store/*.store.ts` | KHÔNG cache server-state ở đây |
| Util thuần / lib config / type chung | `shared/{utils,lib,types}` | Không phụ thuộc tầng trên |

### B.2 Đích = FSD (react-fsd.template.md)

| Loại phần tử hiện tại | Layer/segment đích | Ghi chú |
|---|---|---|
| UI-kit / wrapper component-lib / api-client base / helper thuần | `shared/{ui,api,lib,config}` | Không mang nghiệp vụ, không import layer trên |
| Thực thể nghiệp vụ (kiểu domain + thẻ hiển thị + API đọc) | `entities/<x>/{model,ui,api}` + `index.ts` | "Danh từ" nghiệp vụ; API đọc `useQuery` |
| Hành động người dùng (1 use case: tạo/sửa) | `features/<x>/{ui,model,api}` + `index.ts` | "Động từ"; `useMutation` + validation |
| Khối UI ghép lớn, tái dùng nhiều page | `widgets/<x>/{ui,model}` + `index.ts` | Ghép entity/feature, không phải 1 use case đơn |
| Component gắn với route | `pages/<x>/ui/*Page.tsx` + `index.ts` | Compose widgets/features/entities |
| Providers / router / style toàn cục | `app/{providers,routes}` | Khởi tạo app, không nghiệp vụ |

Phân loại mỗi phần tử vào một trong ba cột hành động:
- **(a) DỜI:** đã đúng tinh thần, chỉ sai vị trí → đổi thư mục + cập nhật import/alias.
- **(b) TÁCH/GOM:** cần gom về slice, thêm public API `index.ts` (FSD), hoặc tách phần nối-data (container)
  khỏi presentational (Layered).
- **(c) VI PHẠM:** ranh giới sai (presentational gọi API, cross-import cùng layer, import sâu qua public API)
  → phải cắt trước khi coi là đạt.

## C. Xử lý import alias khi dời (bước 4)

- Ưu tiên **alias tuyệt đối** (`@/...`) hơn đường dẫn tương đối sâu — dời file ít vỡ import hơn.
- Chưa có alias → cân nhắc thêm `paths` trong `tsconfig.json` + `resolve.alias` của Vite TRƯỚC khi dời nhiều
  (một bước riêng, XANH, rồi mới dời) — đây là hạ tầng, không đổi hành vi.
- Dời theo lô nhỏ: mỗi lô cập nhật đường dẫn import trỏ tới vị trí mới; giữ barrel/re-export cũ TẠM để file
  chưa dời vẫn build XANH, dọn ở CỔNG G5.

## D. Thứ tự thực thi gợi ý (bước 4)

- **Layered:** lá trước → gốc sau: `components` (presentational) → `hooks`/`services` → `containers` →
  `pages`. Tách `fetch` khỏi component sớm để cắt vi phạm (c).
- **FSD:** dưới lên: `shared` → `entities` → `features` → `widgets` → `pages`. Dựng public API `index.ts`
  cho slice trước khi để nơi khác import qua nó.

Luôn giữ mỗi lô `tsc` + test XANH; cho phép barrel tạm giữ cả đường cũ lẫn mới. Ưu tiên lô giảm được nhiều
vi phạm ranh giới nhất và nêu lý do.
