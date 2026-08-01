#!/usr/bin/env node
// css-pro whole-file audit.
//
// Re-runs the css-pro rule table (hooks/rules.mjs) over a complete stylesheet —
// defects the per-edit hook only checks on the lines you touch — then the
// whole-file checks the hook structurally cannot do. Prints file:line findings,
// grouped by severity, uncapped; exits non-zero if any provable (BLOCK) defect
// remains. Reports only provable facts; nothing resting on taste.
//
//   node audit.mjs <file.css>...     audit the given stylesheets
//   node audit.mjs --strict <file>   exit non-zero on ANY finding, not just BLOCK
//   node audit.mjs                  run the built-in self-test
//
// The rule table is the single source of truth for what is a defect: this script
// only feeds it whole files instead of added text, and adds five file-scale checks
// that need the whole file to see. Scoped to .css/.scss/.sass/.less — prepare()
// preserves line numbers and selectors there; host files are left to the per-edit
// hook.

// Namespace import, not `{ readFileSync, globSync }`: a named import of an export the
// host Node does not have is a SyntaxError at load, so on Node 20 the script would die
// before the "needs Node 22" guard in main() could print. A namespace member is just
// `undefined` there, and the guard runs.
import * as fs from 'node:fs';
import { prepare } from '../../hooks/strip.mjs';
import { BLOCK, ADVISE } from '../../hooks/rules.mjs';

const STYLESHEET = /\.(css|scss|sass|less)$/i;
// Indented Sass (.sass) has no braces, so the brace-driven parseRules yields
// nothing and the empty/duplicate rule checks skip it. Used to flag that honestly.
const SASS_INDENTED = /\.sass$/i;

// --- line lookup --------------------------------------------------------------
// prepare() blanks comments and string contents but preserves newlines, so a
// line number in the prepared text is the same line in the source file.

