# Motion Glossary — reverse-lookup

Reverse-lookup table: map vague description ("bouncy thing when popover opens") to term. Descriptions quoted as-is, authoritative. Trivial defs model already know (Translate, Scale, Rotate, Fade, Hover, Drag, Delay, Duration, Loop, Blur) omitted — only non-obvious mappings and confusable-term disambiguation here.

## Entrances & Exits

- **Pop in** — Element appears with slight overshoot, bounces into place. (vs **Bounce**, spring that overshoots and settles on release — Pop in is entrance, Bounce is spring behavior.)
- **Reveal** — Content uncovered gradually, often by animating clip-path or mask.
- **Enter / Exit** — Animation element plays when added to or removed from screen.

## Sequencing & Timing

- **Stagger** — Animate several items one after another, small delay between each. Cascade.
- **Orchestration** — Deliberate timing of multiple animations so they feel like one coordinated motion.
- **Fill mode** — Whether element keeps first or last frame styles before animation starts or after it ends (e.g. forwards).
- **Stepped animation** — Animation divided into discrete steps, like countdown timer.

## Movement & Transforms

- **Skew** — Slant element along X or Y axis, shearing it out of rectangular shape.
- **3D tilt / Flip** — Rotate in 3D space (rotateX / rotateY) for depth.
- **Perspective** — How strong 3D effect looks — lower value exaggerates depth, viewer feels closer.
- **Transform origin** — Anchor point scale or rotation grows or spins from.
- **Origin-aware animation** — Element animates out of its trigger, like popover growing from button that opened it instead of from own center (CSS default).

## Transitions Between States

- **Crossfade** — One element fades out as another fades in, same spot.
- **Continuity transition** — Change that keeps user oriented by visually connecting before and after. Example: same rectangle bigger and smaller.
- **Morph** — One shape smoothly turns into another, e.g. Dynamic Island.
- **Shared element transition** — Element travels and transforms from one position into another, like thumbnail expanding into card. (vs **Layout animation**, which animates element's own size/position change — shared element transition implies same element appearing in two places.)
- **Layout animation** — Element size or position changes, animates to new spot instead of snapping.
- **Accordion / Collapse** — Section smoothly expands and collapses height to show or hide content.
- **Direction-aware transition** — Content slides one way going forward, opposite way going back. Navigation gets sense of direction.

## Scroll

- **Scroll reveal** — Elements fade or slide into place as they enter viewport.
- **Scroll-driven animation** — Animation progress tied directly to scroll position. (vs **Scroll reveal**, which triggers once on entry; scroll-driven binds continuously to scroll.)
- **Parallax** — Background and foreground move at different speeds while scrolling. Depth.
- **Page transition** — Animation plays when navigating from one page or route to another.
- **View transition** — Browser morphs between two states or pages, connecting shared elements.

## Feedback & Interaction

- **Press / Tap feedback** — Subtle scale-down when element clicked, feels physical. See `motion-craft` for the value.
- **Hold to confirm** — Progress effect fills up while user holds button.
- **Drag to reorder** — Drag items in list to rearrange, others shift to make room.
- **Swipe to dismiss** — Drag element off-screen to close it, like drawer or toast.
- **Rubber-banding** — Resistance and snap-back when dragging past boundary (iOS overscroll feel).
- **Shake / Wiggle** — Quick side-to-side jitter signaling error or rejected input.
- **Ripple** — Circle expanding from tap point, confirms press.

## Easing — pure definitions

- **Ease-out** — Starts fast, ends slow. Default for most UI and anything responding to user.
- **Ease-in** — Starts slow, ends fast.
- **Ease-in-out** — Slow, fast, slow. For elements already on screen moving A to B.
- **Linear** — Constant speed. Reserve for spinners or marquees.
- **Cubic-bezier** — Custom easing curve you define for precise control.
- **Asymmetric easing** — Curve that accelerates and decelerates at different rates. Feels more alive than symmetric one.

## Spring Animations — physics vocabulary

- **Spring** — Motion driven by physics (tension, mass, damping) rather than set duration.
- **Stiffness / Tension** — How strongly spring pulls toward target. Higher feels snappier.
- **Damping** — How quickly spring settles. Lower damping means more bounce and oscillation.
- **Mass** — How heavy element feels. More mass means slower, more sluggish.
- **Bounce** — Spring that overshoots and settles. Playful.
- **Perceptual duration** — How long spring feels finished, even though it keeps micro-settling underneath.
- **Momentum** — Motion carrying velocity, especially after drag or interruption.
- **Velocity** — How fast and which direction element moves. Spring carries it into next animation when interrupted, so flicked element keeps speed.
- **Interruptible animation** — Animation that can be smoothly redirected mid-flight instead of finishing first.

## Looping & Ambient Motion

- **Marquee** — Text or content scrolling continuously in loop.
- **Alternate (yoyo)** — Loop plays forward then reverses each iteration, instead of jumping back to start.
- **Orbit** — Element circling another in continuous path.
- **Pulse** — Gentle repeating scale or opacity change to draw attention.
- **Float** — Gentle continuous up-and-down drift, makes static element feel alive and weightless.
- **Idle animation** — Subtle motion while element just sits there, waiting for interaction.

## Polish & Effects

- **Clip-path** — Clip element to shape. Used for reveals, masks, before/after sliders. (vs **Mask**, which hides/reveals with shape or gradient that has soft, fadeable edges — clip-path edges are hard.)
- **Mask** — Hide or reveal parts of element using shape or gradient — like clip-path, but soft, fadeable edges.
- **Before / after slider** — Draggable divider wipes between two overlaid images to compare them.
- **Line drawing** — SVG path draws itself in, like invisible pen tracing it.
- **Text morph** — Text animates character by character when it changes, draws attention to new value.
- **Skeleton / Shimmer** — Placeholder with moving sheen shown while content loads.
- **Number ticker** — Digits rolling or counting up to value.
- **Tabular numbers** — Fixed-width digits so numbers don't shift around as they change. Essential for tickers, timers, counters.
- **Typewriter** — Text appearing one character at a time, as if typed.

## Performance — descriptive terms

- **Frame rate (FPS)** — Frames drawn per second. 60fps baseline for smooth motion; 120fps on newer displays.
- **Jank** — Visible stutter when browser drops frames, can't keep up with animation.
- **Dropped frame** — Frame browser missed its deadline to draw. Tiny hitch in motion.
- **Compositing** — GPU moves or fades element on its own layer without redoing layout or paint.
- **will-change** — CSS hint that element is about to animate, so browser can promote it to own layer ahead of time.
- **Layout thrashing** — Animating properties like width, height, top, or left that force browser to recalculate layout every frame. Causes jank.

## Principles to Know

- **Purposeful animation** — Motion should serve function — orient, give feedback, show relationships — not just decorate.
- **Anticipation** — Small wind-up in opposite direction before move, hints at what's coming.
- **Follow-through** — Parts of element keep moving and settle slightly after main motion stops. Adds weight.
- **Squash & stretch** — Deform element as it moves to convey weight, speed, flexibility.
- **Perceived performance** — Right animation makes interface feel faster, even when it isn't.
- **Frequency of use** — More often user sees animation, shorter and subtler it should be.
- **Spatial consistency** — Animate so element keeps identity and position across states, users never lose track of where things went.
- **Reduced motion** — Respect user's prefers-reduced-motion setting by toning down or removing motion.
