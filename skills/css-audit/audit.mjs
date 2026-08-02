#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { AUDITABLE, STYLESHEET } from '../../hooks/changed.mjs';
import {
  LINE_COMMENT_LANGS,
  MARKUP_ANCHOR,
  MARKUP_LANGS,
  prepare,
  stripComments,
} from '../../hooks/strip.mjs';
import { ADVISE, BLOCK, parseRules, runRules } from '../../hooks/rules.mjs';

const GLOB = /[*?[\]{}]/;
const isGlob = (a) => GLOB.test(a) && !fs.statSync(a, { throwIfNoEntry: false });
const SASS_INDENTED = /\.sass$/i;

const USAGE = `css-pro audit — whole-file audit of stylesheets and the styles inside source files.

usage:
  node audit.mjs <file|dir|glob>... [--strict] [--json]
  node audit.mjs --help | -h

  --strict      gate ADVISE and WHOLE-FILE findings too (exit 1); BLOCK always gates
  --json        emit one flat JSON array: [{path,line,severity,msg}]
  <dir>         recurse, skipping node_modules and dot-dirs

Reads .css/.scss/.sass/.less, CSS-in-JS in .js/.jsx/.ts/.tsx (+ .mjs/.cjs/.mts/.cts),
and <style>/<script>/style="" in .vue/.svelte/.astro/.html. WHOLE-FILE structure checks
run on stylesheets only. A finding inside an object-form style is reported against the
line its object literal opens on.

Suppress a false positive: put /* csspro-ignore */ on the line above the finding
(or on the same line); it covers that line and the next.

Exit code: 0 clean, 1 if any gated finding remains or a file/glob failed.`;

export const lineCounter = (text) => (idx) => text.slice(0, idx).split('\n').length;

export function findings(rules, text, filePath, lineOf) {
  return runRules(rules, text, filePath).flatMap((hit) =>
    [...new Set(hit.at.map(lineOf))].map((line) => ({ line, msg: hit.msg })),
  );
}

