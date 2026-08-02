# Motion techniques — long-tail reference

Open when build task go past component essentials in `SKILL.md` — its pointer block maps task to section. Agent building one animation no need load whole file — read only section build touch. Samples below show the motion only; the `@media (prefers-reduced-motion: reduce)` branch `SKILL.md` "Done when" requires ships with every one (stagger sample carries it, as the pattern to copy).

## CSS transforms & clip-path

`translate` percentages relative to element own size, so `translateY(100%)` move element by own height regardless dimensions — how Sonner position toasts, Vaul hide drawer before animate in. Prefer percentages over hardcoded pixels; less error-prone, adapt to content.

```css
.drawer-hidden {
  transform: translateY(100%);
} /* works regardless of drawer height */
.toast-enter {
  transform: translateY(-100%);
} /* works regardless of toast height */
```

3D transforms (`rotateX`/`rotateY` with `transform-style: preserve-3d`) make depth — orbiting, coin flips — no JavaScript. Foreshortening come from `perspective`: put `perspective: 800px` on the parent, or `perspective(800px)` first in the transform. Without it the projection orthographic and the element just squash; `preserve-3d` only keep children in the parent 3D space.

`clip-path` one of most powerful animation tools in CSS. `clip-path: inset(top right bottom left)` define rectangular clip; each value "eat" into element from that side:

```css
.hidden {
  clip-path: inset(0 100% 0 0);
} /* fully hidden from right */
.visible {
  clip-path: inset(0 0 0 0);
} /* fully visible */
```

Uses worth know: **reveal-on-scroll** — start `inset(0 0 100% 0)` (hidden from bottom), animate to `inset(0 0 0 0)` on viewport entry (`IntersectionObserver` or Motion `useInView` with `{ once: true, margin: "-100px" }`). **Hold-to-delete** — colored overlay at `inset(0 100% 0 0)`, transition to `inset(0 0 0 0)` over 2s linear on `:active`, snap back 200ms ease-out on release, plus `scale(0.97)` for press feedback. **Tabs w/ seamless color transitions** — duplicate tab list, style copy as "active", clip so only active tab visible, animate clip on tab change (color transition individual color transitions never achieve). **Comparison slider** — overlay two images, clip top w/ `inset(0 50% 0 0)`, adjust right inset by drag position; no extra DOM. Composited `clip-path` animation Chromium-only — WebKit and Gecko repaint every frame, so budget for repaint cost there.

## Tooltips: skip delay on subsequent hovers

Delay first tooltip stop accidental activation, but once one open, hovering adjacent tooltips should open instant, no animation — faster without killing initial delay.

```css
.tooltip {
  transition:
    transform 125ms ease-out,
    opacity 125ms ease-out;
  transform-origin: var(--transform-origin);
}
.tooltip[data-starting-style],
.tooltip[data-ending-style] {
  opacity: 0;
  transform: scale(0.97);
}
.tooltip[data-instant] {
  transition-duration: 0ms;
} /* skip animation on subsequent tooltips */
```

## Use blur to mask imperfect transitions

Crossfade between two states feel off despite tuned easing/duration, add subtle `filter: blur(2px)` during transition. Without blur, two distinct objects overlap; blur bridge gap, trick eye into seeing one smooth transformation. Keep blur under 20px — heavy blur expensive, especially Safari.

```css
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

## Animate enter states with `@starting-style`

Modern CSS way animate element entry no JavaScript, replace React `useEffect(() => setMounted(true))` pattern:

```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 400ms ease,
    transform 400ms ease;
  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

That form cover element **first rendered into the DOM**. Element toggled through `display: none` (popover, `<dialog>`, anything hidden then shown) need `@starting-style` too, plus `display` and `overlay` in the transition list with `allow-discrete` — else those two properties flip instant, the element vanish on frame one and nothing animate out:

```css
[popover] {
  opacity: 0;
  transform: scale(0.95);
  transition:
    opacity 200ms ease-out,
    transform 200ms ease-out,
    display 200ms allow-discrete,
    overlay 200ms allow-discrete;

  &:popover-open {
    opacity: 1;
    transform: scale(1);

    @starting-style {
      opacity: 0;
      transform: scale(0.95);
    }
  }
}
```

`overlay` Chromium-only today, harmless elsewhere (transition list ignore entries it not know), so ship it — deferred top-layer removal it buy is a Chromium nicety; `display` + `allow-discrete` is the part carrying the exit animation in every engine.

