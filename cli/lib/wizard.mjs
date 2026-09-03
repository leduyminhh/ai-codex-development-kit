// Wizard tương tác step-by-step (keypress TUI). Logic step-machine có back, deps injectable để test.
import * as prompt from './prompt.mjs';
import { PROVIDERS } from './paths.mjs';
import { knownPluginIds, check } from './install.mjs';

const { BACK, CANCEL } = prompt;

const defaultDeps = {
  selectOne: prompt.selectOne, selectMany: prompt.selectMany, confirmStep: prompt.confirmStep,
  PROVIDERS, knownPluginIds, check,
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
    // Trạng thái đã cài ở scope: provider -> Set(plugin) (đọc manifest qua check) để đánh dấu
    // plugin nào đã/chưa cài cho đúng provider người dùng vừa chọn.
    const installedByProvider = (scope) => {
      const m = {};
      for (const e of d.check({ scope }).installs) m[e.provider] = new Set(e.plugins || []);
      return m;
    };
    // scope + provider hỏi TRƯỚC để biết bối cảnh, rồi mới đánh dấu trạng thái cài của từng plugin.
    const st = await runSteps([
      { key: 'scope', run: () => d.selectOne('install · Bước 1/5 · Chọn scope', SCOPE_ITEMS) },
      { key: 'providers', run: (s) => d.selectMany('install · Bước 2/5 · Chọn provider', provItems, { preselected: s.providers, min: 1 }) },
      { key: 'plugins', run: (s) => {
          const inst = installedByProvider(s.scope);
          const items = d.knownPluginIds().map((id) => {
            const on = s.providers.filter((p) => inst[p] && inst[p].has(id));
            return { label: id, value: id, hint: on.length ? `đã cài: ${on.join(',')}` : 'chưa cài' };
          });
          return d.selectMany('install · Bước 3/5 · Chọn plugin (core luôn đi kèm)', items, { preselected: s.plugins, min: 1 });
        } },
      { key: 'mode', run: (s) => s.providers.includes('claude')
          ? d.selectOne('install · Bước 4/5 · Kiểu cài cho claude', KIND_ITEMS)
          : 'skills' },
      { key: 'ok', run: (s) => d.confirmStep('install · Bước 5/5 · Xác nhận',
          [`plugins=${s.plugins.join(',')} | providers=${s.providers.join(',')} | scope=${s.scope}` +
            (s.providers.includes('claude') ? ` | claude=${s.mode}` : '')]) },
    ]);
    return st ? { action: 'install', plugins: st.plugins, providers: st.providers, scope: st.scope, mode: st.mode } : null;
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
    const st = await runSteps([
      { key: 'scope', run: () => d.selectOne('uninstall · Bước 1/3 · Chọn scope', SCOPE_ITEMS) },
      { key: 'providers', run: (s) => {
          const installed = d.check({ scope: s.scope }).installs;
          if (!installed.length) { console.log(`\nKhông có gì đã cài ở scope=${s.scope}. (b để đổi scope, q để thoát)`); return CANCEL; }
          const items = installed.map((e) => ({ label: e.provider, value: e.provider, hint: (e.plugins || []).join(',') }));
          return d.selectMany('uninstall · Bước 2/3 · Chọn provider để gỡ', items, { preselected: s.providers, min: 1 });
        } },
      { key: 'ok', run: (s) => d.confirmStep('uninstall · Bước 3/3 · Xác nhận gỡ', [`providers=${s.providers.join(',')} | scope=${s.scope}`]) },
    ]);
    return st ? { action: 'uninstall', providers: st.providers, scope: st.scope } : null;
  }

  return null;
}
