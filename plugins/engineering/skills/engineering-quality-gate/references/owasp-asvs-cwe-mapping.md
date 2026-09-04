# Ánh xạ OWASP Top 10 ↔ ASVS ↔ CWE

Dùng bảng này để **chuẩn hoá report**, KHÔNG để thổi phồng finding. Chỉ gắn mã khi finding thật sự thuộc
loại đó; không map ép cho đủ.

| OWASP Top 10 | Họ control ASVS | CWE thường gặp |
|--------------|-----------------|----------------|
| **A01 Broken Access Control** | access control / authorization | `CWE-862`, `CWE-639`, `CWE-285` |
| **A02 Cryptographic Failures** | crypto, key management, credential storage | `CWE-327`, `CWE-328`, `CWE-916`, `CWE-798` |
| **A03 Injection** | validation, encoding, query safety | `CWE-89`, `CWE-79`, `CWE-94`, `CWE-77` |
| **A04 Insecure Design** | architecture & secure design | `CWE-602`, `CWE-284` |
| **A05 Security Misconfiguration** | secure config & deployment hardening | `CWE-16`, `CWE-489` |
| **A06 Vulnerable & Outdated Components** | dependency & component governance | `CWE-1104` |
| **A07 Identification & Authentication Failures** | authentication, session, password, MFA | `CWE-287`, `CWE-384`, `CWE-522` |
| **A08 Software & Data Integrity Failures** | integrity, trusted update & pipeline | `CWE-494`, `CWE-829` |
| **A09 Security Logging & Monitoring Failures** | audit logging & monitoring | `CWE-778`, `CWE-117` |
| **A10 SSRF** | outbound request controls & validation | `CWE-918` |

## Cách dùng trong report

- Mỗi finding bảo mật ghi tối thiểu **OWASP** (mã A0x) và **CWE** (mã cụ thể); **ASVS** ghi ở mức họ control
  khi phù hợp. Xem cột tương ứng trong [report-template.md](report-template.md).
- Nếu không ánh xạ chắc chắn → ghi `n/a` + lý do, thay vì gán bừa. Ánh xạ là để tra cứu chuẩn, không phải
  bằng chứng mức độ nghiêm trọng — severity vẫn tính từ exploitability + impact.
