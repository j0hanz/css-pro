// The rule table for css-pro.
// Every rule asserts something that can be shown wrong — a spec violation, a performance problem, or an accessibility issue.
// The rule table is a list of objects, each with a `re` regex and a `msg` string.
// The regex is tested against the added CSS, and if it matches, the message is reported.
// Some rules have a `when` array of regexes that must all match, and an `absent` regex that must not match.
// Some rules have a `fn` function that takes the added CSS and returns either `null` (clean)
// or a NON-EMPTY array of match indices — never `[]`, which is truthy and would report a
// clean file. The indices let the whole-file audit print `file:line` for every occurrence;
// the per-edit hook only needs the truthiness.
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
    re: /(?<![\w-])transition(?:-property)?\s*:[^;{}]*(?<![-\w])(?:(?:min|max)-(?:width|height|inline-size|block-size)|width|height|inline-size|block-size|margin|padding|inset|top|left|right|bottom|(?:(?:row|column)-)?gap)\b/i,
    msg: 'Transitioning a layout property runs layout and paint on every frame, on the main thread. Animate `transform` or `opacity` instead.',
  },
  {
    // `calc()` is a CSS expression, not a math parser. `calc(1px+1px)` is invalid and the
    // whole declaration is dropped. `calc(1px + 1px)` is valid and works. The same goes
    // for `clamp()`, `min()`, and `max()`.
    fn: mathWhitespace,
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
    // Not reachable by the rule above: smooth scrolling carries no @keyframes, no
    // transition, and no transform token, yet it is interaction-triggered movement of
    // the whole viewport — the most common unguarded vestibular trigger in a stylesheet.
    when: [/scroll-behavior\s*:\s*smooth/i],
    absent: /prefers-reduced-motion/i,
    msg: 'Smooth scrolling is interaction-triggered movement of the whole viewport (WCAG 2.3.3) and a common vestibular trigger. Add `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto } }`. Ignore if handled globally.',
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
    fn: directionBlindRadius,
    msg: 'This block sets a logical inline edge but a `border-radius` whose left and right corners differ. The edge flips in RTL, the corners do not, so the rail and the square corners end up on opposite sides. Use `border-start-start-radius` / `border-end-start-radius`, or make the radius uniform.',
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
// Each returns `null` or a non-empty array of indices into `added`. Returning `[]`
// would be truthy and report a clean file, so every one of these guards that.

// The separator is a LOOKBEHIND, not a capture. Consuming it meant a match ate the `}`
// that the next block needed to anchor against, so back-to-back rules — the normal shape
// of a stylesheet — were scanned every other one, and half of every block-scoped check
// was silently skipped.
const BLOCK_RE = /(?<=^|[;{}])\s*([^{};]+)\{([^{}]*)\}/g;

// A block's body ends just before the closing `}` that terminates the match.
const bodyStartOf = (m) => m.index + m[0].length - 1 - m[2].length;

const found = (at) => (at.length ? at : null);

// `--s-6` is ONE identifier: the `-6` is part of the name, not a subtraction. Blanking
// custom-property identifiers before the test is the whole fix — without it every token
// named `--s-1`, `--space-4`, `--z-10` made a valid `calc()` look malformed and the rule
// refused the write.
const MATH_NO_SPACE =
  /\b(?:calc|clamp|min|max)\([^;{})]*?(?:[\w%] ?[+-][\d.(]|\)[+-][\d.(]|[%\d][+-] )/gi;
const blankCustomIdents = (s) => s.replace(/--[\w-]+/g, (m) => '_'.repeat(m.length));

function mathWhitespace(added) {
  return found([...blankCustomIdents(added).matchAll(MATH_NO_SPACE)].map((m) => m.index));
}

function duplicateIdenticalDeclarations(added) {
  const at = [];
  for (const m of added.matchAll(BLOCK_RE)) {
    const seen = new Map();
    let offset = bodyStartOf(m);
    for (const decl of m[2].split(';')) {
      const idx = decl.indexOf(':');
      const prop = idx === -1 ? '' : decl.slice(0, idx).trim().toLowerCase();
      if (prop && !prop.startsWith('--')) {
        const value = decl
          .slice(idx + 1)
          .trim()
          .toLowerCase();
        // If the same property is set to the same value twice in one block, the first is dead.
        if (seen.get(prop) === value) at.push(offset + decl.search(/\S/));
        seen.set(prop, value);
      }
      offset += decl.length + 1; // + the ';' that split consumed
    }
  }
  return found(at);
}

const REORDER = [
  /(?<![\w-])order\s*:\s*-?[1-9]\d*/gi,
  /flex-direction\s*:\s*(?:row|column)-reverse/gi,
  /flex-flow\s*:[^;{}]*(?:row|column)-reverse/gi,
  // `1 / -1` spans every track from the first line to the last. Spanning the whole grid
  // cannot reorder anything, so it is not a signal — only an explicit numbered track is.
  /(?<![\w-])grid-(?:row|column)(?:-(?:start|end))?\s*:\s*\d+(?!\s*\/\s*-1)/gi,
];

function visualReorder(added) {
  const at = [];
  for (const re of REORDER) for (const m of added.matchAll(re)) at.push(m.index);
  return found(at.sort((a, b) => a - b));
}

// A logical inline edge flips under `direction: rtl`; `border-radius` corners are
// physical and do not. A block that sets both, with corners that differ left-to-right,
// contradicts itself — the author asked for a direction-aware edge and a direction-blind
// radius. Uniform radii are direction-agnostic and never fire.
const INLINE_LOGICAL = /(?<![\w-])(?:border|padding|margin|inset)-inline(?:-(?:start|end))?\s*:/i;
const RADIUS = /(?<![\w-])border-radius\s*:\s*([^;}]+)/i;

// `border-radius: a b c d` is TL TR BR BL. Left and right differ when TL !== TR or
// BL !== BR. One value is uniform; two and three set TL=a and TR=b.
function flipsInRtl(value) {
  const [a, b, c, d] = value.split('/')[0].trim().split(/\s+/);
  if (b === undefined) return false;
  if (d === undefined) return a !== b; // 2 or 3 values: TL=a, TR=b
  return a !== b || d !== c;
}

function directionBlindRadius(added) {
  const at = [];
  for (const m of added.matchAll(BLOCK_RE)) {
    if (!INLINE_LOGICAL.test(m[2])) continue;
    const r = RADIUS.exec(m[2]);
    if (r && flipsInRtl(r[1])) at.push(bodyStartOf(m) + r.index);
  }
  return found(at);
}
