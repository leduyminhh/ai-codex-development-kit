# Characterization test — khóa hành vi code cũ trước khi sửa

Tài liệu tham chiếu cho `backend-testing`, bước 3. Dùng khi cần sửa/refactor code cũ **chưa có
test bao quanh** (hoặc test quá thưa). Mục tiêu: dựng **lưới an toàn hồi quy** trước khi động
code, để mọi thay đổi hành vi ngoài ý muốn lộ ra ngay.

## Characterization test là gì

Test **mô tả hành vi HIỆN TẠI của code như nó đang chạy** — kể cả hành vi có vẻ lạ — chứ không
mô tả hành vi "đáng lẽ đúng". Nó chốt lại "hệ thống hôm nay làm gì" để khi refactor, nếu hành
vi đổi ngoài ý định, test sẽ đỏ.

Khác với test thông thường: test thường khẳng định hành vi ĐÚNG theo yêu cầu; characterization
khóa hành vi ĐANG CÓ (đúng hay sai chưa xét). Nếu phát hiện hành vi hiện tại có vẻ là bug → GHI
LẠI, BÁO cho người quyết, KHÔNG tự "sửa cho đúng" trong lúc dựng lưới.

## Quy trình

1. **Xác định điểm vào (seam) công khai** để gọi vào vùng cần khóa: API endpoint, application
   service, hàm public. Chọn điểm vào **ổn định**, ít khả năng phải đổi khi refactor.
2. **Khoanh vùng phụ thuộc ngoài:** DB, HTTP, thời gian, ngẫu nhiên. Với vùng cần chạy nhanh →
   mock/fake ở ranh giới; với vùng persistence quan trọng → Testcontainers/DB dùng-một-lần. Cố
   định nguồn bất định (clock, seed random) để kết quả tái lập.
3. **Ghi lại output + side-effect quan sát được** với vài bộ input đại diện (nhánh chính + case
   biên đã biết): giá trị trả về, trạng thái lưu xuống, thông điệp/exception, lệnh gọi ra ngoài.
   Nếu chưa biết output, chạy thử một lần, đọc kết quả THẬT rồi chốt kỳ vọng theo kết quả đó.
4. **Xác nhận toàn bộ characterization test XANH trên code CŨ** (chưa sửa gì). Đây là mốc: lưới
   chỉ có giá trị khi nó xanh trên hiện trạng.
5. **Refactor/sửa từng bước nhỏ**, chạy lại lưới sau mỗi bước. Đỏ → hoặc thay đổi làm lệch hành
   vi (revert/sửa), hoặc là thay đổi hành vi CHỦ Ý → cập nhật test kèm giải thích *vì sao* trong
   commit. Không sửa test để "cho xanh" mà không hiểu vì sao đỏ.

## Chọn độ phủ cho lưới

- Phủ **các đường đi bạn sắp động vào** trước; không cố khóa toàn bộ code cũ cùng lúc.
- Ưu tiên nhánh nghiệp vụ chính + case biên đã biết đi qua vùng refactor.
- Không có điểm vào rõ để gọi (code rối, phụ thuộc chằng chịt) → BÁO rủi ro, đề xuất thu hẹp
  phạm vi refactor hoặc tách seam tối thiểu trước, thay vì refactor mù.

## Sau khi refactor xong

- Giữ characterization test ở lại repo làm **tài sản hồi quy** (đừng xóa sau khi refactor).
- Với hành vi mà quá trình này lộ ra là **bug thật**, ghi rõ trong báo cáo + để người quyết: sửa
  code (kèm test khẳng định hành vi ĐÚNG mới) hay giữ nguyên. Không âm thầm đổi.
- Nêu residual risk: đường đi chưa khóa được, phụ thuộc chưa cô lập được hoàn toàn.
