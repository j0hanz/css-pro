---
name: css-functions
description: Use when choosing a CSS value function (calc/clamp/color-mix/anchor/scroll) to compute a value at render instead of hardcoding or JS, or auditing an existing call's trap. Prefer over css-craft for function choice and traps; css-craft covers shorthand, literals, and layout.
---

# CSS Functions

CSS value functions **compute** a value at render time from inputs — other values, units, environment, DOM, anchor. Reach for one before you **hardcode** a fixed value or reach for JS (fixed `font-size`→`clamp()`, precomputed tint→`color-mix()`, JS scroll handler→`scroll()`): the browser adapts the result to its context for free. The skill is two moves — pick the **function** by **intent**, then respect the **trap** that keeps it correct.

## Pick by intent

Name what the value must _do_, then take the function — the left side is **intent**, not function name.

- Fluid size between two bounds, no media query → `clamp(min, preferred, max)`.
- Cap size at maximum (content width, etc.) → `min(...)`.
- Floor size at minimum → `max(...)`.
- Arithmetic across units (`%` + `px`, `em` × scalar) → `calc(...)`.
- Compute against intrinsic size (`auto`, `fit-content`, `max-content`) → `calc-size(...)`.
- Snap value to step → `round(...)`; modulo → `mod(...)` (sign of divisor) or `rem(...)` (sign of dividend).
- Map value onto 0–1 progress → `progress(value, start, end)`.
- Tint, shade, fade color without precomputing → `color-mix(in oklch, color, white|black|transparent N%)`.
- Auto text color contrasting background → `contrast-color(bg)` (black or white only).
- One color light scheme, another dark → `light-dark(light, dark)` — needs `color-scheme`.
- Color with predictable lightness across hues → `oklch()` / `oklab()` (L is 0–1, not 0–100).
- Change only color's alpha channel → `alpha(from color / value)` (Color 5, not yet shipped).
- Read DOM attribute into value → `attr(name type(<length>), fallback)` (typed form, check support).
- Read UA environment value (notch safe-area, viewport) → `env(...)`.
- Size relative to container, not viewport (component-fluid type) → `cqi` / `cqw` units, e.g. `clamp(1.25rem, 5cqi, 2rem)`.
- Read custom property → `var(--name, fallback)`.
- Conditional value from style / media / feature query → `if(cond: val; cond: val)`.
- Position or size element relative to anchor → `anchor()`, `anchor-size()`.
- Drive animation from scroll or view progress, no JS → `scroll()`, `view()` (set on `animation-timeline`).
- Easing for transition/animation → `cubic-bezier()`, `steps()`, `linear()`.
- Grid track range or repeating pattern → `minmax()`, `fit-content()`, `repeat()`.
- Generated numbering in `content` → `counter()`, `counters()` (nested, with separator); inline symbol set → `symbols()`.
- Custom-drawn image via worklet → `paint(name)`.
- Element's position/count among siblings (DOM tree) → `sibling-index()`, `sibling-count()`.

When several fit, prefer the one that adapts to context over the one that names a constant — `clamp()` over a media-query step, `color-mix()` over a hand-picked hex. When none fits, say so and reach for JS rather than bend a function to a job it wasn't named for.

**Done when** the intent is named, the matching function chosen, and — if it has one — its trap (below) checked before the value is written.

## Traps that bite

For functions with silent failure: usecase, working call, trap. Check yours before you write it.

