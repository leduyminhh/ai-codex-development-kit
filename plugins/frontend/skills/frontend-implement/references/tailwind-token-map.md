# Token map — giá trị quan sát → token design-system + class Tailwind

Mục tiêu: đưa giá trị style thô (từ HTML/Figma/ảnh) về **token chuẩn của project** rồi phát ra **class
Tailwind**, thay vì rải giá trị lẻ (`p-[13px]`, `text-[#3b82f6]`). Ưu tiên token; chỉ dùng giá trị tuỳ ý
khi thật sự không có token phù hợp và có lý do.

## Quy tắc chung

1. Đọc `design-system.md` + `tailwind.config` của project để biết token đã có (màu, spacing scale, font).
2. Với mỗi giá trị quan sát, chọn **token gần nhất** trong thang của project; lệch nhỏ → dùng token (đừng
   chế bậc mới) trừ khi thiết kế cố ý khác.
3. Thiếu token cho một vai trò rõ ràng (vd màu "danger") → **đề xuất thêm token** vào design-system, không
   hard-code mã màu rải rác.

## Ánh xạ theo nhóm

| Nhóm | Giá trị quan sát | Về token / class |
|------|------------------|-------------------|
| Màu | `#hex`/`rgb` nền/chữ/border | token màu (`bg-primary`, `text-muted-foreground`, `border-input`) theo vai trò, KHÔNG theo mã |
| Khoảng cách | padding/margin/gap px | spacing scale (`p-4`, `gap-2`, `space-y-3`); 1 bậc ≈ 4px — chọn bậc gần nhất |
| Typography | size/weight/line-height | `text-sm/base/lg`, `font-medium/semibold`, `leading-*` theo thang font |
| Bo góc | radius px | `rounded-sm/md/lg/full` theo token radius |
| Đổ bóng | box-shadow | `shadow-sm/md/lg` theo token |
| Border | width/style/màu | `border`, `border-2`, màu theo token |
| Layout | flex/grid, direction, gap | `flex`/`grid`, `flex-col`, `items-*`, `justify-*`, `gap-*` |
| Responsive | breakpoint | prefix `sm: md: lg:` theo breakpoint của project |

## Ưu tiên & tránh

- Ưu tiên **class ngữ nghĩa của design-system** (vd `bg-card`, `text-primary`) hơn class Tailwind thô khi
  design-system định nghĩa chúng.
- Tránh `*-[giá trị tuỳ ý]` trừ khi có token thiếu thật sự; nếu buộc dùng, ghi `TODO` đề nghị bổ sung token.
- Không trộn nhiều hệ (inline style + CSS module + Tailwind) trong cùng component — theo hệ project đã chọn.
- Dark mode / theme: dùng token ngữ nghĩa (tự đổi theo theme) thay vì màu cứng, nếu project có theme.

## Với đầu vào là ảnh

Giá trị đo từ ảnh là **ước lượng** — luôn quy về **bậc token gần nhất** thay vì con số lẻ, và đánh dấu
`[ước lượng]` những chỗ suy đoán để người duyệt chỉnh nhanh.
