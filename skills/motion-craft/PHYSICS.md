# How motion should feel

Physics of motion feel — mainly Apple _Designing Fluid Interfaces_ (WWDC 2018) and related talks, ported to web (CSS, Pointer Events, `requestAnimationFrame`, spring libs like Motion / Framer Motion). This file descriptive physics; `motion-craft` own prescriptive bar (durations, bounce values, when to animate).

Through-line: **interface feel alive when motion start from current on-screen value, inherit user velocity, project momentum forward, and can be grabbed and reversed any instant.** Springs make that natural — inherently interruptible and velocity-aware.

Interface feel fluid when it act like physical world: respond instantly, move continuously, carry momentum, resist at boundaries, redirect mid-motion. Apple frame design as serving four human needs — safety/predictability, understanding, achievement, joy — every technique below serve one.

## Response and direct manipulation

Moment lag appear, directness "falls off a cliff"; response is foundation for everything else. Respond on pointer-_down_, not release — highlight button instant it pressed; waiting for `click`/touch-up feel dead. Audit every latency on input path (debounces, artificial timers, ~300ms tap delay) — anything non-essential is regression. Feedback must be continuous _during_ interaction, not just at end: drag, slider, drawer update 1:1 with pointer whole way.

When user drag thing it must stay glued to finger and respect offset from _where they grabbed it_ — snapping to element center on grab break illusion. Use Pointer Events with `setPointerCapture` so tracking continue when pointer leave element bounds, and keep short velocity/position history (last few `pointermove` events) so you have velocity at release.

```js
el.addEventListener('pointerdown', (e) => {
  el.setPointerCapture(e.pointerId);
  const grabOffset = e.clientY - el.getBoundingClientRect().top; // respect where they grabbed
  // ...track position + timestamp history for velocity
});
```

## Interruptibility — the most important principle

Thought and gesture happen in parallel. Every animation must be interruptible and redirectable any moment — user must be able to grab moving element mid-flight and reverse it without waiting for finish. Closing modal grabbed again should follow finger, not finish closing then reopen.

Mechanics that make this work: never lock out input during transition; always animate from _presentation_ (current on-screen) value, never target — starting from logical/target value on interrupt cause visible jump. Avoid CSS transitions and `@keyframes` for anything gesture-driven — can't be smoothly grabbed and reversed mid-flight; springs animate from current value by default, exactly what interruption need. When gesture reverse, _blend_ velocity rather than hard-cut — replacing one animation with another at reversal make velocity discontinuity, a "brick wall" (this iOS _additive animation_ natively; on web, pick spring lib that re-targets from current velocity). Decompose 2D motion into independent X and Y springs — single spring on 2D distance desync when X and Y have different velocities.

## Springs: behavior over animation

Pre-scripted fixed-duration animation can't respond to new input; spring can — new input just change target, motion stay continuous. Reach for springs for anything user can touch.

Apple deliberately replaced physics triplet (mass/stiffness/damping) with two designer-friendly parameters. Think in these:

- **Damping ratio** — control overshoot. `1.0` = critically damped, no bounce, smooth settle. `< 1.0` = overshoot and oscillate; lower = bouncier.
- **Response** — how fast value reach target, in seconds. Lower = snappier. **Not "duration"** — spring has no fixed duration; settle time emerge from parameters.

Apple shipped values:

| Interaction                  | Damping | Response |
| ---------------------------- | ------- | -------- |
| Move / reposition (e.g. PiP) | `1.0`   | `0.4`    |
| Rotation                     | `0.8`   | `0.4`    |
| Drawer / sheet               | `0.8`   | `0.3`    |

Motion / Framer Motion `bounce` + `duration` spring API map closely to Apple damping + response. For prescriptive default config (when to use bounce, which duration), see `motion-craft`.

## Velocity handoff — the seam between drag and animation

When gesture end, animation must continue at finger exact velocity — no visible seam between dragging and animating. This detail most separate "fluid" from "fine." Pass pointer release velocity as spring initial velocity. Some APIs want _relative_ velocity — normalize by remaining distance to target:

```
relativeVelocity = gestureVelocity / (targetValue − currentValue)
```

