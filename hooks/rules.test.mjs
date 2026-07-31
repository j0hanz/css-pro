#!/usr/bin/env node
// Precision and recall for the rule table. Run: node hooks/rules.test.mjs
//
// Each rule gets a defect that MUST fire and near-misses that MUST NOT. The
// near-misses are the valuable half — a rule that fires on prose or on legitimate CSS
// is worse than no rule, and a block that false-positives is demoted by policy.

import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('./runtime.mjs', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'csspro-'));

function hook(mode, css, name = 'probe.css') {
  const p = join(dir, name);
  writeFileSync(p, css);
  const out = execFileSync(process.execPath, [HOOK, mode], {
    encoding: 'utf8',
    input: JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: p, content: css },
    }),
  }).trim();
  if (!out) return { blocked: false, advised: false, text: '' };
  const j = JSON.parse(out);
  const o = j.hookSpecificOutput ?? {};
  return {
    blocked: o.permissionDecision === 'deny',
    advised: Boolean(o.additionalContext),
    text: o.permissionDecisionReason ?? o.additionalContext ?? '',
  };
}

// [name, css, mode, shouldFire]
const CASES = [
  // --- blocks: defect must fire -------------------------------------------------
  ['transition: all', `.a{transition:all .2s}`, 'pre', true],
  ['magic z-index', `.a{z-index:9999}`, 'pre', true],
  ['transition on width', `.a{transition:width .2s}`, 'pre', true],
  ['calc unspaced', `.a{width:calc(100%-10px)}`, 'pre', true],
  ['bare var fallback', `.a{color:var(--a, --b)}`, 'pre', true],
  ['oklch lightness 62', `.a{color:oklch(62 .2 250)}`, 'pre', true],
  ['longhand before shorthand', `.a{background-color:red;background:blue}`, 'pre', true],
  ['identical duplicate decl', `.a{color:red;color:red}`, 'pre', true],

  // --- blocks: near-misses must NOT fire ----------------------------------------
  ['comment: transition all', `/* avoid transition: all */\n.a{color:red}`, 'pre', false],
  ['comment: bad calc', `/* calc(100%-10px) is wrong */\n.a{color:red}`, 'pre', false],
  ['comment: bare var', `/* never var(--a, --b) */\n.a{color:red}`, 'pre', false],
  ['comment: bad oklch', `/* oklch(62 .2 250) */\n.a{color:red}`, 'pre', false],
  ['comment: magic z-index', `/* no z-index: 9999 */\n.a{color:red}`, 'pre', false],
  ['string: transition all', `.a::after{content:"transition: all"}`, 'pre', false],
  ['token named --transition-all', `:root{--transition-all:.2s}`, 'pre', false],
  ['transition a custom property', `.a{transition:--my-color .2s}`, 'pre', false],
  ['transition display allow-discrete', `.a{transition:display .2s allow-discrete}`, 'pre', false],
  ['calc correctly spaced', `.a{width:calc(100% - 10px)}`, 'pre', false],
  ['calc negative literal', `.a{margin:calc(-1 * var(--x))}`, 'pre', false],
  ['clamp correctly spaced', `.a{font-size:clamp(1rem, 2vw + 1rem, 2rem)}`, 'pre', false],
  ['oklch percentage', `.a{color:oklch(62% .2 250)}`, 'pre', false],
  ['oklch decimal', `.a{color:oklch(.62 .2 250)}`, 'pre', false],
  ['oklch lightness exactly 1', `.a{color:oklch(1 0 0)}`, 'pre', false],
  ['nested var fallback', `.a{color:var(--x, var(--y, red))}`, 'pre', false],
  ['shorthand then longhand', `.a{background:red;background-size:cover}`, 'pre', false],
  ['border then border-radius', `.a{border:1px solid;border-radius:4px}`, 'pre', false],
  ['modest z-index', `.a{z-index:100}`, 'pre', false],
  ['z-index from token', `.a{z-index:var(--z-modal)}`, 'pre', false],
  ['grid-template-areas "all"', `.a{grid-template-areas:"all all"}`, 'pre', false],
  // the progressive-enhancement fallback idiom: first value is load-bearing
  ['fallback then var', `.a{color:#eee;color:var(--x)}`, 'pre', false],
  [
    'fallback then gradient',
    `.a{background:red;background:linear-gradient(red,blue)}`,
    'pre',
    false,
  ],

  // --- stripping must not swallow the code around what it removes ---------------
  ['comment then real defect', `/* transition: all is bad */\n.a{transition:all .2s}`, 'pre', true],
  ['defect then comment', `.a{transition:all .2s}/* fine */`, 'pre', true],
  ['apostrophe inside comment', `/* don't do this */\n.a{transition:all .2s}`, 'pre', true],
  ['unterminated string recovers', `.a{content:"oops\n.b{transition:all .2s}`, 'pre', true],
  [
    '// inside a css url is not a comment',
    `.a{background:url(//cdn.x/a.png);transition:all .2s}`,
    'pre',
    true,
  ],

  // --- advisories: must fire ----------------------------------------------------
  ['100vh', `.a{height:100vh}`, 'post', true],
  ['outline none, no focus-visible', `.a{outline:none}`, 'post', true],
  ['light-dark, no color-scheme', `.a{color:light-dark(#000,#fff)}`, 'post', true],
  ['order non-zero', `.a{order:2}`, 'post', true],
  ['row-reverse', `.a{flex-direction:row-reverse}`, 'post', true],
  [
    'motion, no reduced-motion',
    `.a{transition:transform .2s;transform:translateY(0)}`,
    'post',
    true,
  ],

  // --- advisories: must NOT fire ------------------------------------------------
  ['100dvh', `.a{height:100dvh}`, 'post', false],
  [
    'outline none WITH focus-visible',
    `.a{outline:none}\n.a:focus-visible{outline:2px solid}`,
    'post',
    false,
  ],
  [
    'light-dark WITH color-scheme',
    `:root{color-scheme:light dark}\n.a{color:light-dark(#000,#fff)}`,
    'post',
    false,
  ],
  ['order: 0 is not a reorder', `.a{order:0}`, 'post', false],
  ['comment mentioning 100vh', `/* 100vh is a trap */\n.a{height:100dvh}`, 'post', false],
  [
    'motion WITH reduced-motion',
    `.a{transition:transform .2s;transform:none}\n@media (prefers-reduced-motion:reduce){.a{transition:none}}`,
    'post',
    false,
  ],
];

