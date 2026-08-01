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

export function ranges(diff) {
  const out = new Map();
  for (const h of hunks(diff)) {
    if (h.count <= 0) continue;
    if (!out.has(h.file)) out.set(h.file, []);
    out.get(h.file).push([h.start, h.start + h.count - 1]);
  }
  return out;
}

export function addedLines(diff) {
  const out = [];
  for (const h of hunks(diff))
    h.lines.forEach((text, i) => out.push({ file: h.file, line: h.start + i, text }));
  return out;
}