- **`calc()`** — full-bleed minus fixed sidebar: `width: calc(100% - var(--sidebar, 240px))`. Trap: `+`/`-` need spaces (`calc(100% - 10px)`, not `calc(100%-10px)`); `*`/`/` don't. Inner `calc` keyword optional: `calc(100% - (20px + 1em))`.
- **`min()` / `max()` / `clamp()`** — fluid heading, never below 1.125rem, 1.5rem at desktop: `font-size: clamp(1.125rem, 1rem + 2vw, 1.5rem)`. Trap: middle is _preferred_, not target — clamped to bounds. These scale value; they don't swap _layouts_ (still media/container query).
- **`round()`** — snap fluid size to 4px grid: `width: round(var(--fluid), 4px)`. Trap: `round(<strategy>?, value, interval)`; `nearest` (default) / `up` / `down` / `to-zero`.
- **`mod()` vs `rem()`** — cycle counter. Trap: differ only on negatives — `mod` takes _divisor_'s sign, `rem` _dividend_'s. Pick deliberately.
- **`color-mix()`** — 60% brand tint over white: `color-mix(in oklch, var(--brand) 60%, white)`. Trap: name colorspace (`in oklch` perceptual, `in srgb` plain); % is _that_ color's amount, omit one → remainder; `none` drops channel; hue method (`shorter`/`longer`/`increasing`/`decreasing`) after colorspace when mixing hues.
- **`oklch()` / `oklab()`** — equal perceived lightness across hues: `--c1: oklch(0.7 0.12 25); --c2: oklch(0.7 0.12 200)`. Trap: L is `0`–`1`, not `0`–`100`; chroma unbounded (~`0`–`0.4`); hue `0`–`360`. Predictable across hues, unlike `hsl`.
- **`light-dark()`** — one token, both schemes: `color: light-dark(#111, #eee)`. Trap: switches only with `color-scheme: light dark` set — without it, first arg forever.
- **`anchor()` / `anchor-size()`** — tooltip pinned above button. Button: `anchor-name: --btn`. Tooltip: `position: absolute; position-anchor: --btn; top: anchor(--btn bottom)`. Trap: anchor needs `anchor-name`, positioned element needs `position-anchor` + `position: absolute` (or `fixed`). `anchor(--x edge)` reads edge, `anchor-size(--x width)` size.
- **`cqi` / `cqw` units** — fluid type per component: `font-size: clamp(1.25rem, 5cqi, 2rem)` inside `container-type: inline-size` ancestor (every element is style container; size queries need explicit `container-type`). Trap: unsupported cq unit invalidates _whole_ custom-property value — hierarchy lost, not degraded. Guard: `@supports (font-size: 1cqi)`.
- **`env()`** — keep content off notch: `padding-top: env(safe-area-inset-top)`. Trap: nonzero only under `viewport-fit=cover` in meta viewport; else `0`.
- **`attr()`** — drive size from data attribute: `width: attr(data-w type(<length>), 100px)`. Trap: legacy form returns string; typed form returns real value — check support.
- **`scroll()` / `view()`** — progress bar tracks scroll, no JS: `animation-timeline: scroll(); animation: progress linear;`. Trap: set on `animation-timeline`; `view()` takes `animation-range` to bound in-view. Verify support.
- **`counter()` / `counters()`** — number steps in `content`: `content: counter(step) ". "`. Trap: needs counter from `counter-reset`/`counter-increment`/`counter-set`; `counters()` joins nested levels with its separator.
- **`sibling-index()` / `sibling-count()`** — stagger animations or split space by position, no `:nth-child` rules. Trap: 1-based among element siblings; support is new — Chromium/Safari only, no Firefox yet (not Baseline).
- **`transform` list** — move then spin: `transform: translate(10px, 0) rotate(45deg)`. Trap: composes in order — same calls, different order, different result. Screen-space move first when in doubt.
- **`paint()`** — custom background gradient can't do. Trap: worklet must register first (`CSS.paintWorklet.addModule` + `registerPaint('name', …)`); reference by that name.

For the long tail — each function's usecase and copyable call, for functions "Traps that bite" doesn't trap (`calc-size`, `progress`, `contrast-color`, `if()`, `image-set()`, `shape()`, `ray()`, …; picker above lists them, Traps don't) — open [`FUNCTIONS.md`](FUNCTIONS.md).
