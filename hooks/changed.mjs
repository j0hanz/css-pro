import { readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EXTS = 'css scss sass less js jsx cjs mjs ts tsx cts mts vue svelte astro html htm'.split(
  ' ',
);

export const AUDITABLE = new RegExp(`\\.(?:${EXTS.join('|')})$`, 'i');
export const AUDITABLE_GLOBS = EXTS.map((e) => `*.${e}`);
export const STYLESHEET = /\.(?:css|scss|sass|less)$/i;

export const DIFF_ARGS = ['diff', '-U0', '--no-color', '--no-ext-diff'];

export const MAX_BYTES = 512 * 1024;
export const MAX_FILES = 40;

const slug = (v) => String(v ?? 'main').replace(/[^\w-]/g, '_');

export const stateFile = (kind, { session_id, agent_id } = {}) =>
  join(tmpdir(), `css-pro-${kind}-${slug(session_id)}${agent_id ? `-${slug(agent_id)}` : ''}.txt`);

export const lineKey = (a) => `${a.file}\t${a.text.trim()}`;

export function cap(rows, limit, noun) {
  const shown = rows.slice(0, limit);
  const rest = rows.length - shown.length;
  return { shown, note: rest ? `\n(${rest} further ${noun} not shown.)` : '' };
}

export function untrackedLines(root, paths) {
  const out = [];
  for (const file of paths.slice(0, MAX_FILES)) {
    const abs = resolve(root, file);
    try {
      if (statSync(abs).size > MAX_BYTES) continue;
      readFileSync(abs, 'utf8')
        .split('\n')
        .forEach((text, i) => out.push({ file, line: i + 1, text }));
    } catch {}
  }
  return out;
}

const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(?:\d+))? @@/;

export function addedLines(diff) {
  const out = [];
  let file = null;
  let previous = '';
  let lineNumber = 0;
  for (const row of diff.split('\n')) {
    if (row.startsWith('+++ ') && previous.startsWith('--- ')) {
      const target = row.slice(4).trim();
      file = target === '/dev/null' ? null : target.replace(/^b\//, '');
      lineNumber = 0;
    } else if (file && row.startsWith('@@')) {
      const hunk = HUNK.exec(row);
      lineNumber = hunk ? +hunk[1] : 0;
    } else if (file && lineNumber && row.startsWith('+')) {
      out.push({ file, line: lineNumber++, text: row.slice(1) });
    }
    previous = row;
  }
  return out;
}
