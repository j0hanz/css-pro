# Tokens

A **token** is a custom property — `--name: value` — referred to with `var()`. This is the custom-property layer: declaring, substituting, typing, and driving custom properties. For naming and which tokens to swap for theming, see **designer**; for compressing declarations, see [`SHORTHAND.md`](SHORTHAND.md); for the process, see [`SKILL.md`](SKILL.md).

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

`var(--name)` substitutes the value. Names are **case-sensitive** (`--My-Color` ≠ `--my-color`) and begin with `--`. You cannot use `var()` for property names, selectors, or inside media/container queries — only inside property values. A media query can _re-point_ a token (see Responsive); it just cannot _read_ one.

## Scope and the cascade

A token declared on a selector is scoped to that selector and its descendants. `:root` is the global home (the `<html>` element, high specificity). A token redeclared on a descendant **overrides** the global for that subtree — descendants inherit the local value. This is the whole mechanism for theming.

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

Everything inside `.sidebar` uses the sidebar's values; everything else uses `:root`. One override, no duplication.

## Group by function on :root

One canonical block, grouped. This is the home of the system's values.

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

`var(--name, fallback)` uses the fallback when the token is undefined or invalid-at-computed-time. The fallback is everything after the first comma, so `var(--foo, red, blue)` is a fallback of `red, blue` — one value, not two.

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

Chains work but cost parse time (the browser resolves each `var()`); keep them to two levels. Fallbacks cover graceful degradation when a token is absent or invalid — they do not patch _unsupported_ custom properties, where the whole `var()` is ignored.

## @property — typed, inherit-controlled, animatable

A plain `--token: value` is untyped: the browser accepts nearly anything as valid and only discovers it is wrong when `var()` substitutes it into a property — at which point the property falls back to its inherited or initial value, not your intent. `@property` registers the token with a type, an inheritance flag, and an initial value, which fixes that and more.

```css
@property --gradient-stop {
  syntax: '<color>';
  inherits: false;
  initial-value: #3f87a6;
}
```

Three reasons to register:

- **Type safety** — a value that fails the `syntax` (e.g. `2rem` for a `<color>`) falls back to `initial-value`, not to the property's default. The token cannot silently break the property it is used in.
- **Controlled inheritance** — `inherits: false` stops a token from inheriting, so a parent's value does not leak into children that should use the initial. A plain `--token` always inherits; `@property` is the only off switch.
- **Animation** — the browser can only _interpolate_ a token it knows the type of. A plain `--gradient-stop` between two colors snaps; a registered `<color>` one transitions smoothly. Register any token you put in a `transition` or `@keyframes` animation.

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

`syntax` accepts the CSS value types — `<color>`, `<length>`, `<percentage>`, `<integer>`, `<number>`, `<angle>`, `<time>`, `<url>`, and `*` (any value, which defeats typing). `inherits` is required (`true` / `false`). `initial-value` is required unless `syntax` is `*`.

Two limits and one exemption:

- **`initial-value` is restricted** — no `rem`/`em`, no `clamp()`, no other custom properties. `px` and `calc()` with viewport units are allowed (`initial-value: calc(18px + 1.5vi)`). Workaround: conservative `px` in `@property`, real dynamic value assigned normally in `:root`.
- **Don't register component API props** — a prop meant to stay _undefined_ so `var(--button-bg, var(--color-primary))` falls through must not get an `initial-value`; registration would fill it and kill the fallback.
- `@property` is cross-browser since mid-2024; treat as progressive enhancement where old Firefox matters.

## Three computation gotchas

How the browser computes token values — each one produces a "why is my value missing" bug:

- **Invalid at computed-value time (IACVT)** — a `var()` that substitutes an invalid value cannot fall back to an _earlier cascaded declaration_ (those were discarded at parse time). The property falls to its inherited or initial value instead. `color: blue; color: var(--broken);` gives you inherited color, not blue.
- **Unsupported unit poisons the whole value** — `clamp(1.25rem, var(--fluid, 5cqi), 2.5rem)` in a browser without `cqi` doesn't use the bounds; the whole `font-size` is IACVT and falls to `medium`. Gate modern units behind `@supports (font-size: 1cqi)`.
- **Computed values are immutable on inheritance** — `--size-lg: calc(2 * var(--size))` on `:root` computes _once_; redefining `--size` on a descendant does not recompute it. Do the math where it's consumed: `font-size: calc(var(--size-adjust, 1) * var(--size));`.

Prevention: give every `var()` a fallback matching the receiving property's type, and use `@property` `initial-value` as the safety net.

## Responsive — change the inputs, not the logic

Put the layout math in once, against tokens; in the media query, re-point only the tokens. The logic never re-opens.

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

`calc()` composes tokens freely; media queries cannot _read_ `var()` but can freely _re-declare_ tokens, which is the move.

### Fluid tokens — clamp the value, skip the query

Recipes for tokens that adapt on their own; prefer these before re-pointing in any query:

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

Media queries ask "how wide is the screen"; a component in a sidebar needs "how wide am I". Name the container, query it, re-point tokens exactly as with media queries:

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

- Size queries need `container-type: inline-size` (or the `container: name / inline-size` shorthand) on an _ancestor_ — an element cannot size-query itself.
- Range syntax works: `@container (30ch <= inline-size <= 60ch)`.
- Container units `cqi` / `cqw` make values fluid to the container: `font-size: clamp(1.25rem, 5cqi, 2rem)`. Trap: in a browser without support, a cq unit inside a custom-property value invalidates the whole value — guard with `@supports (font-size: 1cqi)`.
- Style queries — `@container style(--theme: dark) { ... }` — branch on a token's value; Chromium-only, treat as enhancement.
- Known bug: Safari 16.4 collapses widths when `auto-fit` grid children get containment — test there.

Prefer a container query over a media query whenever the trigger is "this component got narrow", not "this device is small".

## Theming — override on a selector

Themes are scoped overrides: re-declare tokens under `[data-theme]` / a class on `:root` / `html` / `body` and the cascade reapplies every consumer; toggle the attribute (JS `setProperty` / remove) to swap. For which tokens to swap, see **designer**. Put a `transition` on the _consuming_ properties for a smooth change — you cannot transition an unregistered token, so for a token that must animate its own value, register it with `@property` first.

## JS — live read and write

Tokens live in the DOM, so JS reads and writes them like any style.

```js
const root = document.documentElement;
root.style.setProperty('--color-primary', '#ff6347'); // set
getComputedStyle(root).getPropertyValue('--color-primary').trim(); // get (computed)
el.style.getPropertyValue('--my-var'); // get inline only
```

This is the seam for live theming, color pickers, and pointer-driven values (`--mouse-x`, `--mouse-y`). `getPropertyValue` often returns leading whitespace — `.trim()` it.
