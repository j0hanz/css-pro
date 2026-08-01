# Reviewing a motion diff

Specialized review: measure animation/motion code against bar in `SKILL.md`. Scope is motion in the diff, nothing else — general review asked, decline, say out of scope.

Bias toward motion that _feels right_, not motion that just runs. Transition "works" but sluggish, wrong origin, fires too often, drops frames = regression, not pass. **Default to flagging; approval earned** — unsure if motion feels right, strongest move often delete it, not guess.

## Flag these on sight

`transition: all`; `scale(0)` or pure-fade entrances with no initial transform; `ease-in` on any UI interaction or weak built-in easing on deliberate animation; animation on keyboard shortcut / command-palette toggle / 100+per-day action; UI duration > 300ms with no stated reason; `transform-origin: center` on trigger-anchored popover/dropdown/tooltip; keyframes on toasts/toggles/anything added or triggered rapidly; animating layout properties (`width`/`height`/`margin`/`padding`/`top`/`left`); Framer Motion `x`/`y`/`scale` shorthands on motion running while page busy; updating CSS variable on parent to drive child transform; missing `prefers-reduced-motion` handling on movement; ungated `:hover` motion; symmetric enter/exit timing on press-and-release or hold; everything-at-once entrance where 30–80ms stagger belongs.

## Remedial preference — delete first

Proposing fixes, prefer earlier moves over later: **delete** animation (high-frequency / no purpose / keyboard-triggered); then **reduce** it (shorter duration, smaller transform, fewer properties); then **fix easing** (`ease-in` → `ease-out`/custom curve); then **fix origin/physicality** (correct `transform-origin`, replace `scale(0)` with `scale(0.95)` + opacity); then **make interruptible** (keyframes → transitions, or spring for gesture-driven motion); then **move to GPU** (layout props → `transform`/`opacity`, shorthand → full `transform` string, WAAPI for programmatic CSS); then **asymmetric timing** (slow deliberate phase, snap response); then **polish** (blur to mask crossfades, stagger for groups, `@starting-style` for entry, spring for "alive" elements); then **accessibility & cohesion** (reduced-motion + hover gating, tune to component's personality).

## Output format

Two parts, this order.

**Part 1 — Findings table.** Single markdown table, one row per issue. Never "Before:/After:" list.

| Before                                | After                                  | Why                                                                       |
| ------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| `transition: all 300ms`               | `transition: transform 200ms ease-out` | Specify exact properties; `all` animates unintended properties off-GPU    |
| `transform: scale(0)`                 | `transform: scale(0.95); opacity: 0`   | Nothing appears from nothing — `scale(0)` looks like it came from nowhere |
| `ease-in` on dropdown                 | `ease-out` + custom curve              | `ease-in` delays the moment user watches most; feels sluggish             |
| `transform-origin: center` on popover | `var(--transform-origin)` (Base UI)    | Popovers scale from trigger, not center (modals exempt)                   |

**Part 2 — Verdict.** Group remaining commentary by impact tier, highest first; omit empty tiers: (1) feel-breaking regressions — sluggish easing, comes-from-nowhere, fires on high-frequency/keyboard actions; (2) missed simplifications — animations to remove or drastically reduce; (3) performance — non-GPU properties, dropped-frame risks, recalc storms; (4) interruptibility & timing — keyframes where transitions/springs belong, symmetric timing that should be asymmetric; (5) origin, physicality & cohesion — wrong origin, mismatched personality, jarring crossfades; (6) accessibility — reduced-motion and pointer/hover gating.

Close with explicit decision: **Block** — any feel-breaking regression, animation on keyboard/high-frequency action, `scale(0)`/`ease-in` on UI, or non-GPU animation with easy GPU fix. **Approve** — no feel-breaking regressions, no obvious motion to delete, durations/easing within bounds, interruptibility handled where needed, reduced-motion respected. Cite `file:line`, and when value needed pull exact one from `SKILL.md`, no approximating.

When feel can't be judged from code alone, say so and point at the slow-motion method in [`TECHNIQUES.md`](TECHNIQUES.md); don't guess.
