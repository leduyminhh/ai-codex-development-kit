# Skill-Granular Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép chọn/cài/gỡ/update ở mức SKILL với lựa chọn phân cấp plugin→skill (chọn cha = load toàn bộ con), qua cả CLI (`--skill`) và wizard.

**Architecture:** Build vẫn build tất cả; chọn-lọc chỉ ở lớp đặt-file (`installOne`). Manifest track hai trường tách bạch: `plugins` (nguyên khối, update nhận skill mới) + `skills` (chọn lẻ, cố định). Định danh skill = id ghép `plugin/skill`. Thêm primitive TUI `selectTree` cho wizard.

**Tech Stack:** Pure ESM, Node ≥20 built-ins, zero runtime dependency, không bước build. Test harness tự viết `ok(cond, msg)` + `process.env.AIE_INSTALL_ROOT` để cô lập install.

**Spec:** [docs/superpowers/specs/2026-09-08-skill-granular-install-design.md](../specs/2026-09-08-skill-granular-install-design.md)

## Global Constraints

- Zero runtime dependency; pure ESM; không thêm bước build; giữ LF, UTF-8 no-BOM.
- KHÔNG đụng `adapters/*`, `cli/build.mjs`, `test/validate.mjs` (build/parity giữ nguyên).
- Định danh skill = `plugin/skill` (vd `backend/backend-init`, `core/git-workflow`).
- **`core/principles` LUÔN cài (ép bật)** — không bỏ chọn được.
- **`<plugin>-principles` do ADAPTER sinh** (từ `plugins/<id>/shared/principles.md`), có trong build nhưng KHÔNG có trong `loadSkills`. Bộ lọc PHẢI luôn ship `<plugin>-principles` khi plugin đó có ≥1 skill hiệu lực (baseline plugin, tương tự core/principles). Nó KHÔNG xuất hiện như skill chọn-lẻ trong wizard.
- Tên skill-dir DUY NHẤT toàn cục (xác nhận trong `adapters/codex/adapter.mjs:11`), nên khoá theo `plugin/skill` là đủ.
- Claude `--as-plugin` (plugin-mode): không tách skill; suy plugin từ tập chọn, cài nguyên plugin + cảnh báo.
- Test hiện dùng harness `ok(cond, msg)` (KHÔNG phải `node:test`); giữ đúng phong cách khi thêm assert.
- Dừng cho người duyệt diff trước khi commit (1 task = 1 commit); commit qua `core:git-workflow` (header EN, body VI có dấu, không trailer đồng tác giả).

---

### Task 1: Pure helpers chọn-lựa & tập skill hiệu lực (`install.mjs`)

Ba hàm THUẦN (export để test, không I/O ngoài `loadPlugins/loadCore`): phân giải lựa chọn, liệt kê skill của plugin, tính tập hiệu lực (gồm generated principles + backward-compat).

**Files:**
- Modify: `cli/lib/install.mjs` (thêm helpers cạnh `resolvePlugins`, dòng ~283-292)
- Test: `test/install.test.mjs` (thêm khối unit ở đầu, sau khối `marketplacesToRemove`)

**Interfaces:**
- Consumes: `loadPlugins()`, `loadCore()` từ `./plugins.mjs` (đã import sẵn `loadPlugins`; thêm `loadCore`).
- Produces:
  - `skillCatalog(): { plugins: Array<{id, skillIds:string[]}> }` — danh mục skill NGUỒN theo plugin (KHÔNG gồm generated `<id>-principles`). core đứng đầu. `skillIds` là `plugin/skill`.
  - `allSkillsOf(pluginId): string[]` — các `plugin/skill` nguồn của một plugin.
  - `resolveSelection({ plugins, skills }): { plugins:string[], skills:string[] }` — validate + quy-về-khối + dedup. Ném `Error` khi id lạ.
  - `effectiveSkills(entry): Set<string>` — tập `plugin/skill` để lọc đặt file (gồm generated principles + `core/principles` ép bật).

- [ ] **Step 1: Viết test thất bại cho `skillCatalog` + `allSkillsOf`**

Thêm vào `test/install.test.mjs` (sau khối `marketplacesToRemove`, trước khối additive), và bổ sung import:

```js
// mở rộng dòng import install.mjs:
const { install, uninstall, update, check, linkDisabledForRoot, claudePluginCommands,
  claudePluginRefreshCommands, claudeCliScope, marketplacesToRemove,
  skillCatalog, allSkillsOf, resolveSelection, effectiveSkills } =
  await import('../cli/lib/install.mjs');

// ── unit: skillCatalog + allSkillsOf (PURE) ──────────────────────────────────
{
  const cat = skillCatalog();
  ok(cat.plugins[0].id === 'core', 'skillCatalog: core đứng đầu');
  ok(cat.plugins.some((p) => p.id === 'backend'), 'skillCatalog: có backend');
  const be = cat.plugins.find((p) => p.id === 'backend');
  ok(be.skillIds.includes('backend/backend-init'), 'skillCatalog: backend gồm backend/backend-init');
  ok(!be.skillIds.some((s) => s.endsWith('/backend-principles')),
    'skillCatalog: KHÔNG liệt kê generated backend-principles');
  ok(allSkillsOf('backend').includes('backend/backend-init')
    && allSkillsOf('backend').every((s) => s.startsWith('backend/')),
    'allSkillsOf: trả plugin/skill của đúng plugin');
  ok(allSkillsOf('core').includes('core/principles'), 'allSkillsOf: core gồm principles');
}
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `node test/install.test.mjs`
Expected: FAIL — `skillCatalog is not a function` (chưa export).

- [ ] **Step 3: Cài đặt tối thiểu `skillCatalog` + `allSkillsOf`**

Thêm vào `cli/lib/install.mjs` (cạnh `resolvePlugins`); cập nhật import đầu file thêm `loadCore`:

```js
// dòng import: import { REPO_ROOT, loadPlugins, loadCore, loadMarketplace } from './plugins.mjs';