function makeLineLookup(text) {
  const starts = [0]; // starts[k] = index where line (k+1) begins
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return (idx) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

// --- rule table, run over the whole file --------------------------------------
// Mirrors hooks/runtime.mjs run(), but added === the whole prepared file, so the
// when/absent rules (e.g. "outline: none with no :focus-visible in this file") read
// the full file on both sides — more correct than the per-edit pass, which only
// sees added text for `when`. `re` and `fn` rules report every occurrence with its
// line; when/absent rules report once, at the first `when` hit.

function runTable(rules, prepared, path, lineOf) {
  const out = [];
  for (const rule of rules) {
    if (rule.files && !rule.files.test(path)) continue;
    if (rule.fn) {
      // `fn` rules hand back match indices, so the audit can pin each occurrence
      // instead of printing one line-less finding. Two hits on one line are one
      // finding — the line is all the developer needs to go look.
      const at = rule.fn(prepared);
      if (at) for (const line of new Set(at.map(lineOf))) out.push({ line, msg: rule.msg });
      continue;
    }
    if (rule.re) {
      const re = globalize(rule.re);
      let m;
      while ((m = re.exec(prepared)) !== null) {
        out.push({ line: lineOf(m.index), msg: rule.msg });
        if (m.index === re.lastIndex) re.lastIndex++; // guard zero-width
      }
      continue;
    }
    // when/absent
    if (!rule.when.every((w) => w.test(prepared))) continue;
    if (rule.absent && rule.absent.test(prepared)) continue;
    let line = null;
    const m = globalize(rule.when[0]).exec(prepared);
    if (m) line = lineOf(m.index);
    out.push({ line, msg: rule.msg });
  }
  return out;
}

function globalize(re) {
  return new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
}

// --- whole-file checks --------------------------------------------------------

// prepare() blanks the inside of every string so rule regexes cannot fire on prose.
// The structural checks need those contents back: `[data-x='foo']` and `[data-x='bar']`
// blank to the same text, and two rules that differ only inside a string are not
// duplicates — that was reporting a false "duplicate block". Structural characters stay
// blanked so a `{` or `;` inside a string still cannot fool the parser, and lengths are
// unchanged, so every line number still holds.
function restoreStrings(prepared, src) {
  return prepared.replace(/(['"])[^'"\n]*\1/g, (m, q, off) => {
    const inner = src.slice(off + 1, off + m.length - 1).replace(/[{};]/g, ' ');
    return q + inner + m[m.length - 1];
  });
}

// Walks prepared text, returns leaf rules with line numbers. At-rule blocks
// (@media, @supports, @layer, @property) recurse into their children and prefix the
// condition, so context is kept: "@media (min-width:600px) .a". Native nesting
// (.a { .b { } }) is handled the same way. String contents are already blanked by
// prepare(), so a `{` inside a string cannot fool the nested-block lookahead.
//
// `atRules` is tracked separately from the selector prefix. Two rules can only be
// merged into a selector list when they sit under the SAME at-rule conditions, and the
// prefix is no use for that test: for a nested block the prefix already contains that
// block's own selector, so no two nested rules would ever compare equal.
function parseRules(text, lineOf) {
  const out = [];
  let i = 0;
  // Process ONE block: scan its head to '{', then walk the body accumulating this
  // block's OWN declarations while recursing into each nested block with a
  // prefixed selector. Returns with i just past THIS block's closing '}'. The
  // previous walker was a level-scanner that consumed through the PARENT's '}',
  // which dropped any declaration after a nested block — `.a { .b {} width: 1px; }`
  // lost the `width`. Processing one block at a time lets the body loop capture
  // decls before, between, AND after nested children.
  function block(prefix, atRules) {
    const start = i;
    while (i < text.length && text[i] !== '{' && text[i] !== '}') i++;
    if (i >= text.length || text[i] === '}') {
      if (text[i] === '}') i++; // stray close at top level / after a nested block
      return;
    }
    // `stmt` skips top-level statements (`@charset`, `@use`, `@import`) so the
    // head is only the selector — otherwise the statement glues into the
    // selector and shifts the reported line.
    const raw = text.slice(start, i);
    const stmt = raw.lastIndexOf(';') + 1;
    const head = raw.slice(stmt).trim();
    const lead = raw.slice(stmt).match(/^\s*/)[0].length;
    const line = lineOf(start + stmt + lead);
    const sel = prefix ? `${prefix} ${head}` : head;
    // Only an at-rule head adds a condition; a plain selector head does not.
    const cond = head.startsWith('@') ? (atRules ? `${atRules} ${head}` : head) : atRules;
    i++; // consume '{'
    // Walk the body until this block's '}'. A parent's declarations may appear
    // before, between, or after nested blocks; each span up to a nested '{' splits
    // into the parent's decls (up to the last ';') and the next nested selector.
    let body = '';
    let hasNested = false;
    while (i < text.length && text[i] !== '}') {
      let j = i;
      while (j < text.length && text[j] !== '{' && text[j] !== '}') j++;
      if (j >= text.length || text[j] === '}') {
        // This block's close: the whole remaining span is its own decls (the last
        // declaration may omit its trailing ';').
        body += text.slice(i, j);
        i = j;
        break;
      }
      // `text[j] === '{'`: a nested block follows.
      hasNested = true;
      const seg = text.slice(i, j);
      const semi = seg.lastIndexOf(';');
      body += semi >= 0 ? seg.slice(0, semi + 1) : '';
      const nestedSel = (semi >= 0 ? seg.slice(semi + 1) : seg).trim();
      i = j; // advance to the nested '{'
      block(nestedSel ? `${sel} ${nestedSel}` : sel, cond);
    }
    // A parent with only nested children (e.g. `@media { .x {} }`) has no own
    // decls — skip it. A leaf is always recorded so the empty-rule check can fire
    // on `.c {}`; body emptiness is judged in structureFindings, not here.
    if (hasNested ? body.replace(/[;\s]/g, '') !== '' : true)
      out.push({ selector: sel, context: cond ?? '', body, line });
    if (text[i] === '}') i++; // consume this block's '}'
  }
  while (i < text.length) block('', '');
  return out;
}

// Two rules with byte-identical declarations under the same at-rule conditions are, by
// definition, one selector list — merging them changes nothing a browser can observe.
// Below this many declarations the finding is noise: on a 1592-line reference sheet,
// keying on ONE declaration reported ten `{ display: none }` blocks alongside the one
// real find; keying on two reported only the real one.
const MIN_REPEATED_DECLS = 2;

function structureFindings(prepared, lineOf) {
  const rules = parseRules(prepared, lineOf);
  const out = [];
  const seen = new Map(); // at-rule context + declarations -> first rule seen
  // Keys ignore formatting: `width:1px` and `width: 1px`, `.a,.b` and `.a, .b`
  // are the same block. Normalization is for equality only — the message keeps
  // the original selector. The separator is a NUL (not a space): it can't appear
  // in CSS, so a context tail + declaration head can never collide across the split.
  const norm = (s) =>
    s
      .replace(/\s+/g, ' ')
      .replace(/\s*([:;,{}])\s*/g, '$1')
      .trim();
  // Split rather than normalising the body whole, so a trailing `;` cannot make two
  // identical blocks look different — and so the count is there for the threshold.
  const declsOf = (body) =>
    body
      .split(';')
      .map(norm)
      .filter((d) => d.includes(':'));
  for (const r of rules) {
    const isEmpty = r.body.replace(/[;\s]/g, '') === '';
    if (isEmpty)
      out.push({
        line: r.line,
        msg: `empty rule — \`${r.selector || '(unnamed)'}\` has no declarations.`,
      });
    const decls = declsOf(r.body);
    const key = `${norm(r.context)}\0${decls.join(';')}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, r);
    } else if (norm(prev.selector) === norm(r.selector)) {
      out.push({
        line: r.line,
        msg: `duplicate block — \`${r.selector || '(unnamed)'}\` is identical to the one at line ${prev.line}.`,
      });
    } else if (decls.length >= MIN_REPEATED_DECLS) {
      out.push({
        line: r.line,
        msg: `repeated declarations — \`${r.selector}\` sets the same ${decls.length} declarations as \`${prev.selector}\` at line ${prev.line}, under the same conditions. One selector list, or a shared class.`,
      });
    }
  }
  return out;
}

