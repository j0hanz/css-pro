#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { text } from 'node:stream/consumers';
import { addedLines, AUDITABLE, DIFF_ARGS } from './changed.mjs';
import { CUSTOM_PROPERTY_DECLARED } from './rules.mjs';

const MAX_UNTRACKED = 40;
const MAX_BYTES = 512 * 1024;
const MAX_FINDINGS = 5;

const NO_FALLBACK = /var\(\s*(--[\w-]+)\s*\)/g;

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

  const added = addedLines(git(...DIFF_ARGS, 'HEAD') ?? git(...DIFF_ARGS) ?? '');

  for (const p of (git('ls-files', '-o', '--exclude-standard', '--full-name', '--', ':/') ?? '')
    .split('\n')
    .filter((p) => p && AUDITABLE.test(p))
    .slice(0, MAX_UNTRACKED)) {
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
  if (!used.size) process.exit(0);

  const grep = spawnSync(
    'git',
    ['-C', cwd, 'grep', '--untracked', '-hIoE', '-e', CUSTOM_PROPERTY_DECLARED, '--', ':/'],
    { encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
  );
  if (grep.status !== 0 && grep.status !== 1) process.exit(0);

  const declared = new Set();
  for (const m of (grep.stdout ?? '').matchAll(/--[A-Za-z0-9_-]+/g)) declared.add(m[0]);

  const missing = [...used].filter(([name]) => !declared.has(name));
  if (!missing.length) process.exit(0);

  const shown = missing.slice(0, MAX_FINDINGS);
  const body =
    shown.map(([name, where]) => `- ${where.replace(/\\/g, '/')}  ${name}`).join('\n') +
    (missing.length > shown.length
      ? `\n(${missing.length - shown.length} further name(s) not shown.)`
      : '');

  const stamp = join(
    tmpdir(),
    `css-pro-tokens-${String(payload.session_id ?? 'main').replace(/[^\w-]/g, '_')}` +
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
        hookEventName: payload.hook_event_name || 'Stop',
        additionalContext:
          'css-pro: these custom properties were read this turn by a `var()` with no ' +
          'fallback, and nothing in this repository declares them. An undeclared name ' +
          'makes the declaration invalid at computed-value time, so the property falls ' +
          'back to its inherited or initial value with no error anywhere:\n' +
          body +
          '\nCheck each name against the sheet that declares your tokens. If the value ' +
          'is set from JavaScript at runtime, give the `var()` a fallback.',
      },
    }),
  );
} catch {
  process.exit(0);
}
