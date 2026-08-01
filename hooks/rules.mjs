export const STYLE_MARKERS =
  /(?:styled|css|keyframes|createGlobalStyle)\s*[.(`]|(?:style|css|sx)\s*=\s*\{\{|createStyles\s*\(|\bstyle\s*\(\s*\{|<style[\s>]|\bstyle\s*=\s*["']/;

export const DECLARATION =
  /^[ \t]*(?:--[\w-]+|[a-z]+(?:-[a-z]+)+|transition)[ \t]*:[ \t]*\S|:[ \t]*[^;{}\n]*(?:\d(?:px|r?em|%|vh|vw|dvh|vmin|vmax|ms|s|deg|fr|ch|pt)(?![\w-])|var\(|calc\(|clamp\()/im;

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
    when: [/scroll-behavior\s*:\s*smooth/i],
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
    files: /\.css$/i,
    re: /@import\b/i,
    msg: '`@import` is discovered only after this sheet downloads, then fetched serially, delaying first paint. Use another `<link>`, or ignore if a bundler inlines it.',
  },
];

const BLOCK_RE = /(?<=^|[;{}])([^{};]+)\{([^{}]*)\}/g;

const bodyStartOf = (m) => m.index + m[0].length - 1 - m[2].length;

function* eachBlock(text) {
  for (let t = text; ;) {
    const layer = [...t.matchAll(BLOCK_RE)];
    if (!layer.length) return;
    yield* layer;
    t = t.replace(BLOCK_RE, (m) => m.replace(/[^\n]/g, ' '));
  }
}

const found = (at) => (at.length ? at : null);

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
        if (seen.get(prop) === value) at.push(offset + decl.search(/\S/));
        seen.set(prop, value);
      }
      offset += decl.length + 1;
    }
  }
  return found(at.sort((a, b) => a - b));
}

const REORDER = [
  /(?<![\w-])order\s*:\s*-?[1-9]\d*/gi,
  /flex-direction\s*:\s*(?:row|column)-reverse/gi,
  /flex-flow\s*:[^;{}]*(?:row|column)-reverse/gi,
  /(?<![\w-])grid-(?:row|column)(?:-(?:start|end))?\s*:\s*(?!1\b)\d+(?!\s*\/\s*-1)/gi,
];

function visualReorder(added) {
  const at = [];
  for (const re of REORDER) for (const m of added.matchAll(re)) at.push(m.index);
  return found(at.sort((a, b) => a - b));
}

const INLINE_LOGICAL = /(?<![\w-])(?:border|padding|margin|inset)-inline(?:-(?:start|end))?\s*:/i;
const RADIUS = /(?<![\w-])border-radius\s*:\s*([^;}]+)/i;

function flipsInRtl(value) {
  return value.split('/').some((half) => {
    const [a, b, c, d] = half.trim().split(/\s+/);
    if (b === undefined) return false;
    if (d === undefined) return a !== b || (c !== undefined && b !== c);
    return a !== b || d !== c;
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

function focusableMissingFocusVisible(added) {
  if (!/:focus-visible/i.test(added)) return null;
  const focused = new Set();
  const cursorBlocks = [];
  for (const m of eachBlock(added)) {
    if (m[1].includes(':focus-visible'))
      for (const part of m[1].split(',')) focused.add(baseOfSelector(part));
    if (/(?<![\w-])cursor\s*:\s*pointer/i.test(m[2])) cursorBlocks.push(m);
  }
  if (focused.has('*')) return null;
  const at = [];
  for (const m of cursorBlocks)
    if (!m[1].split(',').some((part) => focused.has(baseOfSelector(part)))) at.push(bodyStartOf(m));
  return found(at.sort((a, b) => a - b));
}

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
