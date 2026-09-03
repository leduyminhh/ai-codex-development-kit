# Input adapters — rút "design intent" từ ba dạng đầu vào

Trước khi sinh bất kỳ React nào, luôn rút một **design intent** — mô tả trung gian, KHÔNG phải code — rồi
mới map sang component. Nhờ đó ba dạng đầu vào (HTML/CSS, Figma-MCP, ảnh) hội tụ về một đường sinh chung.

## "Design intent" gồm gì

- **Cấu trúc/layout:** cây phần tử + quan hệ bố cục (row/column/grid/stack), thứ tự, nhóm lặp (list/table).
- **Token quan sát:** màu, khoảng cách (padding/gap/margin), typography (size/weight/line-height), bo góc,
  đổ bóng, border — ở dạng **giá trị thô** để map sang token chuẩn ở bước sau.
- **Phần tử UI + vai trò:** nút, input, select, tab, badge, card, dialog, bảng… (danh từ UI, không phải div vô danh).
- **Tương tác nhìn thấy:** trạng thái (hover/active/disabled/selected), toggle, mở/đóng, chuyển tab, submit form.
- **Nội dung động (chỗ trống dữ liệu):** phần rõ ràng đến từ dữ liệu (danh sách, số liệu, tên) — đánh dấu
  để bước sinh để trống bằng `props`.

Ghi lại design intent ngắn gọn (bullet/bảng) trước khi sinh; nếu có phần **ước lượng** (đo bằng mắt),
đánh dấu `[ước lượng]` để người duyệt kiểm.

## Adapter A — File HTML/CSS có sẵn

Chính xác nhất (có giá trị thật). Cách rút:

- Đọc file: dựng cây DOM; giữ **semantic** (`header/nav/main/section/form/button/label`) — nó gợi thẳng
  vai trò UI + a11y.
- Lấy style đã áp: đọc CSS (class, inline, biến `--*`). Với utility-CSS sẵn có (Tailwind trong HTML) →
  giữ nguyên ý nghĩa class. Với CSS thường → rút giá trị (màu, px, rem) làm token quan sát.
- Nhận diện phần lặp (item giống nhau) → một component + render list qua `props`.
- KHÔNG bê nguyên `<style>`/inline vào JSX; chuyển sang Tailwind + token ở bước map.

## Adapter B — Figma qua MCP / Dev Mode

Có cấu trúc, chính xác về khoảng cách/màu nếu MCP trả đủ:

- Dùng **MCP tool của Figma trong session** để lấy node/frame + style (fill, spacing, typography,
  auto-layout, constraints). Không có Figma MCP trong session → **hạ về Adapter C (ảnh)** và nói rõ.
- Map **auto-layout → flex/grid** (direction/gap/padding thẳng ra Tailwind `flex`/`grid`/`gap-*`/`p-*`).
- Map **style token của Figma → token design-system** (đừng chép mã màu thô nếu design-system đã có token
  tương ứng).
- Tên layer Figma thường gợi vai trò component — dùng làm gợi ý đặt tên, nhưng chuẩn hoá theo
  `code-convention.md`.
- Bỏ chi tiết chỉ phục vụ dựng hình trong Figma (group thừa, layer ẩn) — giữ cây UI có nghĩa.

## Adapter C — Ảnh / screenshot

Linh hoạt nhất, kém chính xác nhất về đo đạc:

- Nhìn ảnh, suy **cấu trúc + vai trò + hệ phân cấp** trước; đo khoảng cách/màu là **ước lượng** — bám
  **thang token của design-system** (vd chọn `gap-4` gần nhất) thay vì chế giá trị lẻ.
- Đánh dấu mọi con số suy từ ảnh là `[ước lượng]`; liệt kê giả định (màu nền, cỡ chữ) để người duyệt sửa nhanh.
- Text đọc được trong ảnh → nội dung mẫu; đừng hard-code nếu rõ là dữ liệu động (để `props`).
- Nếu ảnh mờ/thiếu state (không thấy hover/disabled) → nêu rõ "thiếu, cần xác nhận", không tự bịa.

## Sau khi rút

Chuyển sang [component-mapping.md](component-mapping.md) (map phần tử → component) và
[tailwind-token-map.md](tailwind-token-map.md) (map token quan sát → token chuẩn + class).
