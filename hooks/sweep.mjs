#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { text } from 'node:stream/consumers';
import { fileURLToPath } from 'node:url';
import {
  addedLines,
  AUDITABLE,
  AUDITABLE_GLOBS,
  DIFF_ARGS,
  lineKey,
  untrackedLines,
} from './changed.mjs';
import { CUSTOM_PROPERTY_DECLARED } from './rules.mjs';
import { stateFile } from './state.mjs';

const MAX_FILES = 40;
const MAX_FINDINGS = 5;

const NO_FALLBACK = /var\(\s*(--[\w-]+)\s*\)/g;
const LINE_COMMENT = /\.(scss|sass|less|[cm]?[jt]sx?)$/i;

function maskAddedLine(s, state, lineComment) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const n = s[i + 1];
    if (state.comment) {
      if (c === '*' && n === '/') {
        state.comment = false;
        i++;
      }
      continue;
    }
    if (c === '/' && n === '*') {
      state.comment = true;
      i++;
      continue;
    }
    if (lineComment && c === '/' && n === '/') break;
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < s.length && s[i] !== q) {
        if (s[i] === '\\') i++;
        i++;
      }
      out += ' ';
      continue;
    }
    out += c;
  }
  return out;
}

function sessionGate(root, startedAt) {
  const seen = new Map();
  return (path) => {
    let mtime = seen.get(path);
    if (mtime === undefined) {
      try {
        mtime = statSync(resolve(root, path)).mtimeMs;
      } catch {
        mtime = null;
      }
      seen.set(path, mtime);
    }
    return mtime !== null && mtime >= startedAt;
  };
}

const AUDIT = fileURLToPath(new URL('../skills/css-audit/audit.mjs', import.meta.url));

