import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EXTS = 'css scss sass less js jsx cjs mjs ts tsx cts mts vue svelte astro html htm'.split(
  ' ',
);
const HOST_EXTS = new Set('js jsx cjs mjs ts tsx cts mts'.split(' '));

export const AUDITABLE = new RegExp(`\\.(?:${EXTS.join('|')})$`, 'i');
export const AUDITABLE_GLOBS = EXTS.map((e) => `*.${e}`);
export const STYLE_GLOBS = EXTS.filter((e) => !HOST_EXTS.has(e)).map((e) => `*.${e}`);
export const STYLESHEET = /\.(?:css|scss|sass|less)$/i;

export const DIFF_ARGS = ['diff', '-U0', '--no-color', '--no-ext-diff'];

export const MAX_BYTES = 512 * 1024;
export const MAX_FILES = 40;

const slug = (v) => String(v ?? 'main').replace(/[^\w-]/g, '_');

export const stateFile = (kind, { session_id } = {}) =>
  join(tmpdir(), `css-pro-${kind}-${slug(session_id)}.txt`);

// The session mark is compared against file mtimes, which can lag the wall clock.
const MTIME_SLACK_MS = 1000;
export const sessionStart = () => String(Date.now() - MTIME_SLACK_MS);

// Session-mark wire format, both ends here: first line is the session start, the rest are
// the baseline lineKeys — dirt the tree already carried when the session opened.
export const formatSessionMark = (startedAt, lines) =>
  `${startedAt}\n${lines.map(lineKey).join('\n')}`;

export function parseSessionMark(mark) {
  const newline = mark.indexOf('\n');
  return {
    startedAt: Number(newline === -1 ? mark : mark.slice(0, newline)),
    before: newline === -1 ? [] : mark.slice(newline + 1).split('\n'),
  };
}

export const lineKey = (a) => `${a.file}\t${a.text.trim()}`;

export function cap(rows, limit, noun) {
  const shown = rows.slice(0, limit);
  const rest = rows.length - shown.length;
  return { shown, note: rest ? `\n(${rest} further ${noun} not shown.)` : '' };
}

const mtimeOf = (abs) => {
  try {
    return statSync(abs).mtimeMs;
  } catch {
    return 0;
  }
};

export function keepNewest(root, paths) {
  if (paths.length <= MAX_FILES) return { kept: paths, dropped: [] };
  const ranked = paths
    .map((file) => ({ file, at: mtimeOf(resolve(root, file)) }))
    .sort((a, b) => b.at - a.at)
    .map((p) => p.file);
  return { kept: ranked.slice(0, MAX_FILES), dropped: ranked.slice(MAX_FILES) };
}

export function untrackedLines(root, paths) {
  const out = [];
  for (const file of paths) {
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

export const gitRunner =
  (cwd) =>
  (...args) => {
    const r = spawnSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
    return r.status === 0 || (args[0] === 'grep' && r.status === 1) ? r.stdout : null;
  };

export function repoChanges(cwd) {
  const git = gitRunner(cwd);
  const root = git('rev-parse', '--show-toplevel')?.trim();
  if (!root) return { root: null, git, added: [] };
  const untracked = (git('ls-files', '-o', '--exclude-standard', '--full-name', '--', ':/') ?? '')
    .split('\n')
    .filter((p) => p && AUDITABLE.test(p));
  const { kept, dropped } = keepNewest(root, untracked);
  return {
    root,
    git,
    dropped,
    added: [
      ...addedLines(git(...DIFF_ARGS, 'HEAD') ?? git(...DIFF_ARGS) ?? ''),
      ...untrackedLines(root, kept),
    ],
  };
}
