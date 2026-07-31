# Motion techniques — long-tail reference

Open when build task go past component essentials in `SKILL.md`: clip-path animation, gestures & drag, perf gotchas, stagger/cohesion/asymmetric timing, `@starting-style` entry, blur masking, tooltips, debugging. Agent building one animation no need load whole file — read only section build touch.

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

3D transforms (`rotateX`/`rotateY` with `transform-style: preserve-3d`) make real depth — orbiting, coin flips, depth effects — no JavaScript.

`clip-path` one of most powerful animation tools in CSS. `clip-path: inset(top right bottom left)` define rectangular clip; each value "eat" into element from that side:

```css
.hidden {
  clip-path: inset(0 100% 0 0);
} /* fully hidden from right */
.visible {
  clip-path: inset(0 0 0 0);
} /* fully visible */
```

Uses worth know: **reveal-on-scroll** — start `inset(0 0 100% 0)` (hidden from bottom), animate to `inset(0 0 0 0)` on viewport entry (`IntersectionObserver` or Motion `useInView` with `{ once: true, margin: "-100px" }`). **Hold-to-delete** — colored overlay at `inset(0 100% 0 0)`, transition to `inset(0 0 0 0)` over 2s linear on `:active`, snap back 200ms ease-out on release, plus `scale(0.97)` for press feedback. **Tabs w/ seamless color transitions** — duplicate tab list, style copy as "active", clip so only active tab visible, animate clip on tab change (color transition individual color transitions never achieve). **Comparison sliders** — overlay two images, clip top w/ `inset(0 50% 0 0)`, adjust right inset by drag position; no extra DOM, fully hardware-accelerated.

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

Crossfade between two states feel off despite tuned easing/duration, add subtle `filter: blur(2px)` during transition. Without blur, two distinct objects overlap; blur bridge gap, trick eye into seeing one smooth transformation. Keep blur under 20px — heavy blur expensive, especially Safari. Button block in `SKILL.md` component building show this inlined on press-feedback example.

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

Use `@starting-style` when browser support allows; else fall back to `data-mounted` attribute pattern (`useEffect(() => setMounted(true), [])` + `<div data-mounted={mounted}>`).

## Gestures & drag

For physics (momentum projection, rubber-band formula, gesture hysteresis, velocity handoff) see [`PHYSICS.md`](PHYSICS.md); here practical patterns.

**Momentum-based dismissal** — no need drag past threshold; compute velocity (`Math.abs(dragDistance) / elapsedTime`) and dismiss if velocity over ~0.11 regardless of distance. Quick flick enough.

```js
const timeTaken = Date.now() - dragStartTime.current;
const velocity = Math.abs(swipeAmount) / timeTaken;
if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) dismiss();
```

**Damping at boundaries** — user drag past natural boundary (drawer dragged up when already top), apply damping so more drag, less move; real things slow before stop, no sudden halt. **Pointer capture** — once drag start, capture all pointer events so drag continue if pointer leave element bounds. **Multi-touch protection** — ignore extra touch points after drag begin, else switching fingers mid-drag make element jump (`if (isDragging) return`). **Friction over hard stops** — allow over-drag w/ rising resistance, not invisible wall.

## Performance

Animate `transform` and `opacity` only — skip layout/paint, run on GPU. Animating `padding`, `margin`, `height`, `width`, `top`, or `left` trigger all three rendering steps.

`transition: all` always a finding — animate unintended properties off GPU. Name exact properties: `transition: transform 200ms ease-out`.

Don't drive child transforms via CSS variable on parent — changing variable on parent recalc styles for all children, so in drawer w/ many items, updating `--swipe-amount` on container cause expensive recalc. Set `transform` direct on element instead.

```js
element.style.setProperty('--swipe-amount', `${distance}px`); // bad: recalc on all children
element.style.transform = `translateY(${distance}px)`; // good: only this element
```

**Framer Motion shorthand properties (`x`, `y`, `scale`) NOT hardware-accelerated** — use `requestAnimationFrame` on main thread, drop frames under load. For hardware acceleration, use full `transform` string. Matters when browser simultaneous load content, run scripts, paint — at Vercel, dashboard tab animation used Shared Layout Animations, dropped frames during page loads; switch to CSS animations (off main thread) fixed it.

```jsx
<motion.div animate={{ x: 100 }} />                          // NOT hardware accelerated — drops frames under load
<motion.div animate={{ transform: "translateX(100px)" }} />  // hardware accelerated — stays smooth
```

CSS animations beat JS under load, run off main thread; rAF-based animations stutter while browser load/script/paint. Use CSS (or WAAPI) for predetermined motion, JS/springs for dynamic/gesture-driven motion. WAAPI give JS control w/ CSS performance — hardware-accelerated, interruptible, no library:

```js
element.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
  duration: 1000,
  fill: 'forwards',
  easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
});
```

## Stagger, cohesion, asymmetric timing

**Stagger** group entrances 30–80ms between items; longer delays make interface feel slow. Stagger decorative — must never block interaction while playing.

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
```

**Cohesion** — motion should match component personality, product. Playful component can be bouncier; professional dashboard should be crisp, fast. Sonner feel right partly cuz whole experience cohesive — easing/duration fit vibe, slightly slower than typical UI, use `ease` not `ease-out` to feel more elegant, animation style matching toast design, page design, even name. Match motion to mood. For entering/exiting lists, opacity change must work w/ height animation; no formula — adjust until feel right.

**Asymmetric enter/exit timing** — slow where user deciding, fast where system responds. Press should slow when deliberate (hold-to-delete: 2s linear), release always snappy (200ms ease-out). Applies broadly: press-and-release or hold interaction w/ symmetric timing is a finding.

```css
.overlay {
  transition: clip-path 200ms ease-out;
} /* release: fast */
.button:active .overlay {
  transition: clip-path 2s linear;
} /* press: slow, deliberate */
```

## Debugging

Play animations at reduced speed spot issues invisible at full speed — temp raise duration to 2–5×, or use browser DevTools animation inspector to slow playback. In slow motion, look for: colors transitioning smooth vs two distinct states overlapping; easing that start/stop abrupt; wrong `transform-origin` (element scale from wrong point); multiple animated properties (opacity, transform, color) drifting out sync. Step frame-by-frame in Chrome DevTools Animations panel catch timing drift between coordinated properties. Test touch interactions (drawers, swipe) on physical devices — connect phone, hit dev server by IP, use Safari remote devtools (Xcode Simulator fallback; real hardware better for gestures).

**Review your work next day.** Notice imperfections next day missed during dev, slow-motion/frame-by-frame review surface timing issues invisible at full speed.
