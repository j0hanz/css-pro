---
name: css-craft
description: Use when writing or refactoring CSS — custom properties and var(), shorthand and the reset trap, intrinsic layout, and the modern value-function long tail (clamp/calc-size/if/linear/shape/image-set) with its support traps. Not a house style.
---

# CSS Craft

How CSS actually behave, in place it behave surprising. Mechanics only — rules browser enforce whether you know or not. Naming, taxonomy, house style stay yours.

Four **leading words**:

- **custom property** — named value (`--color-danger`) read back with `var()`.
- **shorthand** — one declaration setting several properties (`margin: 10px 5px`).
- **reset** — what shorthand does to every longhand it omits: snaps to initial value. Trap that make declaration order matter.
- **function** — value computed at render time (`clamp()`, `color-mix()`, `anchor()`) rather than hardcoded.

## Reference bodies

Open one work need:

- [`PROPERTIES.md`](PROPERTIES.md) — custom properties end to end: scope and cascade, `@property` typing and animation, fallbacks, three computation gotchas that produce "why is my value missing", responsive re-pointing, container queries, theming, reading and writing from JS.
- [`SHORTHAND.md`](SHORTHAND.md) — value-count rules for sides (TRBL) and corners, order values take in `background`/`font`/`border`/`animation`/`transition`/`flex`/`grid`, and reset trap in full.
- [`LAYOUT.md`](LAYOUT.md) — intrinsic grid and flex patterns, one-line upgrades that retire old hacks (`aspect-ratio`, `text-wrap: balance`, `accent-color`), and `:where()` / `:has()` / `@layer`.
- [`FUNCTIONS.md`](FUNCTIONS.md) — picking value function by intent, and trap that keeps each one correct.

## The four things that bite

**Shorthand resets what it omits.** `background: red` clears `background-image`, `background-position`, rest. Longhand set _before_ shorthand gets discarded. Fold it in, or declare after. Full per-property detail in [`SHORTHAND.md`](SHORTHAND.md).

**Invalid `var()` cannot fall back to earlier declaration.** Those discarded at parse time, property falls to inherited or initial value instead — `color: blue; color: var(--broken)` gives inherited colour, not blue. Give every `var()` fallback of right type. See computation gotchas in [`PROPERTIES.md`](PROPERTIES.md).

**Untyped custom property cannot be interpolated.** Plain `--stop: red` snaps between values; same property registered with `@property` and `syntax: '<color>'` transitions smooth. Register anything you put in `transition` or `@keyframes`.

**Computed values frozen on inheritance.** `--size-lg: calc(2 * var(--size))` on `:root` computes once; redefining `--size` on descendant won't recompute it. Do arithmetic where value consumed.
