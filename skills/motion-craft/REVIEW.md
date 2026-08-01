# Reviewing a motion diff

Specialized review: measure animation/motion code against bar in `SKILL.md`. Scope is motion in the diff, nothing else — general review asked, decline, say out of scope.

Transition "works" but sluggish, wrong origin, fires too often, drops frames = regression, not pass. **Default to flagging; approval earned** — unsure if motion feels right, strongest move often delete it, not guess.

## Flag these on sight

`transition: all`; `scale(0)` or pure-fade entrances with no initial transform; `ease-in` on any UI interaction, or a built-in easing on entering/exiting or on-screen movement where an `--ease-*` token belongs (hover and colour changes keep `ease`); animation on keyboard shortcut / command-palette toggle / 100+per-day action; UI duration > 300ms with no stated reason (modals and drawers sit outside that bar — 200–500ms); `transform-origin: center` on trigger-anchored popover/dropdown/tooltip; keyframes on toasts/toggles/anything added or triggered rapidly; animating layout properties (`width`/`height`/`margin`/`padding`/`top`/`left`); Framer Motion `x`/`y`/`scale` shorthands where a full `transform` string would hand the animation off; updating CSS variable on parent to drive child transform; missing `prefers-reduced-motion` handling on movement; ungated `:hover` motion; symmetric enter/exit timing on press-and-release or hold; everything-at-once entrance where 30–80ms stagger belongs.

## Output format

Two parts, this order.

**Part 1 — Findings table.** Single markdown table, one row per issue.

| Before                                | After                                  | Why                                                                       |
| ------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| `transition: all 300ms`               | `transition: transform 200ms ease-out` | Specify exact properties; `all` animates unintended properties off-GPU    |
| `transform: scale(0)`                 | `transform: scale(0.95); opacity: 0`   | Nothing appears from nothing — `scale(0)` looks like it came from nowhere |
| `ease-in` on dropdown                 | `ease-out` + custom curve              | `ease-in` delays the moment user watches most; feels sluggish             |
| `transform-origin: center` on popover | `var(--transform-origin)` (Base UI)    | Popovers scale from trigger, not center (modals exempt)                   |

**Part 2 — Verdict.** Group remaining commentary by impact, highest first.

Close with explicit decision. **Block** on a measurable defect — non-GPU animation with easy GPU fix, missing `prefers-reduced-motion` on movement — or on a design judgment: feel-breaking regression, animation on keyboard/high-frequency action, `scale(0)` or `ease-in` on UI. Say which kind each blocking item is. **Approve** — no feel-breaking regressions, no obvious motion to delete, durations/easing within bounds, interruptibility handled where needed, reduced-motion respected. Cite `file:line`, and pull exact values from [`SKILL.md`](SKILL.md) — durations, `--ease-*` tokens, press and entrance scale values, stagger, asymmetric enter/exit timing, the composited-property list and the Framer shorthand rule all live there. Blur ceiling and `will-change` scope are in [`TECHNIQUES.md`](TECHNIQUES.md).

When feel can't be judged from code alone, say so and point at `## Debugging` in [`TECHNIQUES.md`](TECHNIQUES.md).
