# Layout — intrinsic patterns, one-line upgrades, modern selectors

Layout layer: grid/flex patterns that adapt to content and container without media queries, one-line property upgrades that retire old hacks, and the few selector tools worth stating. Tokens: see [`TOKENS.md`](TOKENS.md). Process: see [`SKILL.md`](SKILL.md).

## Intrinsic layout patterns

Reach for these before writing a media query — they respond to content and container, free.

- **Intrinsic grid** — columns that wrap on their own:

  ```css
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--grid-min, 20ch)), 1fr));
    gap: var(--gap, 1rem);
  }
  ```

  The inner `min(100%, ...)` is load-bearing: without it, containers narrower than `--grid-min` overflow.

- **Grid-area stacking** — overlap layers (hero image + content, image + caption, overlay) without absolute positioning:

  ```css
  .hero {
    display: grid;
    grid-template-areas: 'hero';
  }
  .hero > * {
    grid-area: hero;
  }
  ```

  Every child shares the area; align each with `place-self` / `justify-self`. Replaces `position: absolute` for overlays — layers stay in flow, container sizes to content.

- **Sidebar** — content-driven sidebar, flexible main: `grid-template-columns: fit-content(20ch) minmax(50%, 1fr);`

- **Sticky footer** — footer at bottom on short pages: `body { min-height: 100dvh; display: grid; grid-template-rows: auto 1fr auto; }`. Use `100dvh`, not `100vh` — mobile address bars make `100vh` overflow. Flex variant when element count varies: `body { display: flex; flex-direction: column; } footer { margin-top: auto; }`.

- **Centering** — `display: grid; place-content: center;` centers anything both axes. Trap: on a grid whose children use `auto-fit`/`auto-fill`, `place-content` collapses tracks — use `place-items` plus explicit width there. Single child inside grid/flex: `margin: auto` also centers.

- **Flex pancake** — items wrap individually at their own minimum: `.row > * { flex: 1 1 var(--item-min, 20ch); } .row { display: flex; flex-wrap: wrap; gap: 1rem; }`.

- **Equal heights** — free: flex children stretch by default; grid `grid-auto-flow: column` gives equal height _and_ width. No `height: 100%` hacks needed on the parent — only on nested card innards.

## One-line upgrades

Modern properties that retire an old hack in one declaration. Default to these; treat the hack they replace as a refactor target.

| Upgrade                                   | Retires                                                               |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `aspect-ratio: 16 / 9`                    | padding-bottom percentage hack                                        |
| `object-fit: cover` on `<img>`            | `background-image` for content images (keeps semantics, `alt`)        |
| `margin-inline: auto` (+ logical props)   | `margin-left/right: auto`; physical props that break RTL              |
| `width: fit-content`                      | display swaps / shrink-wrap hacks                                     |
| `text-wrap: balance` (headings, ≤6 lines) | manual `<br>` in headlines; `pretty` for body orphans                 |
| `scroll-margin-top: 2rem`                 | anchor targets hidden under sticky nav                                |
| `text-underline-offset: 0.25em`           | descender-crowded underlines                                          |
| `overscroll-behavior: contain`            | JS scroll-chaining guards on modals/drawers                           |
| `scrollbar-gutter: stable`                | layout shift when scrollbar appears (no effect w/ overlay scrollbars) |
| `color-scheme: light dark`                | hand-styled native controls/scrollbars per theme                      |
| `accent-color: var(--accent)`             | most custom checkbox / radio / range / progress CSS                   |
| `min-height: 100dvh`                      | `100vh` mobile viewport jump                                          |

## Selectors and layers

Only the tools that change how a system composes — the rest is standard.

- **`:where()`** — zero specificity. Wrap design-system defaults so any consumer rule overrides without a fight: `:where(.button) { ... }`.
- **`:is()`** — compact grouping, takes highest specificity of its list. `.card :is(h2, h3)`.
- **`:has()`** — parent/quantity/variant selection from CSS. Quantity: `ul:has(li:nth-child(11)) { --compact: 1; }`. Variant detection: `.button:where(:has(svg)) { border-radius: 50%; }` — wrap in `:where()` to keep specificity flat.
- **`@layer`** — declare order once, `@layer reset, theme, components, utilities;` — first listed loses. Trap: _unlayered_ styles beat all layers; and `@supports` cannot detect at-rules. Put `@property` registrations in a layer to control override precedence.
- **Owl spacing** — `.flow > * + * { margin-block-start: var(--flow-space, 1em); }` — rhythm without first/last-child exceptions.
