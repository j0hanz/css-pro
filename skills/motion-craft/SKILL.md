---
name: motion-craft
description: Web animation — use when deciding whether and how to animate (duration, easing curve, spring vs transition, prefers-reduced-motion), when building an entrance, hover, popover, drawer, or scroll reveal, when reviewing animation in a diff, or when naming an effect from a vague description. Not for transition/animation shorthand syntax or custom-property mechanics — css-craft.
---

# Motion Craft

Prescriptive half of motion: what good motion _is_, how to _decide_ it, how to _review_ it.

Holding a description but not the name — "bouncy thing when the popover opens", "the fill that runs while you hold the button" — open [`GLOSSARY.md`](GLOSSARY.md): reverse lookup, description in, term out, plus the vs-notes separating the pairs that get confused (clip-path vs mask, shared element vs layout animation, asymmetric easing vs asymmetric timing).

## The decision engine

Four constraints every animation satisfies before it ships. Any order.

**1. Should this animate at all?** Frequency user sees it decides almost everything: motion on daily-repeated thing feels slow, delayed, disconnected. Raycast ships no open/close animation — correct for something used hundreds times a day. Count deliberate actions; a pointer passing over a hover target is incidental, gated by the hover rule under Accessibility rather than counted here.

| Frequency                                                   | Decision                     |
| ----------------------------------------------------------- | ---------------------------- |
| 100+ times/day (keyboard shortcuts, command palette toggle) | No animation. Ever.          |
| 10–99 times/day (list navigation, tab switching)            | Remove or drastically reduce |
| 1–9 times/day (modals, drawers, toasts)                     | Standard animation           |
| Less than daily (onboarding, feedback, celebrations)        | Can add delight              |

**2. What's the purpose?** Every animation needs one: **spatial consistency** (toast enter/exit same edge, swipe-to-dismiss feels intuitive), **state indication** (morphing feedback button shows change), **explanation** (marketing animation showing feature works), **feedback** (button scales down on press, confirms interface heard user), or **preventing jarring change** (elements appear/vanish with no bridge feel broken). "Looks cool" not on list — if that's only purpose and user sees it often, skip.

**3. What easing?** Decide by what element does. Entering/exiting → `ease-out` (fast start, feels responsive). Moving/morphing on screen → `ease-in-out` (natural accel then decel). Hover/color change → `ease`. Constant motion (marquee, progress bar) → `linear`, and any loop running past 5s ships a visible pause/stop control (WCAG 2.2.2). Default → `ease-out`.

Built-in CSS easings too weak for deliberate motion — lack punch that makes animation feel intentional. Use strong custom curves, keep as tokens:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1); /* strong ease-out for UI interactions */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* strong ease-in-out for on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1); /* iOS-like drawer curve (Ionic) */
```

`ease-out` on every UI interaction: motion covers most ground in the first frames, exact moment user watches most closely, so 200ms `ease-out` dropdown _feels_ faster than same 200ms on a slow-starting curve. Tokens above are the default set; when a curve needs more punch than they carry, pull a stronger variant from [easing.dev](https://easing.dev/).

**4. How fast?** Most UI animations stay under 300ms — 180ms dropdown feels more responsive than 400ms one, faster-spinning spinner makes app feel it loads faster even when load time same. Modals and drawers sit outside that bar: bigger surface, longer travel, 200–500ms.

| Element                  | Duration      |
| ------------------------ | ------------- |
| Button press feedback    | 100–160ms     |
| Tooltips, small popovers | 125–200ms     |
| Dropdowns, selects       | 150–250ms     |
| Modals, drawers          | 200–500ms     |
| Marketing / explanatory  | Can be longer |

Group entering together staggers 30–80ms between items — longer delays make the interface feel slow.

Press-and-release and hold interactions run enter and exit at different lengths: slow where the user is deciding (hold-to-delete, 2s linear), snappy where the system responds (200ms ease-out). Symmetric timing on either is a finding.

## Springs

Springs feel natural — simulate physics, no fixed duration; settle on own params. Use for drag interactions with momentum, elements that should feel "alive" (Apple's Dynamic Island), gestures interruptible mid-animation, decorative mouse-tracking.

**Drag, swipe, flick, or any pointer-driven motion — read [`PHYSICS.md`](PHYSICS.md) before writing it.** That file owns the feel: respond on pointer-_down_ rather than release, interruptibility (grab moving element mid-flight, reverse it), `setPointerCapture` so tracking survives leaving element, ~10px hysteresis and tap hit-padding, velocity handoff at release, Apple's momentum-projection function, rubber-band formula, frame-level smoothness. Spring config stays here.

```js
// Apple-style (easier to reason about) — recommended
{ type: "spring", visualDuration: 0.5, bounce: 0.2 }

// Traditional physics (more control)
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

`visualDuration` is time spring takes to visually reach target — Apple's `response`; plain `duration` is the whole settle including the tail, so Apple-style numbers belong on `visualDuration`. Keep bounce 0.1–0.3, on drag-to-dismiss and playful interactions. Velocity is what you buy: spring reverse smoothly from current position when you click expanded item then immediately press Escape.

For decorative mouse interactions, tie visual changes to spring (`useSpring` in Motion/Framer Motion) instead of directly to mouse position — direct mapping feels artificial, lacks motion; spring interpolates with momentum. Only when motion decorative; for functional graph in banking app, no animation better.

## Component building

**Buttons must feel responsive.** Add `transform: scale(0.97)` on `:active` — instant feedback UI is listening. Scale subtle (0.95–0.98), applies to any pressable element; `scale()` scales children too (font, icons, content) — feature for press feedback.

