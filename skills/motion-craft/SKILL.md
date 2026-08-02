---
name: motion-craft
description: Web animation — use when deciding whether and how to animate (duration, easing curve, spring vs transition, prefers-reduced-motion), when building an entrance, hover, popover, drawer, scroll reveal, or drag/swipe gesture, when an animation stutters or feels wrong, or when naming an effect from a vague description. Not for transition/animation shorthand syntax or custom-property mechanics — css-craft; not review — css-audit.
---

# Motion Craft

`## Done when` at the bottom is the bar; sections above carry the values it cites.

- Holding a description but not the name — "bouncy thing when the popover opens", "the fill that runs while you hold the button" → [`GLOSSARY.md`](GLOSSARY.md): description in, term out, plus vs-notes separating the pairs that get confused.
- Drag, swipe, flick, or any pointer-driven motion → [`PHYSICS.md`](PHYSICS.md) **before writing it**: response on pointer-down, interruptibility, `setPointerCapture`, gesture hysteresis, velocity handoff, momentum projection, rubber-banding, frame-level smoothness, hinting mid-gesture, symmetric enter/exit paths, and how a glass or blurred surface materialises rather than fades.
- Build detail behind every rule here → [`TECHNIQUES.md`](TECHNIQUES.md), section list under **Component building**.

## The decision engine

Four constraints every animation satisfies before it ships — **frequency**, **purpose**, **easing**, **duration**. Any order.

**Frequency — should this animate at all?** Count deliberate actions; a pointer passing over a hover target is incidental, gated by the hover rule under Accessibility rather than counted here. Raycast ships no open/close animation — correct for something used hundreds times a day.

| Frequency                                                   | Decision                     |
| ----------------------------------------------------------- | ---------------------------- |
| 100+ times/day (keyboard shortcuts, command palette toggle) | No animation. Ever.          |
| 10–99 times/day (list navigation, tab switching)            | Remove or drastically reduce |
| 1–9 times/day (modals, drawers, toasts)                     | Standard animation           |
| Less than daily (onboarding, feedback, celebrations)        | Can add delight              |

**Purpose — what is it for?** Every animation needs one: **spatial consistency** (toast enter/exit same edge, swipe-to-dismiss feels intuitive), **state indication** (morphing feedback button shows change), **explanation** (marketing animation showing feature works), **feedback** (button scales down on press, confirms interface heard user), or **preventing jarring change** (elements appear/vanish with no bridge feel broken). "Looks cool" not on list — if that's only purpose and user sees it often, skip.

**Easing — which curve?** Decide by what element does. Entering/exiting → `ease-out`. Moving/morphing on screen → `ease-in-out` (natural accel then decel). Hover/color change → `ease`. Constant motion (marquee, progress bar) → `linear`. Default → `ease-out`: motion covers most ground in the first frames, exact moment user watches most closely, so 200ms `ease-out` dropdown _feels_ faster than same 200ms on a slow-starting curve.

Built-in CSS easings too weak for deliberate motion — lack punch that makes animation feel intentional. Use strong custom curves, keep as tokens:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1); /* strong ease-out for UI interactions */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* strong ease-in-out for on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1); /* iOS-like drawer curve (Ionic) */
```

Tokens above are the default set; when a curve needs more punch than they carry, pull a stronger variant from [easing.dev](https://easing.dev/).

**Duration — how fast?** Most UI animations stay under 300ms — 180ms dropdown feels more responsive than 400ms one, and a faster-spinning spinner makes the app feel like it loads faster even when load time same.

| Element                  | Duration      |
| ------------------------ | ------------- |
| Button press feedback    | 100–160ms     |
| Tooltips, small popovers | 125–200ms     |
| Dropdowns, selects       | 150–250ms     |
| Modals, drawers          | 200–500ms     |
| Marketing / explanatory  | Can be longer |

Press-and-release and hold interactions run enter and exit at different lengths: slow where the user is deciding (hold-to-delete, 2s linear), snappy where the system responds (200ms ease-out).

## Springs

Springs have no fixed duration — settle from own parameters, animate from current on-screen value, carry velocity. That velocity is what you buy: spring reverse smoothly from where the pixels are when you click an expanded item then immediately press Escape.

```js
// Apple-style (easier to reason about) — recommended
{ type: "spring", visualDuration: 0.5, bounce: 0.2 }

// Traditional physics (more control)
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

Apple-style numbers belong on `visualDuration`, never plain `duration` — mapping between the two spring vocabularies in [`PHYSICS.md`](PHYSICS.md). Keep bounce 0.1–0.3, on drag-to-dismiss and playful interactions.

For decorative mouse interactions, tie visual changes to spring (`useSpring` in Motion / Framer Motion) instead of directly to mouse position — direct mapping feels artificial, lacks momentum. Only when motion decorative; for functional graph in banking app, no animation better.

## Component building

**Pick the driver by what starts the motion.** Discrete state change (open/close, hover, mount) → CSS transition: retargets mid-flight, so rapidly toggled state stays smooth. Continuous gesture (drag, swipe, flick) → spring: animates from the current on-screen value and carries velocity, which a transition cannot. `@keyframes` only where nothing interrupts — they restart from zero.

