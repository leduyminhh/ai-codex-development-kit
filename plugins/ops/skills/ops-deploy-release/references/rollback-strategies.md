# Chiến lược triển khai & rollback

Chọn chiến lược theo đặc điểm service, KHÔNG áp cứng một kiểu. Mỗi chiến lược cần **tiêu chí tiến/lùi**
đo được và **đường rollback** đã chuẩn bị TRƯỚC khi triển khai. Với production, mọi bước tiến/lùi đều
**chờ xác nhận của người** (xem [deploy-safety.md](deploy-safety.md)).

## So sánh nhanh

| Chiến lược | Khi nào dùng | Tài nguyên | Rollback |
|-----------|--------------|-----------|----------|
| Rolling | Service chạy được **nhiều version song song**; thay đổi tương thích ngược; tài nguyên vừa | Không cần gấp đôi | Rolling ngược về image/version cũ theo từng batch |
| Blue-green | Cần **cắt/đảo tức thì**, kiểm thử full trên môi trường "green" trước khi chuyển traffic | Cần ~gấp đôi (2 môi trường) | Chuyển traffic về "blue" (version cũ) tức thì |
| Canary | Thay đổi **rủi ro cao**, muốn phơi nhiễm **tỉ lệ nhỏ** rồi tăng dần theo metric | Vừa (một nhóm nhỏ instance) | Cắt traffic canary về 0%, giữ version cũ phục vụ phần còn lại |

## Rolling update
- **Cách làm:** thay lần lượt từng batch instance sang version mới; giữ đủ instance lành phục vụ.
- **Tiêu chí tiến:** mỗi batch mới **readiness/health OK** + error rate/latency trong ngưỡng trước khi sang batch kế.
- **Tiêu chí lùi:** một batch fail readiness hoặc metric vượt ngưỡng → dừng, **rolling ngược** về version cũ.
- **Lưu ý:** hai version chạy song song → thay đổi phải **tương thích ngược** (API/schema/message).

## Blue-green
- **Cách làm:** dựng môi trường "green" (version mới) song song "blue" (đang chạy); test green; **chuyển traffic**
  blue → green; giữ blue một khoảng làm đường lùi.
- **Tiêu chí tiến:** green pass smoke test + health trước khi chuyển; sau chuyển, metric ổn định trong cửa sổ theo dõi.
- **Tiêu chí lùi:** metric/health sau chuyển vượt ngưỡng → **chuyển traffic về blue** (tức thì), điều tra green sau.
- **Lưu ý:** migration schema dùng chung DB cần **tương thích cả hai version** trong lúc còn giữ blue.

## Canary
- **Cách làm:** đưa version mới cho **tỉ lệ nhỏ** traffic (vd 1% → 5% → 25% → 100%); tăng dần theo metric.
- **Tiêu chí tiến:** ở mỗi mốc %, error rate / latency / lỗi nghiệp vụ của canary **không tệ hơn** baseline quá
  ngưỡng, trong cửa sổ quan sát đã định → tăng %.
- **Tiêu chí lùi:** vượt ngưỡng ở bất kỳ mốc nào → **cắt canary về 0%**, giữ version cũ; điều tra trước khi thử lại.
- **Lưu ý:** cần đủ traffic + đo lường phân tách canary vs baseline mới đánh giá được.

## Rollback — nguyên tắc chung
- **Chuẩn bị trước:** điểm khôi phục (version/artifact/tag) + dữ liệu (nếu đụng schema) phải sẵn TRƯỚC khi deploy.
- **Ưu tiên đường đã thử:** rollback theo đúng chiến lược đã triển khai (rolling ngược / chuyển traffic / cắt canary).
- **Schema:** nếu migration không đảo được, rollback code có thể **không đủ** — cần forward-fix; nêu rõ `[giả định]`
  và rủi ro dữ liệu, chờ người quyết.
- **Sau rollback:** health-check lại, thông báo, ghi lại nguyên nhân + trạng thái; nêu **residual risk** còn lại.
