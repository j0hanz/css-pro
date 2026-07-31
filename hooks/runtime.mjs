#!/usr/bin/env node
import { extname } from 'node:path';
import { readFileSync } from 'node:fs';

const CSS = ['.css', '.scss', '.sass', '.less'];

// Doctrine rules. Two shapes:
//   { re, tier, msg }            — re tested against the ADDED text only
//   { when, absent, tier, msg }  — fires when every `when` matches the added text
//                                  AND `absent` is missing from the whole file
// tier 'block'  → decision:"block", reason fed back to the model (pattern wrong on its face)
// tier 'advise' → non-blocking additionalContext (wrong unless context elsewhere excuses it)
const RULES = [
  // ---- block: certain from the diff alone ----
  {
    tier: 'block',
    re: /transition(?:-property)?\s*:\s*all\b/i,
    msg: '`transition: all` animates every prop — perf cost, unintended animates. Animate only what changes. (css-craft / motion-craft)',
  },
  {
    tier: 'block',
    re: /\bease-in(?!-out)\b/i,
    msg: '`ease-in` on UI starts slow at the moment users watch closest. Enter/exit → `ease-out`. (motion-craft)',
  },
  {
    tier: 'block',
    re: /z-index\s*:\s*(?:9{4,}|2147483647)\b/i,
    msg: 'Magic `z-index` — lazy stacking. Use the project z-index token or a documented scale. (css-craft)',
  },
  {
    tier: 'block',
    re: /\bscale[a-z0-9]*\(\s*0(?:\.0+)?\s*[,)]|(?<![\w-])scale\s*:\s*0(?:\.0+)?\s*(?:;|\}|$)/im,
    msg: '`scale(0)` entrance — nothing appears from nothing. Start from `scale(0.9)` + opacity. (motion-craft)',
  },
  {
    tier: 'block',
    re: /(?<![\w-])transition(?:-property)?\s*:[^;{}]*(?<![-\w])(?:(?:min|max)-(?:width|height)|width|height|margin|padding|top|left)\b/i,
    msg: 'Transitioning a layout property — runs layout + paint on the main thread. Animate `transform`/`opacity` instead. (motion-craft)',
  },
  {
    // ponytail: numeric operands only — `calc(100px+var(--x))` slips through (letters
    // would false-positive on token names); covers the common `calc(100%-10px)` typo.
    tier: 'block',
    re: /\b(?:calc|clamp|min|max)\([^;{})]*?(?:[\w%] ?[+-][\d.(]|\)[+-][\d.(]|[%\d][+-] )/i,
    msg: '`calc()` needs spaces around `+`/`-` — unspaced is silently invalid. (css-functions)',
  },
  {
    tier: 'block',
    re: /var\(\s*--[\w-]+\s*,\s*--[\w-]/i,
    msg: '`var(--a, --b)` — the bare `--b` is literal fallback text, not a token. Nest it: `var(--a, var(--b))`. (css-craft)',
  },
  {
    tier: 'block',
    re: /\bokl(?:ch|ab)\(\s*(?:[2-9]\d*|1\d+|1\.\d*[1-9])(?:\.\d+)?(?![\d.%])/i,
    msg: '`oklch()`/`oklab()` lightness is 0–1 (or a %), not 0–100 — silent wrong color. (css-functions)',
  },
  {
    tier: 'block',
    re: /(?<![\w-])(background|font|border)(?!-radius\b)-[a-z-]+\s*:[^{}]*;[^{}]*(?<![\w-])\1\s*:/i,
    msg: 'Longhand before its shorthand in the same block — the shorthand resets every longhand it omits. Fold it in or reorder. (css-craft)',
  },
  // ---- advise: pattern-detectable, excuse may live elsewhere ----
  {
    tier: 'advise',
    re: /(?<![\w-])(?:min-|max-)?height\s*:\s*100vh\b/i,
    msg: '`100vh` jumps under mobile address bars — use `100dvh`. (css-craft)',
  },
  {
    tier: 'advise',
    re: /(?<![\w-])(?:transition|animation)(?:-(?!delay)[a-z]+)?\s*:[^;{}]*?(?:\b(?:[6-9]\d{2}|\d{4,})ms\b|(?<![\w.])(?:0?\.[6-9]\d*|[1-9]\d*(?:\.\d+)?)s\b)(?![^;{}]*\binfinite\b)/i,
    msg: '≥600ms on UI — stay under 300ms; modals ≤500ms. State the reason or cut it. (motion-craft)',
  },
  {
    tier: 'advise',
    when: [
      /@keyframes|(?<![\w-])(?:animation|transition)(?:-[a-z]+)?\s*:/i,
      /\btransform\s*:|translate|rotate|(?<![a-z])scale/i,
    ],
    absent: /prefers-reduced-motion/i,
    msg: 'Motion added, no `prefers-reduced-motion` in this file — fewer and gentler, not zero: keep fades, drop movement. Ignore if handled globally. (motion-craft)',
  },
  {
    tier: 'advise',
    when: [/:hover[^{}]*\{[^{}]*transform\s*:/i],
    absent: /@media[^{]*\bhover\s*:\s*hover/i,
    msg: '`:hover` motion ungated — touch fires hover on tap. Gate with `@media (hover: hover) and (pointer: fine)`. Ignore if gated globally. (motion-craft)',
  },
  {
    tier: 'advise',
    when: [/outline\s*:\s*(?:none|0)\b/i],
    absent: /:focus-visible/i,
    msg: '`outline: none` with no `:focus-visible` in this file — never remove focus without a replacement. (designer)',
  },
  {
    tier: 'advise',
    when: [/light-dark\(/i],
    absent: /color-scheme\s*:/i,
    msg: '`light-dark()` without `color-scheme: light dark` — first argument wins forever. Ignore if set globally. (css-functions)',
  },
];

async function readStdin() {
  let d = '';
  process.stdin.setEncoding('utf8');
  for await (const c of process.stdin) d += c;
  return d;
}

try {
  const payload = JSON.parse((await readStdin()) || '{}');
  const { tool_name, tool_input = {} } = payload;
  const path = tool_input.file_path;
  if (!path || !CSS.includes(extname(path).toLowerCase())) process.exit(0);

  const edits =
    tool_name === 'Write'
      ? [tool_input.content ?? '']
      : tool_name === 'Edit'
        ? [tool_input.new_string ?? '']
        : tool_name === 'MultiEdit'
          ? (tool_input.edits ?? []).map((e) => e.new_string ?? '')
          : [];
  const added = edits.join('\n');
  if (!added) process.exit(0);

  let file; // lazy; false = unreadable → skip file-scope rules
  const fileText = () => {
    if (file === undefined) {
      try {
        file = readFileSync(path, 'utf8');
      } catch {
        file = false;
      }
    }
    return file;
  };

  const blocks = [];
  const advisories = [];
  for (const rule of RULES) {
    if (rule.re) {
      if (!rule.re.test(added)) continue;
    } else {
      if (!rule.when.every((w) => w.test(added))) continue;
      const f = fileText();
      if (f === false || rule.absent.test(f)) continue;
    }
    (rule.tier === 'block' ? blocks : advisories).push(rule.msg);
  }

  if (blocks.length) {
    const lines = [...blocks, ...advisories.map((m) => `(advisory) ${m}`)];
    console.log(
      JSON.stringify({
        decision: 'block',
        reason: `css-pro doctrine: ${path}\n- ${lines.join('\n- ')}`,
      }),
    );
  } else if (advisories.length) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `css-pro doctrine (advisory): ${path}\n- ${advisories.join('\n- ')}`,
        },
      }),
    );
  }
} catch {
  process.exit(0);
}
