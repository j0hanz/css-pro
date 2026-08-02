export const STYLE_MARKERS =
  /(?:styled|css|keyframes|createGlobalStyle)\s*[.(`]|(?:style|css|sx)\s*=\s*\{\{|createStyles\s*\(|\bstyle\s*\(\s*\{|<style[\s>]|\bstyle\s*=\s*["']/;

export const CUSTOM_PROPERTY_DECLARED = String.raw`(--[A-Za-z0-9_-]+["']?[ \t]*:)|(@property[ \t]+--[A-Za-z0-9_-]+)|(setProperty\([ \t]*["']--[A-Za-z0-9_-]+)`;

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
    fn: mathMissingWhitespace,
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

export function parseRules(text) {
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
    const afterSemicolon = raw.lastIndexOf(';') + 1;
    const tail = raw.slice(afterSemicolon);
    const head = tail.trim();
    const at = start + afterSemicolon + tail.match(/^\s*/)[0].length;
    const sel = prefix ? (head ? `${prefix} ${head}` : prefix) : head;
    const cond = head.startsWith('@') ? (atRules ? `${atRules} ${head}` : head) : atRules;
    i++;
    const segs = [];
    let hasNested = false;
    while (i < text.length && text[i] !== '}') {
      let j = i;
      while (j < text.length && text[j] !== '{' && text[j] !== '}') j++;
      if (j >= text.length || text[j] === '}') {
        segs.push({ at: i, text: text.slice(i, j) });
        i = j;
        break;
      }
      hasNested = true;
      const seg = text.slice(i, j);
      const semi = seg.lastIndexOf(';');
      if (semi >= 0) segs.push({ at: i, text: seg.slice(0, semi + 1) });
      const nestedSel = (semi >= 0 ? seg.slice(semi + 1) : seg).trim();
      i = j;
      const nestedIsAtRule = nestedSel.startsWith('@');
      block(
        nestedIsAtRule || !nestedSel ? sel : `${sel} ${nestedSel}`,
        nestedIsAtRule ? (cond ? `${cond} ${nestedSel}` : nestedSel) : cond,
      );
    }
    const body = segs.map((s) => s.text).join('');
    if (hasNested ? body.replace(/[;\s]/g, '') !== '' : true)
      out.push({ selector: sel, context: cond ?? '', body, segs, at, line: 0 });
    if (text[i] === '}') i++;
  }
  while (i < text.length) block('', '');
  return out;
}

export function bodyOffset(rule, k) {
  for (const s of rule.segs) {
    if (k < s.text.length) return s.at + k;
    k -= s.text.length;
  }
  return rule.at;
}

const globalize = (re) => new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');

export function runRules(rules, text, path, readFile = () => text) {
  const out = [];
  for (const rule of rules) {
    if (rule.files && !rule.files.test(path)) continue;
    if (rule.fn) {
      const at = rule.fn(text, readFile);
      if (at.length) out.push({ msg: rule.msg, at });
      continue;
    }
    if (rule.re) {
      const at = [...text.matchAll(globalize(rule.re))].map((m) => m.index);
      if (at.length) out.push({ msg: rule.msg, at });
      continue;
    }
    if (!rule.when.every((w) => w.test(text))) continue;
    const file = readFile();
    if (file === null || rule.absent.test(file)) continue;
    out.push({ msg: rule.msg, at: [globalize(rule.when[0]).exec(text).index] });
  }
  return out;
}

const MATH_NO_SPACE =
  /(?<!Math\.)\b(?:calc|clamp|min|max)\([^;{})]*?(?:[\w%] ?[+-][\d.(]|\) ?[+-][\d.(]|[%\d][+-] )/gi;
const blankCustomIdents = (s) => s.replace(/--[\w-]+/g, (m) => '_'.repeat(m.length));

function mathMissingWhitespace(added) {
  return [...blankCustomIdents(added).matchAll(MATH_NO_SPACE)].map((m) => m.index);
}

function duplicateIdenticalDeclarations(added) {
  const at = [];
  for (const rule of parseRules(added)) {
    const seen = new Map();
    let k = 0;
    for (const decl of rule.body.split(';')) {
      const idx = decl.indexOf(':');
      const prop = idx === -1 ? '' : decl.slice(0, idx).trim().toLowerCase();
      if (prop && !prop.startsWith('--')) {
        const value = decl
          .slice(idx + 1)
          .trim()
          .toLowerCase();
        if (seen.get(prop) === value) at.push(bodyOffset(rule, k + decl.search(/\S/)));
        seen.set(prop, value);
      }
      k += decl.length + 1;
    }
  }
  return at.sort((a, b) => a - b);
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
  return at.sort((a, b) => a - b);
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
  for (const rule of parseRules(added)) {
    if (!INLINE_LOGICAL.test(rule.body)) continue;
    const r = RADIUS.exec(rule.body);
    if (r && flipsInRtl(r[1])) at.push(bodyOffset(rule, r.index));
  }
  return at.sort((a, b) => a - b);
}

function splitTopLevel(s, stop) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
    else if (depth === 0 && stop(c)) {
      if (i > start) parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  if (s.length > start) parts.push(s.slice(start));
  return parts;
}

const splitSelectorList = (s) => splitTopLevel(s, (c) => c === ',');

function focusableMissingFocusVisible(added, readFile) {
  if (!/:focus-visible/i.test(added)) return [];
  const scope = readFile?.() ?? added;
  const focused = new Set();
  for (const rule of parseRules(scope))
    if (rule.selector.includes(':focus-visible'))
      for (const part of splitSelectorList(rule.selector)) focused.add(baseOfSelector(part));
  if (focused.has('*')) return [];
  const at = [];
  for (const rule of parseRules(added))
    if (
      /(?<![\w-])cursor\s*:\s*pointer/i.test(rule.body) &&
      !splitSelectorList(rule.selector).some((part) => focused.has(baseOfSelector(part)))
    )
      at.push(rule.at);
  return at.sort((a, b) => a - b);
}

function baseOfSelector(sel) {
  const parts = splitTopLevel(
    sel.trim(),
    (c) => c === '>' || c === '+' || c === '~' || /\s/.test(c),
  );
  const last = parts.length ? parts[parts.length - 1] : '';
  return (
    last
      .replace(/::?[\w-]+(\([^)]*\))?/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .trim()
      .toLowerCase() || '*'
  );
}
