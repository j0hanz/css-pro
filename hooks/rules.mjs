// The rule table for css-pro.
// Every rule asserts something that can be shown wrong — a spec violation, a performance problem, or an accessibility issue.
// The rule table is a list of objects, each with a `re` regex and a `msg` string.
// The regex is tested against the added CSS, and if it matches, the message is reported.
// Some rules have a `when` array of regexes that must all match, and an `absent` regex that must not match.
// Some rules have a `fn` function that takes the added CSS and returns true if the rule is violated.
// A rule with a `files` regex runs only on paths it matches.
// ADVISE is ordered by severity: the runtime shows the first three hits and withholds the rest.

export const BLOCK = [
  {
    re: /transition(?:-property)?\s*:\s*all\b/i,
    msg: '`transition: all` animates every property, including ones you did not intend and ones that force layout. Name the properties that change.',
  },
  {
    re: /z-index\s*:\s*(?:9{4,}|2147483647)\b/i,
    msg: 'A `z-index` of 9999+ is not a stacking decision, it is a bid to win one. Use the project’s z-index scale or a token.',
  },
  {
    re: /(?<![\w-])transition(?:-property)?\s*:[^;{}]*(?<![-\w])(?:(?:min|max)-(?:width|height)|width|height|margin|padding|top|left)\b/i,
    msg: 'Transitioning a layout property runs layout and paint on every frame, on the main thread. Animate `transform` or `opacity` instead.',
  },
  {
    // `calc()` is a CSS expression, not a math parser. `calc(1px+1px)` is invalid and the
    // whole declaration is dropped. `calc(1px + 1px)` is valid and works. The same goes
    // for `clamp()`, `min()`, and `max()`.
    re: /\b(?:calc|clamp|min|max)\([^;{})]*?(?:[\w%] ?[+-][\d.(]|\)[+-][\d.(]|[%\d][+-] )/i,
    msg: '`calc()` requires whitespace around `+` and `-`. Without it the expression is invalid and the whole declaration is dropped.',
  },
  {
    re: /var\(\s*--[\w-]+\s*,\s*--[\w-]/i,
    msg: 'In `var(--a, --b)` the `--b` is literal fallback *text*, not a token reference. Nest it: `var(--a, var(--b))`.',
  },
  {
    re: /\bokl(?:ch|ab)\(\s*(?:[2-9]\d*|1\d+|1\.\d*[1-9])(?:\.\d+)?(?![\d.%])/i,
    msg: '`oklch()` and `oklab()` lightness is 0–1, or a percentage. A bare value above 1 silently clamps and gives you the wrong colour.',
  },
  {
    re: /(?<![\w-])(background|font|border)(?!-[a-z-]*(?:radius|collapse|spacing|blend-mode|smooth(?:ing)?)\b)-[a-z-]+\s*:[^{}]*;[^{}]*(?<![\w-])\1\s*:/i,
    msg: 'A longhand set before its shorthand is discarded — the shorthand resets every longhand it omits. Fold it in, or move it after.',
  },
  {
    fn: duplicateIdenticalDeclarations,
    msg: 'The same property is set twice to the same value in one block. The first is dead.',
  },
];

export const ADVISE = [
  {
    when: [/outline\s*:\s*(?:none|0)\b/i],
    absent: /:focus-visible/i,
    msg: 'Removing the outline with no `:focus-visible` in this file leaves keyboard users with no visible focus (WCAG 2.4.7). Replace it, do not just remove it.',
  },
  {
    when: [
      /@keyframes|(?<![\w-])(?:animation|transition)(?:-[a-z]+)?\s*:/i,
      /\btransform\s*:|translate|rotate|(?<![a-z])scale/i,
    ],
    absent: /prefers-reduced-motion/i,
    msg: 'Motion added with no `prefers-reduced-motion` in this file (WCAG 2.3.3). Fewer and gentler, not none — keep fades, drop movement. Ignore if handled globally.',
  },
  {
    re: /(?<![\w-])animation(?:-iteration-count)?\s*:[^;{}]*(?<![\w-])infinite\b/i,
    msg: 'An animation that repeats forever falls under WCAG 2.2.2: moving content past five seconds needs a way to pause, stop, or hide it. Brief loading indicators that leave on their own are fine.',
  },
  {
    fn: visualReorder,
    msg: 'Visual order now differs from DOM order, so keyboard and screen-reader users get a different sequence (WCAG 1.3.2, 2.4.3). Confirm focus order still reads correctly — this may be entirely correct.',
  },
  {
    when: [/:hover[^{}]*\{[^{}]*transform\s*:/i],
    absent: /@media[^{]*\bhover\s*:\s*hover/i,
    msg: 'Touch devices fire `:hover` on tap, so this motion plays on every touch and sticks. Gate with `@media (hover: hover) and (pointer: fine)`. Ignore if gated globally.',
  },
  {
    when: [/light-dark\(/i],
    absent: /color-scheme\s*:/i,
    msg: '`light-dark()` needs `color-scheme` to resolve; without it the first argument wins permanently. Ignore if set globally.',
  },
  {
    re: /(?<![\w-])(?:min-|max-)?height\s*:\s*100vh\b/i,
    msg: '`100vh` does not account for mobile browser chrome, so the element overflows and jumps as the address bar hides. `100dvh` tracks the visible viewport.',
  },
  {
    re: /(?<![\w-])(?:min-|max-)?width\s*:\s*100vw\b/i,
    msg: '`100vw` includes the space under a classic scrollbar, so any page with a vertical scrollbar overflows horizontally. `100%` of the containing block does not.',
  },
  {
    re: /(?<![\w-])transition(?:-property)?\s*:[^;{}]*(?<![-\w])box-shadow\b/i,
    msg: 'Transitioning `box-shadow` repaints the element on every frame. Put the shadow on a pseudo-element and transition its `opacity` instead.',
  },
  {
    re: /will-change\s*:[^;{}]*,[^;{}]*,/i,
    msg: '`will-change` listing three or more properties asks the browser to keep every one optimisation-ready, which holds memory and can be slower than no hint. Hint only what actually animates.',
  },
  {
    // Preprocessor @import compiles away; only plain CSS pays at runtime.
    files: /\.css$/i,
    re: /@import\b/i,
    msg: '`@import` is discovered only after this sheet downloads, then fetched serially, delaying first paint. Use another `<link>`, or ignore if a bundler inlines it.',
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
      // If the same property is set to the same value twice in one block, the first is dead.
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