Element at `y=50`, target `y=150` (100px to go), finger moving 50px/s → initial spring velocity = `50 / 100 = 0.5`. Framer Motion / Motion take absolute px/s velocity directly (the `velocity` option), so you usually hand raw value.

## Momentum projection — animate to where the gesture is going

Small input, big output. Don't snap to nearest boundary from _release point_; use velocity to project resting position — like scroll deceleration — then snap to target nearest that projected point. That what make flick feel like throw. Apple exact projection function:

```js
// decelerationRate ≈ 0.998 for normal scroll feel; 0.99 for snappier
function project(initialVelocity /* px/s */, decelerationRate = 0.998) {
  return ((initialVelocity / 1000) * decelerationRate) / (1 - decelerationRate);
}
const projectedEndpoint = currentPosition + project(releaseVelocity);
const target = nearestSnapPoint(projectedEndpoint); // choose target from the projection
animateSpringTo(target, { velocity: releaseVelocity }); // then hand off velocity
```

Physics-textbook `v²/(2·decel)` _not_ what Apple ship — use exponential-decay form above. Standard behavior in good bottom-sheets and carousels (Vaul, Embla).

## Spatial consistency — symmetric paths, anchored origins

Enter and exit along same path; anchor interactions to source — see `motion-craft` for origin mechanic. Mirror easing on reversible transitions so outbound path match return (inverse cubic-bézier control points for two directions).

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
- **Detect all plausible gestures in parallel from first move**, then confidently cancel losers once intent clear. Avoid recognizers reporting only _final_ state (`swipeleft`-type events) — they throw away continuous tracking you need for feedback.
- **Minimize disambiguation delays.** Double-tap detection unavoidably delay single taps; only pay that cost where double-tap truly exist.

## Frame-level smoothness

Smoothness about _what in the frames_, not just frame rate. Keep per-frame positional change below perception threshold to avoid strobing; for very fast motion, subtle motion blur / stretch encode speed and read better than hard sharp streak. `requestAnimationFrame` is web display-synced clock (Apple use `CADisplayLink`).

## Materials & depth — translucency conveys hierarchy

Apple use translucent materials as floating functional layer that bring structure without stealing focus; on web, approximate with `backdrop-filter`. Build nav/toolbars/sheets as translucent layers (blur + semi-transparent background) with content scrolling underneath, not opaque bars consuming fixed strip. Material weight encode hierarchy: darker/heavier materials separate structural regions (sidebars); lighter materials draw attention to interactive elements (buttons). Never stack light translucent surface on another — legibility collapse. Bigger surfaces should read as thicker: stronger blur + deeper shadow than small chips, with context-aware shadow (heavier over busy/text content, lighter over plain backgrounds).

Dim to focus, separate to keep flow: modal task pair surface with dimming scrim and push background back/down; parallel non-blocking panel use translucency and offset _without_ scrim so flow not broken. For stacked sheets, progressively dim and push back each parent. Vibrancy keep text legible over changing backgrounds — over blurred/translucent surfaces, no flat gray text; use higher-contrast, slightly heavier weight, small letter-spacing bump, and put color on solid layer, not translucent foreground. Prefer scroll edge effects over hard dividers — instead of 1px border under sticky header, fade small blur/gradient mask where content meet floating chrome, only where floating UI actually overlap content. And materialize, don't just fade: for glass/blur surfaces, animate blur radius and scale together on enter/exit so surface read as real material arriving, not plain opacity fade.

```css
.toolbar {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(255, 255, 255, 0.4); /* bright top edge = light catching the material */
}
```

## Multimodal feedback — motion + sound + haptics

