# How motion should feel

Physics of motion feel — mainly Apple _Designing Fluid Interfaces_ (WWDC 2018) and related talks, ported to web (CSS, Pointer Events, `requestAnimationFrame`, spring libs like Motion / Framer Motion). File descriptive physics; `motion-craft` own prescriptive bar (durations, bounce values, when to animate).

Through-line: **interface feel alive when motion start from current on-screen value, inherit user velocity, project momentum forward, and grabbed/reversed any instant.** Springs make natural — inherently interruptible, velocity-aware.

Interface fluid when act like physical world: respond instant, move continuous, carry momentum, resist at boundaries, redirect mid-motion. Apple frame design serving four human needs — safety/predictability, understanding, achievement, joy — every technique below serve one.

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

Mechanics that make work: never lock out input during transition; always animate from _presentation_ (current on-screen) value, never target — starting from logical/target value on interrupt cause visible jump. Avoid CSS transitions and `@keyframes` for anything gesture-driven — can't smoothly grab/reverse mid-flight; springs animate from current value by default, exact what interruption need. When gesture reverse, _blend_ velocity rather than hard-cut — replacing one animation with another at reversal make velocity discontinuity, "brick wall" (iOS _additive animation_ native; web, pick spring lib that re-targets from current velocity). Decompose 2D motion into independent X and Y springs — single spring on 2D distance desync when X and Y different velocities.

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

## Materials & depth — translucency conveys hierarchy

Apple use translucent materials as floating functional layer bring structure without stealing focus; web, approximate with `backdrop-filter`. Build nav/toolbars/sheets as translucent layers (blur + semi-transparent background) with content scrolling underneath, not opaque bars consuming fixed strip. Material weight encode hierarchy: darker/heavier materials separate structural regions (sidebars); lighter materials draw attention to interactive elements (buttons). Never stack light translucent surface on another — legibility collapse. Bigger surfaces should read thicker: stronger blur + deeper shadow than small chips, context-aware shadow (heavier over busy/text content, lighter over plain backgrounds).

Dim to focus, separate to keep flow: modal task pair surface with dimming scrim and push background back/down; parallel non-blocking panel use translucency and offset _without_ scrim so flow not broken. Stacked sheets, progressively dim and push back each parent. Vibrancy keep text legible over changing backgrounds — over blurred/translucent surfaces, no flat gray text; use higher-contrast, slightly heavier weight, small letter-spacing bump, put color on solid layer, not translucent foreground. Prefer scroll edge effects over hard dividers — instead of 1px border under sticky header, fade small blur/gradient mask where content meet floating chrome, only where floating UI actually overlap content. Materialize, don't just fade: for glass/blur surfaces, animate blur radius and scale together on enter/exit so surface read as real material arriving, not plain opacity fade.

```css
.toolbar {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(255, 255, 255, 0.4); /* bright top edge = light catching the material */
}
```

## Multimodal feedback — motion + sound + haptics