`@starting-style` in every engine since mid-2024 (Firefox 129) — reach for it directly.

## Gestures & drag

For physics (momentum projection, rubber-band formula, boundary damping, pointer capture, gesture hysteresis, velocity handoff) see [`PHYSICS.md`](PHYSICS.md); here practical patterns.

**Momentum-based dismissal** — no need drag past threshold; compute velocity (`Math.abs(dragDistance) / elapsedTime`) and dismiss if velocity over ~0.11 regardless of distance. Quick flick enough.

```js
const timeTaken = Date.now() - dragStartTime.current;
const velocity = Math.abs(swipeAmount) / timeTaken;
if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) dismiss();
```

**Multi-touch protection** — ignore extra touch points after drag begin, else switching fingers mid-drag make element jump (`if (isDragging) return`).

## Performance

Which properties composite and `transition: all` are stated under "Name every animated property, and keep them off layout"; the parent-variable recalc and the Motion driver under "Set `transform` direct on the moving element" — both in `SKILL.md`. Here the cost detail and the code behind them.

`box-shadow` repaints every frame. Put shadow on pseudo-element, transition that element's `opacity` instead. `will-change` name only the property that animate, only on elements that animate. Take it off when the animation end — the hint hold a compositor layer as long as it set, so hints left on permanently cost memory they never earn back.

Parent-variable recalc, in code — a drawer updating `--swipe-amount` on its container restyles every row each frame:

```js
element.style.setProperty('--swipe-amount', `${distance}px`); // bad: recalc on all children
element.style.transform = `translateY(${distance}px)`; // good: only this element
```

Same trade in Motion / Framer Motion:

```jsx
<motion.div animate={{ x: 100 }} />                          // custom-property transform, rAF each frame — stutters under load
<motion.div animate={{ transform: "translateX(100px)" }} />  // handed to WAAPI, no per-frame JS — stays smooth
```

Default to CSS animations — declarative, no library, and the browser can take them off the main thread. Reach for WAAPI when JS must compute the keyframes; it stay interruptible and get the same acceleration treatment. Either way acceleration is per-property and per-engine (the `clipPath` below composite in Chromium, repaint elsewhere), so bank on the control, treat the speed as enhancement:

```js
element.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
  duration: 1000,
  fill: 'forwards',
  easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
});
```

## Stagger, cohesion, asymmetric timing

**Stagger** — interval in [`SKILL.md`](SKILL.md). Decorative: interaction stays live while it plays.

```css
.item {
  opacity: 0;
  transform: translateY(8px);
  animation: fadeIn 300ms ease-out forwards;
}
.item:nth-child(2) {
  animation-delay: 50ms;
}
.item:nth-child(3) {
  animation-delay: 100ms;
}
@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .item {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

**Cohesion** — match motion to the component's personality. Playful component can be bouncier; professional dashboard crisp and fast. Sonner read elegant because easing, duration and toast design pull one direction: `ease` rather than `ease-out`, a touch slower than typical UI. For entering/exiting lists, pair the opacity change with `translateY` on the row and let siblings reflow — height is not animatable under this plugin (css-craft's `FUNCTIONS.md`, `calc-size()`).

**Asymmetric enter/exit timing** — rule and timings in [`SKILL.md`](SKILL.md). Recipe:

```css
.overlay {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 200ms ease-out;
} /* release: fast */
.button:active .overlay {
  clip-path: inset(0 0 0 0);
  transition: clip-path 2s linear;
} /* press: slow, deliberate */
```

## Reduced motion in JS

Same branch as the CSS `@media (prefers-reduced-motion: reduce)` block in `SKILL.md`, for motion whose values JS compute — read the preference, swap the travelling value for a still one:

```jsx
const shouldReduceMotion = useReducedMotion();
const closedX = shouldReduceMotion ? 0 : '-100%';
```

## Debugging

Play animations at reduced speed spot issues invisible at full speed — temp raise duration to 2–5×, or use browser DevTools animation inspector to slow playback. In slow motion, look for: colors transitioning smooth vs two distinct states overlapping; easing that start/stop abrupt; wrong `transform-origin` (element scale from wrong point); multiple animated properties (opacity, transform, color) drifting out sync. Step frame-by-frame in Chrome DevTools Animations panel catch timing drift between coordinated properties.
