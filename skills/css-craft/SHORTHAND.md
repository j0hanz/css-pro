# Shorthand

**Shorthands** set many properties one declaration — `margin: 10px 5px`, `border: 1px solid black`. Compress longhand sprawl one line. File cover: reset trap, value-count rules, per-property order high-traffic shorthands.

## The reset trap (read this first)

Shorthands **reset** every longhand they cover to that longhand's _initial_ value. Omitted values not preserved — wiped to default.

```css
p {
  background-color: red;
  background: url('bg.gif') no-repeat left top; /* background-color is now transparent, not red */
}
```

Shorthand `background` reset `background-color` to `transparent`, omitted. Consequences, fixes:

- **Shorthand after longhand wipes longhand** — declare kept longhand _after_ shorthand. Fold into shorthand instead when shorthand sets every longhand you care about anyway.
- **Longhand after shorthand survives** — `background: url(...) no-repeat; background-color: red;` keep red.
- **Can't inherit one longhand by omission** — `inherit` applies whole property or not at all. Inherit single longhand: use that longhand with `inherit`, not shorthand.
- **Order across rules matters too** — later rule's shorthand reset what earlier rule's longhand set.
- **Compound shorthands reset hard** — `grid` reset `grid-template-*` _and_ `grid-auto-flow`, `-columns`, `-rows`. `flex` reset `flex-grow`, `-shrink`, `-basis`. `border` reset `border-width`, `-style`, `-color`, per-side `border-*` _and_ `border-image` to `none` — `border` can't express an image, so prior `border-image` silently goes.

Reach for shorthand when meaning set (or accept initial for) every longhand it covers.

## Value-count syntax — box sides: TRBL

Box-side shorthands (`margin`, `padding`, `border-width`, `border-style`, `border-color`, `inset`, `scroll-margin`, `scroll-padding`) take 1–4 values, clockwise from top — **TRBL**, consonants of "trouble":

| Values                    | Meaning                     |
| ------------------------- | --------------------------- |
| `margin: 1em`             | all four sides              |
| `margin: 1em 2em`         | top/bottom, then left/right |
| `margin: 1em 2em 3em`     | top, left/right, bottom     |
| `margin: 1em 2em 3em 4em` | top, right, bottom, left    |

Collapse when pairs match: `1em 2em 1em 2em` → `1em 2em`; `1em 2em 1em` → `1em 2em` (bottom=top). `inset` (`top`/`right`/`bottom`/`left`) same order.

## Value-count syntax — box corners: TL TR BR BL

Corner shorthands (`border-radius`) take 1–4 values, clockwise from top-left:

| Values                           | Meaning                                               |
| -------------------------------- | ----------------------------------------------------- |
| `border-radius: 1em`             | all four corners                                      |
| `border-radius: 1em 2em`         | top-left + bottom-right, then top-right + bottom-left |
| `border-radius: 1em 2em 3em`     | top-left, top-right + bottom-left, bottom-right       |
| `border-radius: 1em 2em 3em 4em` | top-left, top-right, bottom-right, bottom-left        |

Sides, corners use _same_ 1/2/3/4 pattern, different start points — sides top, corners top-left.

`/` splits horizontal from vertical radii, elliptical corners: `border-radius: 50% / 25%` = 50% horizontal, 25% vertical.

## Logical box sides — and the corner that does not follow

Every box-side shorthand has a logical twin that maps to writing direction instead of screen edges. `margin-block` / `margin-inline`, `padding-block` / `padding-inline`, `border-block` / `border-inline`, `inset-block` / `inset-inline`. Two values only — start then end — because each names one axis:

| Physical                | Logical (horizontal-tb, LTR)            |
| ----------------------- | --------------------------------------- |
| `margin: 1em 2em`       | `margin-block: 1em; margin-inline: 2em` |
| `padding-left: 1em`     | `padding-inline-start: 1em`             |
| `border-top: 2px solid` | `border-block-start: 2px solid`         |
| `top: 0; bottom: 0`     | `inset-block: 0`                        |

`inset` itself is **physical** TRBL despite the name — `inset-block` / `inset-inline` are the logical ones.

**`border-radius` corners are physical, and there is no logical shorthand for them.** This is the trap: `border-inline-start` flips to the right edge under `direction: rtl`, and `border-radius: 0 1em 1em 0` does not move at all. A rail on one side with square corners on the other is the result, in exactly the component where someone reached for logical properties on purpose. The per-corner logical longhands exist — use them:

```css
/* Breaks in RTL: the rail flips, the corners do not. */
.callout {
  border-inline-start: 3px solid var(--accent);
  border-radius: 0 var(--radius) var(--radius) 0;
}

/* Holds: both follow writing direction. */
.callout {
  border-inline-start: 3px solid var(--accent);
  border-start-end-radius: var(--radius);
  border-end-end-radius: var(--radius);
}
```

