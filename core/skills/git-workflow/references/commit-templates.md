# Template commit message

Dùng sau khi đã đọc `commit-convention.md`, khi staged diff cần chọn template.
Ưu tiên template NHỎ NHẤT giải thích được thay đổi mà không giấu ngữ cảnh review
hay migration quan trọng.

## Chọn cỡ commit

- `small`: một thay đổi tập trung, title đủ nói hết, không cần body dài.
- `medium`: một thay đổi logic với vài bullet liên quan.
- `large`: một thay đổi logic trải nhiều module hoặc vùng vận hành.
- `breaking`: hành vi không tương thích, gỡ contract, cần migration, hoặc consumer
  phải hành động.

Quy tắc: commit daily gọn cho việc thường ngày; chỉ dùng mục có cấu trúc khi giúp review
dễ hơn; tách thay đổi không liên quan thay vì ép vào template lớn; header tiếng Anh,
body tiếng Việt có dấu (mặc định của kit).

## Daily commit (small/medium)

```text
<type>(<scope>): <summary>

Changed:
- <what changed>
- <what changed>

Reason:
- <why this change was needed>
```

Thay đổi rất nhỏ và tự giải thích được thì một dòng là đủ:

```text
fix(editor): correct font size label
```

## Structured body (khi có nhiều loại thay đổi)

Chỉ giữ mục có thật:

```text
<type>(<scope>): <summary>

Added:
- <new behavior or capability>

Changed:
- <modified behavior>

Fixed:
- <bug fix>

Removed:
- <deleted behavior or file>
```

## Multi-module (một thay đổi chạm nhiều tầng)

Bỏ module không chạm; không bịa tác động ngoài staged diff:

```text
<type>(<scope>): <summary>

Backend:
- <backend change>

Frontend:
- <frontend change>

Database:
- <database change>

CLI:
- <CLI change>

Documentation:
- <documentation change>
```

## Long body (large/breaking, hoặc mục ≥3 bullet dày)

Bullet cha ngắn gọn, facts liên quan nằm dưới dạng `•`. KHÔNG dùng nested bullet để
giấu thay đổi không liên quan đáng lẽ phải là bullet riêng hoặc commit riêng.

```text
<type>(<scope>): <summary>

Changed:
- <parent behavior or workflow change>
  • <supporting component, flag, artifact, or secondary flow>
  • <supporting constraint or operational detail>
- <independent behavior or workflow change>
  • <supporting detail>

Reason:
- <why the parent changes were needed>
  • <supporting operational or maintenance reason>

Important notes / Breaking impact:
- <required consumer action>
  • <migration or compatibility detail>
```

## Refactor

```text
refactor(<scope>): <summary>

Changed:
- <structure change>
- <extraction or simplification>

Reason:
- <why the refactor was needed>

Impact:
- <expected behavior impact, usually no behavior change expected>
```

## Fix (khi đã biết root cause)

```text
fix(<scope>): <summary>

Fixed:
- <bug fixed>

Root cause:
- <why the bug happened>

Impact:
- <who or what is affected>
```

## Breaking change

Header phải có `!`; body phải có `BREAKING CHANGE:` + migration:

```text
<type>(<scope>)!: <summary>

BREAKING CHANGE: <short summary of incompatible change>

Changed:
- <changed behavior>

Removed:
- <removed behavior>

Migration:
- <required migration step>
```

## Large architecture commit

Cho commit nền tảng/migration/kiến trúc lớn; chỉ giữ mục diff chứng minh được:

```text
<type>(<scope>)!: <summary>

BREAKING CHANGE: <one-line breaking summary>

Architecture:
- <architecture change>

Backend:
- <backend change>

Frontend:
- <frontend change>

CLI:
- <CLI change>

Documentation:
- <documentation change>

Cleanup:
- <removed files or obsolete logic>

Migration:
- <migration step>
```

## Pull Request notes

Dùng khi người dùng yêu cầu chuẩn bị PR:

```md
Summary:

- 
- 

Changes:

Added:
- 

Changed:
- 

Fixed:
- 

Removed:
- 

Migration:

- 

Testing:

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual test
- [ ] Build passed

Risk:

- Low / Medium / High

Notes:

- 
```

## Chuẩn chất lượng

Body tốt là body CỤ THỂ:

```text
Changed:
- replace polling with websocket updates
- reduce repeated API calls during execution monitoring
```

Tránh mơ hồ:

```text
Changed:
- update code
- fix issue
- improve logic
```