**Buttons must feel responsive.** Press feedback tells the user the UI is listening. `scale()` scales children too (font, icons, content) — feature here, not bug.

```css
.button {
  transition: transform 160ms ease-out;
}
.button:active {
  transform: scale(0.97);
}
```

**Entrances need a visible shape to grow out of.** Nothing in real world appears from nothing, so `scale(0)` reads as coming from nowhere; even barely-visible initial scale makes entrance feel natural, like balloon that has visible shape even deflated.

**Make popovers origin-aware.** Popovers, dropdowns, tooltips scale in from trigger, so default `transform-origin: center` wrong for almost every trigger-anchored surface. **Modals are exception:** not anchored to trigger, appear centered in viewport, so center correct there.

```css
.popover {
  transform-origin: var(--transform-origin);
} /* Base UI */
```

**Name every animated property, and keep them off layout.** `transform` and `opacity` are the default — skip layout and paint, composite in every engine. `filter`, `background-color` and `clip-path` composite only where an engine has landed it — `filter` in Chromium and WebKit, `clip-path` Chromium-only today — so price them as a repaint elsewhere, and keep `blur()` radius small either way. `padding`, `margin`, `height`, `width`, `top`, `left` run layout, paint and composite every frame. `transition: all` animates whatever else happens to change, off GPU.

**Set `transform` direct on the moving element.** Custom property on a parent recalculates styles for every child each frame, and custom-property transforms accelerate in no engine today — so a full `transform` string is what hands the animation to WAAPI, driver included. Cost detail and code in [`TECHNIQUES.md`](TECHNIQUES.md).

[`TECHNIQUES.md`](TECHNIQUES.md) — open the section the task touches:

- **Shipping any animation** — "Performance": `box-shadow` on a pseudo-element instead of the box, `will-change` scope and when to take it off, CSS animation vs WAAPI.
- **Several items entering, or a list reordering** — "Stagger, cohesion, asymmetric timing": stagger sample with its reduced-motion branch, matching motion to component personality, the 2s/200ms hold recipe.
- **Popover, dialog, toast, anything appearing** — "Animate enter states with `@starting-style`": the first-render form, plus `display`, `overlay` and `allow-discrete` for anything toggled through `display: none`.
- **Reveals, wipes, progress fills, comparison sliders, 3D** — "CSS transforms & clip-path": `inset()` recipes, and the `perspective` without which 3D just squashes.
- **Tooltips** — "Tooltips: skip delay on subsequent hovers".
- **Crossfade that still feels off** — "Use blur to mask imperfect transitions", with the cost ceiling.
- **Drag dismissal, multi-touch** — "Gestures & drag".
- **Animation runs but looks wrong** — "Debugging": replay at 2–5× duration, and what to look for there.

Shape-function syntax itself — `inset` `xywh` `rect` `polygon` `path` `shape` — belongs to css-craft's `FUNCTIONS.md`.

## Accessibility

`prefers-reduced-motion` means fewer and gentler animations, **not zero** — keep opacity and color transitions that aid comprehension, remove movement and position changes. Gate hover animations behind `@media (hover: hover) and (pointer: fine)` — touch devices trigger hover on tap, cause false positives. A loop running past 5s ships a visible pause/stop control (WCAG 2.2.2). (`prefers-reduced-transparency`, `prefers-contrast`, and vestibular specifics — see [`PHYSICS.md`](PHYSICS.md).)

**`scroll-behavior: smooth` is an animation and gets the same branch.** Easiest one to forget: it carries no `@keyframes`, no `transition`, no duration, so it does not look like motion in the source — but one line on `html` animates every in-page jump on the site, and moving the whole viewport is the largest movement on the page (WCAG 2.3.3).

```css
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
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

Every line true before animation ships. The provable ones are checked rather than recalled — run css-audit on the file you animated; judge feel yourself.

- All four decision-engine constraints settled: frequency, purpose, easing, duration.
- Easing is an `--ease-*` token, or `ease`/`linear` where **Easing** assigns them; duration inside the band for that element type.
- Every animated property named explicitly, `transform` and `opacity` by default; anything else priced against the exceptions above. No `transition: all`.
- `transform-origin` matches the surface: trigger-anchored → trigger, modal → center.
- Driver matches the trigger: transition for discrete state change, spring for continuous gesture.
- `transform` set direct on the moving element — no custom property on a parent driving a child, no Motion / Framer Motion `x`/`y`/`scale` shorthand where a full `transform` string hands the animation to WAAPI.
- Entrances start at `scale(0.9)` or higher, paired with opacity.
- Pressable elements carry press feedback — `scale(0.95–0.98)` on `:active`.
- `prefers-reduced-motion` branch written: opacity and color kept, movement dropped — including `scroll-behavior: auto` if the sheet sets `smooth` anywhere.
- _Group of items entering:_ staggered 30–80ms apart rather than landing at once — longer delays make the interface feel slow.
- _Press-and-release or hold:_ enter and exit timings differ (slow in, snappy out).
- _Hover motion:_ gated behind `@media (hover: hover) and (pointer: fine)`.
- _Loop running past 5s:_ pause/stop control shipped with it.