Corner longhands read `border-<block>-<inline>-radius`: `border-start-start-radius`, `border-start-end-radius`, `border-end-start-radius`, `border-end-end-radius`. A uniform `border-radius: 1em` is direction-agnostic and needs none of this.

Mixing the two families is not itself a bug — `border-block-start` and `border-top` are the same edge in horizontal-tb. It bites in two places: RTL, where the inline axis flips, and vertical writing modes, where block and inline swap entirely. So a physical override of a logically-set edge (`h2 { border-block-start: … }` then `h2:first-of-type { border-top: none }`) resets nothing under `writing-mode: vertical-rl`.

## The `/` separator

Several shorthands use `/` split two value groups:

- `background` — `position / size`
- `border-radius` — `horizontal / vertical`
- `border-image` — `source slice / width / outset repeat` (two slashes max)
- `grid-area`, `grid-row`, `grid-column` — `start / end`

## Per-property order and rules

### `background`

`color image repeat attachment position` — where value types differ, order flexible. One hard rule: `position` before `/size`. `background-size` no standalone slot — set as `position / size`, or `background-size` longhand after.

```css
background: #fff url('bg.gif') no-repeat fixed center top / cover;
```

### `font`

`style weight variant size/line-height family` — `font-size`, `font-family` required; rest default `normal` if omitted. `line-height` joins `font-size` with `/`. Style/weight/variant before size; family last. Omitted `line-height` the one that bites — snaps back to `normal`, so `font: 1em Arial` after `line-height: 1.5` loses the 1.5. Same wipe hits `font-kerning`, `font-optical-sizing`, `font-feature-settings`, `font-variation-settings`, `font-language-override`, `font-stretch`, `font-size-adjust`, every `font-variant-*`.

```css
font:
  italic bold 0.8em/1.2 'Arial',
  sans-serif;
```

### `border`

`width style color` — `border-style` required or nothing renders; width, color default if omitted (`medium`, `currentcolor`). Per-side: `border-top`, `-right`, `-bottom`, `-left`.

```css
border: 1px solid var(--color-border);
```

### `animation`

`duration timing-function delay iteration-count direction fill-mode play-state name` — no value syntactically required (every omitted longhand reset to initial — `duration` to `0s`, `name` to `none`), visible animation needs both duration, name. First `<time>` duration, second delay. Duration first so two times not misread. Also resets `animation-timeline` to `auto` and `animation-range-start` / `-end` to `normal`, so a prior `animation-timeline: scroll()` or `animation-range-start: 20%` goes — set them after the shorthand. Leaves `animation-composition` alone.

```css
animation: 0.3s ease-in 0.1s 2 forwards slide-in;
```

### `transition`

`property duration timing-function delay || <transition-behavior>` — five longhands. First `<time>` duration, second delay. Multiple transitions comma-separated. Omitted behaviour resets `transition-behavior` to `normal`, which drops discrete properties: `transition: display 1s allow-discrete` to carry `display` through. Chrome 117 / Safari 17.4 / Firefox 129.

```css
transition:
  background-color 0.3s ease,
  transform 0.2s ease-out;
```

### `flex`

`grow shrink basis` — 1, 2, or 3 values, type-dependent rules:

| Values           | Meaning                                                                              |
| ---------------- | ------------------------------------------------------------------------------------ |
| `flex: 1`        | `grow 1`, `shrink 1`, `basis 0%`                                                     |
| `flex: 1 2`      | `grow 1`, `shrink 2` (second a number) **or** `grow 1`, `basis 2em` (second a width) |
| `flex: 1 2 10em` | `grow 1`, `shrink 2`, `basis 10em`                                                   |

Single number sets grow, basis `0%` — percentage, not `0px`, and the two differ once the container's main size is indefinite. Single width sets basis. Keywords set all three: `flex: auto` = `1 1 auto`, `flex: none` = `0 0 auto`.

### `gap` / `grid` / `place-*`

`gap: row column`; single value sets both. `place-content` / `place-items` / `place-self` set align then justify — `place-items: center stretch` (single value sets both).

### `grid-area`

`row-start / column-start / row-end / column-end` — omitted `column-start` copies `row-start` only when `row-start` is a `<custom-ident>` (named line); otherwise `auto`. Same condition governs each omitted `*-end`. So `grid-area: main` = `main / main / main / main`, `grid-area: 2` = `2 / auto / auto / auto`. Use `span N` for end N tracks from start.

```css
grid-area: 1 / 2 / span 2 / span 3;
```

### `grid` / `grid-template`

`grid` heavyweight: sets `grid-template-rows`, `-columns`, `-areas`, plus the auto-placement reset above. Prefer `grid-template-rows/columns` unless want that reset. `grid-template` takes `rows / columns` or `rows / columns / areas`.
