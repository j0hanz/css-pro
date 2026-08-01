#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { text } from 'node:stream/consumers';
import { CUSTOM_PROPERTY_DECLARED } from './rules.mjs';

const EXTS = ['css', 'scss', 'sass', 'less', 'vue', 'svelte', 'astro', 'html', 'htm'];
const STYLE_OR_MARKUP = new RegExp(`\\.(?:${EXTS.join('|')})$`, 'i');
const STYLE_GLOBS = EXTS.map((e) => `*.${e}`);

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

function tokenSheets(cwd) {
  const r = spawnSync(
    'git',
    ['-C', cwd, 'grep', '-cIE', '-e', CUSTOM_PROPERTY_DECLARED, '--', ...STYLE_GLOBS],
    { encoding: 'utf8', windowsHide: true },
  );
  if (r.status !== 0) return [];
  return r.stdout
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const at = l.lastIndexOf(':');
      return { path: l.slice(0, at), n: +l.slice(at + 1) };
    })
    .sort((a, b) => b.n - a.n || a.path.localeCompare(b.path))
    .slice(0, 3)
    .map((f) => f.path);
}

if (process.argv[2] === '--self-test') {
  const hit = (list) => list.some((l) => l && STYLE_OR_MARKUP.test(l));
  const tests = [
    ['stylesheet detected', hit(['src/a.css', 'src/b.js'])],
    ['sfc detected', hit(['App.vue'])],
    ['html detected', hit(['index.html'])],
    ['htm detected', hit(['a.htm'])],
    ['sass detected', hit(['a.scss'])],
    ['pure js/ts/tsx/mjs not detected', !hit(['x.js', 'y.ts', 'z.tsx', 'w.mjs'])],
    ['empty not detected', !hit([])],
    [
      'globs derive from extension set',
      STYLE_GLOBS.length === EXTS.length && STYLE_GLOBS.every((g, i) => g === `*.${EXTS[i]}`),
    ],
    ['brief is non-empty', BRIEF.length > 0],
  ];
  let fail = 0;
  for (const [name, ok] of tests) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  onstart: ${name}`);
    if (!ok) fail++;
  }
  console.log(fail ? `\n${fail} self-test(s) failed.` : '\nAll self-tests passed.');
  process.exit(fail ? 1 : 0);
}

try {
  const payload = JSON.parse((await text(process.stdin)) || '{}');
  const cwd = payload.cwd || process.cwd();
  if (!hasStyles(cwd)) process.exit(0);
  const sheets = tokenSheets(cwd);
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: payload.hook_event_name || 'SessionStart',
        additionalContext:
          BRIEF +
          (sheets.length
            ? ` Custom properties here are declared mostly in ${sheets.join(', ')}; a var() name absent from the repo resolves to nothing.`
            : ''),
      },
    }),
  );
} catch {
  process.exit(0);
}
