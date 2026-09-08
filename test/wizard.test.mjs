#!/usr/bin/env node
// Test logic wizard + prompt (không cần TTY). Zero-dep. Chạy: node test/wizard.test.mjs
import { keyToAction, BACK, CANCEL, renderFrame } from '../cli/lib/prompt.mjs';
import { flattenTree, headerState, cascadeToggle } from '../cli/lib/prompt.mjs';

let pass = 0; const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };

// keyToAction
ok(keyToAction('up', {}) === 'up', 'up -> up');
ok(keyToAction('k', {}) === 'up', 'k -> up');
ok(keyToAction('down', {}) === 'down', 'down -> down');
ok(keyToAction('j', {}) === 'down', 'j -> down');
ok(keyToAction('space', {}) === 'toggle', 'space -> toggle');
ok(keyToAction('a', {}) === 'all', 'a -> all');
ok(keyToAction('return', {}) === 'confirm', 'return -> confirm');
ok(keyToAction('b', {}) === 'back', 'b -> back');
ok(keyToAction('q', {}) === 'quit', 'q -> quit');
ok(keyToAction('escape', {}) === 'quit', 'escape -> quit');
ok(keyToAction('c', { ctrl: true }) === 'quit', 'ctrl-c -> quit');
ok(keyToAction('x', {}) === null, 'phím lạ -> null');
ok(typeof BACK === 'symbol' && typeof CANCEL === 'symbol', 'BACK/CANCEL là symbol');
ok(BACK !== CANCEL, 'BACK !== CANCEL');

// renderFrame: đếm đúng số DÒNG HIỂN THỊ kể cả title nhiều dòng (bug step 4 confirm)
{
  const f = renderFrame('a\nb', [{ label: 'x' }, { label: 'y' }], { cursor: 0, selected: new Set(), multi: false, hint: 'h' });
  ok(f.rows === f.text.split('\n').length, 'renderFrame.rows = số dòng visual của text');
  ok(f.rows === 5, 'renderFrame: title 2 dòng + 2 item + hint = 5 dòng (không undercount)');
}

// renderFrame: đếm CẢ dòng bị WRAP khi label dài hơn bề rộng terminal (bug up/down duplicate text)
{
  const f = renderFrame('t', [{ label: 'x'.repeat(50) }], { cursor: 0, selected: new Set(), multi: false, hint: 'h' }, 20);
  // width=20 · title "t"(1) + item "> "+50 = 52 ký tự → ceil(52/20)=3 + hint "h"(1) = 5 dòng visual
  ok(f.rows === 5, `renderFrame: label wrap theo width → đếm đủ visual rows (được ${f.rows}, mong đợi 5)`);
  ok(f.rows > f.text.split('\n').length, 'renderFrame: dòng wrap KHÔNG bị undercount (rows > số dòng logic)');
}

// selectTree phần thuần: flattenTree / headerState / cascadeToggle
const GROUPS = [
  { plugin: 'core', label: 'core', skills: [
    { value: 'core/principles', label: 'principles', locked: true },
    { value: 'core/git-workflow', label: 'git-workflow' } ] },
  { plugin: 'backend', label: 'backend', skills: [
    { value: 'backend/backend-init', label: 'backend-init' },
    { value: 'backend/backend-testing', label: 'backend-testing' } ] },
];

{
  const rows = flattenTree(GROUPS);
  ok(rows[0].type === 'header' && rows[0].groupIndex === 0, 'flattenTree: dòng 0 là header core');
  ok(rows.filter((r) => r.type === 'skill').length === 4, 'flattenTree: 4 skill rows');
}
{
  ok(headerState(GROUPS[1], new Set(['backend/backend-init', 'backend/backend-testing'])) === 'full',
    'headerState: đủ con → full');
  ok(headerState(GROUPS[1], new Set(['backend/backend-init'])) === 'partial', 'headerState: một phần → partial');
  ok(headerState(GROUPS[1], new Set()) === 'empty', 'headerState: rỗng → empty');
}
{
  const sel = new Set(['core/principles']);
  cascadeToggle(sel, GROUPS[0]);
  ok(sel.has('core/git-workflow'), 'cascadeToggle: bật toàn nhóm');
  cascadeToggle(sel, GROUPS[0]);
  ok(!sel.has('core/git-workflow') && sel.has('core/principles'),
    'cascadeToggle: tắt nhóm nhưng giữ locked (principles)');
}

import { runWizard } from '../cli/lib/wizard.mjs';

