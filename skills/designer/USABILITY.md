# Usability — the floor and the words

Reference for **Build to the plan**, **Land the floor**, **Writing interface copy** paths in [`SKILL.md`](SKILL.md). Usability two halves: interface work for everyone (**floor**), and words help people find way through (interface copy). Both design material — same intent you bring to spacing and color apply to contrast, focus, button label.

## The floor

**Floor** = non-negotiable quality baseline — parts client never think about. Bar every build clear, plus check behind each.

### Contrast

Text contrast against background:

- **AA (the floor)** — 4.5:1 normal text, 3:1 large text (≥24px regular or ≥19px bold).
- **AAA (stretch)** — 7:1 normal, 4.5:1 large. Reach AAA on body copy where can; never ship below AA.
- UI components and graphical objects (icon borders, chart segments, focus indicators) — 3:1 against adjacent color.

Check pairs at boundaries, not average. Mid-grey label on white reading 4.5:1 alone often drop below when sat on tinted card.

### Focus

- Every interactive element has visible focus indicator. 2px outline, 3:1 contrast against surround, never removed without replacement.
- Tab order match reading order. Visual order diverge from DOM order = bug to fix in DOM, not tab sequence.
- Never disable outline globally. If style focus, style `:focus-visible` so mouse users don't see, keyboard users do.
- Modals, menus, drawers trap focus while open, return it to trigger on close.
- Recipe scaling with type: `outline: max(2px, 0.08em) solid currentColor; outline-offset: 0.25em;` — offset gives ring room without layout shift.
- Focus signaled by `box-shadow` alone vanish in Windows High Contrast / forced-colors mode (shadows stripped, outlines kept) — pair with `outline: 2px solid transparent`; transparent outline turns visible there.

### Motion

- Respect `prefers-reduced-motion`. Decorative motion (entrance reveals, ambient atmosphere, parallax) — suppress or swap for fade. Motion carrying information (spinner = progress) — keep information, drop flourish.
- User who ask reduced motion ask once, for everything. No per-component opt-out.
- Auto-playing motion longer than 5 seconds need pause, stop, or hide control.

### Semantic markup and assistive tech

- Use native element that do job: `<button>` for actions, `<a>` for navigation, `<input type="checkbox">` for toggles. Native give focus, role, keyboard behavior free; `<div onclick>` force you rebuild all three and you miss one.
- Add ARIA only when native element can't express semantics. `aria-label` on icon button, `aria-expanded` on disclosure, `aria-live` on toast region. ARIA on top of native control usually noise that conflict with free behavior.
- Images carrying information get `alt` text describing that information. Decorative images get `alt=""` — empty, not omitted.
- Form fields have programmatically associated `<label>`. Placeholder not label; it vanish moment user type.

### Color is not the only signal

- Never signal state by color alone. Error = color _plus_ icon _plus_ text. Required field = label _plus_ word "required" or asterisk with legend. Colorblind users, low-vision users, monochrome-display users all lose color channel.
- Charts and data viz: label series directly, not by color key alone.

### Target size

Touch targets ≥24×24 CSS px (44×44 comfortable minimum on mobile). Gaps between targets count toward this — tight row of small buttons need spacing, not just size. Tighten targets for pointer users only under `@media (any-hover: hover) and (any-pointer: fine)` — never shrink the touch default.

### Form input traps

- `input { font-size: max(16px, 1em); }` — iOS Safari zooms the page on focus when input text computes under 16px.
- Inputs don't inherit document typography — set `font-family: inherit` explicitly.

## States

Every interactive surface has four **states**. Design only happy path = ship half interface. Each state both structural design and moment for copy — voice and layout co-located here, not split across references.

- **Loading** — show work happening and roughly how long. Skeleton for known structure, spinner for unknown. Don't fake progress.
- **Empty** — invitation to act, not blank wall. Tell user what they see here once something exist, and how to get first something onto it.
- **Error** — explain what went wrong and how to fix, in interface's voice. Errors don't apologize, never vague. "Couldn't reach the server. Saved locally — retry when you're back online." beat "Oops! Something went wrong." Preserve user input; never make them retype.
- **Success** — confirm outcome in same vocabulary as action ("Published", not "Operation complete"). Brief unless action momentous.

## Interface copy

Words appear in design for one reason: make it easier to understand, therefore easier to use. Design material, not decoration.

### Write from the user's side of the screen

Before writing, ask what design need to say, and how best say it to help person navigate. Name things by what people control and recognize, never by how system built. Person manage notifications, not webhook config. Describe what something do in plain terms rather than sell it. Specific always beat clever.

### Active voice, one name per action

Active voice default. Control say exactly what happen when used: "Save changes," not "Submit." Action keep same name through whole flow, so button saying "Publish" produce toast saying "Published" and empty state saying "Publish your first post." Interface vocabulary = signposting for someone navigating product; cohesion and consistency = how people learn their way around.

### Register and discipline

Keep register conversational and tuned: plain verbs, sentence case, no filler, tone matched to brand and audience. Each element do exactly one job. Label labels, example demonstrates, nothing quietly do double duty. Label need tooltip to explain = label wrong.

## Cognitive load

- One primary action per screen. Secondary actions visibly secondary (weight, color, position), not competing.
- Plain language at audience's register.
- Forgiving inputs: accept formats human write, not one database store. Format phone numbers and card numbers yourself; don't reject them.

## The check (authoritative)

Before declaring floor landed and copy done: responsive to mobile, keyboard focus visible under `:focus-visible`, reduced motion respected, body contrast ≥ AA, every state designed (loading/empty/error/success), no color-only signals, and — read aloud in flow order — no line reads as system-internal jargon, apology, hedge, or placeholder, and no action change name between trigger and confirmation. One missing = not done.
