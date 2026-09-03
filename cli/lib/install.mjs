// install / check / uninstall logic — file-copy theo provider × scope, track bằng manifest.
// Zero-dependency. Build output (build/<provider>/) là nguồn copy; tự build nếu thiếu.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { REPO_ROOT, loadPlugins, loadMarketplace } from './plugins.mjs';
import { scopeRoot, manifestPath, PROVIDER_LAYOUT, PROVIDERS } from './paths.mjs';
import { pack } from './pack.mjs';
import { BEGIN as MB_BEGIN, END as MB_END, mergeManagedBlock, removeManagedBlock } from './managed-block.mjs';

// ── phát hiện môi trường ───────────────────────────────────────────────────
/** true nếu kit chạy từ trong node_modules (đã cài như package) → KHÔNG link vào đó
 *  (link sẽ gãy khi npm update/gỡ kit); thay vào đó copy để bản cài self-contained. */
export function linkDisabledForRoot(repoRoot) {
  return repoRoot.split(/[\\/]+/).includes('node_modules');
}
const USE_LINK = !linkDisabledForRoot(REPO_ROOT);

const BUILD_DIR = path.join(REPO_ROOT, 'build');

// ── fs helpers ───────────────────────────────────────────────────────────────
function copyFileRec(src, dest, files) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  files.push(dest);
}
function copyDirRec(src, destDir, files) {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(destDir, e.name);
    if (e.isDirectory()) copyDirRec(s, d, files);
    else copyFileRec(s, d, files);
  }
}
/** Dọn các thư mục cha rỗng từ `start` lên tới (không gồm) `stopAt`. */
function pruneEmptyDirs(start, stopAt) {
  let dir = start;
  while (dir.startsWith(stopAt) && dir !== stopAt) {
    try {
      if (fs.readdirSync(dir).length === 0) { fs.rmdirSync(dir); dir = path.dirname(dir); }
      else break;
    } catch { break; }
  }
}
/** Xóa file rồi dọn các thư mục cha rỗng (an toàn — không đụng file người dùng). */
function removeFileAndPruneEmpty(file, stopAt) {
  try { fs.rmSync(file, { force: true }); } catch { /* ignore */ }
  pruneEmptyDirs(path.dirname(file), stopAt);
}

/** Kiểu symlink theo nền tảng: Windows dùng junction cho THƯ MỤC (không cần admin). */
function symlinkType(isDir) {
  if (process.platform === 'win32') return isDir ? 'junction' : 'file';
  return isDir ? 'dir' : 'file';
}
/** true nếu `p` là symlink HOẶC junction (readlink chạy được cho cả hai; ném với dir thật). */
function isLinkPath(p) { try { fs.readlinkSync(p); return true; } catch { return false; } }

/** Gỡ một LINK an toàn: unlink (symlink) / rmdir (junction) — KHÔNG xóa nội dung target. */
function removeLinkAndPruneEmpty(link, stopAt) {
  try {
    const st = fs.lstatSync(link);
    if (st.isSymbolicLink()) fs.unlinkSync(link);   // symlink (file/dir POSIX)
    else if (st.isDirectory()) fs.rmdirSync(link);  // junction Windows (chỉ gỡ reparse point)
    else fs.unlinkSync(link);                        // file (copy-fallback) — phòng hờ
  } catch { /* ignore */ }
  pruneEmptyDirs(path.dirname(link), stopAt);
}

// ── manifest ─────────────────────────────────────────────────────────────────
function readManifest(scope) {
  const p = manifestPath(scope);
  if (!fs.existsSync(p)) return { version: 1, installs: [] };
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { version: 1, installs: [] }; }
}
function writeManifest(scope, m) {
  const p = manifestPath(scope);
  if (!m.installs.length) {
    try { fs.rmSync(p, { force: true }); } catch { /* */ }
    // Dọn thư mục .ai-engineering nếu đã rỗng (best-effort; còn file khác → rmdir ném, bỏ qua).
    try { fs.rmdirSync(path.dirname(p)); } catch { /* không rỗng hoặc không tồn tại */ }
    return;
  }
  fs.mkdirSync(path.dirname(p), { recursive: true }); // đảm bảo .ai-engineering tồn tại trước khi ghi
  fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
}

