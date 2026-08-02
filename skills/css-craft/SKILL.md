---
name: css-craft
description: CSS mechanics — use when a declaration silently does nothing (var() not resolving, shorthand wiping the longhands it omits, an unregistered custom property refusing to interpolate, a logical property flipping under RTL while its border-radius does not), or when writing custom properties, fluid clamp() values, shorthand, intrinsic layout and centering, container queries, @layer, or value functions like calc-size()/color-mix(). Not motion — duration, easing, and whether to animate are motion-craft; not review — css-audit.
---

# CSS Craft

How CSS actually behave, in place it behave surprising. Several of below checked rather than remembered — per-edit hook refuse a write carrying one, css-audit re-run same table over whole file.

## Reference bodies

- Writing or debugging a custom property → [`PROPERTIES.md`](PROPERTIES.md): scope and cascade, `@property` typing and animation, fallback rules, the computation gotchas behind "why is my value missing", re-pointing values per media query, fluid `clamp()` recipes, theming, JS read and write.
- Writing a shorthand, or a longhand sitting near one → [`SHORTHAND.md`](SHORTHAND.md): the reset trap in full, value counts for sides (TRBL) and corners, the logical box-side twins and the `border-radius` corners that do not follow them, value order per shorthand.
- Building layout, or about to write a media query → [`LAYOUT.md`](LAYOUT.md): intrinsic grid, grid-area stacking, sidebar, sticky footer, centering; container and style queries; one-line upgrades retiring old hacks; `:where()` / `:is()` / `:has()` / `@layer` / owl spacing.
- Picking a value function, or feature-detecting one → [`FUNCTIONS.md`](FUNCTIONS.md): `calc-size()`, `progress()`, `color-mix()`, `contrast-color()`, `if()`, `image-set()`, `linear()`, the shape functions behind `clip-path` / `offset-path`, each with the support trap it still carries; `@supports` and `CSS.supports()` syntax; fallback ordering.

## What bites

Before a declaration ships, confirm none of these apply to it.

**Shorthand resets what it omits.** `background: red` clears `background-image`, `background-position`, rest. Longhand set _before_ its shorthand is discarded — move it after. Per-property detail in [`SHORTHAND.md`](SHORTHAND.md).

**Invalid `var()` cannot fall back to earlier declaration.** `color: blue; color: var(--broken)` gives inherited colour, not blue. Give every `var()` a fallback of the right type — it rescues the _missing_ token only, and `var(--foo, red, blue)` is one fallback of `red, blue`, everything after first comma. Gotchas in [`PROPERTIES.md`](PROPERTIES.md).

**Untyped custom property cannot be interpolated.** Plain `--stop: red` snaps between values; same property registered with `@property` and `syntax: '<color>'` transitions smooth. Register anything you put in `transition` or `@keyframes` — with one exemption: component API prop meant to stay _undefined_ keeps `var(--button-bg, var(--color-primary))` fallthrough only while unregistered, because registration fills `initial-value`.

**Computed values frozen on inheritance.** `--size-lg: calc(2 * var(--size))` on `:root` computes once; redefining `--size` on descendant won't recompute it. Do arithmetic where value consumed.

**Unlayered styles beat every layer.** One stray rule outside `@layer` outranks your whole layered design system, and `!important` inverts the order on top of that. Full ordering in [`LAYOUT.md`](LAYOUT.md).

**`minmax(20ch, 1fr)` overflows.** The memorised intrinsic-grid line needs the inner `min()`, else any container narrower than `20ch` overflows. Recipe in [`LAYOUT.md`](LAYOUT.md).

**Logical edge, physical corner.** `border-inline-start` flips under `direction: rtl`; `border-radius: 0 1em 1em 0` does not, so the rail and the square corners end up on opposite sides. Per-corner logical longhands (`border-start-end-radius`) in [`SHORTHAND.md`](SHORTHAND.md).

**`@supports` cannot detect at-rules cross-engine.** `@supports at-rule(@container)` is Chromium 148+ only; probe API presence from JS — `window.CSSContainerRule` for `@container`, `window.CSSLayerBlockRule` for `@layer`. And a pass proves only the form you tested — partial implementations accept the function name and fail the call, so test the exact call you ship.
