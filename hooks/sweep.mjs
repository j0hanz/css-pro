#!/usr/bin/env node
import { appendFileSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { text } from 'node:stream/consumers';
import { fileURLToPath } from 'node:url';
import { auditFile } from '../skills/css-audit/audit.mjs';
import {
  AUDITABLE,
  AUDITABLE_GLOBS,
  cap,
  lineKey,
  MAX_FILES,
  parseSessionMark,
  repoChanges,
  stateFile,
} from './changed.mjs';
import { CUSTOM_PROPERTY_DECLARED } from './rules.mjs';
import { blankStrings, LINE_COMMENT_LANGS, stripComments } from './strip.mjs';

const MAX_FINDINGS = 5;

export const NO_FALLBACK = /var\(\s*(--[\w-]+)\s*\)/g;

export function maskByFile(added) {
  const byFile = new Map();
  for (const a of added) {
    if (!byFile.has(a.file)) byFile.set(a.file, []);
    byFile.get(a.file).push(a);
  }
  for (const [file, rows] of byFile) {
    const joined = rows.map((r) => r.text).join('\n');
    const masked = blankStrings(stripComments(joined, LINE_COMMENT_LANGS.test(file))).split('\n');
    rows.forEach((r, i) => (r.masked = masked[i]));
  }
  return added;
}

export function sessionGate(root, startedAt) {
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

function missedBlockRules({ cwd, root, added, said, dropped }) {
  const byPath = new Map();
  for (const a of added) {
    if (!a.fresh) continue;
    const abs = resolve(root, a.file);
    if (!byPath.has(abs)) byPath.set(abs, new Set());
    byPath.get(abs).add(a.line);
  }
  if (!byPath.size) return null;

  const swept = [...byPath.keys()].slice(0, MAX_FILES);
  const unswept = byPath.size - swept.length + dropped;

  const rows = swept
    .flatMap((p) => {
      const r = auditFile(p);
      return r.error
        ? []
        : r.block
            .filter((f) => !r.ignore.has(f.line) && byPath.get(p).has(f.line))
            .map((f) => ({ ...f, path: p }));
    })
    .sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line)
    .map((r) => {
      const where = `${relative(cwd, r.path).replace(/\\/g, '/')}:${r.line}`;
      return { key: `${where}\t${r.msg}`, text: `- ${where}  ${r.msg}` };
    })
    .filter((r) => !said.has(r.key));
  if (!rows.length) return null;

  const { shown, note } = cap(rows, MAX_FINDINGS, 'finding(s)');
  return {
    keys: shown.map((r) => r.key),
    text:
      'css-pro, turn-end sweep — these trip write-refusal rules:\n' +
      shown.map((r) => r.text).join('\n') +
      note +
      (unswept ? `\n(${unswept} further changed file(s) not swept.)` : ''),
  };
}

export function declaredNames(git, where, extraFlags) {
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

export function undeclaredTokens({ cwd, root, git, added, said }) {
  const used = new Map();
  for (const a of maskByFile(added)) {
    if (!a.fresh) continue;
    for (const m of a.masked.matchAll(NO_FALLBACK))
      if (!used.has(m[1])) used.set(m[1], `${relative(cwd, resolve(root, a.file))}:${a.line}`);
  }
  if (!used.size) return null;
  const declared = declaredNames(git, '', []);
  if (declared === null) return null;

  let missing = [...used].filter(([name]) => !declared.has(name) && !said.has(name));
  if (!missing.length) return null;

  const vendored = declaredNames(git, '*node_modules/', ['--no-exclude-standard']);
  if (vendored === null) return null;

  const settled = missing.filter(([name]) => vendored.has(name)).map(([name]) => name);
  missing = missing.filter(([name]) => !vendored.has(name));
  if (!missing.length) return settled.length ? { keys: settled, text: '' } : null;

  const { shown, note } = cap(
    missing.map(([name, where]) => ({
      key: name,
      text: `- ${where.replace(/\\/g, '/')}  ${name}`,
    })),
    MAX_FINDINGS,
    'name(s)',
  );
  return {
    keys: [...settled, ...shown.map((r) => r.key)],
    text:
      'css-pro: read by a `var()` with no fallback, declared nowhere in this repo or its ' +
      'installed packages — the declaration is invalid and silently falls back:\n' +
      shown.map((r) => r.text).join('\n') +
      note +
      '\nIf the value is set from JavaScript at runtime, give the `var()` a fallback.',
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const payload = JSON.parse((await text(process.stdin)) || '{}');
    if (payload.stop_hook_active) process.exit(0);
    let startedAt = NaN;
    let before = [];
    try {
      ({ startedAt, before } = parseSessionMark(
        readFileSync(stateFile('session', { session_id: payload.session_id }), 'utf8'),
      ));
    } catch {}
    if (!(startedAt > 0)) process.exit(0);

    const cwd = payload.cwd || process.cwd();
    const { root, git, added, dropped } = repoChanges(cwd);
    if (!root) process.exit(0);

    const ledger = stateFile('sweep', { session_id: payload.session_id });
    let said = new Set();
    try {
      said = new Set(readFileSync(ledger, 'utf8').split('\n'));
    } catch {}

    const baseline = new Set(before);
    const touched = sessionGate(root, startedAt);
    const scan = {
      cwd,
      root,
      git,
      said,
      dropped: dropped.filter((f) => AUDITABLE.test(f) && touched(f)).length,
      added: added
        .filter((a) => AUDITABLE.test(a.file) && touched(a.file))
        .map((a) => ({ ...a, fresh: !baseline.has(lineKey(a)) })),
    };

    const parts = [];
    const record = [];
    for (const check of [missedBlockRules, undeclaredTokens]) {
      try {
        const part = check(scan);
        if (!part) continue;
        record.push(...part.keys);
        if (part.text) parts.push(part.text);
      } catch {
        // Ignore a check that fails, so the other can still run. The sweep hook is advisory, not a gate.
      }
    }
    if (record.length) {
      try {
        appendFileSync(ledger, record.join('\n') + '\n');
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
}