// ── managed block (graft) ──────────────────────────────────────────────────────
// Chèn khối baseline "AI Engineering" vào file chỉ dẫn (AGENTS.md/CLAUDE.md) tại scope root
// của project ĐÍCH — augment file có sẵn của người dùng, chỉ ghi vùng giữa marker. Track theo
// entry (field `managed`) + reference-count khi gỡ để không xoá khối khi provider khác còn dùng.
/** Khối baseline = vùng BEGIN..END TRÍCH từ core/agents/AGENTS.template.md (template đã chứa sẵn
 *  marker; phần trước BEGIN là preamble project-owned, KHÔNG thuộc khối managed). */
function baselineBlock() {
  const full = fs.readFileSync(path.join(REPO_ROOT, 'core', 'agents', 'AGENTS.template.md'), 'utf8');
  const start = full.indexOf(MB_BEGIN);
  const end = full.indexOf(MB_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('core/agents/AGENTS.template.md thiếu marker managed block hợp lệ');
  }
  return full.slice(start, end + MB_END.length);
}
/** File chỉ dẫn (rel scope root) mỗi provider nhận khối. cursor: bỏ qua (đã inline vào .cursor/rules). */
function instructionFiles(provider, scope) {
  if (provider === 'claude') return [scope === 'global' ? '.claude/CLAUDE.md' : 'CLAUDE.md'];
  if (provider === 'codex') return [scope === 'global' ? '.codex/AGENTS.md' : 'AGENTS.md'];
  if (provider === 'antigravity') return ['AGENTS.md'];
  return [];
}
/** Merge khối baseline vào từng file; trả các rel đã ghi (để lưu vào manifest entry). */
function applyManagedBlock(root, rels) {
  const block = baselineBlock();
  const written = [];
  for (const rel of rels) {
    const abs = path.join(root, rel);
    const existing = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
    const next = existing.trim() === '' ? `${block}\n` : mergeManagedBlock(existing, block, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, next);
    written.push(rel);
  }
  return written;
}
/** Gỡ khối baseline khỏi 1 file; xoá file (+ prune) nếu sau khi gỡ chỉ còn rỗng. */
function cleanManagedBlock(root, rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return;
  const next = removeManagedBlock(fs.readFileSync(abs, 'utf8'));
  if (next.trim() === '') removeFileAndPruneEmpty(abs, root);
  else fs.writeFileSync(abs, next);
}
/** PURE: file managed cần gỡ = có ở entry bị gỡ mà KHÔNG entry giữ lại nào còn dùng (reference-count). */
export function managedFilesToClean(removeEntries, keepEntries) {
  const kept = new Set();
  for (const e of keepEntries) for (const f of (e.managed || [])) kept.add(f);
  const out = new Set();
  for (const e of removeEntries) for (const f of (e.managed || [])) if (!kept.has(f)) out.add(f);
  return out;
}

// ── build ensure ─────────────────────────────────────────────────────────────
export function ensureBuilt(provider) {
  execFileSync('node', ['cli/build.mjs', '--target', provider], { cwd: REPO_ROOT, stdio: 'ignore' });
}

// ── claude plugin-mode (cài THẬT như plugin qua `claude` CLI, không phải skills phẳng) ───────
// Khác mode 'skills' (copy/symlink vào .claude/skills/): mode 'plugin' đăng ký build/claude làm
// marketplace dạng directory rồi `claude plugin install <id>@<mkt>` để Claude quản lý như plugin
// thật (namespaced <id>:<skill>, core tự kéo qua dependencies). aip không tự ghi settings.json
// — uỷ cho `claude` CLI (nguồn chuẩn) để check/uninstall do chính Claude Code theo dõi.

/** scope của aip → --scope của `claude plugin` (global = toàn máy = user). */
export function claudeCliScope(scope) { return scope === 'global' ? 'user' : 'project'; }

/** Thư mục marketplace dạng directory mà `claude plugin marketplace add` trỏ tới (= build/claude). */
export function claudeMarketplaceDir() { return path.join(BUILD_DIR, 'claude'); }