// Stub prompt: trả lần lượt theo kịch bản đã nạp.
function stub(script) {
  const calls = [...script];
  return () => Promise.resolve(calls.shift());
}
function makeDeps({ one = [], many = [], confirm = [] }) {
  const o = stub(one), m = stub(many), c = stub(confirm);
  return {
    selectOne: () => o(), selectMany: () => m(), confirmStep: () => c(),
    PROVIDERS: ['claude', 'cursor', 'codex'], // antigravity pending — không offer trong wizard
    knownPluginIds: () => ['backend', 'frontend', 'olap-warehouse'],
    check: ({ scope }) => ({ installs: scope === 'project'
      ? [{ provider: 'claude', plugins: ['backend'] }, { provider: 'cursor', plugins: ['frontend'] }] : [] }),
  };
}

// install: scope -> providers -> plugins (đánh dấu đã/chưa cài) -> (kiểu cài claude) -> confirm
{
  const deps = makeDeps({ one: ['project', 'skills'], many: [['claude'], ['backend']], confirm: [true] });
  const r = await runWizard('install', deps);
  ok(r && r.action === 'install' && r.scope === 'project' && r.mode === 'skills'
    && JSON.stringify(r.plugins) === '["backend"]' && JSON.stringify(r.providers) === '["claude"]',
    'install: ráp đúng action object (claude→skills)');
}

// install: claude chọn kiểu plugin -> mode='plugin'
{
  const deps = makeDeps({ one: ['project', 'plugin'], many: [['claude'], ['backend']], confirm: [true] });
  const r = await runWizard('install', deps);
  ok(r && r.mode === 'plugin', 'install: claude chọn kiểu cài plugin → mode=plugin');
}

// install: KHÔNG chọn claude -> không hỏi kiểu cài (selectOne chỉ tiêu cho scope), mode mặc định 'skills'
{
  const deps = makeDeps({ one: ['project'], many: [['cursor'], ['frontend']], confirm: [true] });
  const r = await runWizard('install', deps);
  ok(r && r.mode === 'skills' && JSON.stringify(r.providers) === '["cursor"]',
    'install: không claude → mode=skills (bỏ qua bước kiểu cài)');
}

// back: plugins trả BACK -> quay lại providers (giữ), chọn lại -> tiếp
{
  const { BACK } = await import('../cli/lib/prompt.mjs');
  const deps = makeDeps({ one: ['project', 'skills'], many: [['claude'], BACK, ['claude'], ['backend', 'frontend']], confirm: [true] });
  const r = await runWizard('install', deps);
  ok(r && JSON.stringify(r.plugins) === '["backend","frontend"]', 'install: back ở plugins quay lại providers, chọn lại OK');
}

// cancel: bước đầu (scope) BACK -> null
{
  const { BACK } = await import('../cli/lib/prompt.mjs');
  const deps = makeDeps({ one: [BACK] });
  const r = await runWizard('install', deps);
  ok(r === null, 'install: BACK ở bước đầu (scope) -> huỷ (null)');
}

// CANCEL giữa luồng (providers q huỷ) -> null
{
  const { CANCEL } = await import('../cli/lib/prompt.mjs');
  const deps = makeDeps({ one: ['project'], many: [CANCEL] });
  const r = await runWizard('install', deps);
  ok(r === null, 'install: CANCEL giữa luồng (providers) -> null');
}

// uninstall: scope project -> chọn provider đã cài -> confirm
{
  const deps = makeDeps({ one: ['project'], many: [['claude']], confirm: [true] });
  const r = await runWizard('uninstall', deps);
  ok(r && r.action === 'uninstall' && JSON.stringify(r.providers) === '["claude"]' && r.scope === 'project',
    'uninstall: chọn provider đã cài');
}

// uninstall: scope global -> manifest rỗng -> null
{
  const deps = makeDeps({ one: ['global'] });
  const r = await runWizard('uninstall', deps);
  ok(r === null, 'uninstall: manifest rỗng -> null');
}

// update: scope project (có cài) -> confirm -> action object
{
  const deps = makeDeps({ one: ['project'], confirm: [true] });
  const r = await runWizard('update', deps);
  ok(r && r.action === 'update' && r.scope === 'project', 'update: scope project + confirm -> {action:update, scope}');
}

// update: scope global (manifest rỗng) -> null (không có gì để update)
{
  const deps = makeDeps({ one: ['global'] });
  const r = await runWizard('update', deps);
  ok(r === null, 'update: manifest rỗng -> null');
}

// update: BACK ở bước scope -> huỷ (null)
{
  const { BACK } = await import('../cli/lib/prompt.mjs');
  const deps = makeDeps({ one: [BACK] });
  const r = await runWizard('update', deps);
  ok(r === null, 'update: BACK ở bước đầu -> null');
}

console.log('');
if (fails.length) { console.log('FAIL:'); for (const f of fails) console.log('  ✗ ' + f); }
console.log(`\nWIZARD TEST: ${pass} pass, ${fails.length} fail`);
process.exit(fails.length ? 1 : 0);
