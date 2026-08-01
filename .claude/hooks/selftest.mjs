#!/usr/bin/env node
// fires:  Stop (project settings — this repo only, not shipped with the plugin)
// reads:  .stop_hook_active
// emits:  additionalContext naming the failing self-tests or the unparseable manifest,
//         else nothing
// fails:  exit 0, silent — a broken guard must not strand a turn
// verify: echo '{}' | node .claude/hooks/selftest.mjs; echo $?
//
// Every rule this plugin ships is a regex, and a regex that stops matching stops
// matching silently: nothing fails, a defect just walks through. audit.mjs --self-test
// is the only thing standing between an edit to rules.mjs or strip.mjs and a release
// that checks less than the last one, and it only runs when someone remembers. This
// runs it at every turn end (~90ms) and speaks only when it fails. The manifests are
// parsed for the same reason — a trailing comma in hooks.json does not error, it just
// unregisters every hook.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { text } from 'node:stream/consumers';
import { fileURLToPath } from 'node:url';

const from = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const MANIFESTS = ['../../hooks/hooks.json', '../../.claude-plugin/plugin.json'];

try {
  const payload = JSON.parse((await text(process.stdin)) || '{}');
  if (payload.stop_hook_active) process.exit(0);

  const problems = [];
  for (const rel of MANIFESTS) {
    try {
      JSON.parse(readFileSync(from(rel), 'utf8'));
    } catch (e) {
      problems.push(`${rel.replace('../../', '')} is not valid JSON: ${e.message.split('\n')[0]}`);
    }
  }

  for (const suite of ['../../skills/css-audit/audit.mjs', '../../hooks/sweep.mjs']) {
    const run = spawnSync(process.execPath, [from(suite), '--self-test'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    // Exit 1 is the verdict, so read the lines rather than the code — a crash produces
    // neither PASS nor FAIL lines and is reported as itself.
    const lines = (run.stdout ?? '').split('\n');
    const failed = lines.filter((l) => l.startsWith('FAIL'));
    if (failed.length) problems.push(...failed);
    else if (!lines.some((l) => l.startsWith('PASS')))
      problems.push(
        `${suite.replace('../../', '')} --self-test produced no results: ${(run.stderr ?? '').split('\n')[0]}`,
      );
  }

  if (!problems.length) process.exit(0);
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'Stop',
        additionalContext:
          "css-pro's own checks are failing on this working tree — the rule tables no " +
          'longer do what the suite says they do:\n' +
          problems.map((p) => `- ${p}`).join('\n') +
          '\nThe full runs are `node skills/css-audit/audit.mjs --self-test` and ' +
          '`node hooks/sweep.mjs --self-test`.',
      },
    }),
  );
} catch {
  process.exit(0);
}
