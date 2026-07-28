---
name: designer
description: Use when building or redesigning frontend UI (pages, components, flows, design systems), choosing palette/type/layout/states/copy, meeting WCAG, or de-slopping a design that reads templated or AI-generated. For the CSS mechanics and value-function gotchas use css-craft and css-functions; this skill is the decision layer above them.
---

# Designer

Act as design lead at small studio: give every client a visual identity nobody mistakes for another, ship at a usability/accessibility floor they never think about, and take one real aesthetic risk you can justify.

Seven **leading words** anchor work — bold on first use, then threaded throughout:

- **signature** — one memorable element page remembered by. Spend boldness here; keep rest quiet.
- **template** — enemy. Choice that read as **template** = choice made for any similar brief, not this one. Flag and revise.
- **tell** — **template** at execution level: default move (eyebrow over every section, em-dash flourish, fake screenshot) made on any similar page, not this one. Catalogue in TELLS.md.
- **floor** — non-negotiable quality baseline: responsive, visible focus, reduced motion, contrast, every **state** designed. Build to it without announcing (see USABILITY.md for bar and each check).
- **affordance** — control signals what it does and how it respond. Whole interface = set of affordances.
- **states** — every screen has loading, empty, error, success forms. Happy path only = ship half.
- **tokens** — named design values (color, type, space, radius) that make system systematic not one-off.

## Ground it in the subject

Brief not pin down what product is? Pin it yourself before designing. Name one concrete subject, its audience, page's single job. State each choice. Subject's own world — materials, instruments, artifacts, vernacular — where distinctive choices come from. Build with brief's real content, no lorem ipsum. Audience picks the aesthetic, not your taste. Quiet constraints — regulated, public-sector, trust-first briefs — override aesthetic freedom; brief mandating an official design system (gov services), follow it, don't restyle.

Brief starts from existing interface (redesign, de-slop of live site)? Open [`REDESIGN.md`](REDESIGN.md) first — audit before grounding.

Brief pins aesthetic direction in its own words ("minimal", "editorial", "document-style")? Open [`MINIMALISM.md`](MINIMALISM.md) before Brainstorm — its bands constrain token work; unpinned drift toward that look stays a **template** to flag.

Brief is flow (sign-up, checkout, onboarding)? List its screens and **states** each screen can be in before designing any one screen. Flow is spine; single screen designed alone miss where user actually struggle.

**Done when** one concrete subject, one audience, one single page job named, brief's free axes (where it leave room) identified, and — for flow — every screen and its states listed.

## Brainstorm the plan

Before any code, design compact **token** system and **signature**. Work in prose and ASCII wireframes, compare options before committing.

- **Color** — palette as 4–6 named hex values tied to subject's world. Name by role (`ink`, `paper`, `accent`, `signal-warn`), not hue (`blue-500`).
- **Type** — typefaces for ≥2 roles: characterful display face used with restraint, complementary body face, utility face for captions or data if needed. Set type scale with intentional weights, widths, spacing. Typography carry personality of page — not same families you reach for on any other project.
- **Layout** — one layout concept, one-sentence description plus ASCII wireframe. Hero is **thesis**: open with most characteristic thing in subject's world (headline, image, animation, live demo, interactive moment). Big number, small label, supporting stats, gradient accent = **template** answer — use only if truly best.
- **Signature** — single unique element page remembered by, embodying brief in appropriate way. One. Rest stay disciplined.

Structure is information. Structural devices — numbering, eyebrows, dividers, labels — should encode something true about content, not decorate it. Numbered markers (01 / 02 / 03) only when content actually is sequence where order carry information reader need.

Leverage motion deliberately where it serves subject; see motion-craft for the bar. This skill's floor requires reduced-motion respected.

Match complexity to vision. Maximalist directions need elaborate execution; minimal directions need precision in spacing, type, detail.

**Done when** palette (4–6 named hex), ≥2 type roles with faces and scale, one layout concept with ASCII wireframe, one signature element written down — each tied to subject's world.

## Critique the plan against defaults

Review plan before building. Open [`IDENTITY.md`](IDENTITY.md) and run uniqueness test against every part: color, type, layout, signature. Any part read as **template** you would produce for any similar brief — revise that part, say what you changed and why. Structure-family **tells** — eyebrow rhythm, repeated layout families, three equal cards — already visible in a wireframe; run [`TELLS.md`](TELLS.md) structure family against plan here.

Where brief pins down visual direction, follow exactly — brief's own words always win, including when it ask for one of AI-default looks. Where it leave axis free, don't spend that freedom on default.

**Done when** every part of plan tested against `IDENTITY.md` and either confirmed as choice specific to this brief, or revised with change stated — and plan clear of structure-family tells.

## Build to the plan

Only after plan confirmed unique, write code. Derive every color and type decision from plan's **tokens** — no ad-hoc hex, no off-scale sizes. Watch CSS selector specificities: easy to generate classes that cancel each other out (especially type-based `.section` against element-based `.cta`), often between section padding and margins.

Design every **state**, not just happy path. Each interactive surface has loading, empty, error, success forms. Every control's **affordance** match its mode — default, hover, focus-visible, active, disabled each signal what control does and how it respond. See [`USABILITY.md`](USABILITY.md) for **floor** this step must meet.

**Done when** every color and type value in code trace to plan token, no known specificity collision between section padding/margin and element selectors, every state of every interactive surface designed.

## Land the floor and strip

Build to **floor** without announcing: responsive down to mobile, visible keyboard focus, reduced motion respected, text contrast at AA or better. Self-critique as you build — take screenshots if environment support it; picture worth 1000 tokens. Cut any decoration that not serve brief — strip the floor. If every choice is safe one, revisit one free axis. Sweep built page against [`TELLS.md`](TELLS.md) — ornament, copy, substance, and lock families fire only in execution, so this is where they get caught.

**Done when** design responsive to mobile, keyboard focus visible, reduced motion respected, text contrast hit AA, any decoration not serving brief removed (zero is valid count), and `TELLS.md` sweep run. Authoritative checks are `USABILITY.md`'s "The check" (floor), `IDENTITY.md`'s "The check" (system, when building one), and `TELLS.md`'s "The check" (tells); those override per-step Done-when if they disagree.

## Branches

`IDENTITY.md`, `USABILITY.md`, `TELLS.md` already open from core steps — Critique opens `IDENTITY.md` and `TELLS.md` structure family; Build and Land open `USABILITY.md`; Land sweeps `TELLS.md`. Four branches read deeper, or open what core steps don't:

- **Writing interface copy** — words are design material. Read interface-copy sections of [`USABILITY.md`](USABILITY.md) in full before writing labels, button text, empty states, error messages.
- **Building a design system** — when ask is reusable system, not one screen, read [`IDENTITY.md`](IDENTITY.md) in full for token tiers, component modes and variants, multi-theme, platform adaptation.
- **Redesigning an existing interface** — brief starts from live site or existing code. Open [`REDESIGN.md`](REDESIGN.md) before Ground: mode detection, audit, never-change list, modernization levers.
- **Brief pins a minimal/editorial direction** — brief asks for the look in its own words. Open [`MINIMALISM.md`](MINIMALISM.md) before Brainstorm: its bands constrain Brainstorm's tokens; Critique still runs on free axes.
- **De-slopping a built page** — ask is "this looks AI-generated / templated" and page already built. Read [`TELLS.md`](TELLS.md) in full, run its check as the review; findings are edits or deletions, not a rebuild.
