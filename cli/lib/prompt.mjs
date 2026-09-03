// Keypress TUI primitives (zero-dep, raw-mode). Chỉ dùng trong terminal tương tác (TTY).
import readline from 'node:readline';

export const BACK = Symbol('back');     // người dùng bấm b — quay lại bước trước
export const CANCEL = Symbol('cancel'); // huỷ wizard (vd manifest rỗng)
export class WizardUnavailable extends Error {
  constructor() { super('Wizard cần terminal tương tác (TTY).'); this.name = 'WizardUnavailable'; }
}

// Màu ANSI — chỉ bật khi stdout là TTY và không đặt NO_COLOR (tránh lẫn mã màu vào pipe/redirect/test).
const USE_COLOR = !!process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (USE_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = (s) => paint('1', s);
const dim = (s) => paint('2', s);
const cyan = (s) => paint('36', s);
const green = (s) => paint('32', s);
const yellow = (s) => paint('33', s);
const SEP = dim('─'.repeat(40));

/** Thuần: ánh xạ tên phím -> hành động wizard. Export để test. */
export function keyToAction(name, { ctrl = false } = {}) {
  if (ctrl && name === 'c') return 'quit';
  switch (name) {
    case 'up': case 'k': return 'up';
    case 'down': case 'j': return 'down';
    case 'space': return 'toggle';
    case 'a': return 'all';
    case 'return': case 'enter': return 'confirm';
    case 'b': return 'back';
    case 'q': case 'escape': return 'quit';
    default: return null;
  }
}

function renderLines(title, items, { cursor, selected, multi, hint }) {
  const out = [bold(title)];
  items.forEach((it, i) => {
    const active = i === cursor;
    const pointer = active ? cyan('>') : ' ';
    const box = multi ? (selected.has(i) ? green('[x]') : dim('[ ]')) + ' ' : '';
    const label = active ? cyan(it.label) : it.label;
    const tail = it.hint ? dim('  — ' + it.hint) : '';
    out.push(`${pointer} ${box}${label}${tail}`);
  });
  out.push(hint);
  return out;
}

/**
 * Khung hiển thị một frame: gộp các dòng thành text + đếm số DÒNG HIỂN THỊ THẬT
 * (kể cả khi title chứa '\n' nhiều dòng). `rows` dùng cho lệnh cuộn con trỏ lên khi vẽ lại,
 * nên phải đếm theo dòng visual chứ KHÔNG phải số phần tử mảng. Export để test.
 */
export function renderFrame(title, items, opts) {
  const text = renderLines(title, items, opts).join('\n');
  return { text, rows: text.split('\n').length };
}

function runSelect(title, items, { multi = false, preselected = [], min = 0 } = {}) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') return Promise.reject(new WizardUnavailable());
  return new Promise((resolve) => {
    let cursor = 0;
    const selected = new Set(
      preselected.map((v) => items.findIndex((it) => it.value === v)).filter((i) => i >= 0),
    );
    const hint = multi
      ? '↑/↓ di chuyển · Space chọn · a tất cả · Enter xác nhận · b quay lại · q huỷ'
      : '↑/↓ di chuyển · Enter chọn · b quay lại · q huỷ';
    let last = 0;
    const draw = (note = '') => {
      if (last) process.stdout.write(`\x1b[${last}A\x1b[0J`);
      const hintLine = note ? yellow(note) : dim(hint);
      const { text, rows } = renderFrame(title, items, { cursor, selected, multi, hint: hintLine });
      process.stdout.write(text + '\n');
      last = rows;
    };
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const cleanup = () => {
      process.stdin.off('keypress', onKey);
      try { process.stdin.setRawMode(false); } catch { /* */ }
      process.stdin.pause();
    };
    const onKey = (_str, key) => {
      if (!key) return;
      const act = keyToAction(key.name, key);
      if (act === 'up') cursor = (cursor - 1 + items.length) % items.length;
      else if (act === 'down') cursor = (cursor + 1) % items.length;
      else if (act === 'toggle' && multi) { selected.has(cursor) ? selected.delete(cursor) : selected.add(cursor); }
      else if (act === 'all' && multi) {
        if (selected.size === items.length) selected.clear();
        else items.forEach((_, i) => selected.add(i));
      } else if (act === 'back') { cleanup(); return resolve(BACK); }
      else if (act === 'quit') { cleanup(); return resolve(CANCEL); }
      else if (act === 'confirm') {
        if (multi) {
          if (selected.size < min) { draw(`! Chọn ít nhất ${min} mục (Space để chọn).`); return; }
          cleanup(); return resolve([...selected].sort((a, b) => a - b).map((i) => items[i].value));
        }
        cleanup(); return resolve(items[cursor].value);
      }
      draw();
    };
    process.stdout.write('\n' + SEP + '\n'); // phân cách với step trước (ngoài vùng vẽ lại nên giữ nguyên)
    process.stdin.on('keypress', onKey);
    draw();
  });
}

export function selectOne(title, items, opts = {}) { return runSelect(title, items, { ...opts, multi: false }); }
export function selectMany(title, items, opts = {}) { return runSelect(title, items, { ...opts, multi: true }); }

/** Confirm = chọn "Xác nhận & chạy" (true) hoặc "Quay lại sửa" (BACK). q huỷ. */
export async function confirmStep(title, lines = []) {
  const body = [title, ...lines.map((l) => '  ' + l)].join('\n');
  return selectOne(body, [
    { label: 'Xác nhận & chạy', value: true },
    { label: 'Quay lại sửa', value: BACK },
  ]);
}