// A count, not a verdict. Which convention a project uses is its own call; that one file
// uses both is a fact, and one only visible at file scale. Reported only when BOTH
// appear — a consistently physical sheet says nothing.
const LOGICAL_PROP =
  /(?<![\w-])(?:margin|padding|border|inset)-(?:block|inline)(?:-(?:start|end))?\s*:|(?<![\w-])(?:block|inline)-size\s*:|text-align\s*:\s*(?:start|end)\b/gi;
const PHYSICAL_PROP =
  /(?<![\w-])(?:margin|padding)-(?:top|right|bottom|left)\s*:|(?<![\w-])border-(?:top|right|bottom|left)(?:-(?:width|style|color))?\s*:|(?<![\w-])(?:top|right|bottom|left|inset)\s*:|text-align\s*:\s*(?:left|right)\b/gi;

function directionMix(prepared) {
  const logical = [...prepared.matchAll(LOGICAL_PROP)].length;
  const physical = [...prepared.matchAll(PHYSICAL_PROP)].length;
  return logical && physical ? { logical, physical } : null;
}

// -- custom-property checks -----------------------------------------------------
// Walks prepared text, returns dead or undefined custom properties with line numbers.
function customPropertyFindings(files) {
  // Map of custom properties declared and used across all audited files. Each
  // entry is an array of { path, line } objects, so a prop declared in two files
  // and used in one is reported as dead at the unused site and undefined at the
  // used site.
  const declared = new Map(); // name -> [{ path, line }]
  const used = new Map(); // name -> [{ path, line }]
  const add = (map, name, path, line) => {
    if (!map.has(name)) map.set(name, []);
    map.get(name).push({ path, line });
  };

  for (const f of files) {
    for (const m of f.prepared.matchAll(/--[\w-]+(?=\s*:)/g))
      add(declared, m[0], f.path, f.lineOf(m.index));
    for (const m of f.prepared.matchAll(/@property\s+(--[\w-]+)/g))
      add(declared, m[1], f.path, f.lineOf(m.index));
    for (const m of f.prepared.matchAll(/var\(\s*(--[\w-]+)/g))
      add(used, m[1], f.path, f.lineOf(m.index));
  }

  const out = [];
  for (const [name, locs] of declared)
    if (!used.has(name))
      for (const loc of locs)
        out.push({
          path: loc.path,
          line: loc.line,
          msg: `\`${name}\` declared, never read by var() in the audited files (may be exported for another sheet).`,
        });
  for (const [name, locs] of used)
    if (!declared.has(name))
      for (const loc of locs)
        out.push({
          path: loc.path,
          line: loc.line,
          msg: `\`${name}\` used, not declared in the audited files (often a typo, or defined elsewhere).`,
        });
  return out;
}

// --- per-file -----------------------------------------------------------------

function auditFile(path) {
  let raw;
  try {
    raw = fs.readFileSync(path, 'utf8');
  } catch (e) {
    return { path, error: `unreadable: ${e.code || e.message}` };
  }
  const prepared = prepare(raw, path);
  const lineOf = makeLineLookup(prepared);
  return {
    path,
    prepared,
    lineOf,
    block: runTable(BLOCK, prepared, path, lineOf),
    advise: runTable(ADVISE, prepared, path, lineOf),
    // Structural checks compare text, so they need the string contents the rule
    // table wants blanked. Same offsets, so `lineOf` is still valid.
    structure: structureFindings(restoreStrings(prepared, raw), lineOf),
    mix: directionMix(prepared),
    declaresProps: /--[\w-]+\s*:/.test(prepared),
  };
}

function format(path, f) {
  return f.line == null ? `  ${f.msg}` : `  ${path}:${f.line}  ${f.msg}`;
}

// parseRules is brace-driven; indented Sass has no braces, so the empty-rule and
// duplicate-block checks never ran on it. Say so on every .sass file — "clean" would
// claim otherwise. (customPropertyFindings is regex-based and did run.)
const SASS_NOTE =
  '  (note: indented Sass — empty/duplicate rule checks skipped; rule table and custom-property checks did run)';

// Severity order, highest first: the key on the result object and the heading it prints.
const GROUPS = [
  ['block', 'BLOCK — provable, fix:'],
  ['advise', 'ADVISE — measurable, confirm or fix:'],
  ['whole', 'WHOLE-FILE — only visible at file scale:'],
];

// Prints; counts are main's job. Two sources for the same number is one too many.
function report(r) {
  if (r.error) {
    console.log(`== ${r.path} ==\n  (skipped: ${r.error})`);
    return;
  }
  const { path, mix } = r;
  const groups = GROUPS.filter(([key]) => r[key].length);
  console.log(groups.length ? `== ${path} ==` : `== ${path} ==  clean`);
  for (const [key, heading] of groups) {
    console.log(heading);
    for (const f of r[key]) console.log(format(path, f));
  }
  // Neither a finding nor a verdict: a file that uses both conventions is a fact the
  // developer can only see at this scale. Printed alongside `clean` too.
  if (mix)
    console.log(
      `  (note: mixes direction conventions — ${mix.logical} logical and ${mix.physical} physical declarations)`,
    );
  if (SASS_INDENTED.test(path)) console.log(SASS_NOTE);
}

// --- self-test ----------------------------------------------------------------
// One runnable check for the logic: a synthetic sheet with a known defect of
// each kind, negatives proving no false positive on a used prop and a
// registered one, and a two-sheet pair proving cross-file custom-property
// resolution. Run with no arguments.

function selfTest() {
  const src = [
    ':root { --used: red; --unused: blue; }',
    '.a { color: var(--used); }',
    '.b { transition: all .2s; }',
    '.c { }',
    '.c { }',
    '.d { width: calc(100%-1px); }',
    '.e { color: var(--typo); }',
    '@property --registered { syntax: "<length>"; }',
    '.f { width: var(--registered); }',
    '.g { color: red; .h { color: blue; } }', // mixed decls + native nesting
    '.#{$name} {}', // SCSS interpolation in a selector
    '@import "reset.css";', // top-level statement before a rule
    '.i { }',
    '.n,.o { color: green; }', // formatting-variant duplicate pair (norm key)
    '.n, .o {  color:green; }',
    '.p { .q { color: blue; } width: 1px; }', // decl after a nested block (parser fix)
    '.p { width: 1px; }', // same selector+body → duplicate, proving the trailing decl was captured
    ".r[data-x='foo'] { color: teal; }", // strings blank to the same text —
    ".r[data-x='bar'] { color: teal; }", // different rules, NOT a duplicate
    '.s { font-weight: 700; line-height: 1.2; }', // two selectors, identical decls,
    '.t { font-weight: 700; line-height: 1.2; }', // same context → repeated declarations
    '.u { display: none; }', // one shared decl is below the threshold:
    '.v { display: none; }', // never reported
    '@media print { .w { color: red; } }', // same decls, different at-rule context —
    '.x2 { color: red; }', // not mergeable, so not reported
    '.y2 { width: calc(100% - 2 * var(--s-6)); }', // custom ident with a -digit tail
    '.z2 { border-inline-start: 3px solid red; border-radius: 0 4px 4px 0; }',
    '.z3 { border-inline-start: 3px solid red; border-radius: 4px; }', // uniform: silent
    '.z4 { grid-column: 1 / -1; }', // full span cannot reorder: silent
  ].join('\n');
  const prepared = prepare(src, 'test.css');
  const lineOf = makeLineLookup(prepared);
  const block = runTable(BLOCK, prepared, 'test.css', lineOf);
  const advise = runTable(ADVISE, prepared, 'test.css', lineOf);
  const whole = [
    ...structureFindings(restoreStrings(prepared, src), lineOf),
    ...customPropertyFindings([{ path: 'test.css', prepared, lineOf }]),
  ];

  // Cross-file custom-property resolution: a prop declared in one sheet and read
  // by var() in another must NOT be false-flagged when both sheets are audited
  // together — only props dead across ALL passed files are reported.
  const aPre = prepare(':root { --shared: red; --dead: blue; }', 'a.css');
  const bPre = prepare('.x { color: var(--shared); } .y { color: var(--missing); }', 'b.css');
  const propsAB = customPropertyFindings([
    { path: 'a.css', prepared: aPre, lineOf: makeLineLookup(aPre) },
    { path: 'b.css', prepared: bPre, lineOf: makeLineLookup(bPre) },
  ]);
  const phas = (sub) => propsAB.some((f) => f.msg.includes(sub));
  // Multi-site: a dead prop declared in two files and an undefined prop used in
  // two files must each be reported at BOTH sites, not just the first.
  const cPre = prepare(':root { --dup: 1; }\n.c { color: var(--nope); }', 'c.css');
  const dPre = prepare(':root { --dup: 2; }\n.d { color: var(--nope); }', 'd.css');
  const propsCD = customPropertyFindings([
    { path: 'c.css', prepared: cPre, lineOf: makeLineLookup(cPre) },
    { path: 'd.css', prepared: dPre, lineOf: makeLineLookup(dPre) },
  ]);
  const dupUnused = propsCD.filter((f) => f.msg.includes('--dup') && /never read/.test(f.msg));
  const nopeUndef = propsCD.filter((f) => f.msg.includes('--nope') && /not declared/.test(f.msg));
  const sites = (arr) => new Set(arr.map((f) => f.path));
  const has = (arr, sub) => arr.some((f) => f.msg.includes(sub));
  const neverRead = whole.filter((f) => /never read/.test(f.msg)).map((f) => f.msg);
  const notDeclared = whole.filter((f) => /not declared/.test(f.msg)).map((f) => f.msg);
  const tests = [
    ['BLOCK catches transition: all', has(block, 'animates every property')],
    ['BLOCK catches calc() missing whitespace', has(block, 'whitespace')],
    ['WHOLE catches empty rule', has(whole, 'no declarations')],
    ['WHOLE catches duplicate block', has(whole, 'identical to the one at line')],
    ['WHOLE catches unused --unused', neverRead.some((m) => m.includes('--unused'))],
    ['WHOLE catches undefined --typo', notDeclared.some((m) => m.includes('--typo'))],
    ['no false unused on --used', !neverRead.some((m) => m.includes('--used'))],
    [
      'no false unused on @property --registered',
      !neverRead.some((m) => m.includes('--registered')),
    ],
    [
      'no false undefined on @property --registered',
      !notDeclared.some((m) => m.includes('--registered')),
    ],
    [
      'WHOLE empty rule pinned to line 4',
      whole.some((f) => f.line === 4 && /no declarations/.test(f.msg)),
    ],
    [
      'WHOLE duplicate pinned to line 5 referencing line 4',
      whole.some((f) => f.line === 5 && /line 4/.test(f.msg)),
    ],
    [
      'WHOLE no garbage selector from mixed nesting',
      !whole.some((f) => /color: red; \.h/.test(f.msg)),
    ],
    [
      'WHOLE .g keeps its declarations',
      !whole.some((f) => f.msg.includes('`.g`') && /no declarations/.test(f.msg)),
    ],
    [
      'WHOLE no spurious (unnamed) from interpolation',
      !whole.some((f) => f.msg.includes('(unnamed)')),
    ],
    [
      'WHOLE rule after statement pinned to own line, clean selector',
      whole.some((f) => f.line === 13 && /no declarations/.test(f.msg) && f.msg.includes('`.i`')),
    ],
    [
      'Sass note scoped to .sass only',
      !SASS_INDENTED.test('x.scss') && SASS_INDENTED.test('x.sass'),
    ],
    [
      'WHOLE .n, .o formatting variant flagged duplicate',
      whole.some((f) => /identical to the one at line/.test(f.msg) && f.msg.includes('.n,')),
    ],
    [
      'WHOLE decl after nested block participates (same-selector dup)',
      whole.some((f) => /identical to the one at line/.test(f.msg) && f.msg.includes('`.p`')),
    ],
    [
      'WHOLE no false duplicate between .p parent and .q child',
      !whole.some((f) => /identical/.test(f.msg) && f.msg.includes('`.q`')),
    ],
    ['cross-file --shared (used in sibling) not flagged', !phas('--shared')],
    ['cross-file --dead (unused everywhere) flagged', phas('--dead')],
    ['cross-file --missing (declared nowhere) flagged undefined', phas('--missing')],
    [
      'cross-file --dup unused reported at both sites',
      dupUnused.length === 2 && sites(dupUnused).size === 2,
    ],
    [
      'cross-file --nope undefined reported at both sites',
      nopeUndef.length === 2 && sites(nopeUndef).size === 2,
    ],
    // --- string restoration, repeated declarations, and the repaired rules ---
    [
      'no false duplicate between two same-length attribute values',
      !whole.some((f) => /identical to the one at line/.test(f.msg) && f.msg.includes('data-x')),
    ],
    [
      'duplicate-block message keeps the real selector, not the blanked one',
      !whole.some((f) => /`[^`]*\[data-x='\s+'\]/.test(f.msg)),
    ],
    [
      'WHOLE catches repeated declarations across two selectors',
      whole.some((f) => /repeated declarations/.test(f.msg) && f.msg.includes('`.t`')),
    ],
    [
      'one shared declaration is below the threshold, not reported',
      !whole.some((f) => /repeated declarations/.test(f.msg) && f.msg.includes('`.v`')),
    ],
    [
      'identical declarations in a different at-rule context not reported',
      !whole.some((f) => /repeated declarations/.test(f.msg) && f.msg.includes('`.x2`')),
    ],
    [
      'BLOCK: no false calc() on a custom property with a -digit tail',
      !has(block, 'whitespace') || !block.some((f) => f.line === 26),
    ],
    ['every BLOCK finding carries a line', block.every((f) => f.line != null)],
    ['every ADVISE finding carries a line', advise.every((f) => f.line != null)],
    [
      'ADVISE catches direction-blind radius beside a logical inline edge',
      has(advise, 'flips in RTL') || has(advise, 'left and right corners differ'),
    ],
    [
      'ADVISE: uniform radius beside a logical inline edge stays silent',
      advise.filter((f) => /corners differ/.test(f.msg)).length === 1,
    ],
    [
      'ADVISE: grid-column 1 / -1 is a full span, not a reorder',
      !advise.some((f) => /Visual order/.test(f.msg)),
    ],
    [
      'direction mix counted only when both conventions appear',
      directionMix('.a{color:red}') === null,
    ],
  ];
  let fail = 0;
  for (const [name, ok] of tests) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
    if (!ok) fail++;
  }
  console.log(fail ? `\n${fail} self-test(s) failed.` : '\nAll self-tests passed.');
  return fail ? 1 : 0;
}

