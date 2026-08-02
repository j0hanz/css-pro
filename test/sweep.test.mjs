import assert from 'node:assert/strict';
import { rmSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  addedLines,
  AUDITABLE,
  AUDITABLE_GLOBS,
  cap,
  lineKey,
  untrackedLines,
} from '../hooks/changed.mjs';
import {
  declaredNames,
  maskByFile,
  NO_FALLBACK,
  sessionGate,
  undeclaredTokens,
} from '../hooks/sweep.mjs';

const DIFF = [
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
].join('\n');
const got = addedLines(DIFF);
const forFile = (p) => got.filter((a) => a.file === p);

test('an added line carries its new-file number and text', () =>
  assert.deepEqual(forFile('one.css'), [{ file: 'one.css', line: 3, text: '  color: red;' }]));
test('a hunk with no added lines contributes nothing', () => assert.equal(got.length, 2));
test('a deleted target contributes nothing', () => {
  assert.deepEqual(forFile('gone.css'), []);
  assert.deepEqual(forFile('/dev/null'), []);
});
test('a `+++ ` content line does not re-point the file', () =>
  assert.deepEqual(forFile('spoof.css'), []));
test('a line after a spoofed header stays with the real file', () =>
  assert.deepEqual(forFile('two.css'), [{ file: 'two.css', line: 2, text: '++ b/spoof.css' }]));

test('the baseline key ignores line numbers and surrounding space', () =>
  assert.equal(
    lineKey({ file: 'a.css', line: 3, text: '  color: red;' }),
    lineKey({ file: 'a.css', line: 99, text: 'color: red;' }),
  ));

test('every auditable glob is auditable', () => {
  assert.ok(AUDITABLE_GLOBS.length > 0);
  assert.ok(AUDITABLE_GLOBS.every((g) => AUDITABLE.test(g)));
});

test('an untracked file is enumerated whole from line 1, and a missing one is skipped', () => {
  const p = join(tmpdir(), 'css-pro-test-untracked.css');
  writeFileSync(p, 'a{}\nb{}\n');
  try {
    assert.deepEqual(
      untrackedLines(tmpdir(), ['css-pro-test-untracked.css', 'css-pro-test-absent.css']),
      [
        { file: 'css-pro-test-untracked.css', line: 1, text: 'a{}' },
        { file: 'css-pro-test-untracked.css', line: 2, text: 'b{}' },
        { file: 'css-pro-test-untracked.css', line: 3, text: '' },
      ],
    );
  } finally {
    rmSync(p, { force: true });
  }
});

test('the session gate admits what was written after the session opened, and nothing older', () => {
  const stamp = (name, ms) => {
    const p = join(tmpdir(), name);
    writeFileSync(p, 'a{}');
    utimesSync(p, new Date(ms), new Date(ms));
    return p;
  };
  const before = stamp('css-pro-test-before.css', 1_000);
  const after = stamp('css-pro-test-after.css', 9_000);
  try {
    const gate = sessionGate(tmpdir(), 5_000);
    assert.equal(gate('css-pro-test-before.css'), false);
    assert.equal(gate('css-pro-test-after.css'), true);
    assert.equal(gate('css-pro-test-absent.css'), false);
  } finally {
    rmSync(before, { force: true });
    rmSync(after, { force: true });
  }
});

test('a fallback-less var() yields its name; one with a fallback is not a read to check', () =>
  assert.deepEqual(
    [...'a{--x:1;color:var(--x);border:var(--y, red)}'.matchAll(NO_FALLBACK)].map((m) => m[1]),
    ['--x'],
  ));

const masked = (file, ...lines) =>
  maskByFile(lines.map((text, i) => ({ file, line: i + 1, text })))
    .map((a) => a.masked)
    .join('\n');

test('var() in a comment or string is not a read', () =>
  assert.deepEqual(
    [
      ...masked('a.css', '/* var(--a) */ content: "var(--b)"; color: var(--c);').matchAll(
        NO_FALLBACK,
      ),
    ].map((m) => m[1]),
    ['--c'],
  ));

test('block comment state carries across added lines', () => {
  const out = masked('a.css', '/* open var(--a)', 'still comment var(--b) */ color: var(--c);');
  assert.ok(!out.includes('--b'));
  assert.ok(out.includes('--c'));
});

test('line comments blank the rest of the line only for js/scss-alikes', () => {
  assert.ok(!masked('a.scss', '// var(--a)').includes('--a'));
  assert.ok(masked('a.css', '// not a comment: var(--a)').includes('--a'));
});

test('masking is per file, so an open comment does not leak into the next one', () => {
  const rows = [
    { file: 'a.css', line: 1, text: '/* open var(--a)' },
    { file: 'b.css', line: 1, text: 'color: var(--c);' },
  ];
  maskByFile(rows);
  assert.ok(rows[1].masked.includes('--c'));
});

test('cap shows the first N and names what it withheld', () => {
  const rows = Array.from({ length: 7 }, (_, i) => `k${i}`);
  assert.deepEqual(cap(rows, 5, 'thing(s)'), {
    shown: ['k0', 'k1', 'k2', 'k3', 'k4'],
    note: '\n(2 further thing(s) not shown.)',
  });
  assert.equal(cap(rows, 9, 'thing(s)').note, '');
});

test('the vendor search reaches a node_modules at any depth, not only the root one', () => {
  let seen = [];
  declaredNames(
    (...args) => {
      seen = args;
      return '';
    },
    '*node_modules/',
    ['--no-exclude-standard'],
  );
  assert.ok(seen.includes('--no-exclude-standard'));
  assert.ok(seen.includes(':/*node_modules/*.css'));
  assert.ok(!seen.includes(':/node_modules/*.css'));
});

test('a token an installed package declares is settled, reported to nobody, and not searched for twice', () => {
  const added = () => [{ file: 'a.css', line: 1, text: 'a{color:var(--bs-primary)}', fresh: true }];
  // The repo search finds nothing; only the ignored-tree search declares the name.
  const vendor = (...args) => (args.includes('--no-exclude-standard') ? '--bs-primary:' : '');
  const first = undeclaredTokens({
    cwd: '.',
    root: '.',
    git: vendor,
    added: added(),
    said: new Set(),
  });
  assert.deepEqual(first, { keys: ['--bs-primary'], text: '' });

  let searches = 0;
  const counted = (...args) => {
    if (args.includes('--no-exclude-standard')) searches++;
    return vendor(...args);
  };
  const next = undeclaredTokens({
    cwd: '.',
    root: '.',
    git: counted,
    added: added(),
    said: new Set(first.keys),
  });
  assert.equal(next, null);
  assert.equal(searches, 0);
});

test('an undeclared token is reported with its site', () => {
  const part = undeclaredTokens({
    cwd: '.',
    root: '.',
    git: () => '',
    added: [{ file: 'a.css', line: 4, text: 'a{color:var(--nope)}', fresh: true }],
    said: new Set(),
  });
  assert.deepEqual(part.keys, ['--nope']);
  assert.ok(part.text.includes('- a.css:4  --nope'));
});