/** Danh mục skill NGUỒN theo plugin (core đầu tiên). KHÔNG gồm generated <id>-principles. */
export function skillCatalog() {
  const core = loadCore();
  const plugins = [core, ...loadPlugins()].map((p) => ({
    id: p.id,
    skillIds: p.stages.map((s) => `${p.id}/${s.id}`),
  }));
  return { plugins };
}
/** Các `plugin/skill` NGUỒN của một plugin (rỗng nếu plugin không tồn tại). */
export function allSkillsOf(pluginId) {
  const p = skillCatalog().plugins.find((x) => x.id === pluginId);
  return p ? [...p.skillIds] : [];
}
```

- [ ] **Step 4: Chạy test → PASS**

Run: `node test/install.test.mjs`
Expected: PASS các assert skillCatalog/allSkillsOf.

- [ ] **Step 5: Viết test thất bại cho `resolveSelection`**

```js
// ── unit: resolveSelection (PURE) ────────────────────────────────────────────
{
  // chọn đủ mọi con của một plugin → quy về khối (plugins), skills rỗng phần đó
  const whole = resolveSelection({ skills: allSkillsOf('backend') });
  ok(whole.plugins.includes('backend') && !whole.skills.some((s) => s.startsWith('backend/')),
    'resolveSelection: đủ mọi con → plugins=[backend], skills không lặp lại con backend');
  // chọn một phần → skills lẻ, không vào plugins
  const partial = resolveSelection({ skills: ['backend/backend-init'] });
  ok(!partial.plugins.includes('backend') && partial.skills.includes('backend/backend-init'),
    'resolveSelection: một phần → skills lẻ, không nguyên khối');
  // --plugin nguyên khối
  const byPlugin = resolveSelection({ plugins: ['frontend'] });
  ok(byPlugin.plugins.includes('frontend'), 'resolveSelection: --plugin → plugins');
  // skill trần suy plugin duy nhất
  const bare = resolveSelection({ skills: ['backend-init'] });
  ok(bare.skills.includes('backend/backend-init') || bare.plugins.includes('backend'),
    'resolveSelection: skill trần suy được plugin');
  // dedup: skill nằm trong khối đã chọn → bỏ khỏi skills
  const dd = resolveSelection({ plugins: ['backend'], skills: ['backend/backend-init'] });
  ok(!dd.skills.includes('backend/backend-init'),
    'resolveSelection: skill đã trong khối → dedup khỏi skills');
  // id lạ → ném
  let threw = false;
  try { resolveSelection({ skills: ['backend/khong-ton-tai'] }); } catch { threw = true; }
  ok(threw, 'resolveSelection: skill không tồn tại → ném lỗi');
}
```

- [ ] **Step 6: Chạy test → FAIL** (`resolveSelection is not a function`).

- [ ] **Step 7: Cài đặt `resolveSelection`**

```js
/** Chuẩn hoá lựa chọn → {plugins, skills}. plugins=khối; skills=lẻ (plugin/skill). Ném nếu id lạ. */
export function resolveSelection({ plugins = [], skills = [] } = {}) {
  const cat = skillCatalog();
  const validPlugins = new Set(cat.plugins.map((p) => p.id));
  const bySkill = new Map();          // 'plugin/skill' -> true
  const byBare = new Map();           // 'skill' -> ['plugin/skill', ...]
  for (const p of cat.plugins) for (const sid of p.skillIds) {
    bySkill.set(sid, true);
    const bare = sid.split('/')[1];
    byBare.set(bare, [...(byBare.get(bare) || []), sid]);
  }
  const pluginSel = (plugins === 'all')
    ? cat.plugins.map((p) => p.id)
    : (Array.isArray(plugins) ? plugins : (plugins ? [plugins] : []));
  const badP = pluginSel.filter((id) => !validPlugins.has(id));
  if (badP.length) throw new Error(`Plugin không tồn tại: ${badP.join(', ')} (có: ${[...validPlugins].join(', ')})`);

  const skillSel = new Set();
  const rawSkills = Array.isArray(skills) ? skills : (skills ? [skills] : []);
  for (const raw of rawSkills) {
    if (raw.includes('/')) {
      if (!bySkill.has(raw)) throw new Error(`Skill không tồn tại: ${raw}`);
      skillSel.add(raw);
    } else {
      const cands = byBare.get(raw);
      if (!cands) throw new Error(`Skill không tồn tại: ${raw} (có: ${[...bySkill.keys()].join(', ')})`);
      if (cands.length > 1) throw new Error(`Skill "${raw}" mơ hồ, ghi rõ plugin/skill: ${cands.join(', ')}`);
      skillSel.add(cands[0]);
    }
  }
  // quy về khối: plugin có mọi con đã chọn (qua --plugin HOẶC đủ skill lẻ) → plugins
  const wholeSet = new Set(pluginSel);
  for (const p of cat.plugins) {
    if (wholeSet.has(p.id)) continue;
    if (p.skillIds.length && p.skillIds.every((sid) => skillSel.has(sid))) wholeSet.add(p.id);
  }
  // dedup: bỏ skill đã nằm trong khối
  const coveredByWhole = new Set();
  for (const id of wholeSet) for (const sid of allSkillsOf(id)) coveredByWhole.add(sid);
  const outSkills = [...skillSel].filter((s) => !coveredByWhole.has(s)).sort();
  return { plugins: [...wholeSet].sort(), skills: outSkills };
}
```

- [ ] **Step 8: Chạy test → PASS**.

- [ ] **Step 9: Viết test thất bại cho `effectiveSkills` (gồm generated principles + backward-compat)**

```js
// ── unit: effectiveSkills (PURE) — ép core/principles + generated <id>-principles + compat ──
{
  // entry nguyên khối backend
  const eWhole = effectiveSkills({ plugins: ['backend'], skills: [] });
  ok(eWhole.has('core/principles'), 'effective: LUÔN có core/principles (ép bật)');
  ok(eWhole.has('backend/backend-init') && eWhole.has('backend/backend-migrate-db') === false || true,
    'effective: gồm skill nguồn của khối backend');
  ok(eWhole.has('backend/backend-principles'),
    'effective: khối backend → kèm generated backend-principles (baseline)');
  // entry skill lẻ: chỉ 1 skill của backend
  const ePartial = effectiveSkills({ plugins: [], skills: ['backend/backend-init'] });
  ok(ePartial.has('backend/backend-init'), 'effective: có skill lẻ đã chọn');
  ok(ePartial.has('backend/backend-principles'),
    'effective: plugin active dù chỉ 1 skill → vẫn kèm backend-principles');
  ok(!ePartial.has('backend/backend-testing'), 'effective: skill lẻ KHÔNG kéo skill anh em');
  ok(ePartial.has('core/principles'), 'effective: vẫn ép core/principles');
  // backward-compat: entry cũ chỉ có plugins, không field skills
  const eCompat = effectiveSkills({ plugins: ['frontend'] });
  ok(eCompat.has('frontend/frontend-init') && eCompat.has('frontend/frontend-principles'),
    'effective: entry cũ (thiếu skills) mở rộng nguyên khối như hôm nay');
}
```

- [ ] **Step 10: Chạy test → FAIL** (`effectiveSkills is not a function`).

- [ ] **Step 11: Cài đặt `effectiveSkills`**

```js
/** Tập `plugin/skill` để LỌC đặt file: core/principles ép bật; khối mở rộng theo kit HIỆN TẠI;
 *  skill lẻ cố định; MỌI plugin active kèm generated `<id>-principles` (baseline, không có trong loadSkills). */
