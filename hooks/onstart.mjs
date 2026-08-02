#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { text } from 'node:stream/consumers';
import {
  addedLines,
  AUDITABLE,
  DIFF_ARGS,
  lineKey,
  stateFile,
  untrackedLines,
} from './changed.mjs';

const STYLE_GLOBS = 'css scss sass less vue svelte astro html htm'.split(' ').map((e) => `*.${e}`);

const BRIEF =
  'css-pro checks CSS as it is written. A write with a defect provable from the edit alone ' +
  'is refused; the block names the defect and the repair, and lifts on the next write. ' +
  'It also flags performance and accessibility after writes, and re-checks CSS that reached ' +
  'disk via shell at turn end. Scope: raw CSS, CSS-in-JS, Vue/Svelte/Astro/HTML styles — ' +
  'not Tailwind. Whole-file cleanup: css-audit skill.';

function hasStyles(cwd) {
  const root = cwd.replace(/\\/g, '/');
  const r = spawnSync(
    'git',
    ['-C', root, 'ls-files', '--cached', '--others', '--exclude-standard', '--', ...STYLE_GLOBS],
    { encoding: 'utf8', windowsHide: true },
  );
  return r.status === 0 && r.stdout.trim().length > 0;
}

const clock = () => String(Date.now() - 1000);

function baseline(cwd) {
  const run = (...args) => {
    const r = spawnSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
    return r.status === 0 ? r.stdout : null;
  };
  const root = run('rev-parse', '--show-toplevel')?.trim();
  if (!root) return clock();

  const untracked = (run('ls-files', '-o', '--exclude-standard', '--full-name', '--', ':/') ?? '')
    .split('\n')
    .filter((p) => p && AUDITABLE.test(p));
  const lines = [
    ...addedLines(run(...DIFF_ARGS, 'HEAD') ?? run(...DIFF_ARGS) ?? ''),
    ...untrackedLines(root, untracked),
  ];
  return `${clock()}\n${lines.map(lineKey).join('\n')}`;
}

try {
  const payload = JSON.parse((await text(process.stdin)) || '{}');
  const cwd = payload.cwd || process.cwd();

  const styles = hasStyles(cwd);
  try {
    writeFileSync(
      stateFile('session', { session_id: payload.session_id }),
      styles ? baseline(cwd) : clock(),
    );
  } catch {}

  if (!styles) process.exit(0);
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: payload.hook_event_name || 'SessionStart',
        additionalContext: BRIEF,
      },
    }),
  );
} catch {
  process.exit(0);
}
