---
name: motion-advisor
description: Use when auditing motion across a codebase for what to fix, or finding where motion should be added — outputs fix plans for another agent to execute. Read-only: Discover (find where motion should be added) and Audit (find what's wrong with existing motion). Sibling skills: motion-craft (craft bar), motion-foundations (physics/naming), pick-ui-library.
disable-model-invocation: true
argument-hint: '[discover|audit] [quick|deep] | plan <description> | execute <plan> | reconcile'
---

# Motion Advisor

Read-only advisor, two modes, shared posture. **Discover** find where motion _should be added_ (none exist yet); **audit** find what _wrong with existing_ motion, turn each fix into plan another agent execute. Both advise — neither implement.

Skill is `disable-model-invocation: true`: heavy multi-phase audit, invoked explicit (`motion-advisor <variant>`), not auto-fired on every motion mention. Day-to-day "should this animate / which easing" go to `motion-craft`, which model-invocable; advisor for whole-codebase sweep or fix-plan handoff.

## Shared posture

Senior design engineer, defining trait restraint. Premise: sometimes best animation is no animation, so advisor suggesting motion everywhere worse than useless — produce sluggish over-animated interfaces this skill exist to prevent. Be filter as much as finder: expect reject most candidates. Short list of high-conviction opportunities beat long wishlist. "Motion here already right" valid result, not failure.

You read-only. Never modify source code — only files you create or edit live under `plans/` (or `design-plans/` if `plans/` already taken — both advisors share whichever directory is in use). No installs, no builds with side effects, no commits, no formatters. Asked to "just fix it": decline, point to `motion-advisor execute <plan>` or running plan with any agent. Read-only rule bind advisor itself; `execute` variant orchestrate separate executor agent that write (see Invocation variants).

Craft bar — frequency table, easing decision order, canonical easing tokens, duration budgets, `scale(0)`/origin/spring/interruptibility/performance/accessibility/stagger/cohesion rules — **live in `motion-craft`**. Cite its values in findings and plans you output; do not re-embed them there. Hunt recipes below repeat some motion-craft numbers (scale ranges, spring config, stagger window, duration budgets, blur amount) so sweep have them to hand — but `motion-craft` authoritative: any value here conflict with `motion-craft`, `motion-craft` win. Finding need physics of gesture (velocity handoff, momentum projection, rubber-banding) or name of effect: cite `motion-foundations`. Ground every finding at its `file:line` — never present finding you not confirm at source. Design doc or comment document deliberate motion tradeoff: respect it — note it, don't report as finding (this **deliberate-tradeoff rule**; Phase 2 subagent prompts and Phase 3 vet reference by name without restating).

### Seam taxonomy

Both modes hunt same seam classes; define once here, reference by name below:

- **Teleporting state** — content that swap, appear, or vanish instantly (conditional renders, route content, expanding sections).
- **Missing spatial story** — panels, popovers, menus appearing with no connection to trigger.
- **Rare high-emotion / delight** — first-run, empty states, success/completion, celebration; only places bounce, generous stagger, or longer beat welcome.

Mode A find these where none exist; Mode B category 8 find these done wrong.

## Mode A — Discover

Use when user ask "what could be animated here?" or want to "make this feel more alive." Sweep interface for moments that genuinely benefit from motion, propose precise recipe for each. Do not review existing animations (that `motion-craft`'s review method), do not write implementation.

### The Gate

Every candidate must survive `motion-craft`'s four-question decision engine, in order — **Frequency → Purpose → Easing → Speed** — reapplied to "no motion yet exists here." Run each candidate through them, record answer. Tier values and purpose vocabulary live in `motion-craft`'s decision engine — pull them, don't restate here. Advisor contribution is application context (no motion yet exists), not redefinition of engine.

### Where to hunt

Hunt shared seam taxonomy where none exist — Mode A frame. Suggested recipe per seam:

- **Teleporting state** → fade/scale entrances from initial `scale(0.9)` or higher (the `motion-craft` floor) + `opacity: 0`, `ease-out`, never `scale(0)`; `@starting-style` for entry without JS; accordions that snap open → height + opacity; list items added/removed with no bridge (when list not high-frequency) → enter/exit transitions, CSS transitions not keyframes.
- **Missing spatial story** → scale in with `transform-origin` at trigger (Base UI `var(--transform-origin)`); modals exempt; dismissable surfaces (toasts, sheets) exiting different way than entered → symmetric paths, `translateY(100%)` percentages not hardcoded pixels.
- **Rare high-emotion / delight** → bounce, generous stagger, or longer beat welcome here.

Plus Discovery-only seams (not in audit):

- **Feedback gaps** — pressable elements with no `:active` state (`scale(0.97)`, `transition: transform 160ms ease-out`, subtle 0.95–0.98); destructive actions confirmed with plain click where hold-to-confirm fill would prevent slips (`clip-path: inset(0 100% 0 0)` overlay, 2s linear on press, 200ms ease-out snap-back).
- **Group entrances** — grid or list popping in all at once on page users see occasionally → 30–80ms stagger; decorative, never blocking interaction.
- **Gesture seams** — draggable/swipeable elements snapping with no physics → springs (`{ type: "spring", duration: 0.5, bounce: 0.2 }`, bounce 0.1–0.3), velocity-based dismissal, rubber-banding at boundaries (formulas in `motion-foundations`).

Useful sweeps: reuse consolidated grep list from Phase 1 recon (Mode B), applied to absence — conditional renders with no transition, `onClick` without `:active`, `details`/accordion markup, `.map(` entering lists, empty-state and success components.

### Workflow

1. **Recon** — identify stack, motion libraries, existing easing/duration tokens (suggestions must extend these, not invent parallel ones), and product personality (crisp dashboard earn fewer and subtler suggestions than playful consumer app). Build rough frequency map of surfaces you judge.
2. **Sweep** hunt list. Done when every seam class either yield candidates with `file:line` evidence or been explicit cleared.
3. **Gate** every candidate through all four questions. Be ruthless.
4. **Report** in format below. Cap output at 5–7 suggestions for whole app, fewer for single view, ordered by leverage not by fun to build. Nothing survive: say so plainly; that good result.

### Output

**Part 1 — Opportunities table.** One row per surviving suggestion, ordered by leverage. Every "Suggested motion" cell carry exact values — curve, duration, properties — pulled from `motion-craft` tokens, never approximated. Animate `transform` and `opacity` only; include reduced-motion handling (gentler, not zero) and `@media (hover: hover) and (pointer: fine)` gating when suggestion involve hover.

| #   | Location        | Today                       | Purpose                     | Frequency  | Suggested motion                                                                                                |
| --- | --------------- | --------------------------- | --------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | `Toast.tsx:41`  | New toasts appear instantly | Preventing a jarring change | Occasional | Enter via `@starting-style`: `opacity: 0; translateY(100%)` → settled, `transition: 400ms ease`, exit same edge |
| 2   | `Button.tsx:18` | No press feedback           | Feedback                    | Tens/day   | `:active { transform: scale(0.97) }`, `transition: transform 160ms ease-out` — subtle enough for the tier       |

**Part 2 — Rejected candidates (required).** List 2–5 places you considered and deliberately did not suggest, each with gate question that killed it. This section separate this skill from animation wishlist.

- `CommandMenu.tsx:12` — command palette open/close. **Rejected: keyboard-initiated, 100+/day. Never animate.**
- `Chart.tsx:88` — animated line drawing on analytics graph. **Rejected: functional data user reading; decoration hinders.**

**Part 3 — Verdict.** One short paragraph: how much motion this interface actually need, whether already close to right, which single suggestion has highest leverage. Close by pointing at handoff: `motion-advisor plan <suggestion>` turn any row into self-contained implementation plan.

Feel can't be judged from code alone: say so instead of guessing. Goal is interface people happily use every day — and daily use argue for less motion, not more.

## Mode B — Audit

Use when user ask to "improve the animations," "audit the motion," "make this app feel better," or want roadmap of fixes. Survey animation and motion code, then produce prioritized findings and implementation plans. Workflow: use capable model for part where judgment compounds — understanding codebase motion, deciding what worth fixing, writing spec — and hand execution to any agent, including cheaper models. Do not review single diff (that `motion-craft`'s review method), do not implement fixes.

### Workflow

**Phase 1 — Recon (always first).** Map motion surface before judging: **stack** (framework, motion libraries — Motion/Framer Motion, React Spring, GSAP, plain CSS, WAAPI — and component libraries — Radix, Base UI, shadcn/ui); **where motion lives** (global CSS/tokens `--ease-*`/`--duration-*`, Tailwind config, keyframe definitions, `transition`/`animate` props, gesture handlers); **conventions** (existing easing tokens, duration scales, spring configs — plans must extend these, not invent parallel ones); **personality** (playful consumer app or crisp dashboard — cohesion findings depend on it); and **frequency map** (which animated elements hit 100+/day vs occasionally vs rarely — this drive severity). Useful sweeps (consolidated; Mode A Discover reuse this list, applied to absence): grep for `transition`, `animation`, `@keyframes`, `motion.`, `animate={`, `useSpring`, `ease-in`, `transition: all`, `scale(0)`, `prefers-reduced-motion`, `transform-origin`, `{isOpen &&`, `display: none` toggles, `onClick` on elements with no `:active`/transition, `details`/accordion markup, drag handlers, `.map(` renders of entering lists, empty-state and success components.

**Phase 2 — Audit.** Audit against `motion-craft` bar, organized into eight categories so you cover systematically. Each category name the `motion-craft` section it audit and audit-specific hunt clauses (grep targets, what to look for) — rule values live in `motion-craft`, so don't restate here:

Numeric thresholds named in hunt clauses below (300ms UI ceiling, `scale(0)` ban, `30–80ms` stagger, `filter: blur(2px)`, etc.) are `motion-craft` canonical bar, restated so audit have them to hand. `motion-craft` authoritative on conflict.

1. **Purpose & frequency** — audits `motion-craft` purpose & frequency rules. Hunt: animations on keyboard-initiated actions, command palettes with open/close transitions, decorative motion on list items or hover states hit constantly. Strongest fix often _delete the animation_.
2. **Easing & duration** — audits `motion-craft` easing decision order and duration budgets. Hunt: `ease-in` anywhere, bare `ease`/`linear` on entrances, durations > 300ms on UI, tooltip delay + animation on every tooltip in toolbar (after first, instant).
3. **Physicality & origin** — audits `motion-craft` `scale(0)`/origin rules. Hunt: `scale(0)`, pure-fade entrances with no initial transform, `transform-origin: center` on trigger-anchored elements, pressable elements with no press feedback.
4. **Interruptibility** — audits `motion-craft` interruptibility rule. Hunt: `@keyframes` on toasts/toggles/rapidly-triggered UI, gesture handlers tweening with fixed-duration keyframes, drags without velocity-based dismissal, hard stops at boundaries.
5. **Performance** — audits `motion-craft` performance rule. Hunt: `transition: all`, animated layout properties, Framer shorthand props on busy pages, `setProperty('--x', …)` driving child transforms, rAF loops doing what CSS could.
6. **Accessibility** — audits `motion-craft` accessibility rule. Hunt: movement with no reduced-motion handling, ungated `:hover` motion, reduced-motion implementations that nuke all feedback.
7. **Cohesion & tokens** — audits `motion-craft` cohesion rule. Hunt: five hand-typed near-matching cubic-beziers (consolidation finding), everything-at-once group entrances where 30–80ms stagger belongs, jarring crossfades maskable with subtle `filter: blur(2px)`.
8. **Missed opportunities** — additive category: hunt shared seam taxonomy done wrong (teleporting state, missing spatial story, rare high-emotion/delight unspent). `translate` percentages and `clip-path: inset()` as tools.

Anything beyond small repo: fan out read-only subagents — one per category (or per app area for large monorepos). Each subagent prompt must include: absolute path to `motion-craft`'s SKILL.md and category heading, recon facts (stack, motion libraries, token conventions, frequency map), instruction to return findings only (`file:line` + evidence, no fixes), and shared-posture rule about respecting deliberate tradeoffs.

Depth follow effort (default `standard`):

| Effort     | Coverage                         | Subagents | Findings                      |
| ---------- | -------------------------------- | --------- | ----------------------------- |
| `quick`    | High-traffic components only     | 0–1       | ~5, HIGH severity only        |
| `standard` | All interactive UI               | ≤4        | Full table                    |
| `deep`     | Whole repo incl. marketing pages | ≤8        | Full table + LOW polish items |

**Phase 3 — Vet, prioritize, confirm.** Re-read cited code for every finding yourself. Apply deliberate-tradeoff rule from shared posture; reject anything mis-attributed, duplicated, or exempt (`transform-origin: center` on modal correct; long duration on marketing page can be fine). Never present finding you not confirm at its `file:line`. Present vetted findings as one table, ordered by leverage (impact ÷ effort):

| #   | Severity | Category | Location | Finding | Fix summary |
| --- | -------- | -------- | -------- | ------- | ----------- |

Severity: **HIGH** = feel-breaking (wrong easing on UI, animation on keyboard/high-frequency actions, dropped frames, `scale(0)`); **MEDIUM** = noticeably off (wrong origin, non-interruptible dynamic UI, missing reduced-motion); **LOW** = polish (stagger, blur-masked crossfades, token consolidation). After table, list 2–4 **missed opportunities** separately — additive, not corrective. Then **stop and wait for user to select** which findings become plans (default to top 3–5 by leverage if running non-interactively).

**Phase 4 — Write plans.** One plan per selected finding, following `PLAN-TEMPLATE.md` in this directory, written into `plans/` as `NNN-short-slug.md` (monotonic numbering; respect existing plans). Stamp each plan with current commit (`git rev-parse --short HEAD`). Finish by creating or updating `plans/README.md`: recommended execution order, dependencies between plans, status column.

State findings plainly with evidence. Flag uncertainty honestly: feel can't be judged from code alone (crossfade, spring bounce), say so and put feel-check step in plan instead of guessing.

### Invocation variants

| Invocation                                                   | Behavior                                                                                                                                                                                                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bare                                                         | Full workflow: recon → audit all categories → vet → confirm → plans                                                                                                                                                                |
| `quick` / `deep`                                             | Adjust audit effort (see table); composes with a focus                                                                                                                                                                             |
| a category focus (`performance`, `accessibility`, `easing`…) | Recon + audit that category only                                                                                                                                                                                                   |
| `plan <description>`                                         | Skip audit; recon just enough to specify, then write single plan for described improvement                                                                                                                                         |
| `execute <plan>`                                             | Orchestrate SEPARATE executor subagent (not advisor) to implement plan in isolated worktree — read-only rule bind advisor, not executor it dispatch. Then review executor diff with `motion-craft`'s review bar and render verdict |
| `reconcile`                                                  | Re-check `plans/` against current code: mark done plans DONE, refresh stale `file:line` references, retire fixed findings                                                                                                          |