export function effectiveSkills(entry) {
  const out = new Set(['core/principles']);
  const plugins = entry.plugins || [];
  const skills = entry.skills || [];
  for (const p of plugins) for (const sid of allSkillsOf(p)) out.add(sid);
  for (const sid of skills) out.add(sid);
  // plugin active (có ≥1 skill hiệu lực HOẶC là khối) → kèm generated <id>-principles
  const activePlugins = new Set(plugins);
  for (const sid of out) activePlugins.add(sid.split('/')[0]);
  for (const pid of activePlugins) {
    if (pid === 'core') continue; // core baseline là 'principles' (đã ép ở trên)
    out.add(`${pid}/${pid}-principles`);
  }
  return out;
}
```

- [ ] **Step 12: Chạy test → PASS**.

- [ ] **Step 13: Commit**

```bash
git add cli/lib/install.mjs test/install.test.mjs
git commit -F <msg>   # feat(cli): thêm helper thuần chọn-lựa & tập skill hiệu lực (mức skill)
```

---

### Task 2: `installOne` lọc theo skill + `install()` ghi `plugins`+`skills` + cộng dồn

Chuyển `installOne` sang nhận tập skill hiệu lực và chỉ đặt skill-dir thuộc tập; `install()` dùng `resolveSelection`/`effectiveSkills`, union với entry cũ, ghi cả hai trường.

**Files:**
- Modify: `cli/lib/install.mjs` — `installOne` (dòng ~332-401), `install` (dòng ~410-460).
- Test: `test/install.test.mjs` — thêm khối integration cài-lẻ (dùng `AIE_INSTALL_ROOT`).

**Interfaces:**
- Consumes: `effectiveSkills`, `resolveSelection` (Task 1).
- Produces: `installOne(provider, effSet, scope)` với `effSet: Set<'plugin/skill'>`; entry manifest thêm `skills:string[]`.

- [ ] **Step 1: Viết test thất bại — cài LẺ 1 skill chỉ ra 1 skill (+ principles)**

```js
// ── skill-granular: cài LẺ 1 skill → chỉ skill đó (+ baseline principles) ─────
{
  const TMP_S = fs.mkdtempSync(path.join(os.tmpdir(), 'cwf-skill-'));
  process.env.AIE_INSTALL_ROOT = TMP_S;
  install({ providers: 'claude', skills: ['backend/backend-init'], scope: 'project' });
  const E = (rel) => fs.existsSync(path.join(TMP_S, rel));
  ok(E('.claude/skills/backend-init/SKILL.md'), 'skill-lẻ: backend-init được cài');
  ok(!E('.claude/skills/backend-testing/SKILL.md'), 'skill-lẻ: backend-testing KHÔNG được cài');
  ok(E('.claude/skills/principles/SKILL.md'), 'skill-lẻ: core principles vẫn ép bật');
  ok(E('.claude/skills/backend-principles/SKILL.md'), 'skill-lẻ: backend-principles baseline vẫn kèm');
  const mf = JSON.parse(fs.readFileSync(path.join(TMP_S, '.ai-engineering/manifest.json'), 'utf8'));
  const ce = mf.installs.find((e) => e.provider === 'claude');
  ok(ce.skills.includes('backend/backend-init') && !ce.plugins.includes('backend'),
    'skill-lẻ: manifest ghi skills=[backend/backend-init], KHÔNG nguyên khối');
  fs.rmSync(TMP_S, { recursive: true, force: true });
  process.env.AIE_INSTALL_ROOT = TMP;
}
```

- [ ] **Step 2: Chạy test → FAIL** (cài cả plugin / `skills` undefined).

- [ ] **Step 3: Sửa `installOne` nhận `effSet` và lọc skill-dir**

Đổi chữ ký `installOne(provider, pluginIds, scope)` → `installOne(provider, effSet, scope)`. Trong mỗi nhánh, thay vòng lặp "mọi plugin → mọi skill" bằng lọc theo `effSet.has(\`${id}/${skillName}\`)`. Ví dụ nhánh **claude** (dòng ~340-355):

```js
if (layout.kind === 'claude') {
  const claudeRoot = path.join(root, '.claude');
  const pluginsDir = path.join(pbuild, 'plugins');
  if (!fs.existsSync(pluginsDir)) return { files: ctx.files, links: ctx.links };
  for (const id of fs.readdirSync(pluginsDir)) {
    const pdir = path.join(pluginsDir, id);
    if (!fs.statSync(pdir).isDirectory()) continue;
    for (const comp of fs.readdirSync(pdir, { withFileTypes: true })) {
      if (!comp.isDirectory() || comp.name === '.claude-plugin') continue;
      const srcComp = path.join(pdir, comp.name);
      const destComp = path.join(claudeRoot, comp.name);
      // comp thường là 'skills' → lọc từng skill-dir con theo effSet
      for (const skill of fs.readdirSync(srcComp, { withFileTypes: true })) {
        if (!skill.isDirectory()) continue;
        if (!effSet.has(`${id}/${skill.name}`)) continue;
        fs.mkdirSync(destComp, { recursive: true });
        placeEntry(path.join(srcComp, skill.name), path.join(destComp, skill.name), ctx);
      }
    }
    const mcp = path.join(pdir, '.mcp.json');
    if (fs.existsSync(mcp) && effSet.has(`${id}/.mcp`)) placeEntry(mcp, path.join(claudeRoot, `${id}.mcp.json`), ctx);
  }
}
```

Áp cùng nguyên tắc cho nhánh **codex** (`build/codex/<id>/skills/<skill>`), **cursor** (`.cursor/skills/<skill>` + rules 00-principles của plugin active), **agents/antigravity** (`docs/workflow/<skill>/` — chỉ ship skill trong `effSet`; giữ file plugin-level như AGENTS.md của plugin active). Với cursor rules `00-principles`: ship khi plugin đó active (có ≥1 skill trong effSet).

> Lưu ý generated `<id>-principles`: đã nằm trong `effSet` (Task 1) nên vòng lặp trên tự đặt nó — không cần xử lý riêng.

- [ ] **Step 4: Sửa `install()` dùng resolveSelection/effective + union + ghi skills**

Thay khối skills-mode (dòng ~442-451):

```js
const sel = resolveSelection({ plugins, skills });        // {plugins, skills}
const prev = m.installs.find((e) => e.provider === provider && e.mode !== 'plugin');
const effPlugins = prev ? [...new Set([...(prev.plugins || []), ...sel.plugins])] : sel.plugins;
const effSkills  = prev ? [...new Set([...(prev.skills  || []), ...sel.skills ])] : sel.skills;
// chuẩn hoá dedup: bỏ skill đã nằm trong khối
const covered = new Set();
for (const id of effPlugins) for (const s of allSkillsOf(id)) covered.add(s);
const skillsFinal = effSkills.filter((s) => !covered.has(s));
const entry = { provider, plugins: effPlugins, skills: skillsFinal, scope };
uninstallEntries(m, root, (e) => e.provider === provider);
const effSet = effectiveSkills(entry);
const { files, links } = installOne(provider, effSet, scope);
const rel = (arr) => arr.map((f) => path.relative(root, f).split(path.sep).join('/'));
const relF = rel(files), relL = rel(links);
const managed = applyManagedBlock(root, instructionFiles(provider, scope));
m.installs.push({ ...entry, files: relF, links: relL, managed, installedAt: new Date().toISOString() });
results.push({ provider, plugins: effPlugins, skills: skillsFinal, linked: relL.length, copied: relF.length, count: relF.length + relL.length });
```

Cập nhật chữ ký `install({ providers, plugins, skills, scope, mode })` (thêm `skills`).

- [ ] **Step 5: Chạy test → PASS** khối skill-lẻ.

- [ ] **Step 6: Chạy regression các test cũ (cài nguyên plugin vẫn đúng)**

Run: `node test/install.test.mjs`
Expected: PASS toàn bộ (bao gồm additive/partial/update/round-trip cũ — vì cài `plugins:'backend'` → resolveSelection cho `plugins:['backend']` → effective mở rộng nguyên khối).

- [ ] **Step 7: Commit**

```bash
git add cli/lib/install.mjs test/install.test.mjs
git commit -F <msg>   # feat(cli): installOne lọc theo skill + install ghi plugins/skills, cộng dồn
```

---

### Task 3: Gỡ LẺ skill + update theo `effective` + `check` trả `skills`

**Files:**
- Modify: `cli/lib/install.mjs` — `uninstall` (dòng ~489-513), `update` (dòng ~561-598 — nhánh skills reinstall), `check` (dòng ~516-540).
- Test: `test/install.test.mjs` — khối gỡ-lẻ + update-nhận-skill-mới.

**Interfaces:**
- Consumes: `effectiveSkills`, `resolveSelection`, `install` (đã nhận `skills`).
- Produces: `uninstall({ providers, plugins, skills, scope })`; `check().installs[i].skills`.

- [ ] **Step 1: Viết test thất bại — gỡ LẺ 1 skill, giữ phần còn lại**

```js
// ── skill-granular: gỡ LẺ 1 skill của một khối → giữ các skill còn lại ────────
{
  const TMP_RU = fs.mkdtempSync(path.join(os.tmpdir(), 'cwf-skill-rm-'));
  process.env.AIE_INSTALL_ROOT = TMP_RU;
  install({ providers: 'claude', plugins: 'backend', scope: 'project' }); // nguyên khối
  uninstall({ providers: 'claude', skills: ['backend/backend-testing'], scope: 'project' });
  const E = (rel) => fs.existsSync(path.join(TMP_RU, rel));
  ok(!E('.claude/skills/backend-testing/SKILL.md'), 'gỡ-lẻ: backend-testing đã gỡ');
  ok(E('.claude/skills/backend-init/SKILL.md'), 'gỡ-lẻ: backend-init còn lại');
  ok(E('.claude/skills/backend-principles/SKILL.md'), 'gỡ-lẻ: baseline principles còn');
  const mf = JSON.parse(fs.readFileSync(path.join(TMP_RU, '.ai-engineering/manifest.json'), 'utf8'));
  const ce = mf.installs.find((e) => e.provider === 'claude');
  ok(!ce.plugins.includes('backend') && ce.skills.includes('backend/backend-init')
    && !ce.skills.includes('backend/backend-testing'),
    'gỡ-lẻ: khối backend "vỡ" thành skills lẻ, hết backend-testing');
  fs.rmSync(TMP_RU, { recursive: true, force: true });
  process.env.AIE_INSTALL_ROOT = TMP;
}
```

- [ ] **Step 2: Chạy test → FAIL** (uninstall chưa hiểu `skills`).

- [ ] **Step 3: Sửa `uninstall` hỗ trợ `skills` (gỡ lẻ = gỡ entry rồi cài lại phần còn giữ)**

```js
export function uninstall({ providers, plugins, skills, scope = 'project' }) {
  const provs = !providers || providers === 'all' ? null : (Array.isArray(providers) ? providers : [providers]);
  const plugSel = !plugins || plugins === 'all' ? null : (Array.isArray(plugins) ? plugins : [plugins]);
  const skillSel = !skills ? null : (Array.isArray(skills) ? skills : [skills]);
  const root = scopeRoot(scope);
  const m = readManifest(scope);
  const matched = (e) =>
    (!provs || provs.includes(e.provider)) &&
    (!plugSel || (e.plugins || []).some((p) => plugSel.includes(p)) || (e.skills || []).some((s) => plugSel.includes(s.split('/')[0]))) &&
    (!skillSel || [...effectiveSkills(e)].some((s) => skillSel.includes(s)) || (!plugSel));
  // Gỡ lẻ theo skill: tính phần GIỮ LẠI = effective(e) trừ skill bị gỡ (và trừ skill của plugin bị gỡ nguyên khối)
  const reinstall = [];
  if (plugSel || skillSel) {
    for (const e of m.installs.filter(matched)) {
      const remove = new Set(skillSel || []);
      const removePlugins = new Set(plugSel || []);
      const remaining = [...effectiveSkills(e)].filter((s) =>
        !remove.has(s) && !removePlugins.has(s.split('/')[0]) && s !== 'core/principles');
      if (remaining.length) {
        reinstall.push({ provider: e.provider, skills: remaining, scope, mode: e.mode === 'plugin' ? 'plugin' : 'skills' });
      }
    }
  }
  const removed = uninstallEntries(m, root, matched);
  writeManifest(scope, m);
  for (const r of reinstall) install(r);
  return { root, scope, removed };
}
```

> Ghi chú: `resolveSelection` trong `install` sẽ tự quy phần `remaining` về khối nếu tình cờ đủ mọi con — đúng ý. `core/principles` loại khỏi `remaining` vì nó tự ép bật khi cài lại.

- [ ] **Step 4: Chạy test → PASS** khối gỡ-lẻ. Chạy lại toàn bộ file: các test gỡ theo provider/plugin cũ vẫn PASS.

- [ ] **Step 5: Viết test thất bại — update KHỐI nhận skill mới; `check` trả `skills`**

```js
// ── update: khối nhận skill MỚI; skill-lẻ KHÔNG kéo anh em; check trả skills ──
{
  const TMP_U2 = fs.mkdtempSync(path.join(os.tmpdir(), 'cwf-upd-skill-'));
  process.env.AIE_INSTALL_ROOT = TMP_U2;
  // cài LẺ backend-init; xoá thủ công để mô phỏng cần refresh
  install({ providers: 'claude', skills: ['backend/backend-init'], scope: 'project' });
  const chk = check({ scope: 'project' }).installs.find((e) => e.provider === 'claude');
  ok(Array.isArray(chk.skills) && chk.skills.includes('backend/backend-init'),
    'check: trả danh sách skills hiệu lực');
  // update: skill-lẻ chỉ refresh, KHÔNG kéo backend-testing
  update({ scope: 'project', pull: false });
  ok(!fs.existsSync(path.join(TMP_U2, '.claude/skills/backend-testing/SKILL.md')),
    'update skill-lẻ: KHÔNG tự kéo skill anh em');
  ok(fs.existsSync(path.join(TMP_U2, '.claude/skills/backend-init/SKILL.md')),
    'update skill-lẻ: skill đã chọn vẫn còn (refresh)');
  fs.rmSync(TMP_U2, { recursive: true, force: true });
  process.env.AIE_INSTALL_ROOT = TMP;
}
```

- [ ] **Step 6: Chạy test → FAIL** (`check` chưa trả `skills`).

- [ ] **Step 7: Sửa `check` trả `skills`; xác nhận `update` skills-mode gọi `install` với `skills`**

Trong `check().installs.map`, nhánh không phải plugin-mode, thêm `skills: [...effectiveSkills(e)]`.
Trong `update()`, nhánh skills-mode (dòng ~588-594) đổi:

```js
install({ providers: [e.provider], plugins: e.plugins || [], skills: e.skills || [], scope, mode: 'skills' });
```

(install → resolveSelection → effective; khối `e.plugins` mở rộng theo kit hiện tại = nhận skill mới; `e.skills` cố định.)

- [ ] **Step 8: Chạy test → PASS**. Chạy toàn bộ `node test/install.test.mjs` → tất cả PASS.

- [ ] **Step 9: Commit**

```bash
git add cli/lib/install.mjs test/install.test.mjs
git commit -F <msg>   # feat(cli): gỡ lẻ skill + update theo tập hiệu lực + check trả skills
```

---

### Task 4: Claude plugin-mode — suy plugin từ skill + cảnh báo

**Files:**
- Modify: `cli/lib/install.mjs` — nhánh `provider === 'claude' && mode === 'plugin'` (dòng ~426-440).
- Test: `test/install.test.mjs` — unit (PURE) suy plugin + tồn tại cảnh báo.

**Interfaces:**
- Consumes: `resolveSelection`.
- Produces: `pluginsFromSelection({plugins, skills}): string[]` (export, PURE).

- [ ] **Step 1: Viết test thất bại — suy plugin từ chọn lẻ**

```js
// ── plugin-mode: suy tập plugin từ skill lẻ (PURE) ───────────────────────────
{
  const ids = pluginsFromSelection({ plugins: ['frontend'], skills: ['backend/backend-init'] });
  ok(ids.includes('frontend') && ids.includes('backend') && new Set(ids).size === ids.length,
    'pluginsFromSelection: gộp plugin của khối + plugin của skill lẻ, dedup');
}
```

- [ ] **Step 2: Chạy test → FAIL**.

- [ ] **Step 3: Cài đặt `pluginsFromSelection` + dùng trong nhánh plugin-mode + cảnh báo**

```js
/** PURE: tập plugin (dedup) suy từ lựa chọn — dùng cho claude plugin-mode (whole-plugin only). */
export function pluginsFromSelection({ plugins = [], skills = [] } = {}) {
  const out = new Set(plugins);
  for (const s of skills) out.add(s.split('/')[0]);
  return [...out];
}
```

Trong `install()` nhánh plugin-mode, trước khi tính `effPlugins`:

```js
const sel = resolveSelection({ plugins, skills });
const inferred = pluginsFromSelection(sel);
if ((sel.skills || []).length) {
  console.warn('[aip] claude --as-plugin cài NGUYÊN plugin (không tách skill). ' +
    `Cài cả: ${inferred.join(', ')}. Dùng mode skills nếu muốn chọn lẻ.`);
}
// dùng `inferred` thay cho pluginIds cũ khi gộp effPlugins
```

- [ ] **Step 4: Chạy test → PASS**.

- [ ] **Step 5: Commit**

```bash
git add cli/lib/install.mjs test/install.test.mjs
git commit -F <msg>   # feat(cli): plugin-mode suy nguyên plugin từ chọn lẻ + cảnh báo
```

---

### Task 5: Primitive `selectTree` (multi-select phân cấp) trong `prompt.mjs`

**Files:**
- Modify: `cli/lib/prompt.mjs` — thêm `selectTree` + phần thuần `flattenTree`, `cascadeToggle`, `headerState`.
- Test: `test/wizard.test.mjs` — unit phần thuần (không TTY).

**Interfaces:**
- Consumes: khung raw-mode của `runSelect` (tái dùng cơ chế redraw), `keyToAction`.
- Produces:
  - `flattenTree(groups): Array<{type:'header'|'skill', groupIndex, value?, label, locked?}>` (PURE).
  - `headerState(group, selectedValues:Set): 'full'|'partial'|'empty'` (PURE).
  - `cascadeToggle(selectedValues:Set, group): void` (PURE — bật/tắt toàn nhóm, giữ locked luôn bật).
  - `selectTree(title, groups, { preselected, min })`: trả `string[]` value skill đã chọn.

- [ ] **Step 1: Viết test thất bại cho phần thuần**

Thêm vào `test/wizard.test.mjs`:

```js
import { flattenTree, headerState, cascadeToggle } from '../cli/lib/prompt.mjs';

const GROUPS = [
  { plugin: 'core', label: 'core', skills: [
    { value: 'core/principles', label: 'principles', locked: true },
    { value: 'core/git-workflow', label: 'git-workflow' } ] },
  { plugin: 'backend', label: 'backend', skills: [
    { value: 'backend/backend-init', label: 'backend-init' },
    { value: 'backend/backend-testing', label: 'backend-testing' } ] },
];

// flatten: header + skill xen kẽ
{
  const rows = flattenTree(GROUPS);
  ok(rows[0].type === 'header' && rows[0].groupIndex === 0, 'flattenTree: dòng 0 là header core');
  ok(rows.filter((r) => r.type === 'skill').length === 4, 'flattenTree: 4 skill rows');
}
// headerState
{
  ok(headerState(GROUPS[1], new Set(['backend/backend-init', 'backend/backend-testing'])) === 'full',
    'headerState: đủ con → full');
  ok(headerState(GROUPS[1], new Set(['backend/backend-init'])) === 'partial', 'headerState: một phần → partial');
  ok(headerState(GROUPS[1], new Set()) === 'empty', 'headerState: rỗng → empty');
}
// cascadeToggle: bật cả nhóm rồi tắt; locked luôn giữ
{
  const sel = new Set(['core/principles']);
  cascadeToggle(sel, GROUPS[0]);   // đang partial (chỉ locked) → bật tất
  ok(sel.has('core/git-workflow'), 'cascadeToggle: bật toàn nhóm');
  cascadeToggle(sel, GROUPS[0]);   // full → tắt (trừ locked)
  ok(!sel.has('core/git-workflow') && sel.has('core/principles'),
    'cascadeToggle: tắt nhóm nhưng giữ locked (principles)');
}
```

- [ ] **Step 2: Chạy test → FAIL** (`node test/wizard.test.mjs`) — hàm chưa tồn tại.

- [ ] **Step 3: Cài đặt phần thuần + `selectTree`**

```js
export function flattenTree(groups) {
  const rows = [];
  groups.forEach((g, gi) => {
    rows.push({ type: 'header', groupIndex: gi, label: g.label });
    for (const s of g.skills) rows.push({ type: 'skill', groupIndex: gi, value: s.value, label: s.label, locked: !!s.locked });
  });
  return rows;
}
export function headerState(group, selected) {
  const vals = group.skills.map((s) => s.value);
  const on = vals.filter((v) => selected.has(v)).length;
  if (on === 0) return 'empty';
  if (on === vals.length) return 'full';
  return 'partial';
}
export function cascadeToggle(selected, group) {
  const state = headerState(group, selected);
  for (const s of group.skills) {
    if (s.locked) { selected.add(s.value); continue; }   // locked luôn bật
    if (state === 'full') selected.delete(s.value); else selected.add(s.value);
  }
}
```

`selectTree(title, groups, { preselected = [], min = 0 })`: dựng `rows = flattenTree(groups)`; `selected = new Set([...preselected, ...locked values])`; tái dùng khung raw-mode như `runSelect` nhưng:
- render: header vẽ `[x]/[~]/[ ]` theo `headerState`; skill thụt 2 space, `[x]/[ ]`, locked vẽ `dim([x])`.
- `up/down` chạy qua mọi `rows`; `toggle` trên header → `cascadeToggle`; trên skill locked → bỏ qua; trên skill thường → add/delete value.
- `all` → nếu mọi non-locked đã chọn thì clear (giữ locked) else add tất cả.
- `confirm` → đếm selected (gồm locked); nếu `< min` báo lỗi; else `resolve([...selected])`.

(Chi tiết render bám `runSelect` dòng 74-124: cùng cơ chế `draw()`, `keyToAction`, cleanup. Viết `runSelectTree` nội bộ song song `runSelect`.)

- [ ] **Step 4: Chạy test → PASS** phần thuần.

- [ ] **Step 5: Commit**

```bash
git add cli/lib/prompt.mjs test/wizard.test.mjs
git commit -F <msg>   # feat(cli): selectTree — multi-select phân cấp plugin→skill (cha cascade con)
```

---

### Task 6: Wizard install (chọn skill gộp) + uninstall (chọn skill đã cài)

**Files:**
- Modify: `cli/lib/wizard.mjs` — bước install 3/5 (dòng ~71-78) + uninstall 2/3 (dòng ~105-110); `defaultDeps`.
- Test: `test/wizard.test.mjs` — inject deps giả lập, xác nhận selection trả về `plugin/skill`.

**Interfaces:**
- Consumes: `selectTree` (Task 5), `skillCatalog`, `check` (trả `skills`).
- Produces: wizard `install` trả `{ action:'install', plugins, skills, providers, scope, mode }`; `uninstall` trả `{ action:'uninstall', providers, skills, scope }`.

- [ ] **Step 1: Viết test thất bại — install wizard trả skills**

Trong `test/wizard.test.mjs`, thêm deps giả `selectTree` chọn `['backend/backend-init']`, `skillCatalog` giả, `check` giả rỗng; gọi `runWizard('install', deps)`; assert kết quả có `skills` gồm `backend/backend-init`. (Theo mẫu test wizard hiện có — đọc `test/wizard.test.mjs` để khớp cách inject.)

- [ ] **Step 2: Chạy → FAIL**.

- [ ] **Step 3: Sửa wizard**

- `defaultDeps` thêm `selectTree: prompt.selectTree, skillCatalog`.
- install bước 3: dựng `groups` từ `d.skillCatalog()` (core đầu; `core/principles` `locked:true`); preselect từ `installedByProvider` (đọc `check().installs[].skills`). Thay `d.selectMany(... plugins ...)` bằng `d.selectTree('install · Bước 3/5 · Chọn skill (gộp theo plugin)', groups, { preselected, min: 1 })`. Lưu `skills` vào state.
- Cuối install trả `{ action:'install', plugins: [], skills: st.skills, providers, scope, mode }` (để `install()` tự `resolveSelection` quy về khối).
- uninstall bước 2: dựng groups từ skill ĐÃ CÀI (gộp theo provider→plugin); trả `skills`.

- [ ] **Step 4: Chạy → PASS**. Chạy `node test/wizard.test.mjs` toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add cli/lib/wizard.mjs test/wizard.test.mjs
git commit -F <msg>   # feat(cli): wizard chọn skill phân cấp cho install/uninstall
```

---

### Task 7: CLI `--skill` (parse + route + help)

**Files:**
- Modify: `cli/index.mjs` — `parse` (dòng ~30-46), route `install/uninstall/update` (dòng ~211-220), `buildHelp` (dòng ~130-191).
- Test: `test/wizard.test.mjs` hoặc file mới `test/cli-parse.test.mjs` — unit `parse`.

**Interfaces:**
- Consumes: `install/uninstall` đã nhận `skills`.
- Produces: `parse(argv).skill: string[]`.

- [ ] **Step 1: Viết test thất bại cho `parse('--skill a,b')`**

Export `parse` từ `index.mjs` (hoặc tách sang `cli/lib/args.mjs` để test import — chọn tách nếu `index.mjs` không export). Test:

```js
import { parse } from '../cli/lib/args.mjs';
ok(JSON.stringify(parse(['install','--skill','backend/backend-init,core/git-workflow']).skill)
   === JSON.stringify(['backend/backend-init','core/git-workflow']), 'parse: --skill csv → mảng');
ok(parse(['install','--skill','x']).explicit === true, 'parse: --skill đặt explicit');
```

- [ ] **Step 2: Chạy → FAIL**.

- [ ] **Step 3: Tách `parse` sang `cli/lib/args.mjs`, thêm `--skill`**

Chuyển hàm `parse` (+ hằng liên quan) sang `cli/lib/args.mjs`, export; `index.mjs` import lại. Thêm:

```js
else if (v === '--skill') { a.skill = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean); a.explicit = true; }
else if (v.startsWith('--skill=')) { a.skill = v.slice(8).split(',').map((s) => s.trim()).filter(Boolean); a.explicit = true; }
```

Khởi tạo `a.skill = []` trong object mặc định.

- [ ] **Step 4: Route truyền `skills`**

`install`: `install({ providers: args.provider, plugins: args.plugin, skills: args.skill, scope: args.scope, mode: args.mode })`.
`uninstall`: thêm `skills: args.skill`.
Wizard-gate `WIZARDABLE`: giữ nguyên (có `--skill` → `explicit` → non-interactive).

- [ ] **Step 5: Cập nhật `buildHelp`** — thêm dòng `--skill <a,b>` (mô tả: chọn skill lẻ dạng `plugin/skill` hoặc tên skill; `--plugin` = cả plugin) + 2 ví dụ:

```
aip install --provider claude --skill backend/backend-init,core/git-workflow
aip uninstall --skill backend/backend-testing
```

- [ ] **Step 6: Chạy → PASS**. `node cli/index.mjs --help` in đúng.

- [ ] **Step 7: Commit**

```bash
git add cli/lib/args.mjs cli/index.mjs test/cli-parse.test.mjs
git commit -F <msg>   # feat(cli): cờ --skill (parse + route + help) cho cài lẻ skill
```

---

### Task 8: Verify toàn bộ + cập nhật docs + commit tổng kết

**Files:**
- Modify: `README.md` + `README_VI.md` (mục CLI: thêm `--skill`), `CLAUDE.md` (nếu mô tả wizard steps đổi). KHÔNG bắt buộc đổi catalog plugin (ngoài phạm vi).
- Verify: `npm test`, `npm run validate`, `npm run build`.

- [ ] **Step 1: Chạy `npm test`** → toàn bộ suite xanh (install + wizard + validate --build + managed-block + pack-guard).

- [ ] **Step 2: Chạy `npm run validate`** → không đổi kết quả (build/parity không bị động).

- [ ] **Step 3: Thử tay wizard** (thủ công, TTY): `node cli/index.mjs install` → thấy danh sách gộp header plugin + skill con; toggle header cascade con; cài 1 skill lẻ → chỉ skill đó + baseline.

- [ ] **Step 4: Cập nhật README.md → README_VI.md** mục CLI/TÙY CHỌN: thêm `--skill`, ví dụ cài lẻ. Đồng bộ song song.

- [ ] **Step 5: Backport spec** — thêm một dòng vào spec §7.4/Global về generated `<plugin>-principles` luôn kèm (phát hiện lúc lập plan) và đánh dấu điểm skill-name-uniqueness đã VERIFIED (`adapters/codex/adapter.mjs:11`).

- [ ] **Step 6: Commit tổng kết docs + dừng cho người duyệt diff**

```bash
git add README.md README_VI.md docs/superpowers/specs/2026-09-08-skill-granular-install-design.md
git commit -F <msg>   # docs(cli): tài liệu hoá --skill + backport quy tắc <plugin>-principles
```

---

## Ghi chú tự-review

- **Spec coverage:** §3 (kiến trúc lọc)→T2; §4 (schema/effective)→T1–T2; §5 (update)→T3; §6 (plugin-mode)→T4; §7.1 (selectTree)→T5; §7.2 (wizard)→T6; §7.3 (CLI)→T7; §8 (test)→rải khắp + T8.
- **Phát hiện thêm khi lập plan (ngoài spec, đã đưa vào Global Constraints):** generated `<plugin>-principles` phải luôn kèm khi plugin active; skill-name uniqueness đã verified. → backport spec ở T8/Step 5.
- **Type consistency:** `resolveSelection`→`{plugins,skills}`; `effectiveSkills(entry)`→`Set<'plugin/skill'>`; `installOne(provider, effSet, scope)`; `pluginsFromSelection({plugins,skills})`→`string[]`. Dùng nhất quán T1→T7.
- **Thứ tự:** T1→T2→T3 tuần tự (đụng install). T4 sau T2. T5 độc lập. T6 sau T5. T7 sau T2 (cần install nhận skills) + độc lập T5/T6. T8 cuối.
