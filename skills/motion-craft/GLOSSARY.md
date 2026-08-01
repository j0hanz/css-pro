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
- **Asymmetric easing** — Curve accelerating and decelerating at different rates. (vs **asymmetric enter/exit timing** in [`TECHNIQUES.md`](TECHNIQUES.md): different _durations_ in and out — easing names the curve shape, timing the clock.)

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
- **Shared element transition** — Element travels and transforms from one position to another, like thumbnail expanding into card. (vs **Layout animation**: animates element's own size/position change — shared element transition implies same element appearing two places. Motion / Framer Motion's own API name, "shared layout animation", covers both.)
- **Layout animation** — Element size or position changes, animates to new spot instead of snapping.
- **Accordion / Collapse** — Section expands/collapses to show or hide content. (What to animate instead of `height`: css-craft's `FUNCTIONS.md`, `calc-size()`.)
- **Direction-aware transition** — Content slides one way going forward, opposite going back. Navigation gets sense of direction.

## Scroll

- **Reveal-on-scroll** — Elements fade or slide into place entering viewport.
- **Scroll-driven animation** — Animation progress tied directly to scroll position. (vs **Reveal-on-scroll**: triggers once on entry; scroll-driven binds continuously.)
- **Parallax** — Background/foreground move at different speeds scrolling. Depth.
- **Page transition** — Animation plays navigating one page/route to another.
- **View transition** — Browser morphs between two states/pages, connecting shared elements.

## Feedback & Interaction

- **Press / Tap feedback** — Subtle scale-down when element clicked, feels physical. Value in "Buttons must feel responsive", [`SKILL.md`](SKILL.md).
- **Hold-to-delete** — Progress effect fills while user holds button, confirming without dialog.
- **Drag to reorder** — Drag items in list to rearrange, others shift to make room.
- **Swipe to dismiss** — Drag element off-screen to close, like drawer or toast.
- **Rubber-banding** — Resistance and snap-back dragging past boundary (iOS overscroll feel).
- **Shake / Wiggle** — Quick side-to-side jitter, signals error or rejected input.
- **Ripple** — Circle expanding from tap point, confirms press.

## Spring Animations — physics vocabulary

Names only; numbers, formulas and mapping between spring APIs in [`PHYSICS.md`](PHYSICS.md).

- **Bounce** — Motion's overshoot parameter. (vs **Damping ratio**: Apple's name for the same axis, inverted — mapping in [`PHYSICS.md`](PHYSICS.md).)
- **Damping ratio** — Overshoot control: higher settles clean, lower oscillates.
- **Response** — How fast spring reach target. (vs **duration**: spring has no fixed duration — response a parameter, settle time emerges from it.)
- **Perceptual duration** — How long spring feels finished, though keeps micro-settling underneath.
- **Velocity handoff** — Pointer-release velocity handed to spring as initial velocity, so drag and animation share one seam.
- **Momentum projection** — Resting position predicted from release velocity, then snapped to nearest target.

## Looping & Ambient Motion

- **Marquee** — Text/content scrolling continuously in loop.
- **Alternate (yoyo)** — Loop plays forward then reverses each iteration, instead of jumping back to start.
- **Orbit** — Element circling another in continuous path.
- **Pulse** — Gentle repeating scale/opacity change, draws attention.
- **Float** — Gentle continuous up-down drift, static element feels alive, weightless.
- **Idle animation** — Subtle motion while element sits waiting for interaction.

## Polish & Effects

- **Clip-path** — Clip element to shape. Used for reveals, masks, comparison sliders. (vs **Mask**: hides/reveals with shape or gradient, soft fadeable edges — clip-path edges hard.)
- **Mask** — Hide/reveal parts of element using shape or gradient — like clip-path, but soft, fadeable edges.
- **Comparison slider** — Draggable divider wipes between two overlaid images to compare. (Also called before/after slider.)
- **Line drawing** — SVG path draws itself in, like invisible pen tracing it.
- **Text morph** — Text animates character by character when changed, draws attention to new value.
- **Skeleton / Shimmer** — Placeholder with moving sheen shown while content loads.
- **Number ticker** — Digits rolling or counting up to value.
- **Tabular numbers** — Fixed-width digits so numbers don't shift as they change. Essential for tickers, timers, counters.
- **Typewriter** — Text appearing one character at a time, as if typed.
