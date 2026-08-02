import assert from 'node:assert/strict';
import test from 'node:test';
import { ADVISE, BLOCK, DECLARATION, STYLE_MARKERS } from '../hooks/rules.mjs';
import { prepare } from '../hooks/strip.mjs';
import {
  auditPrepare,
  customPropertyFindings,
  findings,
  forStructure,
  formatGroup,
  ignoreLines,
  lineCounter,
  lineLookupFor,
  structureFindings,
} from '../skills/css-audit/audit.mjs';

const on = (rules, css, name) => {
  const { text } = prepare(css, name);
  return findings(rules, text, name, lineCounter(text));
};
const adviseOn = (css, name) => on(ADVISE, css, name);
const blockOn = (css, name) => on(BLOCK, css, name);
// Findings pinned to a source line, for markup and object-form styles whose synthetic
// blocks sit past the end of the source.
const onLine = (raw, name) => {
  const { text, blocks } = auditPrepare(raw, name);
  return findings(BLOCK, text, name, lineLookupFor(raw, text, blocks));
};
const props = (files) =>
  customPropertyFindings(files.map((f) => ({ ...f, lineOf: lineCounter(f.text) })));
const has = (rows, sub) => rows.some((f) => f.msg.includes(sub));

const SRC = [
  ':root { --used: red; --unused: blue; }',
  '.a { color: var(--used); }',
  '.b { transition: all .2s; }',
  '.c { }',
  '.c { }',
  '.d { width: calc(100%-1px); }',
  '.e { color: var(--typo); }',
  '@property --registered { syntax: "<length>"; }',
  '.f { width: var(--registered); }',
  '.g { color: red; .h { color: blue; } }',
  '.#{$name} {}',
  '@import "reset.css";',
  '.i { }',
  '.n,.o { color: green; }',
  '.n, .o {  color:green; }',
  '.p { .q { color: blue; } width: 1px; }',
  '.p { width: 1px; }',
  ".r[data-x='foo'] { color: teal; }",
  ".r[data-x='bar'] { color: teal; }",
  '.s { font-weight: 700; line-height: 1.2; }',
  '.t { font-weight: 700; line-height: 1.2; }',
  '.u { display: none; }',
  '.v { display: none; }',
  '@media print { .w { color: red; } }',
  '.x2 { color: red; }',
  '.y2 { width: calc(100% - 2 * var(--s-6)); }',
  '.z2 { border-inline-start: 3px solid red; border-radius: 0 4px 4px 0; }',
  '.z3 { border-inline-start: 3px solid red; border-radius: 4px; }',
  '.z4 { grid-column: 1 / -1; }',
  '.cb { width: calc(var(--used) -8px); }',
  '.g1 { grid-column: 1; }',
  '.g2 { grid-column: 2; }',
  '.oa { color: red; background: blue; }',
  '.ob { background: blue; color: red; }',
  '.na { font-family: serif; font-size: 1rem; line-height: 1.5; color: tan; margin: 0; }',
  '.nb { font-family: serif; font-size: 1rem; line-height: 1.5; color: tan; padding: 0; }',
  '.pa { font-family: monospace; font-weight: 400; text-transform: none; width: 3px; }',
  '.pb { font-family: monospace; font-weight: 400; text-transform: none; height: 3px; }',
  '.qa { color: navy; border: 0; outline: 0; z-index: 1; }',
  '.qb { color: navy; border: 0; outline: 0; z-index: 1; letter-spacing: 0; word-spacing: 0; text-indent: 0; opacity: 1; }',
  '.da { color: navy; border: 0; background: red; z-index: 1; margin: 0; }',
  '.db { color: navy; border: 0; background: red; z-index: 1; margin: 0; padding: 0; }',
  '.z5 { border-inline-start: 3px solid red; border-radius: 10px / 0 10px; }',
  '.z6 { border-inline-start: 3px solid red; border-radius: 8px / 4px; }',
  '.z7 { border-inline-start: 3px solid red; border-radius: 4px 4px 0; }',
  '@media print { @supports (color: red) { .z8 { color: teal; font-weight: 700; } } }',
  '.z8 { color: teal; font-weight: 700; }',
  '.za { @media print { .zb { color: olive; font-style: italic; } } }',
  '.zb { color: olive; font-style: italic; }',
].join('\n');