let failed = 0;
for (const [name, css, mode, shouldFire] of CASES) {
  const r = hook(mode, css);
  const fired = mode === 'pre' ? r.blocked : r.advised;
  if (fired !== shouldFire) {
    failed++;
    const kind = shouldFire ? 'MISSED (no fire)' : 'FALSE POSITIVE';
    console.log(`  ${kind.padEnd(18)} [${mode}] ${name}`);
    if (r.text) console.log(`      ${r.text.split('\n')[1] ?? r.text}`.slice(0, 120));
  }
}

// engagement: a .tsx with no styling in it must cost nothing
const inert = hook('pre', `export const x = 1;\n`, 'component.tsx');
if (inert.blocked) {
  failed++;
  console.log('  FALSE POSITIVE     [pre] inert .tsx engaged');
}
// ...but a styled block in a .tsx is real CSS and is judged
const styled = hook('pre', 'const A = styled.div`transition: all .2s;`;\n', 'a.tsx');
if (!styled.blocked) {
  failed++;
  console.log('  MISSED (no fire)   [pre] styled.div in .tsx');
}

rmSync(dir, { recursive: true, force: true });
console.log(
  failed ? `\n${failed} failing of ${CASES.length + 2}` : `\nall ${CASES.length + 2} cases pass`,
);
process.exit(failed ? 1 : 0);