/**
 * PURE: dựng đúng các argv cho `claude plugin …` (không thực thi — để test argv tất định).
 * core KHÔNG cài tường minh trong `installs`: domain plugin tự kéo core qua dependency "core" trong
 * plugin.json. NHƯNG cache plugin của Claude key theo VERSION — nếu core@<ver> đã cache (bản cũ, cài
 * trước khi thêm skill dùng chung mới) thì `plugin install` domain sẽ no-op dependency core ("already
 * installed") và KHÔNG re-copy → git-workflow không tới Claude. Nên trước khi cài domain phải:
 *   marketplaceUpdate (làm mới snapshot nguồn = build/claude) + coreUninstall (gỡ core cũ) → lần cài
 *   domain kế tiếp kéo LẠI core TƯƠI qua dependency (đã xác nhận: "+ 1 dependency: core", re-copy đủ skill).
 * @returns {{cliScope:string, marketplace:string, dir:string, add:string[], marketplaceUpdate:string[],
 *            coreUninstall:string[], installs:string[][], uninstalls:string[][], marketplaceRemove:string[]}}
 */
export function claudePluginCommands({ pluginIds, scope, marketplaceName, marketplaceDir }) {
  const cliScope = claudeCliScope(scope);
  const at = (id) => `${id}@${marketplaceName}`;
  return {
    cliScope,
    marketplace: marketplaceName,
    dir: marketplaceDir,
    add: ['plugin', 'marketplace', 'add', marketplaceDir, '--scope', cliScope],
    marketplaceUpdate: ['plugin', 'marketplace', 'update', marketplaceName],
    coreUninstall: ['plugin', 'uninstall', at('core'), '--scope', cliScope, '-y'],
    installs: pluginIds.map((id) => ['plugin', 'install', at(id), '--scope', cliScope]),
    uninstalls: pluginIds.map((id) => ['plugin', 'uninstall', at(id), '--scope', cliScope, '-y']),
    marketplaceRemove: ['plugin', 'marketplace', 'remove', marketplaceName, '--scope', cliScope],
  };
}

/**
 * PURE: argv để REFRESH plugin-mode (dùng cho `aip update`). Cache plugin của Claude key theo
 * VERSION (backend/2.0.0); kit đổi nội dung nhưng không bump version → `plugin install`/`plugin update`
 * no-op ("already at latest") và cache KHÔNG được re-copy. Refresh đúng = `marketplace update <mkt>`
 * (làm mới snapshot nguồn) + với TỪNG plugin: uninstall (-y, tolerate) rồi install (force re-copy).
 * @returns {{marketplaceUpdate:string[], pairs:Array<{id:string, uninstall:string[], install:string[]}>}}
 */
export function claudePluginRefreshCommands({ pluginIds, scope, marketplaceName }) {
  const cliScope = claudeCliScope(scope);
  const at = (id) => `${id}@${marketplaceName}`;
  // core PHẢI được refresh TƯỜNG MINH: lúc install đầu core chỉ được kéo theo qua dependency của
  // domain plugin, KHÔNG cài riêng. Cache plugin của Claude key theo VERSION (cache/<mkt>/core/1.0.0);
  // uninstall/install domain plugin KHÔNG re-copy core khi version core không đổi → SKILL DÙNG CHUNG
  // mới thêm vào core (vd git-workflow) không bao giờ tới Claude. `plugin update`/`install` cũng no-op
  // ("already at latest"). Chỉ uninstall(-y) rồi install core mới buộc re-copy từ snapshot marketplace
  // vừa `marketplace update`. Prepend core (dedup) để nó được làm mới TRƯỚC các domain plugin.
  const ids = [...new Set(['core', ...pluginIds])];
  return {
    marketplaceUpdate: ['plugin', 'marketplace', 'update', marketplaceName],
    pairs: ids.map((id) => ({
      id,
      uninstall: ['plugin', 'uninstall', at(id), '--scope', cliScope, '-y'],
      install: ['plugin', 'install', at(id), '--scope', cliScope],
    })),
  };
}

