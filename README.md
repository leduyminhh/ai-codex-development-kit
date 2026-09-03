# AI Engineering Platform

`ai-engineering-platform` (CLI: `aip`) is a plugin platform that keeps **one
canonical source** of AI-agent capability content and projects it into the native
layout of **Codex, Claude Code, Cursor, and Google Antigravity**. Author a
capability once under `plugins/` and `core/`; the CLI generates the per-provider
skills, marketplace, rules, and workflow docs into a target project, and merges an
"AI Engineering" baseline block into that project's `AGENTS.md` / `CLAUDE.md`.

Pure ESM, **zero runtime dependencies**, no build step. Node.js 20+.

> Vietnamese: see [README_VI.md](README_VI.md).

## Quickstart

```bash
git clone https://github.com/leduyminhh/ai-engineering-platform.git
cd ai-engineering-platform
npm install        # nothing to compile — installs dev tooling only
npm test           # all suites should pass
npm link           # expose `aip` on PATH
```

Install capabilities into another project:

```bash
cd /path/to/project
aip                                   # interactive wizard
# or non-interactive:
aip install --provider claude --plugin backend --yes
aip install --provider all --plugin all --yes
aip install --provider codex --plugin all -g   # global scope
```

`aip` and `ai-engineering-platform` invoke the same CLI. `aip --help` prints the guide.

## Structure

| Path | Owns |
| --- | --- |
| `plugins/` | Canonical capability source: `<id>/.manifest.json` + `shared/principles.md` + `skills/<skill>/SKILL.md`, plus `_marketplace.json` and `_cowork.json`. |
| `core/` | Shared baseline: `agents/AGENTS.template.md`, `principles/`, and the shared `skills/git-workflow/` recipe. |
| `templates/` | `init/` project scaffold (dropped by `*-init` skills) and `skills/` authoring scaffold. |
| `adapters/` | Per-provider projection (`<provider>/adapter.mjs`), auto-discovered. `_shared/lib.mjs` holds the cross-tool logic. |
| `cli/` | The `aip` CLI (`index.mjs` + `lib/*.mjs` + `build.mjs`). Pure ESM, zero-dep. |
| `test/` | Contract validator + install/wizard/managed-block/pack-guard tests. |
| `docs/` | Design records and specs. |
| `completions/` | Shell completions for `aip` (see [SHELL_SETUP.md](SHELL_SETUP.md)). |

## Plugin Catalog

Content is intentionally lean: `core` plus four domain plugins whose skills are
**standalone, on-demand recipes** (there is no mandatory pipeline).

| Plugin | Capability | Skills |
| --- | --- | --- |
| `core` | Shared baseline every plugin depends on. | `principles`, `git-workflow` |
| `backend` | Backend (REST API / service) project. | `backend-init`, `backend-migrate-architecture`, `backend-migrate-vault-consul` |
| `frontend` | Frontend (web app / SPA) project. | `frontend-init` |
| `oltp-database` | OLTP database project. | `oltp-database-init` |
| `olap-warehouse` | Data pipeline / warehouse project. | `olap-warehouse-init` |

Each `*-init` skill is a **docs-only scaffolder**: it drops the `templates/init`
tree + `AGENTS.template.md`, asks the domain basics (stack / framework / engine /
sources), and fills `project-knowledge/`. The two backend `migrate-*` recipes
restructure an existing codebase (architecture; or config → Vault/Consul).

Invoke a skill in Claude Code as `/<plugin>:<skill>` (e.g. `/backend:backend-init`).

## CLI

Every command runs `node cli/index.mjs`.

```bash
aip                 # menu wizard: install | uninstall | build | check
aip install   --provider all|<p>... --plugin all|<id>... [-g] [--yes] [--as-plugin]
aip uninstall [--provider ...] [--plugin ...] [-g] [--yes]   # alias: remove
aip build     --provider all|<p>...   # alias flag: --target
aip check     [-g]
aip update    [-g]        # git pull + rebuild + reinstall tracked installs
aip pack                  # bundle Cowork skills -> build/cowork/<skill>.zip
aip list                  # discovered adapters + plugins
```

- **Scope**: `project` (default, cwd) or `global` (`-g` / `--scope global`, home dir).
- **Install** is symlink-first (junctions on Windows) with a copy fallback, and is
  additive — installing another plugin unions with what is already there. It also
  merges the baseline managed block into the project's instruction file.
- **`--as-plugin`** (Claude only) installs via the `claude` CLI as a real plugin
  (marketplace + namespaced `<id>:<skill>`) instead of flat `.claude/skills/`;
  requires `claude` on PATH.
- **Uninstall** (alias `remove`) removes only tracked paths (never link targets),
  prunes emptied directories, and reference-counts the shared managed block.
- Providers installed by default: `claude`, `cursor`, `codex`. `antigravity` builds
  but installs only when named explicitly (`--provider antigravity`).

State for every install lives in `<scope-root>/.ai-engineering/manifest.json`.

## Provider Outputs

`aip build` writes one tree per provider under `build/<provider>/`:

| Provider | Build output | Installed into (project scope) |
| --- | --- | --- |
| Claude | `.claude-plugin/marketplace.json` + `plugins/<id>/` (core as a dependency plugin) | `.claude/skills/<skill>`; baseline block → `CLAUDE.md` |
| Cursor | `<id>/.cursor/rules/<id>-00-principles.mdc` + `.cursor/skills/<skill>/` | `.cursor/rules` + `.cursor/skills` |
| Codex | `<id>/skills/<skill>/SKILL.md` (native skills) | `.codex/skills/<skill>` (global: `~/.codex/skills`); baseline block → `AGENTS.md` |
| Antigravity | `<id>/AGENTS.md` + `docs/workflow/<skill>/` | on explicit install; baseline block → `AGENTS.md` |

Any skill that ships a `references/` folder ships it to **every** provider (parity,
enforced by `test/validate.mjs`).

## Authoring content

- **New skill** → add `plugins/<id>/skills/<skill-id>/SKILL.md` with frontmatter
  (`name`, `description`, `order`, `title`, `runsIn`, `invoke`, `pipeline: false`,
  `next: null`). It is auto-discovered — no manifest list to update. Put shipped
  reference files under `skills/<skill>/references/`.
- **New provider behavior** → edit `adapters/<provider>/adapter.mjs`; keep it a pure
  `build(plugins, { outDir, marketplace, core }) -> fileEntry[]` where an entry is
  `{path, content}` | `{path, copyFrom}` | `{path, copyDir}`.
- Run `npm run build` and `npm test` (which runs `test/validate.mjs --build`).

## Maintainer

```bash
npm test            # validate --build + install + wizard + managed-block + pack-guard
npm run build       # build all providers into build/
npm run validate    # source + build-output contract
npm run pack:verify # assert the npm-publish file set stays within pack.config.json
```

Cowork upload: `cli/lib/pack.mjs` bundles the `_cowork.json` skill set into
deterministic `build/cowork/<skill>.zip` files for Customize → Skills → Upload.

## Docs

- [CHANGELOG.md](CHANGELOG.md) — version history.
- [MIGRATION.md](MIGRATION.md) — upgrade guide.
- [docs/superpowers/specs/](docs/superpowers/specs/) — design records.

## Change checklist

- Update `README.md` first, then synchronize [README_VI.md](README_VI.md).
- Keep the plugin catalog and provider tables aligned with `plugins/` and `adapters/`.
- Run `npm test` after any structure, content, or projection change.
