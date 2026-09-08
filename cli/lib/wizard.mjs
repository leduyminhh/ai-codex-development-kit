// Wizard tương tác step-by-step (keypress TUI). Logic step-machine có back, deps injectable để test.
import * as prompt from './prompt.mjs';
import { PROVIDERS } from './paths.mjs';
import { knownPluginIds, check, skillCatalog } from './install.mjs';

const { BACK, CANCEL } = prompt;

const defaultDeps = {
  selectOne: prompt.selectOne, selectMany: prompt.selectMany, confirmStep: prompt.confirmStep,
  selectTree: prompt.selectTree,
  PROVIDERS, knownPluginIds, check, skillCatalog,
};

/** Chạy danh sách step có back. step = { key, run(state) -> value|BACK|CANCEL }.
 *  BACK ở bước >0 lùi 1 bước (giữ state); BACK ở bước 0 hoặc CANCEL -> trả null. */
export async function runSteps(steps) {
  const state = {};
  let i = 0;
  while (i < steps.length) {
    const res = await steps[i].run(state);
    if (res === CANCEL) return null;
    if (res === BACK) { if (i === 0) return null; i -= 1; continue; }
    state[steps[i].key] = res;
    i += 1;
  }
  return state;
}

const SCOPE_ITEMS = [
  { label: 'project — thư mục hiện tại', value: 'project' },
  { label: 'global  — toàn máy (~)', value: 'global' },
];