/** Bọc 1 đối số shell trên Windows (execSync nối chuỗi) — chỉ thêm "" khi có ký tự cần bảo vệ. */
function shQuote(arg) { return /[\s"&|<>^()]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg; }

/**
 * Chạy `claude <argv>`. Trên Windows `claude` là shim (.cmd) → dùng shell. Trả {ok, out|err}.
 * KHÔNG ném khi lệnh fail (để gọi nơi khác quyết định bỏ qua, vd marketplace add trùng); CHỈ
 * ném khi không tìm thấy `claude` trên PATH (ENOENT) — báo lỗi rõ cho người dùng.
 */
function runClaudeCli(argv, { tolerate = false } = {}) {
  try {
    const out = process.platform === 'win32'
      ? execSync(['claude', ...argv].map(shQuote).join(' '), { encoding: 'utf8', stdio: 'pipe' })
      : execFileSync('claude', argv, { encoding: 'utf8', stdio: 'pipe' });
    return { ok: true, out: String(out || '') };
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      throw new Error("Không tìm thấy lệnh 'claude' trên PATH. Cần cài Claude Code CLI để dùng --as-plugin.");
    }
    if (!tolerate) {
      const detail = (err.stderr || err.stdout || err.message || '').toString().trim().split('\n')[0];
      throw new Error(`'claude ${argv.join(' ')}' lỗi: ${detail}`);
    }
    return { ok: false, err };
  }
}

/** Cài claude dạng plugin: đăng ký marketplace (idempotent) rồi install từng plugin đã chọn. */
function installClaudePlugin({ pluginIds, scope }) {
  const dir = claudeMarketplaceDir();
  if (!fs.existsSync(path.join(dir, '.claude-plugin', 'marketplace.json'))) {
    throw new Error(`Chưa build claude (thiếu ${path.join('build', 'claude', '.claude-plugin', 'marketplace.json')}).`);
  }
  const marketplaceName = loadMarketplace().name;
  const cmd = claudePluginCommands({ pluginIds, scope, marketplaceName, marketplaceDir: dir });
  // marketplace add: trùng (đã đăng ký) thì `claude` báo lỗi → bỏ qua, vẫn install tiếp.
  runClaudeCli(cmd.add, { tolerate: true });
  // FORCE core tươi trước khi cài domain (xem chú thích claudePluginCommands): làm mới snapshot rồi gỡ
  // core cũ để domain plugin kéo LẠI core tươi qua dependency — bust cache key-theo-version. Cả hai
  // tolerate: marketplace chưa từng update / core chưa cài đều không sao.
  runClaudeCli(cmd.marketplaceUpdate, { tolerate: true });
  runClaudeCli(cmd.coreUninstall, { tolerate: true });
  for (const argv of cmd.installs) runClaudeCli(argv); // domain plugins → kéo core tươi; ném nếu lỗi thật
  return { marketplace: marketplaceName, cliScope: cmd.cliScope, dir };
}

/**
 * PURE: cho danh sách entry SẼ GỠ + entry GIỮ LẠI, trả Set marketplace an toàn để gỡ — tức
 * marketplace của entry plugin-mode bị gỡ mà KHÔNG còn entry giữ lại nào (cùng marketplace) dùng.
 * Tránh yank marketplace khi vẫn còn plugin khác của nó. Export để test. (cùng scope trong 1 manifest)
 */
export function marketplacesToRemove(removeEntries, keepEntries) {
  const kept = new Set(keepEntries.filter((e) => e.mode === 'plugin').map((e) => e.marketplace));
  const out = new Set();
  for (const e of removeEntries) {
    if (e.mode === 'plugin' && !kept.has(e.marketplace)) out.add(e.marketplace);
  }
  return out;
}

/** Gỡ một manifest entry kiểu plugin: uninstall từng plugin + (tuỳ chọn) gỡ marketplace. Tolerant. */
function uninstallClaudePlugin(entry, { removeMarketplace = true } = {}) {
  const cliScope = entry.cliScope || claudeCliScope(entry.scope);
  for (const id of entry.plugins) {
    runClaudeCli(['plugin', 'uninstall', `${id}@${entry.marketplace}`, '--scope', cliScope, '-y'], { tolerate: true });
  }
  if (removeMarketplace) {
    runClaudeCli(['plugin', 'marketplace', 'remove', entry.marketplace, '--scope', cliScope], { tolerate: true });
  }
}

// ── plugin resolution ────────────────────────────────────────────────────────
export function knownPluginIds() { return loadPlugins().map((p) => p.id); }

function resolvePlugins(pluginSel) {
  const all = knownPluginIds();
  if (!pluginSel || pluginSel === 'all') return all;
  const ids = Array.isArray(pluginSel) ? pluginSel : [pluginSel];
  const bad = ids.filter((id) => !all.includes(id));
  if (bad.length) throw new Error(`Plugin không tồn tại: ${bad.join(', ')} (có: ${all.join(', ')})`);
  return ids;
}

// ── copy theo layout từng provider ──────────────────────────────────────────

/**
 * Đặt `src` vào `dest`. Ưu tiên symlink (ctx.useLink); merge an toàn để KHÔNG đè thư mục
 * sẵn có của project; lỗi/không hỗ trợ → copy + cảnh báo MỘT lần. Ghi đường dẫn đã tạo vào
 * ctx.links (link) hoặc ctx.files (copy).
 */
function placeEntry(src, dest, ctx) {
  const isDir = fs.statSync(src).isDirectory();

  if (!ctx.useLink) { // môi trường npm (node_modules) → copy thuần
    if (isDir) copyDirRec(src, dest, ctx.files); else copyFileRec(src, dest, ctx.files);
    return;
  }

  // dest là THƯ MỤC THẬT (không phải link) + src là thư mục → merge từng child (tránh đè dir project)
  if (isDir && fs.existsSync(dest) && !isLinkPath(dest) && fs.statSync(dest).isDirectory()) {
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
      placeEntry(path.join(src, e.name), path.join(dest, e.name), ctx);
    }
    return;
  }

  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest) || isLinkPath(dest)) removeLinkAndPruneEmpty(dest, ctx.root); // dọn dest cũ
    fs.symlinkSync(path.resolve(src), dest, symlinkType(isDir)); // junction cần target tuyệt đối
    ctx.links.push(dest);
  } catch (err) {
    if (!ctx.warned) {
      ctx.warned = true;
      console.warn(`[aip] Không tạo được symlink (${err.code || err.message}); chuyển sang copy. ` +
        `Bản cài sẽ KHÔNG tự cập nhật khi rebuild.`);
    }
    if (isDir) copyDirRec(src, dest, ctx.files); else copyFileRec(src, dest, ctx.files);
  }
}