Three rules combining senses (from _Designing Audio-Haptic Experiences_): **causality** — must obvious what caused feedback; trigger on actual causal event (toggle flipping, item snapping home), match character to action physicality. **Harmony** — visual, sound, haptic must fire same frame; latency between them destroy illusion (don't let CSS transition lag audio/haptic / Vibration API). **Utility** — add feedback only where earn place, reserve haptics/sound meaningful moments (success, error, commit, snap); over-feedback train users ignore all of it.

## Reduced motion & accessibility

Reduced motion not mean _no_ feedback — mean gentler, non-vestibular equivalent. Respond to three independent signals, bake into components: `prefers-reduced-motion: reduce` replace slides/springs/parallax with short opacity cross-fades or static transitions, drop elastic/overshoot, keep opacity/color changes aid comprehension. `prefers-reduced-transparency: reduce` make translucent surfaces frostier/solid (raise background opacity, drop blur). `prefers-contrast: more` want near-solid backgrounds with defined contrasting border.

Also avoid full-viewport moving backgrounds, slow looping oscillations near 0.2 Hz (one cycle per 5s), abrupt brightness jumps (ease dark↔light theme changes). Make large moving objects semi-transparent while traveling, fade big surfaces out during large reposition, back in once settled.

```css
@media (prefers-reduced-motion: reduce) {
  .sheet {
    transition: opacity 200ms ease;
    transform: none !important;
  }
}
@media (prefers-reduced-transparency: reduce) {
  .toolbar {
    background: white;
    backdrop-filter: none;
  }
}
```

## Typography — optical sizing, tracking, leading

Apple design type change shape with size; same discipline apply web (_The Details of UI Typography_, WWDC 2020). Tracking (letter-spacing) size-specific, never one value all sizes — large display text want _negative_ tracking (letters read too far apart as grow); small text want slightly _positive_ tracking legibility; tighten headings, leave body near `0`. Leading (line-height) track size inversely — tight on large headings, looser body copy; increase scripts with tall ascenders/descenders, tighten dense information-heavy UI. Build hierarchy from weight + size + leading as set, not size alone — emphasize with weight, add presence without taking more space. Respect user text-size setting (Dynamic Type): scale layout _with_ text (spacing in `rem`/`em`, not fixed px) so larger font not break layout. Default to platform system font before custom face; already ship optical sizing, tracking tables, legibility tuning — override only with reason.

```css
:root {
  font:
    100%/1.5 system-ui,
    sans-serif;
} /* body: system font, comfortable leading */
.display {
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.05; /* tight leading for large text */
  letter-spacing: -0.02em; /* negative tracking as it grows */
  font-optical-sizing: auto;
}
```

## Design foundations — the eight principles

Techniques above serve Apple eight design principles (_Principles of Great Design_, WWDC 2026); use as names reason with. **Purpose** — make with intention, decide what _not_ build; every feature ask user time, attention, trust, spend budget only where pay off. **Agency** — keep people control: offer choices, don't force single path, back with forgiveness (easy undo for slips; confirmation dialog only genuinely destructive, irreversible actions, used sparingly so not train people click through). **Responsibility** — act user interest: privacy (ask right moment, only what needed, transparently) and safety (anticipate misuse/harm, especially AI — allergy-aware recipe app must not suggest harmful ingredient; add previews, confirmations, disclaimers; cut feature whose risk outweigh value). **Familiarity** — build on what people already know; use metaphors neither too literal nor abstract (trash can mean delete), honor their physics, be consistent (things look same must behave same, live same place, so people predict what happen next; only break familiar pattern if prove better, then test it). **Flexibility** — design different contexts, devices, full range abilities; adapt platform and situation, design inclusively, when no single layout fit everyone, let people personalize. **Simplicity — not minimalism** — strip unnecessary so core purpose shine (burying everything one place look minimal but not simple); be concise clear, every element earn place, sometimes _adding_ context simplify, show common path first, advanced options one level deeper. **Craft** — uncompromising attention detail build trust; nothing random, every spacing, timing, alignment value deliberate choice you defend, jitter/misalignment/breakage read as carelessness. **Delight** result of getting other seven right, not confetti tacked on top — decide emotion want people feel, reinforce in every decision.

Tactical rules serving these: feedback comes four kinds (status, completion, warning, error) — confirm meaningful actions, expose ongoing status, warn before problems, validate inline not on submit. Wayfinding: every screen answer _where am I, where can I go, what there, how get out_ — never trap user. Grouping & mapping: proximity imply relationship, place control near what it affect, arrange controls mirror what they change; if need label explain control, mapping weak. Direct specific labels beat safe generic ones — name nav items for contents ("Progress", "Library"), not vague umbrellas ("Home"); specificity create predictability.

## Process

Prototype interactively — interactive demo worth "a million static designs"; discover interface by building, playing with it, working prototype set concrete bar prevent mediocre final implementation. Design interaction and visuals together — "you shouldn't be able to tell where one ends and the other begins"; motion not layer added after pixels. Test with real people real context, review motion fresh eyes — play slow motion / frame-by-frame catch what invisible full speed.
