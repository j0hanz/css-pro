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

// --- engagement gate ------------------------------------------------------------
// Not rules. These decide whether a NON-stylesheet file is worth running the tables
// over at all; `runtime.mjs` is the only caller. They live here because a gate that
// engages wrongly is not a wasted millisecond — it drags the BLOCK table across a file
// holding no CSS and turns an ordinary write into a PreToolUse deny, so it needs to sit
// somewhere the self-test can import.

// In a .tsx file almost nothing is CSS. Engage only where styling actually lives, so
// the common case costs one regex and an exit.
export const STYLE_MARKERS =
  /(?:styled|css|keyframes|createGlobalStyle)\s*[.(`]|(?:style|css|sx)\s*=\s*\{\{|createStyles\s*\(|\bstyle\s*\(\s*\{|<style[\s>]|\bstyle\s*=\s*["']/;

// ...but an edit whose new_string holds only declarations — the usual way a styled block
// already on disk gets changed — carries no marker at all, and used to exit before a
// single rule ran. Matched narrowly on purpose. A bare `ident: ident` must NOT count:
// that is every `x: number` in a TypeScript interface, and admitting it means
// `Math.max(0, i-1)` in the same file reads as a malformed `calc()` and the write is
// refused. What does count is a property no unquoted JS key can be — hyphenated or
// `--` — or a value carrying a unit or a CSS function. Plain `transition` is named
// because `transition: all` is the one BLOCK trigger with neither.
export const DECLARATION =
  /^[ \t]*(?:--[\w-]+|[a-z]+(?:-[a-z]+)+|transition)[ \t]*:[ \t]*\S|:[ \t]*[^;{}\n]*(?:\d(?:px|r?em|%|vh|vw|dvh|vmin|vmax|ms|s|deg|fr|ch|pt)(?![\w-])|var\(|calc\(|clamp\()/im;

// --- the tables -----------------------------------------------------------------

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
    re: /(?<![\w-])(background|font|border|margin|padding|inset|transition|animation|overflow)(?!-[a-z-]*(?:radius|collapse|spacing|blend-mode|smooth(?:ing)?|wrap|anchor|clip-margin|trim|area)\b)-[a-z-]+\s*:[^{}]*;[^{}]*(?<![\w-])\1\s*:/i,
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
    fn: focusableMissingFocusVisible,
    msg: 'Interactive (`cursor: pointer`) but no `:focus-visible` rule targets this selector. Confirm a visible focus style reaches it — the UA ring alone may not survive a global outline reset. WCAG 2.4.7.',
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
    // The guard has to turn THIS off. A `prefers-reduced-motion` block anywhere in the
    // file used to silence this rule, so one reduced-motion rule for an unrelated
    // animation vouched for a smooth scroll nothing had ever guarded.
    absent: /scroll-behavior\s*:\s*auto/i,
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

// Every rule block, parents included. `BLOCK_RE` alone only ever matches an INNERMOST
// block — its body group cannot span a child's `{` — so the parent of any nested rule
// went unscanned, and the three block-scoped checks below silently skipped it. That is
// the normal shape of SCSS and Less, and now of plain CSS too.
// Each pass yields the current innermost layer and blanks it, selector and braces and
// all, so the layer above becomes innermost next time round. Blanking preserves length
// and newlines, so `m.index` and `bodyStartOf(m)` still index the original text; a
// blanked child leaves a run of spaces in its parent's body, which carries no `;` and
// so cannot read as one of the parent's declarations.
function* eachBlock(text) {
  for (let t = text; ;) {
    const layer = [...t.matchAll(BLOCK_RE)];
    if (!layer.length) return;
    yield* layer;
    t = t.replace(BLOCK_RE, (m) => m.replace(/[^\n]/g, ' '));
  }
}

const found = (at) => (at.length ? at : null);

// `--s-6` is ONE identifier: the `-6` is part of the name, not a subtraction. Blanking
// custom-property identifiers before the test is the whole fix — without it every token
// named `--s-1`, `--space-4`, `--z-10` made a valid `calc()` look malformed and the rule
// refused the write.
// `Math.` is excluded because `Math.max(0, i - 1)` and `Math.min(n-1, x)` are the same
// shape as a malformed `calc()` and read as one — every JS file that reaches this table
// has them, and a BLOCK finding there refuses a write holding no CSS at all.
const MATH_NO_SPACE =
  /(?<!Math\.)\b(?:calc|clamp|min|max)\([^;{})]*?(?:[\w%] ?[+-][\d.(]|\) ?[+-][\d.(]|[%\d][+-] )/gi;
const blankCustomIdents = (s) => s.replace(/--[\w-]+/g, (m) => '_'.repeat(m.length));

function mathWhitespace(added) {
  return found([...blankCustomIdents(added).matchAll(MATH_NO_SPACE)].map((m) => m.index));
}

function duplicateIdenticalDeclarations(added) {
  const at = [];
  for (const m of eachBlock(added)) {
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
  // Sorted because `eachBlock` walks innermost-first, not in source order, and `--json`
  // prints these in array order.
  return found(at.sort((a, b) => a - b));
}

const REORDER = [
  /(?<![\w-])order\s*:\s*-?[1-9]\d*/gi,
  /flex-direction\s*:\s*(?:row|column)-reverse/gi,
  /flex-flow\s*:[^;{}]*(?:row|column)-reverse/gi,
  // `1 / -1` spans every track from the first line to the last, and line 1 is where flow
  // would have put the item anyway. Neither can reorder anything, so neither is a signal
  // — only placement onto a later track is.
  /(?<![\w-])grid-(?:row|column)(?:-(?:start|end))?\s*:\s*(?!1\b)\d+(?!\s*\/\s*-1)/gi,
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
// BL !== BR. The slash form `h / v` carries a separate vertical-radius set that
// flips on its own, so a uniform horizontal half with an asymmetric vertical half
// (`10px / 0 10px`) still contradicts the logical edge — check both halves.
// Three values `a b c` are TL=a TR=b BR=c BL=b, so BL !== BR (b !== c) flips too.
function flipsInRtl(value) {
  return value.split('/').some((half) => {
    const [a, b, c, d] = half.trim().split(/\s+/);
    if (b === undefined) return false; // one value: uniform
    if (d === undefined) return a !== b || (c !== undefined && b !== c); // 2 or 3
    return a !== b || d !== c; // 4
  });
}

function directionBlindRadius(added) {
  const at = [];
  for (const m of eachBlock(added)) {
    if (!INLINE_LOGICAL.test(m[2])) continue;
    const r = RADIUS.exec(m[2]);
    if (r && flipsInRtl(r[1])) at.push(bodyStartOf(m) + r.index);
  }
  return found(at.sort((a, b) => a - b));
}

// An interactive control (`cursor: pointer`) the author has not wired into any
// :focus-visible rule. Fires only when the file already uses :focus-visible —
// a sheet that does no focus styling at all is a different conversation, and a
// blanket rule here would fire on every button-styled div. Native-focusable
// elements (a, button, summary) carry a UA focus ring by default, so this is
// confirm-not-fix: a global outline reset may have killed it.
function focusableMissingFocusVisible(added) {
  if (!/:focus-visible/i.test(added)) return null;
  const focused = new Set();
  const cursorBlocks = [];
  for (const m of eachBlock(added)) {
    if (m[1].includes(':focus-visible'))
      for (const part of m[1].split(',')) focused.add(baseOfSelector(part));
    if (/(?<![\w-])cursor\s*:\s*pointer/i.test(m[2])) cursorBlocks.push(m);
  }
  if (focused.has('*')) return null; // a universal :focus-visible covers all
  const at = [];
  for (const m of cursorBlocks)
    if (!m[1].split(',').some((part) => focused.has(baseOfSelector(part)))) at.push(bodyStartOf(m));
  return found(at.sort((a, b) => a - b));
}

// The rightmost compound's base: strip pseudo-elements, pseudo-classes (with
// their args), and attribute selectors; split on combinators (incl. the
// descendant space); take the last piece. `.parent .child:hover` -> `.child`,
// `summary` -> `summary`, `*` -> `*`.
// ponytail: does not flatten :is()/:where()/:not() args — a cursor on
// `.x:is(.a,.b)` reads as base `.x`, so a `:focus-visible` on `.a` would not
// cover it. A space inside a pseudo-function also mis-splits. ADVISE-tier
// hedge covers the gap; full pseudo-function parsing is the upgrade path.
function baseOfSelector(sel) {
  const last = sel
    .trim()
    .split(/\s*[>+~]\s*|\s+/)
    .pop();
  return (
    last
      .replace(/::?[\w-]+(\([^)]*\))?/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .trim()
      .toLowerCase() || '*'
  );
}
