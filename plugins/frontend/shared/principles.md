# Nguyên tắc riêng — Frontend

> Phần này BỔ SUNG cho `core/principles/` (4 nguyên tắc cốt lõi, 3 tầng tài liệu,
> ranh giới an toàn nền, nguồn sự thật nền). Chỉ mô tả phần ĐẶC THÙ frontend.

## Phân tầng mã nguồn frontend
Mỗi feature tự chứa trong `src/`: `components/` (presentational/view, nhận props vào → phát events
ra) → `containers/` + `state/` (gắn state, data-fetching) → `api/` (data layer, ánh xạ data contract).
View KHÔNG tự gọi API trực tiếp mà qua state/data layer. UI primitives/code chung ở `src/shared/`.
Cây component, design tokens, ui-contract, state-model đều externalize ra file.

## Skeleton khởi tạo (framework hỗ trợ)
`frontend-init` CÓ THỂ ship một **skeleton hạ tầng-only chạy được** cho framework hỗ trợ
(React): app bootstrap + api client (đọc base URL từ env) + feature `health` mẫu + 1 test
xanh. Skeleton KHÔNG khóa router/state-lib/styling — các lựa chọn đó vẫn do team chốt; skeleton
chỉ dùng mặc định tối giản (useState + fetch + CSS Modules) làm điểm khởi đầu thay được.

## Pipeline frontend (thứ tự bắt buộc)
**UI/Component Contract** (props/events/slots + đầy đủ trạng thái UI + data contract + UI mock/fixtures)
→ **State Model** (store/query keys/selectors + data-fetching mapping) → **Implement đầy đủ**
(code component theo từng trạng thái + nối API thật thay mock).

Contract của frontend là **HỢP ĐỒNG GIAO DIỆN component**: chốt trước public API (props vào,
events/callbacks ra, slots/children), đầy đủ trạng thái UI (loading/empty/error/success/disabled)
và data contract — hình dạng dữ liệu nhận từ API ánh xạ TRỰC TIẾP từ response schema của backend
contract — rồi mới viết logic. UI mock/fixtures khớp data contract để render component độc lập.

## Ranh giới an toàn — bổ sung frontend
- Không tự đổi shape của props/events/slots đã chốt trong `ui-contract.md`; cần đổi phải quay lại contract.
- Không hardcode API key/base URL vào component.
- Không tự chỉnh design tokens / theme toàn cục khi chưa được duyệt (ảnh hưởng diện rộng).
- Không commit code fail type-check.

## Nguồn sự thật — bổ sung frontend
`ui-contract.md` (component API + states + data contract) > state-model > implement;
backend `contract.md` (response schema) > data contract của frontend (lệch thì DỪNG, quay lại analysis);
`ui-contract.md` > fixtures/mock.
