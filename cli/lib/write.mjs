// Output writer + small helpers shared by the CLI and adapters.
import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

export function rmrf(d) { fs.rmSync(d, { recursive: true, force: true }); }

function copyDir(src, dst) {
  ensureDir(dst);
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

/**
 * Materialize the file list an adapter returns into outDir.
 * Each entry is one of:
 *   { path, content }   -> write text file
 *   { path, copyFrom }  -> copy a single file
 *   { path, copyDir }   -> copy a directory tree
 * `path` is always relative to outDir and uses '/' separators.
 * Returns the number of files written/copied.
 */
export function writeFiles(outDir, files) {
  let count = 0;
  for (const f of files) {
    const dest = path.join(outDir, f.path);
    if (f.content != null) {
      ensureDir(path.dirname(dest));
      fs.writeFileSync(dest, f.content, 'utf8');
      count++;
    } else if (f.copyFrom) {
      ensureDir(path.dirname(dest));
      fs.copyFileSync(f.copyFrom, dest);
      count++;
    } else if (f.copyDir) {
      if (fs.existsSync(f.copyDir)) { copyDir(f.copyDir, dest); count++; }
    }
  }
  return count;
}

/** Emit a YAML frontmatter block from an ordered list of [key, value] pairs. */
export function frontmatter(pairs) {
  const lines = ['---'];
  for (const [k, v] of pairs) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'boolean' || typeof v === 'number') lines.push(`${k}: ${v}`);
    else lines.push(`${k}: ${v}`); // values here are single-line strings by design
  }
  lines.push('---');
  return lines.join('\n');
}
