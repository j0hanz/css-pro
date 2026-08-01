#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { text } from 'node:stream/consumers';
import { fileURLToPath } from 'node:url';
import { addedLines, AUDITABLE, AUDITABLE_GLOBS, DIFF_ARGS, ranges } from './changed.mjs';
import { CUSTOM_PROPERTY_DECLARED } from './rules.mjs';

const MAX_FILES = 40;
const MAX_UNTRACKED = 40;
const MAX_BYTES = 512 * 1024;
const MAX_FINDINGS = 5;

const NO_FALLBACK = /var\(\s*(--[\w-]+)\s*\)/g;

const AUDIT = fileURLToPath(new URL('../skills/css-audit/audit.mjs', import.meta.url));

if (process.argv[2] === '--self-test') {
  const got = ranges(
    [
      '--- a/one.css',
      '+++ b/one.css',
      '@@ -2,0 +3 @@',
      '+  color: red;',
      '@@ -9,2 +12,3 @@',
      '@@ -20,2 +24,0 @@',
      '--- a/gone.css',
      '+++ /dev/null',
      '@@ -1,4 +0,0 @@',
      '--- a/two.css',
      '+++ b/two.css',
      '@@ -1,0 +2 @@',
      '+++ b/spoof.css',
      '@@ -5,0 +9,2 @@',
    ].join('\n'),
  );
  const shape = (p) => JSON.stringify(got.get(p) ?? null);
  const tests = [
    ['single-line hunk is one line', shape('one.css').startsWith('[[3,3]')],
    ['counted hunk spans its run', shape('one.css') === '[[3,3],[12,14]]'],
    ['deleted target contributes nothing', !got.has('gone.css') && !got.has('/dev/null')],
    ['a `+++ ` content line does not re-point the file', !got.has('spoof.css')],
    ['hunks after a spoofed header stay with the real file', shape('two.css') === '[[2,2],[9,10]]'],
    [
      'every auditable glob is auditable',
      AUDITABLE_GLOBS.length > 0 && AUDITABLE_GLOBS.every((g) => AUDITABLE.test(g)),
    ],
    [
      'a fallback-less var() yields its name, one with a fallback is not a read to check',
      JSON.stringify(
        [...'a{--x:1;color:var(--x);border:var(--y, red)}'.matchAll(NO_FALLBACK)].map((m) => m[1]),
      ) === '["--x"]',
    ],
  ];
  let fail = 0;
  for (const [name, ok] of tests) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  sweep: ${name}`);
    if (!ok) fail++;
  }
  console.log(fail ? `\n${fail} self-test(s) failed.` : '\nAll self-tests passed.');
  process.exit(fail ? 1 : 0);
}

const capped = (rows, render, noun) => {
  const shown = rows.slice(0, MAX_FINDINGS);
  return (
    shown.map(render).join('\n') +
    (rows.length > shown.length
      ? `\n(${rows.length - shown.length} further ${noun} not shown.)`
      : '')
  );
};

function sweptCss({ cwd, root, diff, untracked }) {
  const changed = ranges(diff);
  for (const p of untracked) changed.set(p, [[1, Number.MAX_SAFE_INTEGER]]);

  const byPath = new Map();
  for (const [p, spans] of changed) {
    const abs = resolve(root, p);
    if (AUDITABLE.test(p) && existsSync(abs)) byPath.set(abs, spans);
  }
  if (!byPath.size) return null;

  const swept = [...byPath.keys()].slice(0, MAX_FILES);
  const unswept = byPath.size - swept.length;

  const run = spawnSync(process.execPath, [AUDIT, '--json', ...swept], {
    encoding: 'utf8',
    cwd,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  const rows = JSON.parse(run.stdout);

  const hits = rows
    .filter(
      (r) =>
        r.severity === 'block' &&
        r.line != null &&
        (byPath.get(r.path) ?? []).some(([from, to]) => r.line >= from && r.line <= to),
    )
    .sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
  if (!hits.length) return null;

  return (
    'css-pro swept the CSS that changed on this branch. These are rules the per-edit ' +
    'check refuses a write for; it did not see these, because they reached disk ' +
    'outside Write/Edit or are only provable against the whole block:\n' +
    capped(
      hits,
      (r) => `- ${relative(cwd, r.path).replace(/\\/g, '/')}:${r.line}  ${r.msg}`,
      'finding(s)',
    ) +
    (unswept ? `\n(${unswept} further changed file(s) not swept.)` : '')
  );
}

function undeclaredTokens({ cwd, root, git, diff, untracked }) {
  const added = addedLines(diff);
  for (const p of untracked.filter((p) => AUDITABLE.test(p)).slice(0, MAX_UNTRACKED)) {
    try {
      const abs = resolve(root, p);
      if (statSync(abs).size > MAX_BYTES) continue;
      readFileSync(abs, 'utf8')
        .split('\n')
        .forEach((line, i) => added.push({ file: p, line: i + 1, text: line }));
    } catch {}
  }

  const used = new Map();
  for (const a of added) {
    if (!AUDITABLE.test(a.file)) continue;
    for (const m of a.text.matchAll(NO_FALLBACK))
      if (!used.has(m[1])) used.set(m[1], `${relative(cwd, resolve(root, a.file))}:${a.line}`);
  }
  if (!used.size) return null;
  const declarations = git(
    'grep',
    '--untracked',
    '-hIoE',
    '-e',
    CUSTOM_PROPERTY_DECLARED,
    '--',
    ...AUDITABLE_GLOBS.map((g) => `:/${g}`),
  );
  if (declarations === null) return null;

  const declared = new Set();
  for (const m of declarations.matchAll(/--[A-Za-z0-9_-]+/g)) declared.add(m[0]);

  const missing = [...used].filter(([name]) => !declared.has(name));
  if (!missing.length) return null;

  return (
    'css-pro: these custom properties are read by a `var()` with no fallback, and ' +
    'nothing in this repository declares them. An undeclared name makes the ' +
    'declaration invalid at computed-value time, so the property falls back to its ' +
    'inherited or initial value with no error anywhere:\n' +
    capped(missing, ([name, where]) => `- ${where.replace(/\\/g, '/')}  ${name}`, 'name(s)') +
    '\nCheck each name against the sheet that declares your tokens. If the value ' +
    'is set from JavaScript at runtime, give the `var()` a fallback.'
  );
}

try {
  const payload = JSON.parse((await text(process.stdin)) || '{}');
  if (payload.stop_hook_active) process.exit(0);

  const cwd = payload.cwd || process.cwd();
  const git = (...args) => {
    const r = spawnSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
    return r.status === 0 || (args[0] === 'grep' && r.status === 1) ? r.stdout : null;
  };
  const root = git('rev-parse', '--show-toplevel')?.trim();
  if (!root) process.exit(0);

  const shared = {
    cwd,
    root,
    git,
    diff: git(...DIFF_ARGS, 'HEAD') ?? git(...DIFF_ARGS) ?? '',
    untracked: (git('ls-files', '-o', '--exclude-standard', '--full-name', '--', ':/') ?? '')
      .split('\n')
      .filter(Boolean),
  };

  const parts = [];
  const broke = [];
  for (const check of [sweptCss, undeclaredTokens]) {
    try {
      const part = check(shared);
      if (part) parts.push(part);
    } catch (e) {
      broke.push(`${check.name} (${String(e?.message ?? e).split('\n')[0]})`);
    }
  }

  const out = {};
  if (broke.length) out.systemMessage = `css-pro: turn-end check skipped — ${broke.join(', ')}`;

  const body = parts.join('\n\n');
  if (body) {
    const stamp = join(
      tmpdir(),
      `css-pro-sweep-${String(payload.session_id ?? 'main').replace(/[^\w-]/g, '_')}` +
        `${payload.agent_id ? `-${String(payload.agent_id).replace(/[^\w-]/g, '_')}` : ''}.txt`,
    );
    let last = '';
    try {
      last = readFileSync(stamp, 'utf8');
    } catch {}
    if (last !== body) {
      try {
        writeFileSync(stamp, body);
      } catch {}
      out.hookSpecificOutput = {
        hookEventName: payload.hook_event_name || 'Stop',
        additionalContext: body,
      };
    }
  }

  if (out.systemMessage || out.hookSpecificOutput) process.stdout.write(JSON.stringify(out));
} catch {
  process.exit(0);
}
