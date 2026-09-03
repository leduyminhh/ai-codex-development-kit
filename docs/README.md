# Docs

`docs/` contains stable repository documentation that should outlive a single task
or PR. Do not use it as a dumping ground for generated reports.

> Vietnamese: see [README_VI.md](README_VI.md).

## Structure

| Folder | What it owns |
| --- | --- |
| `superpowers/specs/` | Design specs from structured development work — durable design decisions and implementation boundaries. |

## What belongs here

- Architecture / design records that explain why the repository is shaped the way it is.
- Durable handoff notes for future maintainers.

## What does not belong here

- Temporary command output, scan reports, or local debugging notes.
- Plugin-owned usage docs — keep those in the owning plugin directory.

## Change checklist

- Keep claims traceable to code, configs, tests, or explicit decisions.
- Update English `README.md` first, then synchronize `README_VI.md`.
