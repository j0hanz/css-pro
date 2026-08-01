# Motion Glossary — reverse-lookup

Reverse-lookup table: vague description ("bouncy thing when popover opens") → term. Holds non-obvious mappings and confusable-term disambiguation only. When to reach for an easing or a spring, see [`SKILL.md`](SKILL.md); this file names things, doesn't prescribe.

## Entrances & Exits

- **Pop in** — Element appears with slight overshoot, bounces into place. (vs **Bounce**: spring overshoots, settles on release — Pop in entrance, Bounce spring behavior.)
- **Reveal** — Content uncovered gradually, often animating clip-path or mask.
- **Enter / Exit** — Animation plays when element added to or removed from screen.

## Sequencing & Timing

- **Stagger** — Animate several items one after another, small delay each. Cascade.
- **Orchestration** — Deliberate timing of multiple animations, feels like one coordinated motion.
- **Fill mode** — Whether element keeps first/last frame styles before animation starts or after ends (e.g. forwards).
- **Stepped animation** — Animation divided into discrete steps, like countdown timer.

## Movement & Transforms

- **Skew** — Slant element along X or Y axis, shearing out of rectangular shape.
- **3D tilt / Flip** — Rotate in 3D space (rotateX / rotateY) for depth.
- **Perspective** — Strength of 3D effect — lower value exaggerates depth, viewer feels closer.
- **Transform origin** — Anchor point scale or rotation grows/spins from.
- **Origin-aware animation** — Element animates out of trigger, like popover growing from button that opened it instead of own center (CSS default).

## Transitions Between States

- **Crossfade** — One element fades out as another fades in, same spot.
- **Continuity transition** — Change keeping user oriented by visually connecting before/after. Example: same rectangle bigger and smaller.
- **Morph** — One shape smoothly turns into another, e.g. Dynamic Island.
- **Shared element transition** — Element travels and transforms from one position to another, like thumbnail expanding into card. (vs **Layout animation**: animates element's own size/position change — shared element transition implies same element appearing two places.)
- **Layout animation** — Element size or position changes, animates to new spot instead of snapping.
- **Accordion / Collapse** — Section smoothly expands/collapses height to show or hide content.
- **Direction-aware transition** — Content slides one way going forward, opposite going back. Navigation gets sense of direction.

## Scroll

- **Scroll reveal** — Elements fade or slide into place entering viewport.
- **Scroll-driven animation** — Animation progress tied directly to scroll position. (vs **Scroll reveal**: triggers once on entry; scroll-driven binds continuously.)
- **Parallax** — Background/foreground move at different speeds scrolling. Depth.
- **Page transition** — Animation plays navigating one page/route to another.
- **View transition** — Browser morphs between two states/pages, connecting shared elements.

## Feedback & Interaction

- **Press / Tap feedback** — Subtle scale-down when element clicked, feels physical. See `motion-craft` for value.
- **Hold to confirm** — Progress effect fills while user holds button.
- **Drag to reorder** — Drag items in list to rearrange, others shift to make room.
- **Swipe to dismiss** — Drag element off-screen to close, like drawer or toast.
- **Rubber-banding** — Resistance and snap-back dragging past boundary (iOS overscroll feel).
- **Shake / Wiggle** — Quick side-to-side jitter, signals error or rejected input.
- **Ripple** — Circle expanding from tap point, confirms press.

## Easing — pure definitions

- **Ease-out** — Fast start, slow end.
- **Ease-in** — Slow start, fast end.
- **Ease-in-out** — Slow, fast, slow.
- **Linear** — Constant speed.
- **Cubic-bezier** — Custom easing curve, define for precise control.
- **Asymmetric easing** — Curve accelerating/decelerating at different rates. Feels more alive than symmetric.

## Spring Animations — physics vocabulary

- **Spring** — Motion driven by physics (tension, mass, damping) not set duration.
- **Stiffness / Tension** — How strongly spring pulls toward target. Higher feels snappier.
- **Damping** — How quickly spring settles. Lower damping means more bounce, oscillation.
- **Mass** — How heavy element feels. More mass means slower, sluggish.
- **Bounce** — Spring overshoots, settles. Playful.
- **Perceptual duration** — How long spring feels finished, though keeps micro-settling underneath.
- **Momentum** — Motion carrying velocity, especially after drag or interruption.
- **Velocity** — Speed and direction element moves. Spring carries into next animation when interrupted, flicked element keeps speed.
- **Interruptible animation** — Animation smoothly redirected mid-flight instead of finishing first.

## Looping & Ambient Motion

- **Marquee** — Text/content scrolling continuously in loop.
- **Alternate (yoyo)** — Loop plays forward then reverses each iteration, instead of jumping back to start.
- **Orbit** — Element circling another in continuous path.
- **Pulse** — Gentle repeating scale/opacity change, draws attention.
- **Float** — Gentle continuous up-down drift, static element feels alive, weightless.
- **Idle animation** — Subtle motion while element sits waiting for interaction.

## Polish & Effects

- **Clip-path** — Clip element to shape. Used for reveals, masks, before/after sliders. (vs **Mask**: hides/reveals with shape or gradient, soft fadeable edges — clip-path edges hard.)
- **Mask** — Hide/reveal parts of element using shape or gradient — like clip-path, but soft, fadeable edges.
- **Before / after slider** — Draggable divider wipes between two overlaid images to compare.
- **Line drawing** — SVG path draws itself in, like invisible pen tracing it.
- **Text morph** — Text animates character by character when changed, draws attention to new value.
- **Skeleton / Shimmer** — Placeholder with moving sheen shown while content loads.
- **Number ticker** — Digits rolling or counting up to value.
- **Tabular numbers** — Fixed-width digits so numbers don't shift as they change. Essential for tickers, timers, counters.
- **Typewriter** — Text appearing one character at a time, as if typed.

## Performance — descriptive terms

- **Frame rate (FPS)** — Frames drawn per second. 60fps baseline for smooth motion; 120fps newer displays.
- **Jank** — Visible stutter when browser drops frames, can't keep up with animation.
- **Dropped frame** — Frame browser missed deadline to draw. Tiny hitch in motion.
- **Compositing** — GPU moves/fades element on own layer without redoing layout or paint.
- **will-change** — CSS hint element about to animate, browser can promote to own layer ahead of time.
- **Layout thrashing** — Animating properties like width, height, top, left forces browser recalculate layout every frame. Causes jank.

## Principles to Know

- **Purposeful animation** — Motion should serve function — orient, give feedback, show relationships — not just decorate.
- **Anticipation** — Small wind-up in opposite direction before move, hints what's coming.
- **Follow-through** — Parts of element keep moving, settle slightly after main motion stops. Adds weight.
- **Squash & stretch** — Deform element as it moves, conveys weight, speed, flexibility.
- **Perceived performance** — Right animation makes interface feel faster, even when not.
- **Frequency of use** — More often user sees animation, shorter and subtler it should be.
- **Spatial consistency** — Animate so element keeps identity, position across states, users never lose track where things went.
- **Reduced motion** — Respect user's prefers-reduced-motion setting, tone down or remove motion.
