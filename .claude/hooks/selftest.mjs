#!/usr/bin/env node
// fires:  Stop (project settings — this repo only, not shipped with the plugin)
// emits:  additionalContext naming the failing tests, else nothing
// fails:  exit 0, silent — a broken guard must not strand a turn
// verify: echo '{}' | node .claude/hooks/selftest.mjs; echo $?
//
// Every rule this plugin ships is a regex, and a regex that stops matching stops
// matching silently. The suite only runs when someone remembers; this runs it at
// every turn end and speaks only when it fails.
import { spawnSync } from 'node:child_process';
import { text } from 'node:stream/consumers';
import { fileURLToPath } from 'node:url';

try {
  const payload = JSON.parse((await text(process.stdin)) || '{}');
  if (payload.stop_hook_active) process.exit(0);

  // TAP is pinned so the failure lines stay machine-readable; the default reporter
  // follows the terminal and would change shape under a hook.
  const run = spawnSync(process.execPath, ['--test', '--test-reporter=tap'], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    encoding: 'utf8',
    windowsHide: true,
  });
  if (run.status === 0) process.exit(0);

  const failures = (run.stdout ?? '')
    .split('\n')
    .filter((l) => l.startsWith('not ok '))
    .map((l) => l.replace(/^not ok \d+ - /, ''));

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'Stop',
        additionalContext:
          "css-pro's own checks are failing on this working tree — the rule tables no " +
          'longer do what the suite says they do:\n' +
          (failures.length
            ? failures
            : [(run.stderr ?? '').split('\n')[0] || 'the suite did not run']
          )
            .map((p) => `- ${p}`)
            .join('\n') +
          '\nThe full run is `npm test`.',
      },
    }),
  );
} catch {
  process.exit(0);
}