// --- main ---------------------------------------------------------------------

function main(args) {
  // ADVISE and WHOLE-FILE are reported, not gated: most are intentional and the caller
  // has to dispose of them by reading. But a CI gate that only ever sees BLOCK passes a
  // sheet with an empty rule and a dead token in it, so `--strict` makes every finding
  // gate — the SKILL's "Done when" made checkable.
  const strict = args.includes('--strict');
  args = args.filter((a) => a !== '--strict');
  if (args.length === 0) {
    console.log('css-pro audit: no files given; running self-test.\n');
    return selfTest();
  }
  // PowerShell passes globs through unexpanded — expand them here so `*.css`
  // works in every shell instead of silently auditing nothing. A glob that
  // matches nothing and a file that cannot be read both exit non-zero: a CI
  // gate that audits nothing must fail, not pass.
  // fs.globSync arrived in Node 22. Fail with instructions rather than a
  // TypeError — or worse, a silent skip — when the host Node is older.
  if (args.some((a) => /[*?[\]{}]/.test(a)) && typeof fs.globSync !== 'function') {
    console.log('Glob arguments need Node 22 or newer; pass explicit file paths instead.');
    return 1;
  }
  let failed = 0;
  args = args.flatMap((a) => {
    if (!/[*?[\]{}]/.test(a)) return a;
    const hits = fs.globSync(a);
    if (hits.length === 0) {
      console.log(`== ${a} ==\n  (skipped: glob matched nothing)`);
      failed++;
    }
    return hits;
  });

  // Phase 1: per-file rule table + structural checks. Custom properties are
  // NOT resolved here — they span files, so a prop used only in a sibling sheet
  // would be false-flagged unused/undefined. Phase 2 resolves them together.
  const results = [];
  for (const path of args) {
    if (!STYLESHEET.test(path)) {
      console.log(
        `== ${path} ==\n  (skipped: audit targets .css/.scss/.sass/.less; the per-edit hook covers edits to other files)`,
      );
      continue;
    }
    const r = auditFile(path);
    if (r.error) failed++;
    results.push(r);
  }

  // Phase 2: custom properties resolved across every audited file at once. A
  // prop declared in tokens.css and read in app.css is used, not unused — but
  // only when both sheets are passed. Pass every stylesheet (the SKILL's
  // guidance) and this is exact; pass one sheet and it falls back to that sheet.
  const propsByPath = new Map();
  for (const f of customPropertyFindings(results.filter((r) => !r.error))) {
    if (!propsByPath.has(f.path)) propsByPath.set(f.path, []);
    propsByPath.get(f.path).push(f);
  }

  const counts = { files: 0, block: 0, advise: 0, whole: 0 };
  for (const r of results) {
    if (!r.error) {
      r.whole = [...r.structure, ...(propsByPath.get(r.path) ?? [])];
      counts.files++;
      counts.block += r.block.length;
      counts.advise += r.advise.length;
      counts.whole += r.whole.length;
    }
    report(r);
  }
  console.log(
    `\n${counts.files} file(s): ${counts.block} BLOCK, ${counts.advise} ADVISE, ${counts.whole} WHOLE-FILE.`,
  );
  // Custom-property resolution is only as wide as the file list. Audit one sheet of
  // forty and every token it exports reads as dead, every token it imports as undefined
  // — and the exit code says nothing about it. Say which happened.
  if (counts.files === 1 && results.some((r) => !r.error && r.declaresProps))
    console.log(
      'Scoped to one sheet: custom properties were resolved against it alone, so a token shared with a sibling sheet reads as dead or undefined here. Pass every stylesheet to resolve them.',
    );
  const undisposed = counts.advise + counts.whole;
  if (undisposed && !strict)
    console.log(
      `${undisposed} ADVISE/WHOLE-FILE finding(s) are reported, not gated — confirm each intentional or fix it (css-audit SKILL.md, "Done when"). \`--strict\` gates them.`,
    );
  const gated = strict ? counts.block + undisposed : counts.block;
  return gated > 0 || failed > 0 ? 1 : 0;
}

// Set exitCode, not exit(): stdout is a pipe, and on POSIX a pipe write is async —
// exiting truncates it. The process ends on its own once stdout drains.
process.exitCode = main(process.argv.slice(2));