if (process.argv[2] === '--self-test') {
  const got = addedLines(
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
  const at = (p) => got.filter((a) => a.file === p);
  const tests = [
    [
      'an added line carries its new-file number and text',
      JSON.stringify(at('one.css')) === '[{"file":"one.css","line":3,"text":"  color: red;"}]',
    ],
    ['a hunk with no added lines contributes nothing', got.length === 2],
    ['a deleted target contributes nothing', !at('gone.css').length && !at('/dev/null').length],
    ['a `+++ ` content line does not re-point the file', !at('spoof.css').length],
    [
      'a line after a spoofed header stays with the real file',
      at('two.css').length === 1 && at('two.css')[0].line === 2,
    ],
    [
      'the baseline key ignores line numbers and surrounding space',
      lineKey({ file: 'a.css', line: 3, text: '  color: red;' }) ===
        lineKey({ file: 'a.css', line: 99, text: 'color: red;' }),
    ],
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
    [
      'var() in a comment or string is not a read',
      [
        ...maskAddedLine(
          '/* var(--a) */ content: "var(--b)"; color: var(--c);',
          { comment: false },
          false,
        ).matchAll(NO_FALLBACK),
      ].map((m) => m[1]) +
        '' ===
        '--c',
    ],
    [
      'block comment state carries across lines',
      (() => {
        const st = { comment: false };
        maskAddedLine('/* open var(--a)', st, false);
        const masked = maskAddedLine('still comment var(--b) */ color: var(--c);', st, false);
        return !masked.includes('--b') && masked.includes('--c');
      })(),
    ],
    [
      'line comments blank the rest of the line only for js/scss-less',
      !maskAddedLine('// var(--a)', { comment: false }, true).includes('--a') &&
        maskAddedLine('// not a comment: var(--a)', { comment: false }, false).includes('--a'),
    ],
    [
      'an untracked file is enumerated whole, from line 1, and a missing one is skipped',
      (() => {
        const p = join(tmpdir(), 'css-pro-selftest-untracked.css');
        writeFileSync(p, 'a{}\nb{}\n');
        const got = untrackedLines(tmpdir(), [
          'css-pro-selftest-untracked.css',
          'css-pro-selftest-absent.css',
        ]);
        rmSync(p, { force: true });
        return (
          got.length === 3 &&
          got[0].line === 1 &&
          got[0].text === 'a{}' &&
          got[1].line === 2 &&
          got.every((a) => a.file === 'css-pro-selftest-untracked.css')
        );
      })(),
    ],
    [
      'a finding already reported this session is not reported again, and a new one ' +
        'arrives alone',
      (() => {
        const part = (...names) => ({
          lead: 'lead:\n',
          noun: 'thing(s)',
          tail: '\ntail',
          rows: names.map((n) => ({ key: n, text: `- ${n}` })),
        });
        const said = new Set();
        const first = emit(part('a', 'b'), said);
        first.keys.forEach((k) => said.add(k));
        const again = emit(part('a', 'b'), said);
        const grown = emit(part('a', 'b', 'c'), said);
        return (
          first.text === 'lead:\n- a\n- b\ntail' &&
          again === null &&
          grown.text === 'lead:\n- c\ntail'
        );
      })(),
    ],
    [
      'the vendor search reaches a node_modules at any depth, not only the root one',
      (() => {
        let seen = [];
        declaredNames(
          (...args) => {
            seen = args;
            return '';
          },
          '*node_modules/',
          ['--no-exclude-standard'],
        );
        return (
          seen.includes('--no-exclude-standard') &&
          seen.includes(':/*node_modules/*.css') &&
          !seen.includes(':/node_modules/*.css')
        );
      })(),
    ],
    [
      'a token an installed package declares is settled, and not searched for again',
      (() => {
        const added = [{ file: 'a.css', line: 1, text: 'a{color:var(--bs-primary)}', fresh: true }];
        // Repo search finds nothing; only the ignored-tree search declares the name.
        const vendor = (...args) => (args.includes('--no-exclude-standard') ? '--bs-primary:' : '');
        const settled = [];
        const first = undeclaredTokens({
          cwd: '.',
          root: '.',
          git: vendor,
          added,
          said: new Set(),
          settled,
        });
        let searches = 0;
        const counted = (...args) => {
          if (args.includes('--no-exclude-standard')) searches++;
          return vendor(...args);
        };
        const next = undeclaredTokens({
          cwd: '.',
          root: '.',
          git: counted,
          added,
          said: new Set(settled),
          settled: [],
        });
        return first === null && settled.join() === '--bs-primary' && next === null && !searches;
      })(),
    ],
    [
      'only the findings actually shown are marked reported, so the capped ones return',
      (() => {
        const rows = Array.from({ length: MAX_FINDINGS + 2 }, (_, i) => ({
          key: `k${i}`,
          text: `- k${i}`,
        }));
        const said = new Set();
        const first = emit({ lead: '', noun: 'thing(s)', tail: '', rows }, said);
        first.keys.forEach((k) => said.add(k));
        const rest = emit({ lead: '', noun: 'thing(s)', tail: '', rows }, said);
        return (
          first.keys.length === MAX_FINDINGS &&
          first.text.endsWith('(2 further thing(s) not shown.)') &&
          rest.keys.length === 2 &&
          rest.text === `- k${MAX_FINDINGS}\n- k${MAX_FINDINGS + 1}`
        );
      })(),
    ],
    [
      'the session gate admits what was written after the session opened, and nothing older',
      (() => {
        const stamp = (name, ms) => {
          const p = join(tmpdir(), name);
          writeFileSync(p, 'a{}');
          utimesSync(p, new Date(ms), new Date(ms));
          return p;
        };
        const before = stamp('css-pro-selftest-before.css', 1_000);
        const after = stamp('css-pro-selftest-after.css', 9_000);
        const gate = sessionGate(tmpdir(), 5_000);
        const ok =
          !gate('css-pro-selftest-before.css') &&
          gate('css-pro-selftest-after.css') &&
          !gate('css-pro-selftest-absent.css');
        rmSync(before, { force: true });
        rmSync(after, { force: true });
        return ok;
      })(),
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

function emit(part, said) {
  const rows = part.rows.filter((r) => !said.has(r.key));
  if (!rows.length) return null;
  const shown = rows.slice(0, MAX_FINDINGS);
  return {
    keys: shown.map((r) => r.key),
    text:
      part.lead +
      shown.map((r) => r.text).join('\n') +
      (rows.length > shown.length
        ? `\n(${rows.length - shown.length} further ${part.noun} not shown.)`
        : '') +
      part.tail,
  };
}

function sweptCss({ cwd, root, added }) {
  const byPath = new Map();
  for (const a of added) {
    if (!a.fresh) continue;
    const abs = resolve(root, a.file);
    if (!byPath.has(abs)) byPath.set(abs, new Set());
    byPath.get(abs).add(a.line);
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
    .filter((r) => r.severity === 'block' && r.line != null && byPath.get(r.path)?.has(r.line))
    .sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
  if (!hits.length) return null;

  return {
    lead:
      'css-pro swept the CSS this session changed. These are rules the per-edit check ' +
      'refuses a write for; it did not see these, because they reached disk outside ' +
      'Write/Edit or are only provable against the whole block:\n',
    noun: 'finding(s)',
    tail: unswept ? `\n(${unswept} further changed file(s) not swept.)` : '',
    rows: hits.map((r) => {
      const at = `${relative(cwd, r.path).replace(/\\/g, '/')}:${r.line}`;
      return { key: `${at}\t${r.msg}`, text: `- ${at}  ${r.msg}` };
    }),
  };
}

function declaredNames(git, where, extraFlags) {
  const out = git(
    'grep',
    '--untracked',
    ...extraFlags,
    '-hIoE',
    '-e',
    CUSTOM_PROPERTY_DECLARED,
    '--',
    ...AUDITABLE_GLOBS.map((g) => `:/${where}${g}`),
  );
  if (out === null) return null;
  const names = new Set();
  for (const m of out.matchAll(/--[A-Za-z0-9_-]+/g)) names.add(m[0]);
  return names;
}

function undeclaredTokens({ cwd, root, git, added, said, settled }) {
  const used = new Map();
  const states = new Map();
  for (const a of added) {
    let st = states.get(a.file);
    if (!st) states.set(a.file, (st = { comment: false }));
    const text = maskAddedLine(a.text, st, LINE_COMMENT.test(a.file));
    if (!a.fresh) continue;
    for (const m of text.matchAll(NO_FALLBACK))
      if (!used.has(m[1])) used.set(m[1], `${relative(cwd, resolve(root, a.file))}:${a.line}`);
  }
  if (!used.size) return null;
  const declared = declaredNames(git, '', []);
  if (declared === null) return null;

  let missing = [...used].filter(([name]) => !declared.has(name) && !said.has(name));
  if (!missing.length) return null;

  const vendored = declaredNames(git, '*node_modules/', ['--no-exclude-standard']);
  if (vendored === null) return null;

  for (const [name] of missing) if (vendored.has(name)) settled.push(name);
  missing = missing.filter(([name]) => !vendored.has(name));
  if (!missing.length) return null;

  return {
    lead:
      'css-pro: these custom properties are read by a `var()` with no fallback, and ' +
      'nothing in this repository or its installed packages declares them. An undeclared ' +
      'name makes the declaration invalid at computed-value time, so the property falls ' +
      'back to its inherited or initial value with no error anywhere:\n',
    noun: 'name(s)',
    tail:
      '\nCheck each name against the sheet that declares your tokens. If the value ' +
      'is set from JavaScript at runtime, give the `var()` a fallback.',
    rows: missing.map(([name, where]) => ({
      key: name,
      text: `- ${where.replace(/\\/g, '/')}  ${name}`,
    })),
  };
}

try {
  const payload = JSON.parse((await text(process.stdin)) || '{}');
  if (payload.stop_hook_active) process.exit(0);
  let startedAt = NaN;
  let before = [];
  try {
    const mark = readFileSync(stateFile('session', { session_id: payload.session_id }), 'utf8');
    const nl = mark.indexOf('\n');
    startedAt = Number(nl === -1 ? mark : mark.slice(0, nl));
    before = nl === -1 ? [] : mark.slice(nl + 1).split('\n');
  } catch {}
  if (!(startedAt > 0)) process.exit(0);

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

  const stamp = stateFile('sweep', { session_id: payload.session_id });
  let said = new Set();
  try {
    said = new Set(readFileSync(stamp, 'utf8').split('\n'));
  } catch {}

  const settled = [];

  const baseline = new Set(before);
  const touched = sessionGate(root, startedAt);
  const untracked = (git('ls-files', '-o', '--exclude-standard', '--full-name', '--', ':/') ?? '')
    .split('\n')
    .filter((p) => p && AUDITABLE.test(p) && touched(p));
  const shared = {
    cwd,
    root,
    git,
    said,
    settled,
    added: [
      ...addedLines(git(...DIFF_ARGS, 'HEAD') ?? git(...DIFF_ARGS) ?? ''),
      ...untrackedLines(root, untracked),
    ]
      .filter((a) => AUDITABLE.test(a.file) && touched(a.file))
      .map((a) => ({ ...a, fresh: !baseline.has(lineKey(a)) })),
  };

  const parts = [];
  const fresh = [];
  for (const check of [sweptCss, undeclaredTokens]) {
    try {
      const part = check(shared);
      const next = part && emit(part, said);
      if (!next) continue;
      fresh.push(...next.keys);
      parts.push(next.text);
    } catch {
      // Ignore a check that fails, so the other can still run. The sweep hook is advisory, not a gate.
    }
  }
  const record = [...settled, ...fresh];
  if (record.length) {
    try {
      appendFileSync(stamp, record.join('\n') + '\n');
    } catch {}
  }
  if (!parts.length) process.exit(0);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: payload.hook_event_name || 'Stop',
        additionalContext: parts.join('\n\n'),
      },
    }),
  );
} catch {
  process.exit(0);
}
