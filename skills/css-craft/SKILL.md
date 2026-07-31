---
name: css-craft
description: Use when writing or refactoring CSS — custom properties and var(), shorthand and the reset trap, intrinsic layout, fluid sizing with clamp(), and the modern value-function long tail (calc-size/if/linear/shape/image-set) with its support traps. Mechanics reference for how CSS behaves, not a house style.
---

# CSS Craft

How CSS actually behaves, in the places it behaves surprisingly. This skill has no view
on what your CSS should look like — no naming convention, no token taxonomy, no opinion
on when a value deserves a name. Those are yours. What is here is mechanics: rules the
browser enforces whether or not you know them.

Four **leading words**:

- **custom property** — a named value (`--color-danger`) read back with `var()`.
- **shorthand** — one declaration setting several properties (`margin: 10px 5px`).
- **reset** — what a shorthand does to every longhand it omits: snaps it to its initial
  value. The trap that makes declaration order matter.
- **function** — a value computed at render time (`clamp()`, `color-mix()`, `anchor()`)
  rather than hardcoded.

## Reference bodies

Open the one the work needs:

- [`TOKENS.md`](TOKENS.md) — custom properties end to end: scope and the cascade,
  `@property` typing and animation, fallbacks, the three computation gotchas that
  produce "why is my value missing", responsive re-pointing, container queries, theming,
  reading and writing from JS.
- [`SHORTHAND.md`](SHORTHAND.md) — value-count rules for sides (TRBL) and corners, the
  order values take in `background`/`font`/`border`/`animation`/`transition`/`flex`/
  `grid`, and the reset trap in full.
- [`LAYOUT.md`](LAYOUT.md) — intrinsic grid and flex patterns, one-line upgrades that
  retire old hacks (`aspect-ratio`, `text-wrap: balance`, `accent-color`), and
  `:where()` / `:has()` / `@layer`.
- [`FUNCTIONS.md`](FUNCTIONS.md) — picking a value function by intent, and the trap that
  keeps each one correct.

## The four things that bite

**Shorthand resets what it omits.** `background: red` clears `background-image`,
`background-position`, and the rest. A longhand set _before_ its shorthand is discarded.
Fold it in, or declare it after. Full per-property detail in
[`SHORTHAND.md`](SHORTHAND.md).

**An invalid `var()` cannot fall back to an earlier declaration.** Those were discarded
at parse time, so the property falls to its inherited or initial value instead —
`color: blue; color: var(--broken)` gives you inherited colour, not blue. Give every
`var()` a fallback of the right type. See the computation gotchas in
[`TOKENS.md`](TOKENS.md).

**An untyped custom property cannot be interpolated.** A plain `--stop: red` snaps
between values; the same property registered with `@property` and `syntax: '<color>'`
transitions smoothly. Register anything you put in a `transition` or `@keyframes`.

**Computed values are frozen on inheritance.** `--size-lg: calc(2 * var(--size))` on
`:root` computes once; redefining `--size` on a descendant does not recompute it. Do the
arithmetic where the value is consumed.

## Responsive

Put the layout maths in once, against custom properties, then re-point only those
properties inside the query — the logic never reopens. A media query cannot _read_ a
custom property, but it can freely _re-declare_ one.

Prefer a container query whenever the trigger is "this component got narrow" rather than
"this device is small"; prefer a fluid `clamp()` to either when the value can simply
adapt on its own. Recipes in [`TOKENS.md`](TOKENS.md).