function installOne(provider, pluginIds, scope) {
  const layout = PROVIDER_LAYOUT[provider];
  if (!layout) throw new Error(`Provider không hỗ trợ: ${provider}`);
  const root = scopeRoot(scope);
  const pbuild = path.join(BUILD_DIR, provider);
  if (!fs.existsSync(pbuild)) throw new Error(`Chưa build ${provider} (build/${provider} không có).`);
  const ctx = { files: [], links: [], useLink: USE_LINK, warned: false, root };

  if (layout.kind === 'claude') {
    const claudeRoot = path.join(root, '.claude');
    const ids = new Set(pluginIds);
    ids.add('core'); // core luôn đi kèm
    for (const id of ids) {
      const pdir = path.join(pbuild, 'plugins', id);
      if (!fs.existsSync(pdir)) continue;
      for (const comp of fs.readdirSync(pdir, { withFileTypes: true })) {
        if (!comp.isDirectory() || comp.name === '.claude-plugin') continue; // bỏ manifest plugin
        const destComp = path.join(claudeRoot, comp.name);
        fs.mkdirSync(destComp, { recursive: true });           // dir TỔNG HỢP là thật (gộp nhiều plugin)
        placeEntry(path.join(pdir, comp.name), destComp, ctx);  // link/copy từng child (skill-dir…)
      }
      const mcp = path.join(pdir, '.mcp.json');
      if (fs.existsSync(mcp)) placeEntry(mcp, path.join(claudeRoot, `${id}.mcp.json`), ctx);
    }
  } else if (layout.kind === 'codex') {
    // Codex nạp native skills từ <root>/.codex/skills/<skill-id>/ (global -g → ~/.codex/skills/).
    // Link mỗi skill-dir từ build/codex/<id>/skills/ — core luôn đi kèm (giống claude).
    const skillsRoot = path.join(root, '.codex', 'skills');
    const ids = new Set(pluginIds);
    ids.add('core'); // core (skill principles) luôn đi kèm
    for (const id of ids) {
      const sdir = path.join(pbuild, id, 'skills');
      if (!fs.existsSync(sdir)) continue;
      for (const skill of fs.readdirSync(sdir, { withFileTypes: true })) {
        if (!skill.isDirectory()) continue; // mỗi skill = 1 thư mục (SKILL.md + assets)
        placeEntry(path.join(sdir, skill.name), path.join(skillsRoot, skill.name), ctx);
      }
    }
  } else if (layout.kind === 'cursor') {
    // Cursor: rules (00-principles always-on) + Agent Skills (gọi bằng /skill-id). Core luôn kèm.
    const rulesDir = path.join(root, '.cursor', 'rules');
    const skillsRoot = path.join(root, '.cursor', 'skills');
    const ids = new Set(pluginIds);
    ids.add('core');
    for (const id of ids) {
      const rulesSrc = path.join(pbuild, id, '.cursor', 'rules');
      if (fs.existsSync(rulesSrc)) {
        for (const e of fs.readdirSync(rulesSrc, { withFileTypes: true })) {
          // tên đã có prefix `<id>-` SẴN từ build → copy verbatim (chỉ còn 00-principles).
          placeEntry(path.join(rulesSrc, e.name), path.join(rulesDir, e.name), ctx);
        }
      }
      const skillsSrc = path.join(pbuild, id, '.cursor', 'skills');
      if (!fs.existsSync(skillsSrc)) continue;
      for (const skill of fs.readdirSync(skillsSrc, { withFileTypes: true })) {
        if (!skill.isDirectory()) continue;
        placeEntry(path.join(skillsSrc, skill.name), path.join(skillsRoot, skill.name), ctx);
      }
    }
  } else if (layout.kind === 'agents') {
    const single = pluginIds.length === 1;
    for (const id of pluginIds) {
      const src = path.join(pbuild, id);
      if (!fs.existsSync(src)) continue;
      const dest = single ? root : path.join(root, `cowork-${provider}`, id);
      placeEntry(src, dest, ctx);
    }
  }
  return { files: ctx.files, links: ctx.links };
}

