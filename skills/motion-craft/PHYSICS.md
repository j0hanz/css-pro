# How motion should feel

Physics of motion feel — Apple _Designing Fluid Interfaces_ (WWDC 2018), ported to web (CSS, Pointer Events, `requestAnimationFrame`, spring libs like Motion / Framer Motion). File descriptive physics; `motion-craft` own prescriptive bar (durations, bounce values, when to animate).

Through-line: **interface feel alive when motion start from current on-screen value, inherit user velocity, project momentum forward, and grabbed/reversed any instant.** Springs make natural — inherently interruptible, velocity-aware.

Interface fluid when act like physical world: respond instant, move continuous, carry momentum, resist at boundaries, redirect mid-motion.

## Response and direct manipulation

Moment lag appear, directness "falls off cliff"; response foundation for everything else. Respond on pointer-_down_, not release — highlight button instant pressed; waiting for `click`/touch-up feel dead. Audit every latency on input path (debounces, artificial timers, ~300ms tap delay) — anything non-essential regression. Feedback must continuous _during_ interaction, not just end: drag, slider, drawer update 1:1 with pointer whole way.

When user drag thing, must stay glued to finger, respect offset from _where grabbed_ — snapping to element center on grab break illusion. Use Pointer Events with `setPointerCapture` so tracking continue when pointer leave element bounds, keep short velocity/position history (last few `pointermove` events) for velocity at release.

```js
el.addEventListener('pointerdown', (e) => {
  el.setPointerCapture(e.pointerId);
  const grabOffset = e.clientY - el.getBoundingClientRect().top; // respect where they grabbed
  // ...track position + timestamp history for velocity
});
```

## Interruptibility — the most important principle

Thought and gesture happen parallel. Every animation must interruptible, redirectable any moment — user must grab moving element mid-flight, reverse without waiting for finish. Closing modal grabbed again should follow finger, not finish closing then reopen.

Mechanics that make work: never lock out input during transition; always animate from _presentation_ (current on-screen) value, never target — starting from logical/target value on interrupt cause visible jump. Springs animate from current value by default, exact what interruption need. When gesture reverse, _blend_ velocity rather than hard-cut — replacing one animation with another at reversal make velocity discontinuity, "brick wall" (iOS _additive animation_ native; web, pick spring lib that re-targets from current velocity). Decompose 2D motion into independent X and Y springs — single spring on 2D distance desync when X and Y different velocities.

## Springs: behavior over animation

Pre-scripted fixed-duration animation can't respond new input; spring can — new input just change target, motion stay continuous. Reach for springs anything user can touch.

Apple deliberately replaced physics triplet (mass/stiffness/damping) with two designer-friendly parameters. Think in these:

- **Damping ratio** — control overshoot. `1.0` = critically damped, no bounce, smooth settle. `< 1.0` = overshoot and oscillate; lower = bouncier.
- **Response** — how fast value reach target, in seconds. Lower = snappier. **Not "duration"** — spring no fixed duration; settle time emerge from parameters.

Apple shipped values:

| Interaction                  | Damping | Response |
| ---------------------------- | ------- | -------- |
| Move / reposition (e.g. PiP) | `1.0`   | `0.4`    |
| Rotation                     | `0.8`   | `0.4`    |
| Drawer / sheet               | `0.8`   | `0.3`    |

Motion / Framer Motion `bounce` + `duration` spring API map closely to Apple damping + response. For prescriptive default config (when use bounce, which duration), see `motion-craft`.

## Velocity handoff — the seam between drag and animation

When gesture end, animation must continue at finger exact velocity — no visible seam between dragging and animating. This detail most separate "fluid" from "fine." Pass pointer release velocity as spring initial velocity. Some APIs want _relative_ velocity — normalize by remaining distance to target:

```
relativeVelocity = gestureVelocity / (targetValue − currentValue)
```

Element at `y=50`, target `y=150` (100px to go), finger moving 50px/s → initial spring velocity = `50 / 100 = 0.5`. Framer Motion / Motion take absolute px/s velocity directly (the `velocity` option), so usually hand raw value.

## Momentum projection — animate to where the gesture is going

Small input, big output. Don't snap to nearest boundary from _release point_; use velocity project resting position — like scroll deceleration — then snap to target nearest projected point. That what make flick feel like throw. Apple exact projection function:

```js
// decelerationRate ≈ 0.998 for normal scroll feel; 0.99 for snappier
function project(initialVelocity /* px/s */, decelerationRate = 0.998) {
  return ((initialVelocity / 1000) * decelerationRate) / (1 - decelerationRate);
}
const projectedEndpoint = currentPosition + project(releaseVelocity);
const target = nearestSnapPoint(projectedEndpoint); // choose target from the projection
animateSpringTo(target, { velocity: releaseVelocity }); // then hand off velocity
```

Physics-textbook `v²/(2·decel)` _not_ what Apple ship — use exponential-decay form above. Standard behavior good bottom-sheets and carousels (Vaul, Embla).

## Spatial consistency — symmetric paths, anchored origins

Enter and exit along same path; anchor interactions to source — see `motion-craft` for origin mechanic. Mirror easing on reversible transitions so outbound path match return (inverse cubic-bézier control points two directions).

## Hint in the direction of the gesture

Humans predict final state from trajectory, so intermediate motion should telegraph where things go — Control Center modules "grow up and out toward your finger." Make in-between frames point at outcome, not blindly interpolate to it.

## Rubber-banding — soft boundaries

At edge, resist progressively instead of stopping hard. Hard stop read as "frozen"; continuous resistance read as "responsive, but nothing more here." Apply damping that increase further past boundary user drag:

```js
// The further past the bound, the less the element follows — real things slow before they stop
function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
```

## Gesture feel details

- **Tap:** highlight on touch-_down_ (instant), commit on touch-_up_. Add ~10px hysteresis/hit padding around target, allow cancel-by-dragging-away and back.
- **Drag/swipe:** require small movement threshold (hysteresis, ~10px) before committing to direction, then track 1:1.
- **Detect all plausible gestures parallel from first move**, then confidently cancel losers once intent clear. Avoid recognizers reporting only _final_ state (`swipeleft`-type events) — throw away continuous tracking needed for feedback.
- **Minimize disambiguation delays.** Double-tap detection unavoidably delay single taps; only pay cost where double-tap truly exist.

## Frame-level smoothness

Smoothness about _what in the frames_, not just frame rate. Keep per-frame positional change below perception threshold avoid strobing; for very fast motion, subtle motion blur / stretch encode speed, read better than hard sharp streak. `requestAnimationFrame` web display-synced clock (Apple use `CADisplayLink`).

## Materialize, don't just fade

Glass/blur surface arriving: animate blur radius and scale together on enter/exit so it read as real material appearing, not plain opacity fade.

## Reduced motion & accessibility

`prefers-reduced-motion` bar lives in `motion-craft`; two further signals bake into components. `prefers-reduced-transparency: reduce` make translucent surfaces frostier/solid (raise background opacity, drop blur). `prefers-contrast: more` want near-solid backgrounds with defined contrasting border.

Vestibular: avoid full-viewport moving backgrounds, slow looping oscillations near 0.2 Hz (one cycle per 5s), abrupt brightness jumps (ease dark↔light theme changes). Make large moving objects semi-transparent while traveling, fade big surfaces out during large reposition, back in once settled.

```css
@media (prefers-reduced-transparency: reduce) {
  .toolbar {
    background: white;
    backdrop-filter: none;
  }
}
```
