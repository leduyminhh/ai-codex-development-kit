# Migration Guide

## Re-platform: legacy `ai-engineering` / `aie` → `ai-engineering-platform` / `aip`

This release rebuilds the platform on a pure-ESM, zero-dependency engine and trims
content to a lean, docs-only core. It is a breaking change; there is no in-place
upgrade of an old install — uninstall with the old CLI (or delete its state), then
install fresh with `aip`.

### What changed

| Area | Before (legacy) | Now |
| --- | --- | --- |
| CLI | `ai-engineering` / `aie` | `ai-engineering-platform` / `aip` |
| Engine | TypeScript compiled to `cli/dist/` (build step) | Pure ESM, zero runtime deps, no build step |
| Commands | `init`, `install`, `check`, `doctor`, `remove`, `upgrade`, `artifact`, `registry`, `migrate`, `generate-adapter` | `install`, `uninstall`, `build`, `check`, `list`, `update` (+ menu wizard) |
| Plugin manifest | `plugins/<id>/plugin.yaml` (assets/skills lists) | `plugins/<id>/.manifest.json` (`id/name/description/version`) + auto-discovered skills |
| Plugins | 7 abstract plugins (`application`, `architecture`, `data`, `knowledge`, `platform`, `quality`, `security`) | 4 domain plugins (`backend`, `frontend`, `oltp-database`, `olap-warehouse`) + `core` |
| Workflow model | 5-stage pipeline per plugin | No pipeline — skills are standalone on-demand recipes |
| State | Multi-file `.ai-engineering/` (`platform.lock`, `ownership.json`, backups, …) | Single flat `.ai-engineering/manifest.json` |
| Env override | (legacy) | `$AIE_INSTALL_ROOT` |
| MCP registration | Projected `.mcp.json` / registry | Removed |

### Removed / parked

- The 5-stage pipeline skills (`*-analysis`, `*-api-contract`, `*-ui-contract`,
  `*-state-model`, `*-erd`, `*-implement`, `*-example`, `*-share-contract`,
  `*-schema-contract`, `*-model-lineage`, `*-migration`) are gone. Kept: the four
  `*-init` scaffolders and the two backend recipes
  (`backend-migrate-architecture`, `backend-migrate-vault-consul`).
- Init skills no longer ship runnable code skeletons (FastAPI / React / Postgres
  overlays); `*-init` now scaffolds documentation only.
- `providers/` (MCP registry/policies) and `ai-engineering.config.yaml` are removed.
- The PowerShell hook subsystem (`cli/scripts/`) is not part of this engine.

### How to migrate

1. In each target project, remove the old install (old CLI `aie remove --all`, or
   delete the legacy `.ai-engineering/` directory and any provider files it created).
2. `npm link` this repo to expose `aip`.
3. Reinstall: `aip install --provider <p> --plugin <id>` (or `aip` for the wizard).
4. The baseline block in `AGENTS.md` / `CLAUDE.md` is re-managed in place; content
   outside the markers is preserved.
