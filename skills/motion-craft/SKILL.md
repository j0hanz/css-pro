---
name: motion-craft
description: Use when building or deciding web animation — CSS transitions, transform animations, @keyframes, springs, hover and entrance effects, popovers/drawers, scroll-driven motion — or reviewing animation/motion code in a diff. Covers easing, duration, origin, the physics of motion feel, and the vocabulary for naming an effect.
---

# Motion Craft

Prescriptive half of motion: what good motion _is_, how to _decide_ it, how to _review_ it. Descriptive knowledge — effect names in [`GLOSSARY.md`](GLOSSARY.md), how motion physically feels in [`PHYSICS.md`](PHYSICS.md) — sits alongside; cite for formulas/names, don't duplicate.

## The decision engine

Answer these in order before writing any animation.

**1. Should this animate at all?** Frequency user sees it decides almost everything: motion on daily-repeated thing feels slow, delayed, disconnected. Raycast ships no open/close animation — correct for something used hundreds times a day.

| Frequency                                                   | Decision                     |
| ----------------------------------------------------------- | ---------------------------- |
| 100+ times/day (keyboard shortcuts, command palette toggle) | No animation. Ever.          |
| Tens of times/day (hover effects, list navigation)          | Remove or drastically reduce |
| Occasional (modals, drawers, toasts)                        | Standard animation           |
| Rare / first-time (onboarding, feedback, celebrations)      | Can add delight              |

**2. What's the purpose?** Every animation needs one: **spatial consistency** (toast enter/exit same edge, swipe-to-dismiss feels intuitive), **state indication** (morphing feedback button shows change), **explanation** (marketing animation showing feature works), **feedback** (button scales down on press, confirms interface heard user), or **preventing jarring change** (elements appear/vanish with no bridge feel broken). "Looks cool" not on list — if that's only purpose and user sees it often, skip.

**3. What easing?** Decide by what element does. Entering/exiting → `ease-out` (fast start, feels responsive). Moving/morphing on screen → `ease-in-out` (natural accel then decel). Hover/color change → `ease`. Constant motion (marquee, progress bar) → `linear`. Default → `ease-out`.

Built-in CSS easings too weak for deliberate motion — lack punch that makes animation feel intentional. Use strong custom curves, keep as tokens:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1); /* strong ease-out for UI interactions */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* strong ease-in-out for on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1); /* iOS-like drawer curve (Ionic) */
```

Never use `ease-in` for UI. Starts slow, delays exact moment user watches most closely — dropdown with `ease-in` at 300ms _feels_ slower than `ease-out` at same 300ms. Find stronger custom variants at [easing.dev](https://easing.dev/) or [easings.co](https://easings.co/) instead of hand-rolling.

**4. How fast?** UI animations stay under 300ms — 180ms dropdown feels more responsive than 400ms one, faster-spinning spinner makes app feel it loads faster even when load time same.

| Element                  | Duration      |
| ------------------------ | ------------- |
| Button press feedback    | 100–160ms     |
| Tooltips, small popovers | 125–200ms     |
| Dropdowns, selects       | 150–250ms     |
| Modals, drawers          | 200–500ms     |
| Marketing / explanatory  | Can be longer |

Speed also perceived, not just actual: instant tooltips after first one open (skip delay + skip animation) make whole toolbar feel faster.

Done = all four questions answered, easing token + duration chosen, origin + interruptibility decided, reduced-motion handled.

## Springs

Springs feel natural — simulate physics, no fixed duration; settle on own params. Use for drag interactions with momentum, elements that should feel "alive" (Apple's Dynamic Island), gestures interruptible mid-animation, decorative mouse-tracking. (Physics of springs in gesture-driven motion — velocity handoff, momentum projection, rubber-banding, decomposing 2D motion into X and Y — see [`PHYSICS.md`](PHYSICS.md); here's config.)

```js
// Apple-style (easier to reason about) — recommended
{ type: "spring", duration: 0.5, bounce: 0.2 }

// Traditional physics (more control)
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

Keep bounce subtle (0.1–0.3) when used. Avoid bounce in most UI — reserve for drag-to-dismiss and playful interactions. Interruptibility = reason to pick springs over CSS keyframes: springs keep velocity when interrupted (keyframes restart from zero), so spring animation smoothly reverses from current position when you click expanded item then immediately press Escape.

For decorative mouse interactions, tie visual changes to spring (`useSpring` in Motion/Framer Motion) instead of directly to mouse position — direct mapping feels artificial, lacks motion; spring interpolates with momentum. Only when motion decorative; for functional graph in banking app, no animation better.

## Component building

**Buttons must feel responsive.** Add `transform: scale(0.97)` on `:active` — instant feedback UI is listening. Scale subtle (0.95–0.98), applies to any pressable element; `scale()` scales children too (font, icons, content) — feature for press feedback. When crossfade between two states still feels off, subtle `filter: blur(2px)` masks it — keep under 20px, see "Use blur to mask imperfect transitions" in [`TECHNIQUES.md`](TECHNIQUES.md) for why. Applied inline to press feedback here:

```css
.button {
  transition: transform 160ms ease-out;
}
.button:active {
  transform: scale(0.97);
}
.button-content {
  transition:
    filter 200ms ease,
    opacity 200ms ease;
}
.button-content.transitioning {
  filter: blur(2px);
  opacity: 0.7;
}
```

**Never animate from `scale(0)`.** Nothing in real world disappears/reappears completely; elements from `scale(0)` look like they come out of nowhere. Start from `scale(0.9)` or higher, combined with opacity — even barely-visible initial scale makes entrance feel natural, like balloon that has visible shape even deflated.

**Make popovers origin-aware.** Popovers, dropdowns, tooltips should scale in from trigger, not center — default `transform-origin: center` wrong for almost every trigger-anchored surface. **Modals are exception:** not anchored to trigger, appear centered in viewport, so `transform-origin: center` correct there.

```css
.popover {
  transform-origin: var(--transform-origin);
} /* Base UI */
```

**Prefer CSS transitions over keyframes for interruptible UI** (transitions retarget mid-animation). For rapidly triggered state, transitions stay smooth.

For tooltip skip-delay-on-subsequent-hovers, `@starting-style` entry animation, clip-path patterns (reveal-on-scroll, hold-to-delete, tab color transitions, comparison sliders), 3D transforms, and full clip-path/inset reference, open [`TECHNIQUES.md`](TECHNIQUES.md).

## Accessibility

`prefers-reduced-motion` means fewer and gentler animations, **not zero** — keep opacity and color transitions that aid comprehension, remove movement and position changes. Gate hover animations behind `@media (hover: hover) and (pointer: fine)` — touch devices trigger hover on tap, cause false positives. (Full three-signal reduced-motion model — `prefers-reduced-transparency`, `prefers-contrast`, vestibular specifics — see [`PHYSICS.md`](PHYSICS.md).)

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

```jsx
const shouldReduceMotion = useReducedMotion();
const closedX = shouldReduceMotion ? 0 : '-100%';
```

## Reviewing a motion diff

Reviewing animation/motion code in diff, open [`REVIEW.md`](REVIEW.md) — holds review method (default flagging, escalation triggers, Before/After/Why findings table, Block/Approve verdict tiers) and canonical "Flag these on sight" list. Flag list there single source for review rules; not restated here.
