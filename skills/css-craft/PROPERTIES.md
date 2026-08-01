# Custom properties

**Custom property** — `--name: value`, read back with `var()`. File cover: declaring, substituting, typing, driving them. Compressing declarations: see [`SHORTHAND.md`](SHORTHAND.md). Process: see [`SKILL.md`](SKILL.md).

## Declare and use

```css
:root {
  --color-primary: #005cbf;
  --space-md: 1rem;
}
.button {
  background: var(--color-primary);
  padding: var(--space-md);
}
```

`var(--name)` substitute the value. Names **case-sensitive** (`--My-Color` ≠ `--my-color`), begin `--`. `var()` works inside property values only — not property names, not selectors, not inside media/container queries. Media query can _re-point_ custom property (see Responsive), just cannot _read_ one.

## Scope and the cascade

Custom property declared on selector scoped to that selector and its descendants. `:root` global home (the `<html>` element, high specificity). Redeclared on descendant, **overrides** global for that subtree — descendants inherit local value. Whole mechanism for theming.

```css
:root {
  --text-color: #222;
  --bg: #fff;
}
.sidebar {
  --text-color: #f0f0f0;
  --bg: #333;
  color: var(--text-color);
  background: var(--bg);
}
```

Everything inside `.sidebar` use sidebar's values; everything else `:root`. One override, no duplication.

## Group by function on :root

One canonical block, grouped. Home of system's values.

```css
:root {
  /* Color */
  --color-primary: #005cbf;
  --color-danger: #dc3545;
  --color-text: #212529;
  --color-bg: #fff;

  /* Type */
  --font-body: -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: SFMono-Regular, Menlo, Consolas, monospace;
  --font-size-sm: 0.875rem;
  --font-size-lg: 1.25rem;

  /* Spacing (scale) */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 3rem;

  /* Layout */
  --radius: 0.25rem;
  --shadow-sm: 0 0.125rem 0.25rem rgb(0 0 0 / 0.08);
  --header-h: 80px;
  --sidebar-w: 250px;
}
```

## Fallbacks

`var(--name, fallback)` use the fallback when custom property undefined or invalid-at-computed-time. Fallback is everything after first comma, so `var(--foo, red, blue)` is one fallback of `red, blue`, not two.

```css
.alert {
  background: var(--alert-color, steelblue);
} /* one fallback */
.btn {
  background: var(--accent, var(--color-primary, #005cbf));
} /* chained */
.bad {
  background: var(--accent, --color-primary, #005cbf);
} /* WRONG: '--color-primary, #005cbf' is the literal fallback */
```

Chains work but cost parse time (browser resolve each `var()`); keep to two levels. Fallbacks cover graceful degradation when custom property absent or invalid — they don't patch _unsupported_ custom properties, where whole `var()` ignored.

## @property — typed, inherit-controlled, animatable

Plain `--name: value` untyped: browser accept nearly anything, discover it wrong only when `var()` substitute it into a property — property then fall to its inherited or initial value, not your intent. `@property` register it with type, inheritance flag, initial value.

```css
@property --gradient-stop {
  syntax: '<color>';
  inherits: false;
  initial-value: #3f87a6;
}
```

Three reasons to register:

- **Type safety** — value failing the `syntax` (e.g. `2rem` for `<color>`) fall back to `initial-value`, not to property's default. Custom property cannot silently break property it's used in.
- **Controlled inheritance** — `inherits: false` stop it inheriting, so parent's value don't leak into children that should use the initial. Plain custom property always inherits; `@property` only off switch.
- **Animation** — browser only interpolate custom property whose type it knows.

```css
@property --gradient-stop {
  syntax: '<color>';
  inherits: false;
  initial-value: #3f87a6;
}
.bar {
  background: linear-gradient(to right, var(--gradient-stop), #ebf8e1);
  transition: --gradient-stop 0.4s ease;
}
.bar:hover {
  --gradient-stop: #f69d3c;
} /* smooth, because it is typed */
```

`syntax` take the CSS value types — `<color>`, `<length>`, `<percentage>`, `<integer>`, `<number>`, `<angle>`, `<time>`, `<url>`, and `*` (any value, which defeats typing). `inherits` required (`true` / `false`). `initial-value` required unless `syntax` is `*`.

Two limits and one exemption:

