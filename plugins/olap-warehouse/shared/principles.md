# Nguyên tắc riêng — OLAP Warehouse

> Phần này BỔ SUNG cho `core/principles/` (4 nguyên tắc cốt lõi, 3 tầng tài liệu,
> ranh giới an toàn nền, nguồn sự thật nền). Chỉ mô tả phần ĐẶC THÙ olap-warehouse.

## Thẻ nhận diện — olap-warehouse
- **Là ai:** workflow xây KHO/pipeline PHÂN TÍCH; chốt data contract (schema đầu ra + SLA + nguồn)
  làm hợp đồng cho downstream, rồi mô hình hoá dimensional/normalized + lineage, rồi build
  transform thật + data quality test. Bao cả warehouse, lakehouse, stream.
- **Viết tắt:** OLAP = Online Analytical Processing (xử lý phân tích trực tuyến) — đọc khối lớn,
  tổng hợp/aggregate, mô hình chiều (dimensional); tối ưu cho truy vấn phân tích, không phải giao dịch.
- **Đọc dữ liệu TỪ:** các nguồn vận hành — gồm chính `oltp-database` — KHÔNG sở hữu giao dịch vận hành.
- **Phục vụ:** BI/report/dashboard, data science, downstream dataset consumer.
- **KHÁC ai:** KHÁC `oltp-database` (giao dịch vận hành OLTP, DB dùng chung là sản phẩm) và KHÁC
  `backend-erd` (mô hình nhúng trong app).

## Phân tầng mã nguồn / transform
Transform/job/model nằm trong root riêng (mặc định `pipelines/`): `source/ingest` → `transform/model`
→ `sink/serving`, KHÔNG trộn với tài liệu. `docs/contracts/` chứa data contract đã công bố cho
downstream. Mọi data contract, lineage, kiến thức nền externalize ra file.

> Lưu ý 2 chốt con người với data đặc biệt quan trọng: một transform sai có thể làm hỏng cả
> dataset downstream.

## Pipeline data (thứ tự bắt buộc)
**Data Contract** (schema đầu ra + SLA + sample/synthetic) → **Model & Lineage** (mô hình hóa +
lineage cột + mapping transform→nguồn) → **Implement đầy đủ** (transform thật + data quality test).
Chốt HÌNH DẠNG dữ liệu đích trước (schema, grain, key, partition, freshness/SLA, expectation chất
lượng), rồi mô hình hóa nguồn→trung gian→đích + lineage, rồi mới build transform thật.

Contract của pipeline là **DATA CONTRACT** của dataset đầu ra: chốt trước schema đích (tên cột, kiểu,
nullability, semantic/đơn vị, primary/unique key, grain, partition key), kèm freshness/SLA và kỳ vọng
chất lượng (uniqueness/range/not-null) cùng quy tắc late/duplicate/null. Golden sample/synthetic data
khớp schema đóng vai MOCK để dev/test transform độc lập với nguồn upstream.

## Vòng đời & recipe on-demand
Ngoài pipeline bắt buộc (init → analysis → schema-contract → model-lineage → implement), olap-warehouse
có recipe ON-DEMAND (không thuộc chuỗi) cho tầng MAINTAIN + OPS — đối xứng vòng đời của `oltp-database`:
- **`olap-warehouse-validate`** (maintain): cổng kiểm chất lượng dữ liệu (data quality test khớp
  `contract.md`) + soát drift output ↔ data contract đã công bố + lineage. Chỉ báo cáo, không tự sửa.
- **`olap-warehouse-operate`** (ops): orchestration/scheduling (DAG, SLA, retry) + backfill/reprocessing
  (idempotent, partition-aware, khoảng có giới hạn) + deploy theo môi trường (secret qua env/vault, prod
  qua người duyệt). Blueprint, không tự chạy lên production.
Gọi khi cần ở bất kỳ giai đoạn nào; mọi thao tác rủi ro (backfill/overwrite/prod) tuân ranh giới an toàn bên dưới.

## Ranh giới an toàn — bổ sung olap-warehouse
- Không chạy migration / backfill / lệnh phá hủy/ghi đè dữ liệu (DROP/TRUNCATE/overwrite partition) khi chưa duyệt.
- Không tự kết nối / đọc-ghi nguồn dữ liệu production khi chưa được phép; ưu tiên sample/synthetic.
- Không commit transform fail data quality test.

## Nguồn sự thật — bổ sung olap-warehouse
schema/DDL thực của dataset đích > `data-model.md`; `contract.md` (data contract) > sample/synthetic
> lineage suy đoán. Transform tạo output lệch contract: DỪNG, sửa cho khớp hoặc cập nhật contract
(có ADR, version backward-compat) — KHÔNG để output trôi khỏi hợp đồng đã công bố.