/**
 * Cài providers × plugins ở scope cho trước. Ghi manifest. Trả về tóm tắt.
 * @param {{providers:string[], plugins:string|string[], scope:'project'|'global',
 *          mode?:'skills'|'plugin'}} opts
 *   mode 'plugin' (mặc định 'skills') CHỈ áp dụng cho provider claude — cài qua `claude` CLI
 *   như plugin thật; provider khác luôn ở mode 'skills' (copy/symlink).
 */
export function install({ providers, plugins, scope = 'project', mode = 'skills' }) {
  if (!USE_LINK) console.warn('[aip] Cài qua npm (node_modules) → dùng copy thay vì symlink (bản cài self-contained).');
  const provs = !providers || providers === 'all' ? PROVIDERS : (Array.isArray(providers) ? providers : [providers]);
  // Codex nạp native skills ở mức user (~/.codex/skills). Cài scope=project (.codex/skills/ trong
  // repo) thường KHÔNG được codex đọc → cảnh báo để tránh tưởng đã cài (xem 00-HUONG-DAN mục Codex).
  if (scope === 'project' && provs.includes('codex')) {
    console.warn('[aip] codex nạp native skills từ ~/.codex/skills (mức user); cài scope=project ' +
      'thường KHÔNG được codex đọc — cân nhắc cài global: aip install --provider codex -g');
  }
  const pluginIds = resolvePlugins(plugins);
  const root = scopeRoot(scope);
  const m = readManifest(scope);
  const results = [];
  for (const provider of provs) {
    ensureBuilt(provider);

    if (provider === 'claude' && mode === 'plugin') {
      // CỘNG DỒN: gộp với plugin đã cài cùng mode (install thêm, không thay thế); cùng plugin → refresh.
      const prev = m.installs.find((e) => e.provider === 'claude' && e.mode === 'plugin');
      const effPlugins = prev ? [...new Set([...(prev.plugins || []), ...pluginIds])] : pluginIds;
      uninstallEntries(m, root, (e) => e.provider === 'claude'); // gỡ bản claude cũ (skills HOẶC plugin)
      const info = installClaudePlugin({ pluginIds: effPlugins, scope });
      const managed = applyManagedBlock(root, instructionFiles('claude', scope));
      m.installs.push({
        provider: 'claude', mode: 'plugin', plugins: effPlugins, scope,
        marketplace: info.marketplace, cliScope: info.cliScope,
        files: [], links: [], managed, installedAt: new Date().toISOString(),
      });
      results.push({ provider: 'claude', plugins: effPlugins, mode: 'plugin', marketplace: info.marketplace });
      continue;
    }

    // CỘNG DỒN: gộp với entry cùng provider, cùng mode (skills) — install thêm, không thay thế.
    const prev = m.installs.find((e) => e.provider === provider && e.mode !== 'plugin');
    const effPlugins = prev ? [...new Set([...(prev.plugins || []), ...pluginIds])] : pluginIds;
    uninstallEntries(m, root, (e) => e.provider === provider); // gỡ bản cũ cùng (provider,scope) rồi cài lại UNION
    const { files, links } = installOne(provider, effPlugins, scope);
    const rel = (arr) => arr.map((f) => path.relative(root, f).split(path.sep).join('/'));
    const relF = rel(files), relL = rel(links);
    const managed = applyManagedBlock(root, instructionFiles(provider, scope));
    m.installs.push({ provider, plugins: effPlugins, scope, files: relF, links: relL, managed, installedAt: new Date().toISOString() });
    results.push({ provider, plugins: effPlugins, linked: relL.length, copied: relF.length, count: relF.length + relL.length });
  }
  writeManifest(scope, m);
  // Cài claude → đóng gói sẵn skill cho Cowork (Cowork không đọc kho plugin local; phải upload .zip).
  let coworkPack = null;
  if (provs.includes('claude')) {
    try { coworkPack = pack(); } catch (e) { console.warn('[aip] đóng gói Cowork lỗi:', e.message); }
  }
  return { root, scope, results, coworkPack };
}

