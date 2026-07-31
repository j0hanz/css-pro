# Shorthand

**Shorthands** set many properties one declaration — `margin: 10px 5px`, `border: 1px solid black`. Compress longhand sprawl one line. File cover: reset trap, value-count rules, per-property order high-traffic shorthands. Value naming: see [`TOKENS.md`](TOKENS.md). Process: see [`SKILL.md`](SKILL.md).

## The reset trap (read this first)

Shorthands **reset** every longhand they cover to that longhand's _initial_ value. Omitted values not preserved — wiped to default. Rule that bites.

```css
p {
  background-color: red;
  background: url('bg.gif') no-repeat left top; /* background-color is now transparent, not red */
}
```

Shorthand `background` reset `background-color` to `transparent`, omitted. Consequences, fixes:

- **Shorthand after longhand wipes longhand** — put kept longhand _after_ shorthand, or fold into shorthand.
- **Longhand after shorthand survives** — `background: url(...) no-repeat; background-color: red;` keep red.
- **Can't inherit one longhand by omission** — `inherit` applies whole property or not at all. Inherit single longhand: use that longhand with `inherit`, not shorthand.
- **Order across rules matters too** — later rule's shorthand reset what earlier rule's longhand set.
- **Compound shorthands reset hard** — `grid` reset `grid-template-*` _and_ `grid-auto-flow`, `-columns`, `-rows`. `flex` reset `flex-grow`, `-shrink`, `-basis`. `border` reset `border-width`, `-style`, `-color` _and_ per-side `border-*`. Use only when meaning set every longhand covered.

Reach for shorthand only when meaning set (or accept initial for) every longhand it covers. Keep prior longhand untouched: don't shorthand it — use longhand, or set kept value after.

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

Sides, corners use _same_ 1/2/3/4 pattern, different start points — sides top, corners top-left. Don't confuse.

`/` splits horizontal from vertical radii, elliptical corners: `border-radius: 50% / 25%` = 50% horizontal, 25% vertical.

## The `/` separator

Several shorthands use `/` split two value groups — learn slash, not just order:

- `background` — `position / size`
- `border-radius` — `horizontal / vertical`
- `border-image` — `slice / width / outset` (up to three slashes)
- `grid-area`, `grid-row`, `grid-column` — `start / end`

## Per-property order and rules

### `background`

`color image repeat attachment position` — where value types differ, order flexible. One hard rule: `position` before `/size`. `background-size` no standalone slot — set as `position / size`, or `background-size` longhand after. Omitted longhands **reset**, shorthand `background` wipes prior `background-color` unless restated.

```css
background: #fff url('bg.gif') no-repeat fixed center top / cover;
```

### `font`

`style weight variant size/line-height family` — `font-size`, `font-family` required; rest default `normal` if omitted. `line-height` joins `font-size` with `/`. Style/weight/variant before size; family last. Omitted longhands reset: `font-variant`, `font-stretch`, `font-size-adjust` snap `normal` / `none`.

```css
font:
  italic bold 0.8em/1.2 'Arial',
  sans-serif;
```

### `border`

`width style color` — `border-style` required or nothing renders; width, color default if omitted (`medium`, `currentcolor`). Per-side: `border-top`, `-right`, `-bottom`, `-left`. `border` also resets every per-side `border-*` longhand.

```css
border: 1px solid var(--color-border);
```

### `animation`

`duration timing-function delay iteration-count direction fill-mode play-state name` — no value syntactically required (every omitted longhand reset to initial — `duration` to `0s`, `name` to `none`), visible animation needs both duration, name. First `<time>` duration, second delay. Duration first so two times not misread.

```css
animation: 0.3s ease-in 0.1s 2 forwards slide-in;
```

### `transition`

`property duration timing-function delay` — first `<time>` duration, second delay. Multiple transitions comma-separated.

```css
transition:
  background-color 0.3s ease,
  transform 0.2s ease-out;
```

### `flex`

`grow shrink basis` — 1, 2, or 3 values, type-dependent rules:

| Values           | Meaning                                                                              |
| ---------------- | ------------------------------------------------------------------------------------ |
| `flex: 1`        | `grow 1`, `shrink 1`, `basis 0`                                                      |
| `flex: 1 2`      | `grow 1`, `shrink 2` (second a number) **or** `grow 1`, `basis 2em` (second a width) |
| `flex: 1 2 10em` | `grow 1`, `shrink 2`, `basis 10em`                                                   |

Single number sets grow; single width sets basis. Keywords set all three: `flex: auto` = `1 1 auto`, `flex: none` = `0 0 auto`.

### `gap` / `grid` / `place-*`

`gap: row column`; single value sets both. `place-content` / `place-items` / `place-self` set align then justify — `place-items: center stretch` (single value sets both).

### `grid-area`

`row-start / column-start / row-end / column-end` — omit `column-start`, copies `row-start`; use `span N` for end N tracks from start.

```css
grid-area: 1 / 2 / span 2 / span 3;
```

### `grid` / `grid-template`

`grid` heavyweight: sets `grid-template-rows`, `-columns`, `-areas` _and_ resets `grid-auto-flow`, `-rows`, `-columns`. Prefer `grid-template-rows/columns` (no auto reset) unless want reset. `grid-template` takes `rows / columns` or `rows / columns / areas`.
