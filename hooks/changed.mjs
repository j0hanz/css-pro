import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const EXTS = [
  'css',
  'scss',
  'sass',
  'less',
  'js',
  'jsx',
  'cjs',
  'cjsx',
  'mjs',
  'mjsx',
  'ts',
  'tsx',
  'cts',
  'ctsx',
  'mts',
  'mtsx',
  'vue',
  'svelte',
  'astro',
  'html',
  'htm',
];

export const AUDITABLE = new RegExp(`\\.(?:${EXTS.join('|')})$`, 'i');

export const AUDITABLE_GLOBS = EXTS.map((e) => `*.${e}`);

export const DIFF_ARGS = ['diff', '-U0', '--no-color', '--no-ext-diff'];

const MAX_UNTRACKED = 40;
const MAX_BYTES = 512 * 1024;

export const lineKey = (a) => `${a.file}\t${a.text.trim()}`;

export function untrackedLines(root, paths) {
  const out = [];
  for (const file of paths.slice(0, MAX_UNTRACKED)) {
    try {
      if (statSync(resolve(root, file)).size > MAX_BYTES) continue;
      readFileSync(resolve(root, file), 'utf8')
        .split('\n')
        .forEach((text, i) => out.push({ file, line: i + 1, text }));
    } catch {}
  }
  return out;
}

const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

function* hunks(diff) {
  let file = null;
  let prev = '';
  let cur = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ') && prev.startsWith('--- ')) {
      if (cur) yield cur;
      cur = null;
      const p = line.slice(4).trim();
      file = p === '/dev/null' ? null : p.replace(/^b\//, '');
    } else if (file && line.startsWith('@@')) {
      if (cur) yield cur;
      const m = HUNK.exec(line);
      cur = m ? { file, start: +m[1], count: m[2] === undefined ? 1 : +m[2], lines: [] } : null;
    } else if (cur && line.startsWith('+')) {
      cur.lines.push(line.slice(1));
    }
    prev = line;
  }
  if (cur) yield cur;
}

export function addedLines(diff) {
  const out = [];
  for (const h of hunks(diff))
    h.lines.forEach((text, i) => out.push({ file: h.file, line: h.start + i, text }));
  return out;
}
