---
name: css-craft
description: Use when writing or refactoring CSS — styling a component, making a layout responsive, or auditing a stylesheet for hardcoded values or longhand sprawl. For token taxonomy, naming, and theming, use designer.
---

# CSS Craft

Four **leading words** anchor work:

- **custom property** — named value (`--color-danger`) referred with `var()`. Unit of reuse.
- **literal** — raw value inline where token belongs. Thing to kill.
- **shorthand** — one declaration setting several properties (`margin: 10px 5px`). Unit of compression.
- **reset** — what shorthand does to every longhand it omits: snap back to initial value. Trap that makes ordering matter.

Reference bodies behind pointers — open when a step needs detail:

- [`TOKENS.md`](TOKENS.md) — custom-property layer: `:root` scope and grouping, cascade overrides for theming, `@property` typing, fallbacks, `calc()` and responsive re-pointing, JS read/write.
- [`SHORTHAND.md`](SHORTHAND.md) — shorthand layer: value-count rules for sides (TRBL) and corners, order for background/font/border/animation/transition/flex/grid, and reset trap in full.
- [`LAYOUT.md`](LAYOUT.md) — layout layer: intrinsic grid/flex patterns (auto-fit grid, grid-area stacking, sticky footer, centering), one-line upgrades that retire old hacks (`aspect-ratio`, `text-wrap: balance`, `accent-color`, …), `:where()`/`:has()`/`@layer`.
- [`ORGANIZATION.md`](ORGANIZATION.md) — organization layer: section ordering general → utilities → sitewide → page/component, selector naming (BEM), comment headers and the-why comments, splitting large stylesheets, project style guide and formatting.

## 1. Spot the repeats

Before writing, find every value that recurs or carry design intent — colors, spacing, radii, fonts, weights, shadows, z-indexes, durations, easings. Each is **token** candidate. Value used once and meant one-off may stay literal; value used twice, or one a rebrand force you to hunt for, must be token.

Done when every recurring or design-bearing value named as token, and no **literal** left that brand or spacing change need find-and-replace to update.

## 2. Name by role, scope on :root, group by function

Name for what value means, not how it looks; declare globals once on `:root`, grouped by function, scope component-only values to component. **Token** naming and tier taxonomy: see **designer**; class and selector naming (BEM, name by component not style): see [`ORGANIZATION.md`](ORGANIZATION.md); `:root` scope and grouping mechanics: see [`TOKENS.md`](TOKENS.md).

Done when every global live in one grouped `:root` block, every component-specific value declared on component not promoted to global, and every class named under one project-wide convention.

## 3. Write declarations as shorthand

Collapse related longhands into one **shorthand**: `margin: 10px 5px`, not four lines; `border: 1px solid var(--color-border)`, not three. Respect value-count rules — box sides run **TRBL**, clockwise from top (1 = all; 2 = top/bottom then left/right; 3 = top, left/right, bottom; 4 = top right bottom left); corners run same pattern but from top-left. Respect order where values share type: background is `color image repeat attachment position`, font is `style weight variant size/line-height family`. See [`SHORTHAND.md`](SHORTHAND.md) for full per-property rules.

Use shorthand only when you mean to set longhands it covers — otherwise you set values you didn't intend (see step 4). Where longhand has no shorthand home (`background-size`, set as `position / size`), keep separate.

Done when no longhand block stands where shorthand captures same intent, and every multi-value shorthand use correct count and order.

## 4. Respect the reset

Shorthand **resets** every longhand it omits to that longhand's initial value — set longhand you want to keep after shorthand, or fold it in. Full detail and examples in [`SHORTHAND.md`](SHORTHAND.md).

Done when no rule has longhand silently reset by shorthand in same or later rule, and every value you intend to keep either folded into shorthand or declared after it.

## 5. Harden the tokens that need it

Most tokens plain `--name: value; var(--name)`. Three need more — syntax and examples in [`TOKENS.md`](TOKENS.md):

- **Fallbacks**
- **`@property`**
- **`calc()` + re-pointing**

Done when animatable tokens registered, optional tokens degrade via fallback, and responsive changes re-point tokens instead of re-opening layout logic.

## Branches

Most runs style component or page and follow five steps. Branches reach further:

- **Structuring a stylesheet** — work is a whole page, global, or large multi-rule file, not one component: order sections general → utilities → sitewide → page/component, mark each with a searchable comment header, name selectors under one convention, split large files by scope. Project style guide wins over your own. Open [`ORGANIZATION.md`](ORGANIZATION.md).
- **Theming (dark mode, brands)** — override tokens under class or `[data-theme]` on `:root` / `html` / `body`; cascade reapply everywhere. Open [`TOKENS.md`](TOKENS.md) for override pattern and JS toggle.
- **Responsive layout** — intrinsic patterns first (open [`LAYOUT.md`](LAYOUT.md)); then container queries and media queries that re-point tokens only — component got narrow = container query, device small = media query. Open [`TOKENS.md`](TOKENS.md).
- **Animating a token** — register with `@property` so browser can interpolate; plain `--token: value` won't transition smooth (gradient stops snap). Open [`TOKENS.md`](TOKENS.md).
