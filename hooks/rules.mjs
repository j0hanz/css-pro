// The rule table. Every rule asserts something that can be shown wrong — a spec
// behaviour, a measurable cost, a WCAG criterion, or a documented bug. Nothing here
// rests on a value looking or feeling better; that is the developer's call, not ours.
//
// Two shapes:
//   { re, msg }             — tested against the added text (comments/strings stripped)
//   { when, absent, msg }   — every `when` matches the added text AND `absent` is
//                             missing from the whole file
//   { fn, msg }             — arbitrary check over (addedText, fileText)
//
// `tier: 'block'` runs on PreToolUse and refuses the write. It is reserved for claims
// provable from the edit alone, with no false positives. Everything else advises.

export const BLOCK = [
  {
    id: 'transition-all',
    re: /transition(?:-property)?\s*:\s*all\b/i,
    msg: '`transition: all` animates every property, including ones you did not intend and ones that force layout. Name the properties that change.',
  },
  {
    id: 'magic-z-index',
    re: /z-index\s*:\s*(?:9{4,}|2147483647)\b/i,
    msg: 'A `z-index` of 9999+ is not a stacking decision, it is a bid to win one. Use the project’s z-index scale or a token.',
  },
  {
    id: 'transition-layout-property',
    re: /(?<![\w-])transition(?:-property)?\s*:[^;{}]*(?<![-\w])(?:(?:min|max)-(?:width|height)|width|height|margin|padding|top|left)\b/i,
    msg: 'Transitioning a layout property runs layout and paint on every frame, on the main thread. Animate `transform` or `opacity` instead.',
  },
  {
    // ponytail: numeric operands only — `calc(100px+var(--x))` slips through, since
    // letters either side would false-positive on token names. Covers the common typo.
    id: 'calc-unspaced-operator',
    re: /\b(?:calc|clamp|min|max)\([^;{})]*?(?:[\w%] ?[+-][\d.(]|\)[+-][\d.(]|[%\d][+-] )/i,
    msg: '`calc()` requires whitespace around `+` and `-`. Without it the expression is invalid and the whole declaration is dropped.',
  },
  {
    id: 'var-bare-fallback',
    re: /var\(\s*--[\w-]+\s*,\s*--[\w-]/i,
    msg: 'In `var(--a, --b)` the `--b` is literal fallback *text*, not a token reference. Nest it: `var(--a, var(--b))`.',
  },
  {
    id: 'oklch-lightness-range',
    re: /\bokl(?:ch|ab)\(\s*(?:[2-9]\d*|1\d+|1\.\d*[1-9])(?:\.\d+)?(?![\d.%])/i,
    msg: '`oklch()` and `oklab()` lightness is 0–1, or a percentage. A bare value above 1 silently clamps and gives you the wrong colour.',
  },
  {
    id: 'longhand-before-shorthand',
    re: /(?<![\w-])(background|font|border)(?!-radius\b)-[a-z-]+\s*:[^{}]*;[^{}]*(?<![\w-])\1\s*:/i,
    msg: 'A longhand set before its shorthand is discarded — the shorthand resets every longhand it omits. Fold it in, or move it after.',
  },
  {
    id: 'identical-duplicate-declaration',
    fn: duplicateIdenticalDeclarations,
    msg: 'The same property is set twice to the same value in one block. The first is dead.',
  },
];

export const ADVISE = [
  {
    id: 'viewport-height-unit',
    re: /(?<![\w-])(?:min-|max-)?height\s*:\s*100vh\b/i,
    msg: '`100vh` does not account for mobile browser chrome, so the element overflows and jumps as the address bar hides. `100dvh` tracks the visible viewport.',
  },
  {
    id: 'motion-without-reduced-motion',
    when: [
      /@keyframes|(?<![\w-])(?:animation|transition)(?:-[a-z]+)?\s*:/i,
      /\btransform\s*:|translate|rotate|(?<![a-z])scale/i,
    ],
    absent: /prefers-reduced-motion/i,
    msg: 'Motion added with no `prefers-reduced-motion` in this file (WCAG 2.3.3). Fewer and gentler, not none — keep fades, drop movement. Ignore if handled globally.',
  },
  {
    id: 'hover-motion-ungated',
    when: [/:hover[^{}]*\{[^{}]*transform\s*:/i],
    absent: /@media[^{]*\bhover\s*:\s*hover/i,
    msg: 'Touch devices fire `:hover` on tap, so this motion plays on every touch and sticks. Gate with `@media (hover: hover) and (pointer: fine)`. Ignore if gated globally.',
  },
  {
    id: 'outline-none-without-focus-visible',
    when: [/outline\s*:\s*(?:none|0)\b/i],
    absent: /:focus-visible/i,
    msg: 'Removing the outline with no `:focus-visible` in this file leaves keyboard users with no visible focus (WCAG 2.4.7). Replace it, do not just remove it.',
  },
  {
    id: 'light-dark-without-color-scheme',
    when: [/light-dark\(/i],
    absent: /color-scheme\s*:/i,
    msg: '`light-dark()` needs `color-scheme` to resolve; without it the first argument wins permanently. Ignore if set globally.',
  },
  {
    id: 'visual-order-diverges-from-dom',
    fn: visualReorder,
    msg: 'Visual order now differs from DOM order, so keyboard and screen-reader users get a different sequence (WCAG 1.3.2, 2.4.3). Confirm focus order still reads correctly — this may be entirely correct.',
  },
];

// --- checks that need more than one regex ---------------------------------------

const BLOCK_RE = /(^|[;{}])\s*([^{};]+)\{([^{}]*)\}/g;

function duplicateIdenticalDeclarations(added) {
  for (const m of added.matchAll(BLOCK_RE)) {
    const seen = new Map();
    for (const decl of m[3].split(';')) {
      const idx = decl.indexOf(':');
      if (idx === -1) continue;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const value = decl
        .slice(idx + 1)
        .trim()
        .toLowerCase();
      if (!prop || prop.startsWith('--')) continue;
      // Only identical values are provably redundant. A repeated property with a
      // *different* value is the progressive-enhancement fallback idiom
      // (`color: #eee; color: var(--x)`), where the first is load-bearing.
      if (seen.get(prop) === value) return true;
      seen.set(prop, value);
    }
  }
  return false;
}

function visualReorder(added) {
  return (
    /(?<![\w-])order\s*:\s*-?[1-9]\d*/i.test(added) ||
    /flex-direction\s*:\s*(?:row|column)-reverse/i.test(added) ||
    /flex-flow\s*:[^;{}]*(?:row|column)-reverse/i.test(added) ||
    /(?<![\w-])grid-(?:row|column)(?:-(?:start|end))?\s*:\s*\d/i.test(added)
  );
}

// Three rules that shipped in 0.2.0 are deliberately absent: `ease-in` on entrances,
// durations over 600ms, and `scale(0)` entrances. Each prescribed a value css-pro had
// picked on the developer's behalf, and none can be shown wrong. They were cut, not
// demoted — an advisory is an assertion with better manners.