Three rules for combining senses (from _Designing Audio-Haptic Experiences_): **causality** — must be obvious what caused feedback; trigger on actual causal event (toggle flipping, item snapping home) and match character to action physicality. **Harmony** — visual, sound, haptic must fire same frame; latency between them destroy illusion (don't let CSS transition lag audio/haptic / Vibration API). **Utility** — add feedback only where it earn place, reserve haptics/sound for meaningful moments (success, error, commit, snap); over-feedback train users to ignore all of it.

## Reduced motion & accessibility

Reduced motion not mean _no_ feedback — mean gentler, non-vestibular equivalent. Respond to three independent signals, bake into components: `prefers-reduced-motion: reduce` replace slides/springs/parallax with short opacity cross-fades or static transitions, drop elastic/overshoot, keep opacity/color changes that aid comprehension. `prefers-reduced-transparency: reduce` make translucent surfaces frostier/solid (raise background opacity, drop blur). `prefers-contrast: more` want near-solid backgrounds with defined contrasting border.

Also avoid full-viewport moving backgrounds, slow looping oscillations near 0.2 Hz (one cycle per 5s), abrupt brightness jumps (ease dark↔light theme changes). Make large moving objects semi-transparent while traveling, and fade big surfaces out during large reposition, back in once settled.

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

Apple design type to change shape with size; same discipline apply on web (_The Details of UI Typography_, WWDC 2020). Tracking (letter-spacing) is size-specific, never one value for all sizes — large display text want _negative_ tracking (letters read too far apart as they grow); small text want slightly _positive_ tracking for legibility; tighten headings, leave body near `0`. Leading (line-height) track size inversely — tight on large headings, looser on body copy; increase for scripts with tall ascenders/descenders, tighten for dense information-heavy UI. Build hierarchy from weight + size + leading as set, not size alone — emphasize with weight, which add presence without taking more space. Respect user text-size setting (Dynamic Type): scale layout _with_ text (spacing in `rem`/`em`, not fixed px) so larger font not break layout. Default to platform system font before custom face; it already ship optical sizing, tracking tables, legibility tuning — override only with reason.

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

Techniques above serve Apple eight design principles (_Principles of Great Design_, WWDC 2026); use these as names you reason with. **Purpose** — make with intention, decide what _not_ to build; every feature ask for user time, attention, trust, so spend that budget only where it pay off. **Agency** — keep people in control: offer choices, don't force single path, back it with forgiveness (easy undo for slips; confirmation dialog only for genuinely destructive, irreversible actions, used sparingly so it not train people to click through). **Responsibility** — act in user interest: privacy (ask at right moment, only for what needed, transparently) and safety (anticipate misuse and harm, especially with AI — allergy-aware recipe app must not suggest harmful ingredient; add previews, confirmations, disclaimers; cut feature whose risk outweigh value). **Familiarity** — build on what people already know; use metaphors neither too literal nor too abstract (trash can mean delete), honor their physics, be consistent (things that look same must behave same and live in same place, so people predict what happen next; only break familiar pattern if you can prove it better, then test it). **Flexibility** — design for different contexts, devices, full range of abilities; adapt to platform and situation, design inclusively, and when no single layout fit everyone, let people personalize. **Simplicity — not minimalism** — strip unnecessary so core purpose shine (burying everything in one place look minimal but not simple); be concise and clear, every element earn its place, sometimes _adding_ context simplify, show common path first and advanced options one level deeper. **Craft** — uncompromising attention to detail build trust; nothing random, every spacing, timing, alignment value is deliberate choice you can defend, and jitter/misalignment/breakage read as carelessness. **Delight** is result of getting other seven right, not confetti tacked on top — decide emotion you want people to feel and reinforce it in every decision.

Tactical rules serving these: feedback come in four kinds (status, completion, warning, error) — confirm meaningful actions, expose ongoing status, warn before problems, validate inline not on submit. Wayfinding: every screen answer _where am I, where can I go, what there, how do I get out_ — never trap user. Grouping & mapping: proximity imply relationship, so place control near what it affect and arrange controls to mirror what they change; if you need label to explain control, mapping is weak. And direct specific labels beat safe generic ones — name nav items for contents ("Progress", "Library"), not vague umbrellas ("Home"); specificity create predictability.

## Process

Prototype interactively — interactive demo worth "a million static designs"; you discover interface by building and playing with it, and working prototype set concrete bar that prevent mediocre final implementation. Design interaction and visuals together — "you shouldn't be able to tell where one ends and the other begins"; motion not a layer added after pixels. Test with real people in real context, and review motion with fresh eyes — play in slow motion / frame-by-frame to catch what invisible at full speed.
