# Visual identity — distinctive and systematic

Reference for **Critique the plan** step and **Building a design system** branch in [`SKILL.md`](SKILL.md). Visual identity two halves: pick non-default choices (distinctive), then codify so change propagates and new screen composes from existing decisions (systematic). First half runs every build; second runs when ask is reusable system, not one screen.

## The three defaults

AI-generated design clusters around three looks. All legit for some briefs, but **templates** — defaults not choices, appear regardless of subject. Where brief leave axis free, don't spend freedom on these.

1. **Warm cream** — warm cream background (near `#F4F1EA`), high-contrast serif display, terracotta accent.
2. **Acid on black** — near-black background, single bright acid-green or vermilion accent.
3. **Broadsheet** — hairline rules, zero border-radius, dense newspaper-like columns.

## The uniqueness test

For each plan part (color, type, layout, signature), run test:

1. Imagine similar but different brief, same subject type. Same choice for it?
2. If yes, choice is **template** — answers "any page like this," not this one. Revise toward something specific to this brief's subject, audience, job.
3. Say what changed and why.

Choice passes when it would be wrong for different brief on same subject type — when it depends on something true about _this_ subject a similar one wouldn't share.

## When defaults are correct

Where brief pins visual direction — including asking for one of three looks above — follow exactly. Brief's own words win. **Template** only fails when you chose it by default; when brief chose it, it's constraint, and constraints good.

Goal not originality for own sake. Goal: choices a similar brief would not also produce. Where brief already constrains axis, spend freedom on open axes — and not on these three defaults.

---

## Design tokens

When ask is reusable system, **tokens** become product. Tokens make system systematic: change one value, propagates everywhere used; new screen composed from existing decisions, not invented fresh.

### Three tiers

Don't flatten every value into one list. Three tiers keep system editable and legible:

1. **Primitive** — raw values, named by what they are. `gray-900`, `spacing-4`, `radius-md`, `font-size-lg`. Palette you choose from. Not used directly in components.
2. **Semantic** — values named by role, pointing at primitives. `text-primary` → `gray-900`, `surface-raised` → `gray-50`, `border-subtle` → `gray-200`, `space-section` → `spacing-8`. Layer components consume. Re-theme changes semantic→primitive mapping, not components.
3. **Component** — values local to component, named for component part. `button-bg-primary`, `card-radius`, `input-border-focus`. Escape hatch when component needs decision no semantic token captures; use sparingly or layer rots.

Components consume semantic tokens. Primitives are source. Component tokens are exceptions. Component reaching past semantic to primitive is smell — baked in decision theme can't reach.

### Scales, not single values

Each dimension is scale, not handful of picked values:

- **Type** — modular scale (e.g. 1.250 major third) from caption to display, weight and line-height per step. Body text is one step; nothing picks arbitrary font-size.
- **Space** — base unit (typically 4px), scale of multiples (4, 8, 12, 16, 24, 32, 48, 64). Padding and gaps are scale values, not ad hoc numbers.
- **Color** — role set (text, surface, border, accent, signal: success/warn/danger/info), each with contrast pairs floor requires (see [`USABILITY.md`](USABILITY.md)).
- **Radius** — two or three steps (`sharp`, `control`, `card`); not seven subtly different corners.
- **Motion** — duration and easing tokens (`motion-fast`, `motion-base`, `ease-out`), so timing consistent across system. Coordinate with `motion-craft`.

### Component modes and variants

Every component defined across its axes, not single snapshot. Note: _modes_ here are component's interactive forms (default, hover, focus-visible, active, disabled) — distinct from screen **states** (loading/empty/error/success) in [`USABILITY.md`](USABILITY.md). Both must be designed; different references because different questions.

- **Modes** — default, hover, focus-visible, active, disabled. Each is token mapping, not re-paint. Component with undesigned mode is half-shipped; `USABILITY.md` floor applies to every component in system.
- **Variants** — typed axes component offers: `intent` (primary/secondary/ghost/danger), `size` (sm/md/lg), `fullWidth` (bool). Variants compose; avoid matrix variant like `primary-large-fullWidth` when `intent × size × fullWidth` covers it. Variant API that can't compose is smell — usually one prop doing two jobs.

Document each component with: what it is (one line), when to use, when not to, variant API, one example. Usage docs make system adoptable; undocumented components get re-implemented.

### Multi-theme

Dark mode is semantic→primitive remapping, not separate component set. Component layer theme-agnostic; only semantic layer changes. This tests tiers are correct: if you can't ship dark mode by editing only semantic tokens, a component reached past its layer — find and fix. For CSS mechanism of swapping tokens (`[data-theme]`, `setProperty`), see `css-craft`.

### Platform adaptation

When system spans platforms (web, native mobile, desktop), semantic layer shared, primitive layer adapts to platform conventions:

- Web — system as described above.
- iOS — follow Human Interface Guidelines; map semantic tokens to system semantics where platform expects them (e.g. system colors, SF for body text). Respect native affordances (tab bar, not web nav bar faked into sheet).
- Android — follow Material 3; same semantic mapping to Material tokens and type scale.
- Desktop — denser spacing scale, native menu and window chrome expectations.

Don't force one platform's conventions onto another. Semantic contract constant; primitives honor platform.

## The check

Distinctive: every plan part tested against uniqueness test, each confirmed as choice specific to this brief or revised with change stated. Systematic (when building system): every component consumes semantic tokens (no primitive reach), every component has every mode designed, dark mode ships from semantic edits alone, every component has one-line purpose and documented variant API. Component failing any of these is hole, not finish line.