const prepared = prepare(SRC, 'test.css').text;
const lineOf = lineCounter(prepared);
const block = findings(BLOCK, prepared, 'test.css', lineOf);
const advise = findings(ADVISE, prepared, 'test.css', lineOf);
const whole = [
  ...structureFindings(forStructure(SRC, 'test.css'), lineOf),
  ...props([{ path: 'test.css', text: prepared }]),
];
const neverRead = whole.filter((f) => /never read/.test(f.msg)).map((f) => f.msg);
const notDeclared = whole.filter((f) => /not declared/.test(f.msg)).map((f) => f.msg);
const at = (line, re) => whole.some((f) => f.line === line && re.test(f.msg));

test('BLOCK catches transition: all', () => assert.ok(has(block, 'animates every property')));
test('BLOCK catches calc() missing whitespace', () => assert.ok(has(block, 'whitespace')));
test('BLOCK: no false calc() on a custom property with a -digit tail', () =>
  assert.ok(!block.some((f) => f.line === 26 && /whitespace/.test(f.msg))));
test('BLOCK catches calc() missing a trailing space after a ) operand', () =>
  assert.ok(at(30, /whitespace/) || block.some((f) => f.line === 30 && /whitespace/.test(f.msg))));
test('every BLOCK finding carries a line', () => assert.ok(block.every((f) => f.line != null)));
test('every ADVISE finding carries a line', () => assert.ok(advise.every((f) => f.line != null)));

test('forStructure preserves length, so offsets still index the source', () =>
  assert.equal(forStructure(SRC, 'test.css').length, SRC.length));

test('WHOLE catches empty rule, pinned to line 4', () => assert.ok(at(4, /no declarations/)));
test('WHOLE catches duplicate block, pinned to line 5 referencing line 4', () =>
  assert.ok(at(5, /identical to the one at line 4/)));
test('WHOLE catches unused --unused', () =>
  assert.ok(neverRead.some((m) => m.includes('--unused'))));
test('WHOLE catches undefined --typo', () =>
  assert.ok(notDeclared.some((m) => m.includes('--typo'))));
test('no false unused on --used', () => assert.ok(!neverRead.some((m) => m.includes('--used'))));
test('@property --registered is neither unused nor undefined', () => {
  assert.ok(!neverRead.some((m) => m.includes('--registered')));
  assert.ok(!notDeclared.some((m) => m.includes('--registered')));
});
test('WHOLE no garbage selector from mixed nesting', () =>
  assert.ok(!whole.some((f) => /color: red; \.h/.test(f.msg))));
test('WHOLE .g keeps its declarations', () =>
  assert.ok(!whole.some((f) => f.msg.includes('`.g`') && /no declarations/.test(f.msg))));
test('WHOLE no spurious (unnamed) from interpolation', () =>
  assert.ok(!whole.some((f) => f.msg.includes('(unnamed)'))));
test('WHOLE rule after a statement is pinned to its own line, clean selector', () =>
  assert.ok(
    whole.some((f) => f.line === 13 && /no declarations/.test(f.msg) && f.msg.includes('`.i`')),
  ));
test('WHOLE .n, .o formatting variant flagged duplicate', () =>
  assert.ok(
    whole.some((f) => /identical to the one at line/.test(f.msg) && f.msg.includes('.n,')),
  ));
test('WHOLE decl after a nested block participates (same-selector dup)', () =>
  assert.ok(
    whole.some((f) => /identical to the one at line/.test(f.msg) && f.msg.includes('`.p`')),
  ));
test('WHOLE no false duplicate between .p parent and .q child', () =>
  assert.ok(!whole.some((f) => /identical/.test(f.msg) && f.msg.includes('`.q`'))));
test('no false duplicate between two same-length attribute values', () =>
  assert.ok(
    !whole.some((f) => /identical to the one at line/.test(f.msg) && f.msg.includes('data-x')),
  ));
test('duplicate-block message keeps the real selector, not a blanked one', () =>
  assert.ok(!whole.some((f) => /`[^`]*\[data-x='\s+'\]/.test(f.msg))));
test('WHOLE catches repeated declarations across two selectors', () =>
  assert.ok(whole.some((f) => /repeated declarations/.test(f.msg) && f.msg.includes('`.t`'))));
test('one shared declaration is below the threshold', () =>
  assert.ok(!whole.some((f) => /repeated declarations/.test(f.msg) && f.msg.includes('`.v`'))));
test('identical declarations in a different at-rule context are not reported', () =>
  assert.ok(!whole.some((f) => /repeated declarations/.test(f.msg) && f.msg.includes('`.x2`'))));
test('two at-rules deep: same selector+decls as top-level is not a duplicate', () =>
  assert.ok(
    !whole.some(
      (f) =>
        (f.line === 46 || f.line === 47) &&
        /duplicate|repeated declarations|overlapping/.test(f.msg),
    ),
  ));