export function forStructure(raw, filePath) {
  return stripComments(raw, LINE_COMMENT_LANGS.test(filePath)).replace(
    /(['"])((?:[^'"\\\n]|\\.)*)\1/g,
    (m, q, inner) => q + inner.replace(/[{};]/g, ' ') + q,
  );
}

const MIN_REPEATED_DECLS = 2;
const MIN_SHARED_DECLS = 4;
const MIN_OVERLAP_RATIO = 0.6;

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

export function structureFindings(text, lineOf) {
  const out = [];
  const byDecl = new Map();
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
  for (const r of parseRules(text)) {
    r.line = lineOf(r.at);
    if (r.body.replace(/[;\s]/g, '') === '')
      out.push({
        line: r.line,
        msg: `empty rule — \`${norm(r.selector) || '(unnamed)'}\` has no declarations.`,
      });
    const decls = declsOf(r.body);
    const ctx = norm(r.context);
    const keys = decls.length ? [...new Set(decls)] : ['\0empty'];
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

export function customPropertyFindings(files) {
  const declared = new Map();
  const used = new Map();
  const add = (map, name, path, line) => {
    if (!map.has(name)) map.set(name, []);
    map.get(name).push({ path, line });
  };

  for (const f of files) {
    for (const m of f.text.matchAll(/--[\w-]+(?=\s*:)/g))
      add(declared, m[0], f.path, f.lineOf(m.index));
    for (const m of f.text.matchAll(/@property\s+(--[\w-]+)/g))
      add(declared, m[1], f.path, f.lineOf(m.index));
    for (const m of f.text.matchAll(/var\(\s*(--[\w-]+)/g))
      add(used, m[1], f.path, f.lineOf(m.index));
    for (const m of (f.text ? (f.raw ?? '') : '').matchAll(/setProperty\(\s*['"](--[\w-]+)/g))
      add(declared, m[1], f.path, f.lineOf(m.index));
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

export function ignoreLines(raw) {
  const ignore = new Set();
  raw.split('\n').forEach((l, i) => {
    if (l.includes('csspro-ignore')) {
      ignore.add(i + 1);
      ignore.add(i + 2);
    }
  });
  return ignore;
}

function walkDir(dir) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && !e.name.startsWith('.')) out.push(...walkDir(p));
    } else if (AUDITABLE.test(e.name)) out.push(p);
  }
  return out;
}

function sourceOf(blocks, idx) {
  let source = 0;
  for (const b of blocks) {
    if (b.at > idx) break;
    source = b.source;
  }
  return source;
}

export function lineLookupFor(raw, text, blocks) {
  const lineAt = lineCounter(text);
  return (idx) => lineAt(idx < raw.length ? idx : sourceOf(blocks, idx));
}

export function auditPrepare(raw, filePath) {
  if (MARKUP_LANGS.test(filePath) && !MARKUP_ANCHOR.test(raw)) return { text: '', blocks: [] };
  return prepare(raw, filePath);
}

export function auditFile(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return { path: filePath, error: `unreadable: ${e.code || e.message}` };
  }
  const { text, blocks } = auditPrepare(raw, filePath);
  const lineOf = lineLookupFor(raw, text, blocks);
  return {
    path: filePath,
    raw,
    text,
    lineOf,
    ignore: ignoreLines(raw),
    block: findings(BLOCK, text, filePath, lineOf),
    advise: findings(ADVISE, text, filePath, lineOf),
    structure:
      SASS_INDENTED.test(filePath) || !STYLESHEET.test(filePath)
        ? []
        : structureFindings(forStructure(raw, filePath), lineOf),
    declaresProps: /--[\w-]+\s*:/.test(text),
  };
}

export function formatGroup(path, rows) {
  const byMsg = new Map();
  for (const f of [...rows].sort((a, b) => a.line - b.line)) {
    if (!byMsg.has(f.msg)) byMsg.set(f.msg, new Set());
    byMsg.get(f.msg).add(f.line);
  }
  return [...byMsg].map(
    ([msg, lines]) => `  ${path}:${[...lines].sort((a, b) => a - b).join(',')}  ${msg}`,
  );
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
  const groups = GROUPS.filter(([key]) => r[key].length);
  console.log(groups.length ? `== ${r.path} ==` : `== ${r.path} ==  clean`);
  for (const [key, heading] of groups) {
    console.log(heading);
    for (const line of formatGroup(r.path, r[key])) console.log(line);
  }
  if (SASS_INDENTED.test(r.path)) console.log(SASS_NOTE);
}

function main(argv) {
  let opts;
  let positionals;
  try {
    ({ values: opts, positionals } = parseArgs({
      args: argv,
      options: {
        strict: { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
    }));
  } catch (e) {
    console.log(`${e.message}\n\n${USAGE}`);
    return 1;
  }
  if (opts.help) {
    console.log(USAGE);
    return 0;
  }
  if (positionals.length === 0) {
    console.log(USAGE);
    return 1;
  }

  let failed = 0;
  const skips = [];
  const resolved = positionals.flatMap((a) => {
    if (isGlob(a)) {
      const hits = fs.globSync(a);
      if (hits.length === 0) {
        skips.push({ arg: a, msg: 'glob matched nothing', sev: 'error' });
        failed++;
      }
      return hits;
    }
    const st = fs.statSync(a, { throwIfNoEntry: false });
    if (st && st.isDirectory()) {
      const hits = walkDir(a);
      if (hits.length === 0) {
        skips.push({
          arg: a,
          msg: 'no stylesheet, CSS-in-JS, or single-file component beneath it',
          sev: 'error',
        });
        failed++;
      }
      return hits;
    }
    return a;
  });

  const seen = new Set();
  const paths = [];
  for (const p of resolved) {
    const key = path.resolve(p);
    if (seen.has(key)) continue;
    seen.add(key);
    paths.push(p);
  }

  const results = [];
  for (const p of paths) {
    if (!AUDITABLE.test(p)) {
      skips.push({
        arg: p,
        msg: 'audit targets stylesheets, CSS-in-JS, and single-file component styles',
        sev: 'note',
      });
      continue;
    }
    const r = auditFile(p);
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
    if (r.error) continue;
    const keep = (f) => !r.ignore.has(f.line);
    r.block = r.block.filter(keep);
    r.advise = r.advise.filter(keep);
    r.whole = [...r.structure.filter(keep), ...(propsByPath.get(r.path) ?? []).filter(keep)];
    counts.files++;
    counts.block += r.block.length;
    counts.advise += r.advise.length;
    counts.whole += r.whole.length;
  }

  if (opts.json) {
    const out = [];
    for (const s of skips)
      out.push({ path: s.arg, line: null, severity: s.sev, msg: `skipped: ${s.msg}` });
    for (const r of results) {
      if (r.error) {
        out.push({ path: r.path, line: null, severity: 'error', msg: r.error });
        continue;
      }
      for (const [key, sev] of [
        ['block', 'block'],
        ['advise', 'advise'],
        ['whole', 'whole'],
      ])
        for (const f of r[key]) out.push({ path: r.path, line: f.line, severity: sev, msg: f.msg });
    }
    console.log(JSON.stringify(out, null, 2));
  } else {
    for (const s of skips) console.log(`== ${s.arg} ==\n  (skipped: ${s.msg})`);
    for (const r of results) report(r);
    console.log(
      `\n${counts.files} file(s): ${counts.block} BLOCK, ${counts.advise} ADVISE, ${counts.whole} WHOLE-FILE.`,
    );
    if (counts.files === 1 && results.some((r) => !r.error && r.declaresProps))
      console.log(
        'Scoped to one sheet: custom properties were resolved against it alone, so a token shared with a sibling sheet reads as dead or undefined here. Pass every stylesheet to resolve them.',
      );
    const undisposed = counts.advise + counts.whole;
    if (undisposed && !opts.strict)
      console.log(
        `${undisposed} ADVISE/WHOLE-FILE finding(s) are reported, not gated — confirm each intentional or fix it (css-audit SKILL.md, "Done when"). \`--strict\` gates them.`,
      );
  }
  const gated = opts.strict ? counts.block + counts.advise + counts.whole : counts.block;
  return gated > 0 || failed > 0 ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  process.exitCode = main(process.argv.slice(2));
