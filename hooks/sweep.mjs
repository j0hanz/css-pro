#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { text } from 'node:stream/consumers';
import { fileURLToPath } from 'node:url';
import { AUDITABLE, DIFF_ARGS, ranges } from './changed.mjs';

const MAX_FILES = 40;
const MAX_FINDINGS = 5;

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
  ];
  let fail = 0;
  for (const [name, ok] of tests) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  sweep: ${name}`);
    if (!ok) fail++;
  }
  console.log(fail ? `\n${fail} self-test(s) failed.` : '\nAll self-tests passed.');
  process.exit(fail ? 1 : 0);
}

try {
  const payload = JSON.parse((await text(process.stdin)) || '{}');
  if (payload.stop_hook_active) process.exit(0);

  const cwd = payload.cwd || process.cwd();
  const git = (...args) => {
    const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true });
    return r.status === 0 ? r.stdout : null;
  };
  const root = git('rev-parse', '--show-toplevel')?.trim();
  if (!root) process.exit(0);

  const changed = ranges(git(...DIFF_ARGS, 'HEAD') ?? git(...DIFF_ARGS) ?? '');
  for (const p of (git('ls-files', '-o', '--exclude-standard', '--full-name', '--', ':/') ?? '')
    .split('\n')
    .filter(Boolean))
    changed.set(p, [[1, Number.MAX_SAFE_INTEGER]]);

  const byPath = new Map();
  for (const [p, spans] of changed) {
    const abs = resolve(root, p);
    if (AUDITABLE.test(p) && existsSync(abs)) byPath.set(abs, spans);
  }
  if (!byPath.size) process.exit(0);

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
  if (!hits.length) process.exit(0);

  const shown = hits.slice(0, MAX_FINDINGS);
  const body =
    shown
      .map((r) => `- ${relative(cwd, r.path).replace(/\\/g, '/')}:${r.line}  ${r.msg}`)
      .join('\n') +
    (hits.length > shown.length
      ? `\n(${hits.length - shown.length} further finding(s) not shown.)`
      : '') +
    (unswept ? `\n(${unswept} further changed file(s) not swept.)` : '');

  const stamp = join(
    tmpdir(),
    `css-pro-sweep-${String(payload.session_id ?? 'main').replace(/[^\w-]/g, '_')}` +
      `${payload.agent_id ? `-${String(payload.agent_id).replace(/[^\w-]/g, '_')}` : ''}.txt`,
  );
  let last = '';
  try {
    last = readFileSync(stamp, 'utf8');
  } catch {}
  if (last === body) process.exit(0);
  try {
    writeFileSync(stamp, body);
  } catch {}

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        // SubagentStop runs the same sweep; naming the wrong event drops the output.
        hookEventName: payload.hook_event_name || 'Stop',
        additionalContext:
          'css-pro swept the CSS that changed in this turn. These are rules the per-edit ' +
          'check refuses a write for; it did not see these, because they reached disk ' +
          'outside Write/Edit or are only provable against the whole block:\n' +
          body,
      },
    }),
  );
} catch {
  process.exit(0);
}
