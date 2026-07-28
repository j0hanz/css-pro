# Shorthand

**Shorthand** set many properties one declaration — `margin: 10px 5px`, `border: 1px solid black`. Compress longhand sprawl to one line. This shorthand layer: reset trap, value-count rules, per-property order for high-traffic shorthands. Naming values: see [`TOKENS.md`](TOKENS.md). Process: see [`SKILL.md`](SKILL.md).

## The reset trap (read this first)

Shorthand **reset** every longhand it cover to that longhand's _initial_ value. Omitted values not preserved — wiped to default. This the rule that bite.

```css
p {
  background-color: red;
  background: url('bg.gif') no-repeat left top; /* background-color is now transparent, not red */
}
```

Shorthand `background` reset `background-color` to `transparent` because omitted. Consequences and fixes:

- **Shorthand after longhand wipes the longhand** — put longhand you keep _after_ shorthand, or fold into shorthand.
- **Longhand after shorthand survives** — `background: url(...) no-repeat; background-color: red;` keep red.
- **You cannot inherit one longhand by omission** — `inherit` apply to whole property or not at all. Inherit single longhand: use that longhand with `inherit`, not shorthand.
- **Order across rules matters too** — later rule's shorthand reset what earlier rule's longhand set.
- **Compound shorthands reset hard** — `grid` reset `grid-template-*` _and_ `grid-auto-flow`, `-columns`, `-rows`. `flex` reset `flex-grow`, `-shrink`, `-basis`. `border` reset `border-width`, `-style`, `-color` _and_ per-side `border-*`. Use only when mean to set every longhand they cover.

Reach for shorthand only when mean to set (or accept initial for) every longhand it cover. Keep prior longhand untouched: don't use shorthand for it — use longhand, or set kept value after.

## Value-count syntax — box sides: TRBL

Box-side shorthands (`margin`, `padding`, `border-width`, `border-style`, `border-color`, `inset`, `scroll-margin`, `scroll-padding`) take 1–4 values, clockwise from top — **TRBL**, consonants of "trouble":

| Values                    | Meaning                     |
| ------------------------- | --------------------------- |
| `margin: 1em`             | all four sides              |
| `margin: 1em 2em`         | top/bottom, then left/right |
| `margin: 1em 2em 3em`     | top, left/right, bottom     |
| `margin: 1em 2em 3em 4em` | top, right, bottom, left    |

Collapse when pairs match: `1em 2em 1em 2em` → `1em 2em`; `1em 2em 1em` → `1em 2em` (bottom=top). `inset` (`top`/`right`/`bottom`/`left`) follow same order.

## Value-count syntax — box corners: TL TR BR BL

Corner shorthands (`border-radius`) take 1–4 values, clockwise from top-left:

| Values                           | Meaning                                               |
| -------------------------------- | ----------------------------------------------------- |
| `border-radius: 1em`             | all four corners                                      |
| `border-radius: 1em 2em`         | top-left + bottom-right, then top-right + bottom-left |
| `border-radius: 1em 2em 3em`     | top-left, top-right + bottom-left, bottom-right       |
| `border-radius: 1em 2em 3em 4em` | top-left, top-right, bottom-right, bottom-left        |

Sides and corners use _same_ 1/2/3/4 pattern but start different points — sides at top, corners at top-left. Don't mix up.

`/` split horizontal from vertical radii for elliptical corners: `border-radius: 50% / 25%` = 50% horizontal, 25% vertical.

## The `/` separator

Several shorthands use `/` to split two value groups — learn slash, not just order:

- `background` — `position / size`
- `border-radius` — `horizontal / vertical`
- `border-image` — `slice / width / outset` (up to three slashes)
- `grid-area`, `grid-row`, `grid-column` — `start / end`

## Per-property order and rules

### `background`

`color image repeat attachment position` — where value types differ, order flexible. One hard rule: `position` must come before `/size`. `background-size` has no standalone slot — set as `position / size`, or as `background-size` longhand after. Omitted longhands **reset**, so shorthand `background` wipe prior `background-color` unless restated.

```css
background: #fff url('bg.gif') no-repeat fixed center top / cover;
```

### `font`

`style weight variant size/line-height family` — `font-size` and `font-family` required; rest default `normal` if omitted. `line-height` join `font-size` with `/`. Style/weight/variant come before size; family go last. Omitted longhands reset: `font-variant`, `font-stretch`, `font-size-adjust` snap to `normal` / `none`.

```css
font:
  italic bold 0.8em/1.2 'Arial',
  sans-serif;
```

### `border`

`width style color` — `border-style` required or nothing render; width and color default if omitted (`medium`, `currentcolor`). Per-side: `border-top`, `-right`, `-bottom`, `-left`. `border` also reset every per-side `border-*` longhand.

```css
border: 1px solid var(--color-border);
```

### `animation`

`duration timing-function delay iteration-count direction fill-mode play-state name` — no value syntactically required (every omitted longhand reset to initial — `duration` to `0s`, `name` to `none`), so visible animation need both duration and name. First `<time>` is duration, second is delay. Give duration first so two times not misread.

```css
animation: 0.3s ease-in 0.1s 2 forwards slide-in;
```

### `transition`

`property duration timing-function delay` — first `<time>` is duration, second is delay. Multiple transitions comma-separated.

```css
transition:
  background-color 0.3s ease,
  transform 0.2s ease-out;
```

### `flex`

`grow shrink basis` — 1, 2, or 3 values, type-dependent rules:

| Values           | Meaning                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `flex: 1`        | `grow 1`, `shrink 1`, `basis 0`                                                            |
| `flex: 1 2`      | `grow 1`, `shrink 2` (second is a number) **or** `grow 1`, `basis 2em` (second is a width) |
| `flex: 1 2 10em` | `grow 1`, `shrink 2`, `basis 10em`                                                         |

Single number set grow; single width set basis. Keywords set all three: `flex: auto` = `1 1 auto`, `flex: none` = `0 0 auto`.

### `gap` / `grid` / `place-*`

`gap: row column`; single value set both. `place-content` / `place-items` / `place-self` set align then justify — `place-items: center stretch` (single value set both).

### `grid-area`

`row-start / column-start / row-end / column-end` — omit `column-start` and it copy `row-start`; use `span N` for end N tracks from start.

```css
grid-area: 1 / 2 / span 2 / span 3;
```

### `grid` / `grid-template`

`grid` is heavyweight: set `grid-template-rows`, `-columns`, `-areas` _and_ reset `grid-auto-flow`, `-rows`, `-columns`. Prefer `grid-template-rows/columns` (no auto reset) unless want reset. `grid-template` take `rows / columns` or `rows / columns / areas`.