test('at-rule nested inside a rule scopes its inner block', () =>
  assert.ok(
    !whole.some(
      (f) =>
        (f.line === 48 || f.line === 49) &&
        /duplicate|repeated declarations|overlapping/.test(f.msg),
    ),
  ));
test('WHOLE catches repeated declarations written in a different order', () =>
  assert.ok(at(34, /repeated declarations/)));
test('WHOLE catches a four-declaration partial overlap', () =>
  assert.ok(at(36, /overlapping declarations/)));
test('three shared declarations are below the overlap threshold', () =>
  assert.ok(!at(38, /overlapping declarations/)));
test('four shared declarations in a much longer block are below the ratio', () =>
  assert.ok(!at(40, /overlapping declarations/)));
test('no multi-line selector in a whole-file message', () =>
  assert.ok(!whole.some((f) => f.msg.includes('\n'))));

test('ADVISE catches a direction-blind radius beside a logical inline edge', () =>
  assert.ok(has(advise, 'left and right corners differ')));
test('ADVISE: a uniform radius (plain and slash) stays silent', () =>
  assert.ok(!advise.some((f) => /corners differ/.test(f.msg) && (f.line === 28 || f.line === 44))));
test('ADVISE: a slash radius with an asymmetric vertical half fires', () =>
  assert.ok(advise.some((f) => f.line === 43 && /corners differ/.test(f.msg))));
test('ADVISE: a three-value radius with BL != BR fires', () =>
  assert.ok(advise.some((f) => f.line === 45 && /corners differ/.test(f.msg))));
test('ADVISE: grid-column 1 / -1 is a full span, not a reorder', () =>
  assert.ok(!advise.some((f) => f.line === 29 && /Visual order/.test(f.msg))));
test('ADVISE: grid-column 1 is the flow default, not a reorder', () =>
  assert.ok(!advise.some((f) => f.line === 31 && /Visual order/.test(f.msg))));
test('ADVISE: grid-column 2 still reads as a reorder', () =>
  assert.ok(advise.some((f) => f.line === 32 && /Visual order/.test(f.msg))));

test('ADVISE: smooth scroll is not vouched for by an unrelated reduced-motion block', () =>
  assert.ok(
    has(
      adviseOn(
        'html { scroll-behavior: smooth; }\n@media (prefers-reduced-motion: reduce) { .x { animation: none; } }',
        'smooth.css',
      ),
      'Smooth scrolling',
    ),
  ));
test('ADVISE: smooth scroll is silent once a guard sets scroll-behavior: auto', () =>
  assert.ok(
    !has(
      adviseOn(
        'html { scroll-behavior: smooth; }\n@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }',
        'guarded.css',
      ),
      'Smooth scrolling',
    ),
  ));
test('ADVISE flags a cursor:pointer selector missing from the :focus-visible list', () =>
  assert.ok(
    has(
      adviseOn('.btn { cursor: pointer; }\n.a:focus-visible { outline: 1px; }', 'fm.css'),
      'Interactive',
    ),
  ));
test('ADVISE is silent when cursor:pointer is covered by a :focus-visible rule', () =>
  assert.ok(
    !has(
      adviseOn('.btn { cursor: pointer; }\n.btn:focus-visible { outline: 1px; }', 'fc.css'),
      'Interactive',
    ),
  ));
test('ADVISE focus rule is silent when the file does no :focus-visible at all', () =>
  assert.ok(!has(adviseOn('.btn { cursor: pointer; }', 'fn.css'), 'Interactive')));
test('ADVISE is silent when :focus-visible coverage goes through :is()', () =>
  assert.ok(
    !has(
      adviseOn(
        '.item { cursor: pointer; }\n.item:is(.a, .b):focus-visible { outline: 1px; }',
        'fis.css',
      ),
      'Interactive',
    ),
  ));

test('BLOCK scans the parent block of a nested rule', () =>
  assert.ok(
    has(
      blockOn('.btn { color: red; color: red; &:hover { opacity: 1 } }', 'n.scss'),
      'set twice to the same value',
    ),
  ));
test('ADVISE scans the parent block of a nested rule', () =>
  assert.ok(
    has(
      adviseOn(
        '.a:focus-visible { outline: 1px }\n.btn { cursor: pointer; .icon { color: red } }',
        'n.scss',
      ),
      'Interactive',
    ),
  ));

test('cross-file custom properties resolve against every audited file', () => {
  const rows = props([
    { path: 'a.css', text: prepare(':root { --shared: red; --dead: blue; }', 'a.css').text },
    {
      path: 'b.css',
      text: prepare('.x { color: var(--shared); } .y { color: var(--missing); }', 'b.css').text,
    },
  ]);
  assert.ok(!has(rows, '--shared'), '--shared is read by a sibling');
  assert.ok(has(rows, '--dead'), '--dead is read nowhere');
  assert.ok(has(rows, '--missing'), '--missing is declared nowhere');
});

