# CSS Functions — the long tail

`SKILL.md`'s **"What bites"** cover traps common to declarations. This file rest — functions new, non-obvious, or need usecase to use right. Each entry: usecase, copyable call.

## Math

- `calc-size()` — makes intrinsic size interpolable where `calc()` can't take it: `height: calc-size(auto, size);`. The keyword `size` stands for the basis, so `calc-size(fit-content, size + 2rem)` computes on it. `interpolate-size: allow-keywords` is the other route to the same thing — it makes a plain `height: auto` animate — not a companion declaration. Chromium-only (Chrome 129+, nothing in Gecko/WebKit). Under this plugin the height transition is unavailable either way: the hook refuses `transition: height`, layout and paint every frame on the main thread. Open/close ships as `transform: scaleY()`, or a clip reveal where content must not squash.
- `progress()` — map value onto `0`–`1` between bounds, feed scroll/state math. All three arguments same type — unitless `0` is a `<number>` inside a math function, so lengths need `0px`. `--p: progress(var(--scroll), 0px, 100vh); opacity: var(--p);`
- `abs()` / `sign()` — `abs(var(--dx))`; `sign(var(--dx))` gives `-1` / `0` / `1`.
- `hypot()` / `sqrt()` / `pow()` — vector magnitude, roots, powers: `hypot(var(--x), var(--y))`.

## Color

- `contrast-color()` — auto text color against bg. Baseline since Apr 2026 (Chrome 147 / Firefox 146 / Safari 26), safe to ship. Returns black or white only — not a11y guarantee (WCAG2 algo weak on mid-tones; verify small text). `color: contrast-color(var(--bg));`
- `color-mix()` — mix two colors in a named space: `color-mix(in oklab, var(--brand) 80%, black)`. Alpha only, hue kept: `color-mix(in srgb, var(--brand), transparent 50%)`.
- `color()` — color in explicit colorspace (wide gamut). `background: color(display-p3 1 0 0);`

## Conditional & image

- `if()` — conditional value from style/media/feature query, inline. Chromium-only (Chrome 137+, nothing in Gecko/WebKit, Safari roadmap 2026–27) — ship behind a plain fallback declaration. `width: if(style(--wide): 100%; else: 50%);`
- `image()` — `<url>` with directionality + fallback for unsupported formats.
- `image-set()` — pick best image for device (DPI/format). `background: image-set(url(bg.avif) type("image/avif"), url(bg.png) type("image/png"));`
- `cross-fade()` — blend two+ images at transparency. Unprefixed form Safari-only; `-webkit-cross-fade()` in Chromium; no Firefox support either way.
- `element()` — render arbitrary HTML element as image. Firefox-only, and only as `-moz-element()`.

## Shape (`clip-path`, `offset-path`, `shape-outside`)

- `inset()` — inset rectangle, optional corner rounds: `clip-path: inset(10% round 8px);`
- `xywh()` / `rect()` — rectangle by top-left + width/height, or by distances from edges.
- `polygon()` — vertex list: `clip-path: polygon(0 0, 100% 0, 50% 100%);`
- `path()` — shape from SVG path string.
- `shape()` — shape from command list, richer than `path()` and takes `calc()`/units. Baseline since Feb 2026.
- `ray()` — line segment for `offset-path` (direction + length), motion paths. `offset-path: ray(45deg closest-side);`
- `superellipse()` — ellipse curvature for `corner-shape` and kin.

## Counter & easing

- `symbols()` — inline counter style, no `@counter-style`. Firefox-only: `list-style-type: symbols(cyclic "●" "○");`
- `linear()` — piecewise linear ease through points: `transition-timing-function: linear(0, 0.25 25%, 1);`

## Niche

- `layer()` — `@import` into named or anonymous cascade layer. In a plain `.css` file that `@import` is found only after this sheet lands, then fetched serially, delaying first paint — set order with `@layer a, b;` and load each sheet by `<link>`, or let a bundler inline it.
- `palette-mix()` — mix two font palettes by %.
- `random()` — random value, optionally seeded / dependency-scoped.
- `type()` — types an `attr()` so it parses as a value, not a string: `width: attr(data-size type(<length>));`. Only an `attr()` construct — `@property`'s `syntax` descriptor takes a bare string, `syntax: '<length>'`.
- Font-variant alternates — `stylistic()` / `styleset()` / `character-variant()` / `swash()` / `ornaments()` / `annotation()`: alternate glyph sets for `font-variant-alternates`.

## Testing support

- `@supports (accent-color: red)` for properties; `@supports selector(:has(a))` for selectors; combine with `and` / `or` / `not`. From JS, `CSS.supports('width: 1cqi')` tests a value. At-rule detection and the partial-implementation trap: `SKILL.md`'s "What bites".
- Fallback order: repeat the same property, old declaration first, modern last — `background: #333; background: color-mix(in oklab, var(--brand) 80%, black);`. Later valid declaration wins; unsupported one skipped.
