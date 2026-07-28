# CSS Functions — the long tail

Picker in `SKILL.md` dispatches common intents; its "Traps that bite" covers traps. This file is the rest — functions new, non-obvious, or needing a usecase to use right. Each entry: usecase, copyable call. Obvious functions (`rgb`, `hsl`, `blur`, `translate`, `linear-gradient`, `matrix`, …) live in pretraining, not here.

## Math

- `calc-size()` — animate to/from intrinsic size `calc()` can't take (`auto`-height open/close). `interpolate-size: allow-keywords; transition: height .3s;` then `height: calc-size(auto);` for open state.
- `progress()` — map value onto `0`–`1` between bounds, feed scroll/state math. `--p: progress(var(--scroll), 0, 100vh); opacity: var(--p);`
- `abs()` / `sign()` — `abs(var(--dx))`; `sign(var(--dx))` gives `-1` / `0` / `1`.
- `hypot()` / `sqrt()` / `pow()` — vector magnitude, roots, powers: `hypot(var(--x), var(--y))`.

## Color

- `contrast-color()` — auto text color against bg. Returns black or white only — not an a11y guarantee (WCAG2 algo weak on mid-tones; verify small text). `color: contrast-color(var(--bg));`
- `alpha()` — change only alpha, keep the rest (color-space agnostic). Color 5, not yet shipped. `color: alpha(from var(--brand) / 50%);` relative: `alpha(from var(--brand) / calc(alpha * 0.5))`. Until shipped: `color-mix(in srgb, var(--brand), transparent 50%)`.
- `color()` — color in explicit colorspace (wide gamut). `background: color(display-p3 1 0 0);`
- `dynamic-range-limit-mix()` — mix HDR luminance limits by % (video/HDR contexts).
- `device-cmyk()` — CMYK for print (device-dependent).

## Conditional & image

- `if()` — conditional value from style/media/feature query, inline. `width: if(style(--wide): 100%; else: 50%);`
- `image()` — `<url>` with directionality + fallback for unsupported formats.
- `image-set()` — pick best image for device (DPI/format). `background: image-set(url(bg.avif) type("image/avif"), url(bg.png) type("image/png"));`
- `cross-fade()` — blend two or more images at transparency.
- `element()` — render arbitrary HTML element as image.

## Shape (`clip-path`, `offset-path`, `shape-outside`)

- `inset()` — inset rectangle, optional corner rounds: `clip-path: inset(10% round 8px);`
- `xywh()` / `rect()` — rectangle by top-left + width/height, or by distances from edges.
- `polygon()` — vertex list: `clip-path: polygon(0 0, 100% 0, 50% 100%);`
- `path()` — shape from SVG path string.
- `shape()` — shape from command list (newer, richer than `path()`).
- `ray()` — line segment for `offset-path` (direction + length), motion paths. `offset-path: ray(45deg closest-side);`
- `superellipse()` — ellipse curvature for `corner-shape` and kin.

## Counter & easing

- `symbols()` — inline counter style, no `@counter-style`: `list-style-type: symbols(cyclic "●" "○");`
- `linear()` — piecewise linear ease through points (newer): `transition-timing-function: linear(0, 0.25 25%, 1);`

## Niche

- `layer()` — `@import` into named or anonymous cascade layer.
- `palette-mix()` — mix two font palettes by %.
- `random()` — random value, optionally seeded / dependency-scoped.
- `type()` — coerce/declare value type (syntax / `@property` contexts).
- Font-variant alternates — `stylistic()` / `styleset()` / `character-variant()` / `swash()` / `ornaments()` / `annotation()`: alternate glyph sets for `font-variant-alternates`.
- `-moz-image-rect()` — Mozilla-only sub-rect of image; legacy.

## Testing support

- `@supports (accent-color: red)` for properties; `@supports selector(:has(a))` for selectors; combine with `and` / `or` / `not`.
- `@supports` cannot test at-rules — no detection for `@container`, `@layer`. JS: `CSS.supports('width: 1cqi')` for values; API presence (`window.CSSLayerBlockRule`) for at-rules.
- Partial implementations lie — a passing `@supports` doesn't prove every form of a feature works. Test the actual call you'll ship, not just the function name.
- Fallback order: old declaration first, modern last — `height: 100vh; block-size: 100dvh;`. Later valid declaration wins; unsupported one is skipped.
