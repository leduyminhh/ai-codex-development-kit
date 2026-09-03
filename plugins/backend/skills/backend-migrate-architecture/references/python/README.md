# Kiểm ranh giới kiến trúc bằng import-linter (Python)

Cài (dev): `pip install import-linter` (hoặc thêm vào nhóm dev của `pyproject.toml`).

Copy contract tương ứng kiểu đích vào `setup.cfg` / `.importlinter` / `pyproject.toml`
(`[tool.importlinter]`) và đổi `myapp` thành package gốc thật của project. Chạy:

```bash
lint-imports
```

Lệnh này là CỔNG G4 (bước 8); đưa vào CI để làm gate thường trực. Contract "layers" hiểu
theo thứ tự trên→dưới = ngoài→trong: tầng trên được import tầng dưới, KHÔNG ngược lại — nên
domain (dưới cùng) không thể import application/infrastructure.

- Onion+DDD → `onion.importlinter`
- Hexagonal+DDD → `hexagonal.importlinter`
- Hexagonal/Clean+CQRS → `cqrs.importlinter`

Mapper là module hàm thuần trong `infrastructure/.../mapper.py` (co-locate cạnh adapter dùng
nó). Contract `layers` sẵn có đã chặn domain phụ thuộc mapper (mapper ở infra = tầng ngoài),
không cần contract mới.