function uninstallEntries(m, root, predicate) {
  const keep = [], remove = [];
  for (const e of m.installs) (predicate(e) ? remove : keep).push(e);
  const dropMkts = marketplacesToRemove(remove, keep); // marketplace không còn ai giữ lại dùng
  const done = new Set();                              // gỡ mỗi marketplace tối đa 1 lần
  let removed = 0;
  for (const e of remove) {
    if (e.mode === 'plugin') {
      const drop = dropMkts.has(e.marketplace) && !done.has(e.marketplace);
      uninstallClaudePlugin(e, { removeMarketplace: drop }); // uỷ cho `claude` CLI gỡ plugin (+marketplace nếu drop)
      if (drop) done.add(e.marketplace);
      removed += (e.plugins || []).length;
    } else {
      for (const rel of e.files) removeFileAndPruneEmpty(path.join(root, rel), root);
      for (const rel of (e.links || [])) removeLinkAndPruneEmpty(path.join(root, rel), root);
      removed += e.files.length + (e.links || []).length;
    }
  }
  // Gỡ khối managed khỏi file chỉ dẫn khi không entry giữ lại nào còn dùng (reference-count).
  for (const rel of managedFilesToClean(remove, keep)) cleanManagedBlock(root, rel);
  m.installs = keep;
  return removed;
}

/** Gỡ cài đặt theo filter provider/plugin/scope. Gỡ LẺ plugin: khi entry còn plugin khác,
 *  gỡ nguyên entry rồi cài lại phần GIỮ (tận dụng install cộng dồn) — vì manifest không tách
 *  file theo plugin. */
export function uninstall({ providers, plugins, scope = 'project' }) {
  const provs = !providers || providers === 'all' ? null : (Array.isArray(providers) ? providers : [providers]);
  const plugSel = !plugins || plugins === 'all' ? null : (Array.isArray(plugins) ? plugins : [plugins]);
  const root = scopeRoot(scope);
  const m = readManifest(scope);
  const matched = (e) =>
    (!provs || provs.includes(e.provider)) &&
    (!plugSel || e.plugins.some((p) => plugSel.includes(p)));

  // Khi gỡ LẺ (chỉ định plugin): những plugin còn giữ lại của mỗi entry khớp → cài lại sau khi gỡ.
  const reinstall = [];
  if (plugSel) {
    for (const e of m.installs.filter(matched)) {
      const remaining = e.plugins.filter((p) => !plugSel.includes(p));
      if (remaining.length) {
        reinstall.push({ provider: e.provider, plugins: remaining, scope, mode: e.mode === 'plugin' ? 'plugin' : 'skills' });
      }
    }
  }

  const removed = uninstallEntries(m, root, matched);
  writeManifest(scope, m);
  for (const r of reinstall) install(r); // cài lại phần GIỮ (install tự ghi manifest)
  return { root, scope, removed };
}

