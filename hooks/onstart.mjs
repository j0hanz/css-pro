#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { text } from 'node:stream/consumers';
import {
  formatSessionMark,
  repoChanges,
  sessionStart,
  stateFile,
  STYLE_GLOBS,
} from './changed.mjs';

const BRIEF =
  'css-pro refuses a write whose CSS carries a defect provable from the edit alone. ' +
  'A refusal is this hook, not the user rejecting the edit.';

function hasStyles(cwd) {
  const dir = cwd.replace(/\\/g, '/');
  const r = spawnSync(
    'git',
    ['-C', dir, 'ls-files', '--cached', '--others', '--exclude-standard', '--', ...STYLE_GLOBS],
    { encoding: 'utf8', windowsHide: true },
  );
  return r.status === 0 && r.stdout.trim().length > 0;
}

function baseline(cwd) {
  const { root, added } = repoChanges(cwd);
  return root ? formatSessionMark(sessionStart(), added) : sessionStart();
}

try {
  const payload = JSON.parse((await text(process.stdin)) || '{}');
  const cwd = payload.cwd || process.cwd();

  const styles = hasStyles(cwd);
  try {
    writeFileSync(
      stateFile('session', { session_id: payload.session_id }),
      styles ? baseline(cwd) : sessionStart(),
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