test('a cross-file name is reported at every site that has it', () => {
  const rows = props([
    {
      path: 'c.css',
      text: prepare(':root { --dup: 1; }\n.c { color: var(--nope); }', 'c.css').text,
    },
    {
      path: 'd.css',
      text: prepare(':root { --dup: 2; }\n.d { color: var(--nope); }', 'd.css').text,
    },
  ]);
  const sites = (sub, re) =>
    new Set(rows.filter((f) => f.msg.includes(sub) && re.test(f.msg)).map((f) => f.path));
  assert.deepEqual([...sites('--dup', /never read/)], ['c.css', 'd.css']);
  assert.deepEqual([...sites('--nope', /not declared/)], ['c.css', 'd.css']);
});

test('a token set from JS counts as declared', () => {
  const js = "document.documentElement.style.setProperty('--jsaccent', c);";
  const rows = props([
    { path: 'theme.ts', raw: js, text: prepare(js, 'theme.ts').text },
    { path: 'use.css', text: prepare('.x { color: var(--jsaccent); }', 'use.css').text },
  ]);
  assert.ok(!rows.some((f) => /--jsaccent/.test(f.msg)));
});

test('BLOCK is silent on anchor-less markup prose', () =>
  assert.deepEqual(
    onLine('<p>never write transition: all</p>\n<p>z-index: 9999 is bad</p>\n', 'prose.html'),
    [],
  ));

test('a markup finding carries its SOURCE line, and prose naming it is not a second one', () => {
  const rows = blockOn(
    [
      '<template>',
      '  <p>never write transition: all</p>',
      '</template>',
      '',
      '<style>',
      '.a { transition: all 1s; }',
      '</style>',
    ].join('\n'),
    'a.vue',
  ).filter((f) => /animates every property/.test(f.msg));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].line, 6);
});

test('a style="" attribute keeps block-scoped rule coverage, at the attribute line', () => {
  const rows = onLine('<div\n  style="color: red; color: red"\n></div>\n', 'b.html').filter((f) =>
    /set twice to the same value/.test(f.msg),
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].line, 2);
});

test('an object-form CSS-in-JS finding reports the line of its object literal', () =>
  assert.ok(
    onLine(
      'const A = 1;\nconst B = 2;\nconst S = <div style={{ transitionProperty: "all" }} />;\n',
      'c.tsx',
    ).some((f) => /animates every property/.test(f.msg) && f.line === 3),
  ));

test('formatGroup collapses repeats of one message onto one line', () =>
  assert.deepEqual(
    formatGroup('x.css', [
      { line: 9, msg: 'same' },
      { line: 3, msg: 'same' },
      { line: 5, msg: 'other' },
    ]),
    ['  x.css:3,9  same', '  x.css:5  other'],
  ));

test('csspro-ignore suppresses the marker line and the next', () => {
  const ign = ignoreLines('a\n/* csspro-ignore */\nb\nc');
  assert.deepEqual([...ign].sort(), [2, 3]);
});

// The per-edit hook's engagement gate, over the added text of one Write or Edit. The
// audit never consults it — it is tested here because a gate that engages on ordinary
// TypeScript turns a PreToolUse hook into a deny on code holding no CSS.
const engages = (t) => STYLE_MARKERS.test(t) || DECLARATION.test(t);
for (const [want, snippet] of [
  [
    false,
    'interface Point {\n  x: number;\n  y: number;\n}\nconst prev = (i) => Math.max(0, i-1);',
  ],
  [false, '  onClick: () => void;\n  items: string[];\n  maxLen: 100;'],
  [false, 'const n = Math.min(len-1, i+1);'],
  [false, '  timeout: 3000,\n  version: "1.0.0",\n  ratio: 1.5,'],
  [false, 'export function toGrid(rows: Row[]): Cell[][] {\n  return rows.map(toCells);\n}'],
  [true, '  transition: all 0.3s;'],
  [true, '  background-color: red;\n  background: blue;'],
  [true, '  width: calc(100%-1px);'],
  [true, '  color: var(--a, --b);'],
  [true, '  padding: 4px;'],
  [true, '  --brand: blue;'],
  [true, 'const S = styled.div`color: red`;'],
  [true, '<div style={{ color: "red" }} />'],
])
  test(`hook gate ${want ? 'engages on' : 'ignores'}: ${snippet.split('\n')[0].trim().slice(0, 44)}`, () =>
    assert.equal(engages(snippet), want));