```css
.button {
  transition: transform 160ms ease-out;
}
.button:active {
  transform: scale(0.97);
}
```

**Start entrances at `scale(0.9)` or higher, combined with opacity.** Nothing in real world appears from nothing — element needs visible shape to grow out of. Even barely-visible initial scale makes entrance feel natural, like balloon that has visible shape even deflated.

**Make popovers origin-aware.** Popovers, dropdowns, tooltips should scale in from trigger, not center — default `transform-origin: center` wrong for almost every trigger-anchored surface. **Modals are exception:** not anchored to trigger, appear centered in viewport, so `transform-origin: center` correct there.

```css
.popover {
  transform-origin: var(--transform-origin);
} /* Base UI */
```

**Pick the driver by what starts the motion.** Discrete state change (open/close, hover, mount) → CSS transition: retargets mid-flight, so rapidly toggled state stays smooth. Continuous gesture (drag, swipe, flick) → spring: animates from the current on-screen value and carries velocity, which a transition cannot. `@keyframes` only where nothing interrupts — they restart from zero.

**Name every animated property, and keep them off layout.** `transform` and `opacity` are the default — skip layout and paint, composite in every engine. `filter`, `background-color` and `clip-path` composite only where an engine has landed it — `filter` in Chromium and WebKit, `clip-path` Chromium-only today — so price them as a repaint elsewhere, and keep `blur()` radius small either way. `padding`, `margin`, `height`, `width`, `top`, `left` run layout, paint and composite every frame. `transition: all` is a finding — it animates whatever else happens to change, off GPU. Write `transition: transform 200ms ease-out`.

**Set `transform` direct on the moving element.** Custom property on parent recalculates styles for every child, so drawer with many rows pays full recalc each frame. Motion / Framer Motion's `x`/`y`/`scale` compile to a `transform` assembled from custom properties, and custom-property transforms accelerate in no engine today — Motion writes them per frame from `requestAnimationFrame`, so they stutter on a page also loading and painting. Hand Motion a full `transform` string and it hands the animation to WAAPI, driver included.

[`TECHNIQUES.md`](TECHNIQUES.md) holds the build detail behind every rule above. Open the section the task touches:

- **Shipping any animation** — "Performance": `box-shadow` on a pseudo-element instead of the box, `will-change` scope and when to take it off, CSS animation vs WAAPI.
- **Several items entering, or a list reordering** — "Stagger, cohesion, asymmetric timing": stagger sample with its reduced-motion branch, matching motion to component personality, the 2s/200ms hold recipe.
- **Popover, dialog, toast, anything appearing** — "Animate enter states with `@starting-style`": the first-render form, plus `display`, `overlay` and `allow-discrete` for anything toggled through `display: none`.
- **Reveals, wipes, progress fills, comparison sliders, 3D** — "CSS transforms & clip-path": `inset()` recipes, and the `perspective` without which 3D just squashes.
- **Tooltips** — "Tooltips: skip delay on subsequent hovers".
- **Crossfade that still feels off** — "Use blur to mask imperfect transitions", with the cost ceiling.
- **Drag dismissal, multi-touch** — "Gestures & drag" (the feel itself is [`PHYSICS.md`](PHYSICS.md), above).
- **Animation runs but looks wrong** — "Debugging": replay at 2–5× duration, and what to look for there.

Shape-function syntax itself — `inset` `xywh` `rect` `polygon` `path` `shape` — belongs to css-craft's `FUNCTIONS.md`.

## Accessibility

`prefers-reduced-motion` means fewer and gentler animations, **not zero** — keep opacity and color transitions that aid comprehension, remove movement and position changes. Gate hover animations behind `@media (hover: hover) and (pointer: fine)` — touch devices trigger hover on tap, cause false positives. (`prefers-reduced-transparency`, `prefers-contrast`, and vestibular specifics — see [`PHYSICS.md`](PHYSICS.md).)

```css
@media (prefers-reduced-motion: reduce) {
  .element {
    animation: fade 0.2s ease; /* no transform-based motion */
  }
}
@media (hover: hover) and (pointer: fine) {
  .element:hover {
    transform: scale(1.05);
  }
}
```

Motion / Framer Motion needs the same branch in JS — `useReducedMotion()` recipe under "Reduced motion in JS" in [`TECHNIQUES.md`](TECHNIQUES.md).

## Done when

Every line true before animation ships. Conditional lines pass untouched when condition absent.

- All four decision-engine constraints settled: animates or not, purpose named, easing picked, duration picked.
- Easing is an `--ease-*` token, or `ease`/`linear` where Q3 assigns them; duration inside the band for that element type.
- Every animated property named explicitly, `transform` and `opacity` by default; anything else priced against the exceptions above.
- `transform-origin` matches the surface: trigger-anchored → trigger, modal → center.
- Driver matches the trigger: transition for discrete state change, spring for continuous gesture.
- Entrances start at `scale(0.9)` or higher, paired with opacity.
- Pressable elements carry press feedback — `scale(0.95–0.98)` on `:active`.
- `prefers-reduced-motion` branch written: opacity and color kept, movement dropped.
- _Group of items entering:_ staggered 30–80ms apart rather than landing at once.
- _Press-and-release or hold:_ enter and exit timings differ (slow in, snappy out).
- _Hover motion:_ gated behind `@media (hover: hover) and (pointer: fine)`.
- _Loop running past 5s:_ pause/stop control shipped with it.

## Reviewing a motion diff

Reviewing animation/motion code in diff, open [`REVIEW.md`](REVIEW.md) — holds the canonical "Flag these on sight" list and the output format: Before/After/Why findings table, then commentary grouped by impact, closing on a Block/Approve verdict.
