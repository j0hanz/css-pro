#!/usr/bin/env node
import * as fs from 'node:fs';
import { prepare } from '../../hooks/strip.mjs';
import { BLOCK, ADVISE } from '../../hooks/rules.mjs';

const STYLESHEET = /\.(css|scss|sass|less)$/i;
const GLOB = /[*?[\]{}]/;
const SASS_INDENTED = /\.sass$/i;

function makeLineLookup(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return (idx) => {
    let lo = 0,
      hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

function runTable(rules, prepared, path, lineOf) {
  const out = [];
  for (const rule of rules) {
    if (rule.files && !rule.files.test(path)) continue;
    if (rule.fn) {
      const at = rule.fn(prepared);
      if (at) for (const line of new Set(at.map(lineOf))) out.push({ line, msg: rule.msg });
      continue;
    }
    if (rule.re) {
      const re = globalize(rule.re);
      let m;
      while ((m = re.exec(prepared)) !== null) {
        out.push({ line: lineOf(m.index), msg: rule.msg });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
      continue;
    }
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

// `prepare` blanks stylesheets in place, so offsets into `prepared` index `src` too.
function restoreStrings(prepared, src) {
  return prepared.replace(/(['"])[^'"\n]*\1/g, (m, q, off) => {
    const inner = src.slice(off + 1, off + m.length - 1).replace(/[{};]/g, ' ');
    return q + inner + q;
  });
}

function parseRules(text, lineOf) {
  const out = [];
  let i = 0;
  function block(prefix, atRules) {
    const start = i;
    while (i < text.length && text[i] !== '{' && text[i] !== '}') i++;
    if (i >= text.length || text[i] === '}') {
      if (text[i] === '}') i++;
      return;
    }
    const raw = text.slice(start, i);
    const stmt = raw.lastIndexOf(';') + 1;
    const tail = raw.slice(stmt);
    const head = tail.trim();
    const lead = tail.match(/^\s*/)[0].length;
    const line = lineOf(start + stmt + lead);
    const sel = prefix ? (head ? `${prefix} ${head}` : prefix) : head;
    const cond = head.startsWith('@') ? (atRules ? `${atRules} ${head}` : head) : atRules;
    i++;
    let body = '';
    let hasNested = false;
    while (i < text.length && text[i] !== '}') {
      let j = i;
      while (j < text.length && text[j] !== '{' && text[j] !== '}') j++;
      if (j >= text.length || text[j] === '}') {
        body += text.slice(i, j);
        i = j;
        break;
      }
      hasNested = true;
      const seg = text.slice(i, j);
      const semi = seg.lastIndexOf(';');
      body += semi >= 0 ? seg.slice(0, semi + 1) : '';
      const nestedSel = (semi >= 0 ? seg.slice(semi + 1) : seg).trim();
      i = j;
      // A nested at-rule is a condition, not a selector. Folded into the selector it
      // left the context empty, so a block inside `@media` keyed identically to one
      // outside it and the two read as repeated declarations.
      const nestedAt = nestedSel.startsWith('@');
      block(
        nestedAt || !nestedSel ? sel : `${sel} ${nestedSel}`,
        nestedAt ? (cond ? `${cond} ${nestedSel}` : nestedSel) : cond,
      );
    }
    if (hasNested ? body.replace(/[;\s]/g, '') !== '' : true)
      out.push({ selector: sel, context: cond ?? '', body, line });
    if (text[i] === '}') i++;
  }
  while (i < text.length) block('', '');
  return out;
}

const MIN_REPEATED_DECLS = 2;
// A partial overlap only earns a finding when it is big enough to lift out. Three
// shared declarations is two type rules happening to agree; four is a copied component.
const MIN_SHARED_DECLS = 4;
// ...and when the shared set is most of both blocks. Count alone rewards long blocks
// for agreeing on boilerplate — an 18-declaration rule sharing four `font-*` lines with
// another is not a copy of it, and scoring on count reported two dozen such pairs.
const MIN_OVERLAP_RATIO = 0.6;

// The earlier rule this one most resembles, under the same conditions, scored as shared
// over union. Ties go to the earliest line so the report is stable across runs.
function nearestOverlap(byDecl, ctx, decls) {
  const counts = new Map();
  for (const d of decls)
    for (const other of byDecl.get(`${ctx}\0${d}`) ?? [])
      counts.set(other, (counts.get(other) ?? 0) + 1);
  let best = null;
  for (const [other, shared] of counts) {
    const ratio = shared / (decls.length + other.declCount - shared);
    if (!best || ratio > best.ratio || (ratio === best.ratio && other.line < best.rule.line))
      best = { rule: other, shared, ratio };
  }
  return best;
}

function structureFindings(prepared, lineOf) {
  const rules = parseRules(prepared, lineOf);
  const out = [];
  // `context\0declaration` -> the rules that set it, in source order. Counting hits
  // through this index finds a block's nearest neighbour without an O(n²) scan, and an
  // identical block is just the case where every hit lands on one rule: ratio 1.
  const byDecl = new Map();
  // Also flattens the multi-line selector lists this prints, which would otherwise break
  // the one-line-per-finding format the report promises.
  const norm = (s) =>
    s
      .replace(/\s+/g, ' ')
      .replace(/\s*([:;,{}])\s*/g, '$1')
      .trim();
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
        msg: `empty rule — \`${norm(r.selector) || '(unnamed)'}\` has no declarations.`,
      });
    const decls = declsOf(r.body);
    const ctx = norm(r.context);
    // An empty block has nothing to index, so it could never meet another one. A
    // sentinel key pairs two of them like any other identical pair. Deduped so a block
    // that sets one property twice cannot score above 1.
    const keys = decls.length ? [...new Set(decls)] : ['\0empty'];
    // Matched on the declaration SET, so `.a{x;y}` and `.b{y;x}` are the same block —
    // keyed on source order, every reordered copy of a block went unreported.
    const near = nearestOverlap(byDecl, ctx, keys);
    const same = near?.ratio === 1;
    if (same && norm(near.rule.selector) === norm(r.selector))
      out.push({
        line: r.line,
        msg: `duplicate block — \`${norm(r.selector) || '(unnamed)'}\` is identical to the one at line ${near.rule.line}.`,
      });
    else if (same && decls.length >= MIN_REPEATED_DECLS)
      out.push({
        line: r.line,
        msg: `repeated declarations — \`${norm(r.selector)}\` sets the same ${decls.length} declarations as \`${norm(near.rule.selector)}\` at line ${near.rule.line}, under the same conditions. One selector list, or a shared class.`,
      });
    // Byte-identical bodies are rare in hand-written CSS; a copied component that then
    // drifted by one declaration is the common shape, and an equality test never sees it.
    else if (near && near.shared >= MIN_SHARED_DECLS && near.ratio >= MIN_OVERLAP_RATIO)
      out.push({
        line: r.line,
        msg: `overlapping declarations — \`${norm(r.selector)}\` shares ${near.shared} of its ${decls.length} declarations with \`${norm(near.rule.selector)}\` at line ${near.rule.line}, under the same conditions. Lift the shared set onto one selector list or a common class.`,
      });
    r.declCount = keys.length;
    for (const d of keys) {
      const k = `${ctx}\0${d}`;
      if (!byDecl.has(k)) byDecl.set(k, []);
      byDecl.get(k).push(r);
    }
  }
  return out;
}

// Inline axis only, both sides. `margin-top` is block-axis: it means the same thing in
// every writing mode, so counting it as "physical" inflated the number with declarations
// that carry no direction risk at all — on a real sheet most of the count was `top` and
// `bottom`, and the figure measured nothing you could act on.
const LOGICAL_PROP =
  /(?<![\w-])(?:margin|padding|border|inset)-inline(?:-(?:start|end))?\s*:|(?<![\w-])inline-size\s*:|text-align\s*:\s*(?:start|end)\b/gi;
const PHYSICAL_PROP =
  /(?<![\w-])(?:margin|padding)-(?:right|left)\s*:|(?<![\w-])border-(?:right|left)(?:-(?:width|style|color))?\s*:|(?<![\w-])(?:right|left|inset)\s*:|text-align\s*:\s*(?:left|right)\b/gi;

function directionMix(prepared) {
  const logical = [...prepared.matchAll(LOGICAL_PROP)];
  const physical = [...prepared.matchAll(PHYSICAL_PROP)];
  return logical.length && physical.length
    ? { logical: logical.length, physical: physical.length, at: physical.map((m) => m.index) }
    : null;
}

function customPropertyFindings(files) {
  const declared = new Map();
  const used = new Map();
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
    structure: structureFindings(restoreStrings(prepared, raw), lineOf),
    mix: directionMix(prepared),
    declaresProps: /--[\w-]+\s*:/.test(prepared),
  };
}

// Collapse a sorted line set into compact ranges: [8,33,34] -> "8,33-34".
// Precondition: `lines` is non-empty — callers guard on `lines.size`.
function lineList(lines) {
  if (!lines.size) return '';
  const s = [...lines].sort((a, b) => a - b);
  const runs = [];
  let start = s[0],
    prev = s[0];
  for (let i = 1; i <= s.length; i++) {
    if (i < s.length && s[i] === prev + 1) {
      prev = s[i];
      continue;
    }
    runs.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = s[i];
  }
  return runs.join(',');
}

// One line per distinct message: `path:line,line,...  message`. Findings are
// line-sorted and repeated messages collapse to a single line listing every
// site — a sheet with fifteen `calc()` defects reads as one line, not fifteen.
function formatGroup(path, findings) {
  // Finite sentinel, not Infinity: Infinity - Infinity is NaN, which leaves the
  // order of null-line findings spec-unstable. MAX_SAFE_INTEGER sorts them last.
  const TAIL = Number.MAX_SAFE_INTEGER;
  const ordered = [...findings].sort((a, b) => (a.line ?? TAIL) - (b.line ?? TAIL));
  // Group by message — safe because every rule in the table has a unique msg.
  const byMsg = new Map();
  for (const f of ordered) {
    if (!byMsg.has(f.msg)) byMsg.set(f.msg, new Set());
    if (f.line != null) byMsg.get(f.msg).add(f.line);
  }
  const out = [];
  for (const [msg, lines] of byMsg) {
    const loc = lines.size ? `${path}:${lineList(lines)}` : '';
    out.push(loc ? `  ${loc}  ${msg}` : `  ${msg}`);
  }
  return out;
}

const SASS_NOTE =
  '  (note: indented Sass — empty/duplicate rule checks skipped; rule table and custom-property checks did run)';

const GROUPS = [
  ['block', 'BLOCK — provable, fix:'],
  ['advise', 'ADVISE — measurable, confirm or fix:'],
  ['whole', 'WHOLE-FILE — only visible at file scale:'],
];

function report(r) {
  if (r.error) {
    console.log(`== ${r.path} ==\n  (skipped: ${r.error})`);
    return;
  }
  const { path, mix, lineOf } = r;
  const groups = GROUPS.filter(([key]) => r[key].length);
  // `mix` counts toward the header: a file that printed `clean` and then a note about
  // itself contradicted itself on two adjacent lines.
  console.log(groups.length || mix ? `== ${path} ==` : `== ${path} ==  clean`);
  for (const [key, heading] of groups) {
    console.log(heading);
    for (const line of formatGroup(path, r[key])) console.log(line);
  }
  if (mix)
    console.log(
      `  ${path}:${lineList(new Set(mix.at.map((i) => lineOf(i))))}  (note: mixes direction conventions — ${mix.physical} physical inline-axis declaration(s) here do not flip in RTL, but ${mix.logical} logical one(s) elsewhere in the file do)`,
    );
  if (SASS_INDENTED.test(path)) console.log(SASS_NOTE);
}

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
  ].join('\n');
  const prepared = prepare(src, 'test.css');
  const lineOf = makeLineLookup(prepared);
  const block = runTable(BLOCK, prepared, 'test.css', lineOf);
  const advise = runTable(ADVISE, prepared, 'test.css', lineOf);
  const whole = [
    ...structureFindings(restoreStrings(prepared, src), lineOf),
    ...customPropertyFindings([{ path: 'test.css', prepared, lineOf }]),
  ];

  const aPre = prepare(':root { --shared: red; --dead: blue; }', 'a.css');
  const bPre = prepare('.x { color: var(--shared); } .y { color: var(--missing); }', 'b.css');
  const propsAB = customPropertyFindings([
    { path: 'a.css', prepared: aPre, lineOf: makeLineLookup(aPre) },
    { path: 'b.css', prepared: bPre, lineOf: makeLineLookup(bPre) },
  ]);
  const phas = (sub) => propsAB.some((f) => f.msg.includes(sub));
  const cPre = prepare(':root { --dup: 1; }\n.c { color: var(--nope); }', 'c.css');
  const dPre = prepare(':root { --dup: 2; }\n.d { color: var(--nope); }', 'd.css');
  const propsCD = customPropertyFindings([
    { path: 'c.css', prepared: cPre, lineOf: makeLineLookup(cPre) },
    { path: 'd.css', prepared: dPre, lineOf: makeLineLookup(dPre) },
  ]);
  const adviseOn = (css, name) => {
    const p = prepare(css, name);
    return runTable(ADVISE, p, name, makeLineLookup(p));
  };
  const smoothAdvise = adviseOn(
    'html { scroll-behavior: smooth; }\n@media (prefers-reduced-motion: reduce) { .x { animation: none; } }',
    'smooth.css',
  );
  const guardedAdvise = adviseOn(
    'html { scroll-behavior: smooth; }\n@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }',
    'guarded.css',
  );
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
    [
      'BLOCK catches calc() missing trailing space after a ) operand',
      block.some((f) => f.line === 30 && /whitespace/.test(f.msg)),
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
      !advise.some((f) => f.line === 29 && /Visual order/.test(f.msg)),
    ],
    [
      'ADVISE: grid-column 1 is the flow default, not a reorder',
      !advise.some((f) => f.line === 31 && /Visual order/.test(f.msg)),
    ],
    [
      'ADVISE: grid-column 2 still reads as a reorder',
      advise.some((f) => f.line === 32 && /Visual order/.test(f.msg)),
    ],
    [
      'ADVISE: smooth scroll not vouched for by an unrelated reduced-motion block',
      has(smoothAdvise, 'Smooth scrolling'),
    ],
    [
      'ADVISE: smooth scroll silent once a guard sets scroll-behavior: auto',
      !has(guardedAdvise, 'Smooth scrolling'),
    ],
    [
      'WHOLE catches repeated declarations written in a different order',
      whole.some((f) => f.line === 34 && /repeated declarations/.test(f.msg)),
    ],
    [
      'WHOLE catches a four-declaration partial overlap',
      whole.some((f) => f.line === 36 && /overlapping declarations/.test(f.msg)),
    ],
    [
      'three shared declarations are below the overlap threshold',
      !whole.some((f) => f.line === 38 && /overlapping declarations/.test(f.msg)),
    ],
    [
      'four shared declarations in a much longer block are below the ratio',
      !whole.some((f) => f.line === 40 && /overlapping declarations/.test(f.msg)),
    ],
    ['no multi-line selector in a whole-file message', !whole.some((f) => f.msg.includes('\n'))],
    [
      'direction mix counted only when both conventions appear',
      directionMix('.a{color:red}') === null,
    ],
    [
      'direction mix ignores block-axis physical properties',
      directionMix('.a{margin-inline-start:1px;margin-top:2px}') === null,
    ],
    [
      'direction mix reports a line for each physical inline-axis site',
      directionMix('.a{margin-inline-start:1px;margin-left:2px}')?.at.length === 1,
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

function main(args) {
  const strict = args.includes('--strict');
  const argv = args.filter((a) => a !== '--strict');
  if (argv.length === 0) {
    console.log('css-pro audit: no files given; running self-test.\n');
    return selfTest();
  }
  if (argv.some((a) => GLOB.test(a)) && typeof fs.globSync !== 'function') {
    console.log('Glob arguments need Node 22 or newer; pass explicit file paths instead.');
    return 1;
  }
  let failed = 0;
  const paths = argv.flatMap((a) => {
    if (!GLOB.test(a)) return a;
    const hits = fs.globSync(a);
    if (hits.length === 0) {
      console.log(`== ${a} ==\n  (skipped: glob matched nothing)`);
      failed++;
    }
    return hits;
  });

  const results = [];
  for (const path of paths) {
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

process.exitCode = main(process.argv.slice(2));