/** Liệt kê đã cài gì ở scope (đọc manifest) + tồn tại file thực tế. */
export function check({ scope = 'project' } = {}) {
  const root = scopeRoot(scope);
  const m = readManifest(scope);
  return {
    root,
    scope,
    manifest: manifestPath(scope),
    installs: m.installs.map((e) => {
      if (e.mode === 'plugin') {
        // do `claude` CLI quản lý (cache + settings.json) → không soi file ở scope root.
        const n = (e.plugins || []).length;
        return { provider: e.provider, plugins: e.plugins, mode: 'plugin',
          marketplace: e.marketplace, files: n, present: n, installedAt: e.installedAt };
      }
      const all = [...e.files, ...(e.links || [])];
      return {
        provider: e.provider,
        plugins: e.plugins,
        files: all.length,
        present: all.filter((rel) => fs.existsSync(path.join(root, rel))).length,
        installedAt: e.installedAt,
      };
    }),
  };
}

// ── update: cập nhật plugin ĐÃ CÀI (pull → build → cài lại nếu là copy) ─────────
/** git pull nguồn kit (best-effort, --ff-only). Trả {ok, out} hoặc {ok:false, reason}. */
function gitPull() {
  try {
    const out = execFileSync('git', ['pull', '--ff-only'], { cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe' });
    return { ok: true, out: String(out || '').trim() };
  } catch (err) {
    const detail = (err.stderr || err.stdout || err.message || '').toString().trim().split('\n').filter(Boolean).slice(-1)[0];
    return { ok: false, reason: detail || 'git pull lỗi' };
  }
}

/**
 * aip update — cập nhật các plugin ĐÃ CÀI ở scope, theo trình tự:
 *   1) git pull nguồn kit (best-effort; lỗi thì cảnh báo và vẫn tiếp tục với nguồn hiện tại)
 *   2) build lại các provider đã cài
 *   3) mỗi entry: skills-mode → CÀI LẠI (tái quét build, nhận cả skill mới); plugin → refresh qua `claude` CLI
 * @param {{scope?:'project'|'global', pull?:boolean}} opts  pull=false để bỏ qua git (dùng cho test).
 */
export function update({ scope = 'project', pull = true } = {}) {
  const pulled = pull ? gitPull() : { ok: true, skipped: true };
  const root = scopeRoot(scope);
  const m = readManifest(scope);
  if (!m.installs.length) return { scope, root, pulled, built: [], entries: [], empty: true };

  const providers = [...new Set(m.installs.map((e) => e.provider))];
  for (const p of providers) ensureBuilt(p); // "run build" cho đúng provider đã cài

  const entries = [];
  for (const e of [...m.installs]) { // snapshot: install() bên dưới ghi lại manifest
    if (e.mode === 'plugin') {
      try {
        // KHÔNG dùng install-semantics (marketplace add + plugin install đều no-op khi đã cài cùng
        // version → cache giữ bản cũ). Phải FORCE: marketplace update + uninstall/install từng plugin.
        const cmd = claudePluginRefreshCommands({
          pluginIds: e.plugins, scope, marketplaceName: e.marketplace || loadMarketplace().name,
        });
        runClaudeCli(cmd.marketplaceUpdate, { tolerate: true }); // làm mới snapshot nguồn (dir = build/claude)
        for (const p of cmd.pairs) {
          runClaudeCli(p.uninstall, { tolerate: true }); // chưa cài/lỗi lặt vặt → vẫn install tiếp
          runClaudeCli(p.install);                        // ném nếu install thật sự lỗi
        }
        entries.push({ provider: e.provider, plugins: e.plugins, action: 'plugin-refresh', reload: true });
      } catch (err) {
        entries.push({ provider: e.provider, plugins: e.plugins, action: 'plugin-error', reason: err.message });
      }
    } else {
      // Luôn CÀI LẠI (install tái quét thư mục build) — KHÔNG tin vào tập link/file đã ghi lúc cài.
      // Trước đây symlink-install đi nhánh "pass" (chỉ rebuild build/, link cũ tự tươi) nên BỎ SÓT
      // SKILL MỚI thêm sau lần cài đầu (vd core/git-workflow): không có link nào cho skill mới. Re-install
      // gỡ link cũ rồi re-link TOÀN BỘ theo build (idempotent) + tạo link cho skill mới; entry copy re-copy.
      install({ providers: [e.provider], plugins: e.plugins, scope, mode: 'skills' });
      entries.push({ provider: e.provider, plugins: e.plugins, action: 'reinstall' });
    }
  }
  return { scope, root, pulled, built: providers, entries, empty: false };
}
