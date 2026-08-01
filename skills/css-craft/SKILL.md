---
name: css-craft
description: CSS mechanics — use when a declaration silently does nothing (var() not resolving, shorthand wiping the longhands it omits, an unregistered custom property refusing to interpolate), when writing custom properties, shorthand, intrinsic layout, or value functions like calc-size()/color-mix(). Not motion — duration, easing, and whether to animate are motion-craft; not review — css-audit.
---

# CSS Craft

How CSS actually behave, in place it behave surprising. Mechanics only — rules browser enforce whether you know or not.

## Reference bodies

- Writing or debugging a custom property → [`PROPERTIES.md`](PROPERTIES.md): scope and cascade, `@property` typing and animation, fallback rules, three computation gotchas behind "why is my value missing", re-pointing values per media query, fluid `clamp()` recipes, theming, JS read and write.
- Writing a shorthand, or a longhand sitting near one → [`SHORTHAND.md`](SHORTHAND.md): reset trap in full, value counts for sides (TRBL) and corners, the logical box-side twins and the `border-radius` corner that does not follow them, value order for `background` / `font` / `border` / `animation` / `transition` / `flex` / `grid-area`.
- Building layout, or about to write a media query → [`LAYOUT.md`](LAYOUT.md): intrinsic grid, grid-area stacking, sidebar, sticky footer, centering; container queries and style queries; one-line upgrades retiring old hacks (`aspect-ratio`, `text-wrap: balance`, `accent-color`); `:where()` / `:is()` / `:has()` / `@layer` / owl spacing.
- Picking a value function, or feature-detecting one → [`FUNCTIONS.md`](FUNCTIONS.md): `calc-size()`, `progress()`, `color-mix()`, `contrast-color()`, `if()`, `image-set()`, the shape functions behind `clip-path` / `offset-path` (`inset` `xywh` `rect` `polygon` `path` `shape` `ray`), with the support trap on each one that still carries one; `@supports` and `CSS.supports()` syntax; fallback ordering.

Several of the below are checked, not remembered: the per-edit hook refuses a write carrying one, and `node "${CLAUDE_PLUGIN_ROOT}/skills/css-audit/audit.mjs" <file>` re-runs the same table over a whole sheet with `file:line`. Run it on a file you have edited rather than re-reading it — css-audit owns the workflow.

## What bites

Before a declaration ships, confirm none of these apply to it. Each is a symptom you would otherwise chase in the browser.

**Shorthand resets what it omits.** `background: red` clears `background-image`, `background-position`, rest. Longhand set _before_ shorthand gets discarded. Declare kept longhand _after_ shorthand; fold it into shorthand only when shorthand sets every longhand you care about anyway. Full per-property detail in [`SHORTHAND.md`](SHORTHAND.md).

**Invalid `var()` cannot fall back to earlier declaration.** Those discarded at parse time, property falls to inherited or initial value instead — `color: blue; color: var(--broken)` gives inherited colour, not blue. Give every `var()` fallback of right type, knowing it rescues the _missing_ token only: token that exists but is wrong for the consuming property substitutes anyway and the property still goes invalid. `var(--foo, red, blue)` is one fallback of `red, blue` — everything after first comma is the fallback. See computation gotchas in [`PROPERTIES.md`](PROPERTIES.md).

**Untyped custom property cannot be interpolated.** Plain `--stop: red` snaps between values; same property registered with `@property` and `syntax: '<color>'` transitions smooth. Register anything you put in `transition` or `@keyframes` — with one exemption: component API prop meant to stay _undefined_ keeps `var(--button-bg, var(--color-primary))` fallthrough only while unregistered, because registration fills `initial-value`.

**Computed values frozen on inheritance.** `--size-lg: calc(2 * var(--size))` on `:root` computes once; redefining `--size` on descendant won't recompute it. Do arithmetic where value consumed.

**Unlayered styles beat every layer.** One stray rule outside `@layer` outranks your whole layered design system, and `!important` inverts the order on top of that. Full ordering in [`LAYOUT.md`](LAYOUT.md).

**`minmax(20ch, 1fr)` overflows.** The memorised intrinsic-grid line needs the inner `min()` — `repeat(auto-fit, minmax(min(100%, 20ch), 1fr))` — else any container narrower than `20ch` overflows. Recipe in [`LAYOUT.md`](LAYOUT.md).

**Logical edge, physical corner.** `border-inline-start` flips under `direction: rtl`; `border-radius: 0 1em 1em 0` does not. The rail and the square corners end up on opposite sides — in the component where someone reached for logical properties deliberately. Per-corner logical longhands (`border-start-end-radius`) in [`SHORTHAND.md`](SHORTHAND.md).

**`@supports` cannot detect at-rules cross-engine.** `@supports at-rule(@container)` is Chromium 148+ only; probe API presence from JS — `window.CSSContainerRule` for `@container`, `window.CSSLayerBlockRule` for `@layer`. And a pass proves only the form you tested — partial implementations accept the function name and fail the call, so test the exact call you ship.
