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

const safe = (v) => String(v ?? 'main').replace(/[^\w-]/g, '_');

export const stateFile = (kind, { session_id, agent_id } = {}) =>
  join(tmpdir(), `css-pro-${kind}-${safe(session_id)}${agent_id ? `-${safe(agent_id)}` : ''}.txt`);

export const lineKey = (a) => `${a.file}\t${a.text.trim()}`;

export function cap(rows, limit, noun) {
  const shown = rows.slice(0, limit);
  const rest = rows.length - shown.length;
  return { shown, note: rest ? `\n(${rest} further ${noun} not shown.)` : '' };
}

export function untrackedLines(root, paths) {
  const out = [];
  for (const file of paths.slice(0, MAX_FILES)) {
    try {
      if (statSync(resolve(root, file)).size > MAX_BYTES) continue;
      readFileSync(resolve(root, file), 'utf8')
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
  let prev = '';
  let line = 0;
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ') && prev.startsWith('--- ')) {
      const p = l.slice(4).trim();
      file = p === '/dev/null' ? null : p.replace(/^b\//, '');
      line = 0;
    } else if (file && l.startsWith('@@')) {
      const m = HUNK.exec(l);
      line = m ? +m[1] : 0;
    } else if (file && line && l.startsWith('+')) {
      out.push({ file, line: line++, text: l.slice(1) });
    }
    prev = l;
  }
  return out;
}