- **`initial-value` restricted** — no `rem`/`em`, no `clamp()`, no other custom properties. `px` and `calc()` with viewport units allowed (`initial-value: calc(18px + 1.5vi)`). Workaround: conservative `px` in `@property`, real dynamic value assigned normally in `:root`.
- **Don't register component API props** — prop meant to stay _undefined_ so `var(--button-bg, var(--color-primary))` fall through must not get `initial-value`; registration would fill it and kill the fallback.
- `@property` cross-browser since mid-2024; treat as progressive enhancement where old Firefox matters.

## Three computation gotchas

How browser computes these values — each produce a "why is my value missing" bug:

- **Invalid at computed-value time (IACVT)** — `var()` substituting an invalid value cannot fall back to an _earlier cascaded declaration_; those were discarded at parse time. Property fall to its inherited or initial value instead.
- **Unsupported unit poisons the whole value** — `clamp(1.25rem, var(--fluid, 5cqi), 2.5rem)` in browser without `cqi` doesn't use the bounds; whole `font-size` IACVT, falls to `medium`. Gate modern units behind `@supports (font-size: 1cqi)`.
- **Computed values immutable on inheritance** — value computed on `:root` computes _once_; redefining its inputs on a descendant does not recompute it. Do the math where it's consumed: `font-size: calc(var(--size-adjust, 1) * var(--size));`.

Safety net beyond the type-matched fallback: `@property` `initial-value`.

## Responsive — change the inputs, not the logic

Put layout math in once, against custom properties; in the media query, re-point only those properties. Logic never re-opens.

```css
:root {
  --header-h: 80px;
  --sidebar-w: 250px;
  --gutter: 2rem;
}
.main {
  height: calc(100vh - var(--header-h));
  width: calc(100% - var(--sidebar-w) - var(--gutter));
}
@media (max-width: 768px) {
  :root {
    --sidebar-w: 0;
    --gutter: 1rem;
  } /* .main's math is unchanged */
}
```

`calc()` compose them freely; media queries cannot _read_ `var()` but can freely _re-declare_ — that's the move.

### Fluid values — clamp the value, skip the query

Recipes for values adapting on their own; prefer these before re-pointing in any query:

```css
:root {
  --font-size-h1: clamp(
    1.75rem,
    4vw + 1rem,
    3rem
  ); /* the +1rem keeps browser zoom / text resize working (WCAG 1.4.4) */
  --padding-section: clamp(
    1.5rem,
    6%,
    3rem
  ); /* % padding is relative to element inline size — contextual free */
  --space-section: max(8vh, 2rem); /* viewport-proportional but floored — safe at 400% zoom */
  --flow-space: min(4rem, 8vh);
}
.flow > * + * {
  margin-block-start: var(--flow-space);
}
```

### Container queries — respond to the component's space, not the viewport

Media queries ask "how wide is the screen"; component in a sidebar need "how wide am I". Name the container, query it, re-point exactly as with media queries:

```css
.card-slot {
  container: card / inline-size;
}
@container card (inline-size > 35ch) {
  .card {
    --card-direction: row;
    --card-gap: 2rem;
  }
}
```

- Size queries need `container-type: inline-size` (or the `container: name / inline-size` shorthand) on an _ancestor_ — element cannot size-query itself.
- Range syntax works: `@container (30ch <= inline-size <= 60ch)`.
- Container units `cqi` / `cqw` make values fluid to the container: `font-size: clamp(1.25rem, 5cqi, 2rem)`. Trap: in browser without support, a cq unit inside a custom-property value invalidates the whole value — guard with `@supports (font-size: 1cqi)`.
- Style queries — `@container style(--theme: dark) { ... }` — branch on a value; Chromium-only, treat as enhancement.
- Known bug: Safari 16.4 collapse widths when `auto-fit` grid children get containment — test there.

Prefer container query over media query whenever trigger is "this component got narrow", not "this device is small".

## Theming — override on a selector

Themes are scoped overrides: re-declare under `[data-theme]` / a class on `:root` / `html` / `body`, cascade reapplies every consumer; toggle the attribute (JS `setProperty` / remove) to swap. Put `transition` on the _consuming_ properties for smooth change — you cannot transition an unregistered custom property, so one that must animate its own value needs `@property` first.

## JS — live read and write

They live in the DOM, so JS read and write them like any style.

```js
const root = document.documentElement;
root.style.setProperty('--color-primary', '#ff6347'); // set
getComputedStyle(root).getPropertyValue('--color-primary').trim(); // get (computed)
el.style.getPropertyValue('--my-var'); // get inline only
```

Seam for live theming, color pickers, pointer-driven values (`--mouse-x`, `--mouse-y`). `getPropertyValue` often return leading whitespace — `.trim()` it.
