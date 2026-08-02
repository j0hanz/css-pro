# Custom properties

**Custom property** — `--name: value`, read back with `var()`. File cover: declaring, substituting, typing, driving them. Compressing declarations: see [`SHORTHAND.md`](SHORTHAND.md).

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

`var(--name)` substitute the value. Names **case-sensitive** (`--My-Color` ≠ `--my-color`), begin `--`. `var()` works inside property values only — not property names, not selectors, not inside `@media` conditions. Media query can _re-point_ custom property (see Responsive), just cannot _read_ one. `@container style()` does read them — see container queries in [`LAYOUT.md`](LAYOUT.md).

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

Everything inside `.sidebar` use sidebar's values; everything else `:root`.

## Fallbacks

`var(--name, fallback)` use the fallback only when the referenced property is **guaranteed-invalid** — undefined, explicitly set to `initial`, or holding a bad `var()` of its own. Declared-but-empty (`--x: ;`) is a valid value: it substitutes nothing, the consuming property goes IACVT, fallback skipped.

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
.skipped {
  --bad: 16px;
  color: var(--bad, green);
} /* --bad is defined, so 16px substitutes: color goes IACVT and inherits — green never fires */
```

Token that exists but is wrong for the consuming property substitutes anyway; the property goes IACVT (see gotchas) and the fallback is skipped. Fallback catches the _missing_ token; `@property` `syntax` catches the mistyped one. Chains work — keep to two levels so the fallback path stays readable.

## @property — typed, inherit-controlled, animatable

Plain `--name: value` untyped: browser accept nearly anything, discover it wrong only when `var()` substitute it into a property — property then fall to its inherited or initial value, not your intent. `@property` register it with type, inheritance flag, initial value.

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

- **`initial-value` must be computationally independent** — it cannot depend on another computed value, so `2rem` and references to other custom properties are rejected. `px`, viewport units, and math over them are fine: `initial-value: calc(18px + 1.5vi)`, `initial-value: clamp(10px, 20px, 30px)`. Workaround for a value that needs `rem`: conservative `px` in `@property`, real dynamic value assigned normally in `:root`.
- `@property` in every current engine since mid-2024 — use it directly.

Prop meant to stay _undefined_ so a `var()` chain falls through stays unregistered — see `SKILL.md`'s "What bites".

## Three computation gotchas

How browser computes these values — each produce a "why is my value missing" bug:

- **Invalid at computed-value time (IACVT)** — `var()` substituting an invalid value cannot fall back to an _earlier cascaded declaration_; those were discarded at parse time. Property fall to its inherited or initial value instead.
- **Unsupported unit poisons the whole value** — `clamp(1.25rem, var(--fluid, 5cqi), 2.5rem)` in browser lacking that unit doesn't use the bounds; whole `font-size` goes IACVT. IACVT behaves as `unset`: inherited property takes the parent's value (40px parent gives 40px, not `medium`), non-inherited property takes its initial.
- **Computed values immutable on inheritance** — value computed on `:root` computes _once_; redefining its inputs on a descendant does not recompute it. Do the math where it's consumed: `font-size: calc(var(--size-adjust, 1) * var(--size));`.

## Responsive — change the inputs, not the logic

Put layout math in once, against custom properties; in the media query, re-point only those properties.

```css
:root {
  --header-h: 80px;
  --sidebar-w: 250px;
  --gutter: 2rem;
}
.main {
  height: calc(100dvh - var(--header-h));
  width: calc(100% - var(--sidebar-w) - var(--gutter));
}
@media (max-width: 768px) {
  :root {
    --sidebar-w: 0;
    --gutter: 1rem;
  } /* .main's math is unchanged */
}
```

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
  ); /* % padding resolves against the containing block's inline size — contextual free */
  --space-section: max(8vh, 2rem); /* viewport-proportional but floored — safe at 400% zoom */
  --flow-space: min(4rem, 8vh);
}
.flow > * + * {
  margin-block-start: var(--flow-space);
}
```

## Theming — override on a selector

Themes are scoped overrides: re-declare under `[data-theme]` on `:root`, cascade reapplies every consumer; toggle the attribute (JS `setProperty` / remove) to swap. Put `transition` on the _consuming_ properties for smooth change.

## JS — live read and write

They live in the DOM, so JS read and write them like any style.

```js
const root = document.documentElement;
root.style.setProperty('--color-primary', '#ff6347'); // set
getComputedStyle(root).getPropertyValue('--color-primary').trim(); // get (computed)
el.style.getPropertyValue('--my-var'); // get inline only
```

Seam for live theming, color pickers, pointer-driven values (`--mouse-x`, `--mouse-y`). `getPropertyValue` often return leading whitespace — `.trim()` it.
