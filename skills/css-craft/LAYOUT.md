# Layout — intrinsic patterns, one-line upgrades, modern selectors

Layout layer: grid/flex patterns adapt to content and container without media queries, container queries respond to component space, one-line property upgrades retire old hacks, few selector tools worth stating. Custom properties: see [`PROPERTIES.md`](PROPERTIES.md).

## Intrinsic layout patterns

Reach for these before writing media query — respond to content and container, free.

- **Intrinsic grid** — columns that wrap on their own:

  ```css
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--grid-min, 20ch)), 1fr));
    gap: var(--gap, 1rem);
  }
  ```

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

  Every child share the area; align each with `place-self` / `justify-self`. Replaces `position: absolute` for overlays — layers stay in flow, container size to content.

- **Sidebar** — content-driven sidebar, flexible main: `grid-template-columns: fit-content(20ch) minmax(50%, 1fr);`

- **Sticky footer** — footer at bottom on short pages: `body { min-height: 100dvh; display: grid; grid-template-rows: auto 1fr auto; }`. Use `100dvh`, not `100vh` — mobile address bars make `100vh` overflow. Flex variant when element count varies: `body { display: flex; flex-direction: column; } footer { margin-top: auto; }`.

- **Centering** — `display: grid; place-content: center;` center anything both axes. Trap: on grid whose own `grid-template-columns` uses `repeat(auto-fit, …)` / `auto-fill`, `place-content` collapse tracks — use `place-items` plus explicit width there. `margin: auto` fallback for single child already inside someone else's grid/flex, where you can't set the parent.

- **Flex pancake** — items wrap individually at own minimum: `.row > * { flex: 1 1 var(--item-min, 20ch); } .row { display: flex; flex-wrap: wrap; gap: 1rem; }`.

- **Equal heights** — free: flex children stretch by default; grid `grid-auto-flow: column` give equal height, implicit columns stay content-sized — add `grid-auto-columns: 1fr` for equal width too. `height: 100%` belongs on nested card innards only.

## Container queries — respond to the component's space, not the viewport

Media queries ask "how wide is the screen"; component in a sidebar need "how wide am I". Name the container, query it, re-point custom properties exactly as with media queries:

```css
.card-slot {
  container: card / inline-size;
}
@container card (inline-size > 35ch) {
  .card {
    --card-direction: row;
    --card-gap: 2rem;
  }
}
```

- Size queries need `container-type: inline-size` (or the `container: name / inline-size` shorthand) on an _ancestor_ — element cannot size-query itself.
- Range syntax works: `@container (30ch <= inline-size <= 60ch)`.
- Container units `cqi` / `cqw` make values fluid to the container: `font-size: clamp(1.25rem, 5cqi, 2rem)`.
- Style queries — `@container style(--theme: dark) { ... }` — branch on a custom property's value; Baseline since May 2026 (Chrome 111, Safari 18, Firefox 151). Custom properties only: style queries on regular properties remain unimplemented in every engine.

Prefer container query over media query whenever trigger is "this component got narrow", not "this device is small".

## One-line upgrades

Modern properties retiring an old hack in one declaration. Default to these; treat hack they replace as refactor target.

| Upgrade                                 | Retires                                                               |
| --------------------------------------- | --------------------------------------------------------------------- |
| `aspect-ratio: 16 / 9`                  | padding-bottom percentage hack                                        |
| `object-fit: cover` on `<img>`          | `background-image` for content images (keeps semantics, `alt`)        |
| `margin-inline: auto` (+ logical props) | `margin-left/right: auto`; physical props that break RTL              |
| `width: fit-content`                    | display swaps / shrink-wrap hacks                                     |
| `text-wrap: balance` (headings)         | manual `<br>` in headlines                                            |
| `scroll-margin-top: 2rem`               | anchor targets hidden under sticky nav                                |
| `text-underline-offset: 0.25em`         | descender-crowded underlines                                          |
| `overscroll-behavior: contain`          | JS scroll-chaining guards on modals/drawers                           |
| `scrollbar-gutter: stable`              | layout shift when scrollbar appears (no effect w/ overlay scrollbars) |
| `color-scheme: light dark`              | hand-styled native controls/scrollbars per theme                      |
| `accent-color: var(--accent)`           | most custom checkbox / radio / range / progress CSS                   |

Line cap on `balance` is engine-set — Chromium balances up to 6 lines, Gecko uses its own threshold. `text-wrap: pretty` fixes body orphans as a Chrome/Safari enhancement (no Firefox), so ship it where a plain wrap is acceptable everywhere else.

## Selectors and layers

- **`:where()`** — zero specificity. Wrap design-system defaults so any consumer rule override without fight: `:where(.button) { ... }`.
- **`:is()`** — compact grouping, take highest specificity of its list. `.card :is(h2, h3)`.
- **`:has()`** — parent/quantity/variant selection from CSS. Quantity: `ul:has(li:nth-child(11)) { --compact: 1; }`. Variant detection: `.button:where(:has(svg)) { border-radius: 50%; }` — wrap in `:where()` to keep specificity flat.
- **`@layer`** — declare order once, `@layer reset, theme, components, utilities;` — first listed loses, and _unlayered_ styles beat all layers. `!important` inverts both: first listed wins, unlayered `!important` loses to every layer. `@property` registrations sit outside this — they resolve by document order, last registration in the document wins, and `CSS.registerProperty()` outranks every `@property` rule.
- **Owl spacing** — `.flow > * + * { margin-block-start: var(--flow-space, 1em); }` — rhythm without first/last-child exceptions.