export async function runWizard(action, deps = defaultDeps) {
  const d = { ...defaultDeps, ...deps };

  if (!action) {
    const picked = await d.selectOne('aip · Chọn thao tác', [
      { label: 'install   — cài workflow', value: 'install' },
      { label: 'uninstall — gỡ workflow đã cài', value: 'uninstall' },
      { label: 'update    — cập nhật plugin đã cài (pull → build → cài lại)', value: 'update' },
      { label: 'build     — chỉ build ra build/<tool>/', value: 'build' },
    ]);
    if (picked === BACK || picked === CANCEL) return null;
    action = picked;
  }

  const provItems = d.PROVIDERS.map((p) => ({ label: p, value: p }));

  if (action === 'build') {
    const ok = await d.confirmStep('build · build mọi adapter ra build/<tool>/');
    return (ok === BACK || ok === CANCEL) ? null : { action: 'build' };
  }

  if (action === 'install') {
    // Kiểu cài CHỈ áp dụng cho claude; chỉ hỏi khi claude được chọn, ngược lại mặc định 'skills'.
    const KIND_ITEMS = [
      { label: 'skills — copy vào .claude/skills/ (mặc định, không cần CLI "claude")', value: 'skills' },
      { label: 'plugin — đăng ký marketplace qua "claude plugin" (namespaced, core auto theo dependency)', value: 'plugin' },
    ];
    // Skill đã cài cho các provider vừa chọn (đọc manifest qua check.skills) → preselect cây skill.
    const installedSkills = (scope, providers) => {
      const set = new Set();
      for (const e of d.check({ scope }).installs) {
        if (!providers.includes(e.provider)) continue;
        for (const sid of (e.skills || [])) set.add(sid);
      }
      return set;
    };
    // Dựng nhóm cây skill từ catalog nguồn (core đầu; core/principles là con KHOÁ luôn bật).
    const skillGroups = () => d.skillCatalog().plugins.map((p) => ({
      plugin: p.id, label: p.id,
      skills: p.skillIds.map((v) => ({ value: v, label: v.split('/')[1], locked: v === 'core/principles' })),
    }));
    // scope + provider hỏi TRƯỚC để biết bối cảnh, rồi mới dựng cây skill với preselect đúng provider.
    const st = await runSteps([
      { key: 'scope', run: () => d.selectOne('install · Bước 1/5 · Chọn scope', SCOPE_ITEMS) },
      { key: 'providers', run: (s) => d.selectMany('install · Bước 2/5 · Chọn provider', provItems, { preselected: s.providers, min: 1 }) },
      { key: 'skills', run: (s) => {
          // Mặc định bật core/git-workflow để khớp default CLI (whole-core baseline) + skill đã cài của provider.
          const pre = new Set(['core/git-workflow', ...installedSkills(s.scope, s.providers)]);
          return d.selectTree('install · Bước 3/5 · Chọn skill (gộp theo plugin)', skillGroups(), { preselected: [...pre], min: 1 });
        } },
      { key: 'mode', run: (s) => s.providers.includes('claude')
          ? d.selectOne('install · Bước 4/5 · Kiểu cài cho claude', KIND_ITEMS)
          : 'skills' },
      { key: 'ok', run: (s) => d.confirmStep('install · Bước 5/5 · Xác nhận',
          [`skills=${s.skills.join(',')} | providers=${s.providers.join(',')} | scope=${s.scope}` +
            (s.providers.includes('claude') ? ` | claude=${s.mode}` : '')]) },
    ]);
    return st ? { action: 'install', plugins: [], skills: st.skills, providers: st.providers, scope: st.scope, mode: st.mode } : null;
  }

  if (action === 'update') {
    const st = await runSteps([
      { key: 'scope', run: () => d.selectOne('update · Bước 1/2 · Chọn scope', SCOPE_ITEMS) },
      { key: 'ok', run: (s) => {
          const installed = d.check({ scope: s.scope }).installs;
          if (!installed.length) { console.log(`\nKhông có gì đã cài ở scope=${s.scope} để update. (b để đổi scope, q để thoát)`); return CANCEL; }
          const summary = installed.map((e) => `${e.provider}(${(e.plugins || []).join(',')})`).join(' · ');
          return d.confirmStep('update · Bước 2/2 · Xác nhận', [`git pull → build → cập nhật ${summary} | scope=${s.scope}`]);
        } },
    ]);
    return st ? { action: 'update', scope: st.scope } : null;
  }

  if (action === 'uninstall') {
    // Skill CÀI được chọn để gỡ = hợp mọi entry copy-mode; bỏ baseline không gỡ lẻ được
    // (core/principles + generated <plugin>-principles). Trả về nhóm cây theo plugin.
    const removableGroups = (installs) => {
      const byPlugin = new Map();
      for (const e of installs) for (const sid of (e.skills || [])) {
        const [plug, name] = sid.split('/');
        if (sid === 'core/principles' || name === `${plug}-principles`) continue;
        if (!byPlugin.has(plug)) byPlugin.set(plug, new Set());
        byPlugin.get(plug).add(sid);
      }
      return [...byPlugin.entries()].map(([plug, set]) => ({
        plugin: plug, label: plug,
        skills: [...set].sort().map((v) => ({ value: v, label: v.split('/')[1] })),
      }));
    };
    const st = await runSteps([
      { key: 'scope', run: () => d.selectOne('uninstall · Bước 1/3 · Chọn scope', SCOPE_ITEMS) },
      { key: 'skills', run: (s) => {
          const installs = d.check({ scope: s.scope }).installs.filter((e) => e.mode !== 'plugin');
          const groups = removableGroups(installs);
          if (!groups.length) { console.log(`\nKhông có skill nào (copy-mode) đã cài ở scope=${s.scope} để gỡ. (b để đổi scope, q để thoát)`); return CANCEL; }
          return d.selectTree('uninstall · Bước 2/3 · Chọn skill để gỡ (gộp theo plugin)', groups, { min: 1 });
        } },
      { key: 'ok', run: (s) => d.confirmStep('uninstall · Bước 3/3 · Xác nhận gỡ', [`skills=${s.skills.join(',')} | scope=${s.scope}`]) },
    ]);
    if (!st) return null;
    // providers ảnh hưởng = các provider copy-mode đang chứa ≥1 skill vừa chọn (uninstall() lọc thêm theo skill).
    const installs = d.check({ scope: st.scope }).installs.filter((e) => e.mode !== 'plugin');
    const providers = [...new Set(
      installs.filter((e) => (e.skills || []).some((sid) => st.skills.includes(sid))).map((e) => e.provider),
    )];
    return { action: 'uninstall', providers, skills: st.skills, scope: st.scope };
  }

  return null;
}
