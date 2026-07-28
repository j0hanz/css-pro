# Minimalism — pinned direction, not default

Reference for **Brief pins minimal/editorial direction** branch in [`SKILL.md`](SKILL.md). Defines editorial minimalism — document-style, warm monochrome, type-carried — as constraints once brief pick it. Never chooses: unpinned brief drifting toward look = warm-cream-adjacent **template** ([`IDENTITY.md`](IDENTITY.md) defaults) — flag per Critique, close file. Everything here relationship or band survive palette swap; exact values derived per brief through Brainstorm's normal token work.

## The gate

File applies only when brief pins direction in own words — "minimal", "editorial", "document-style", "clean like Notion / Linear". That `IDENTITY.md`'s "When defaults are correct": brief chose it, so constraint, constraints good. Anything less — vibe you inferred, "modern" alone, own taste — not pin.

**Done when** brief's own words naming direction quoted, or file closed.

## The stance

Restraint as system, five relationships:

- **Whitespace is the structure** — hierarchy from space and scale, not boxes and rules.
- **Hairline does separation** — 1px border do work shadow do elsewhere; shadow near-absent.
- **Color is scarce** — spent only on semantic meaning and small accents; type and space carry page.
- **Type carries the contrast** — two voices in extreme contrast replace decoration as source of drama.
- **Precision is the craft** — minimal directions need precision in spacing, type, detail (SKILL.md); every surviving element exact, or restraint reads unfinished.

## Type — two voices, extreme contrast

- **Display** — characterful face (editorial serif natural fit, not mandated), tight negative tracking, leading near 1.1. Used with restraint: hero, section heads, pull quotes.
- **Body** — plain complementary face, leading ≥ 1.5, ink never pure black, secondary text visibly muted step of ink.
- **Meta** — mono for code, keystrokes, data labels, where brief has them.

Roles and metrics only — faces chosen per brief in Brainstorm, as SKILL.md requires. Same families on any similar brief = **template**; contrast relationship is style, faces belong to brief.

## Color — relationships, not hexes

Token roles and bands; derive values per brief (`css-craft` for mechanics, `css-functions` for derivation):

- `paper` — warm near-white canvas; surfaces at or barely off paper.
- `ink` — off-black, never `#000`.
- `hairline` — ink at low alpha for every border and divider (`color-mix(in oklch, var(--ink) 6%, transparent)` shape); one value page-wide.
- **accents** — low-chroma washes (oklch chroma ≲ 0.04), reserved for small semantic surfaces — tags, badges, inline code — each paired with readable same-hue text (`contrast-color()`, or darker more-chromatic oklch pair).

Bans defining style: no gradients as color, no high-chroma large surfaces, shadow diffuse and ≤ 0.05 alpha where kept at all.

## Shape and space

- **Radius** — two low steps (control, card), both crisp; pills only on smallest elements (tags, badges), never containers or primary buttons.
- **Section space** — from top of space scale; macro-whitespace set first, before any component.
- **Measure** — prose constrained to readable measure (~65–75ch); never full-bleed text.
- **Card** — hairline border, generous internal padding from upper space scale, flat surface at or near paper.
- **Structure without boxes** — where list reads as document (accordion, FAQ, meta rows), separate with hairline border-bottom only; container box exception, earned.

## Motion

Quiet personality: opacity plus small translate only, sparing scroll reveals, nothing ambient. Every duration, easing, stagger value from `motion-craft` — none live here. Reduced motion per floor.

## What still runs

Direction is discipline, not **signature**. Full SKILL.md flow unchanged:

- **Signature still required** — one memorable element on axis direction leaves free; restraint everywhere else is what makes it land.
- **Uniqueness test still runs** ([`IDENTITY.md`](IDENTITY.md)) on free axes: subject grounding, content, layout, signature. Direction pins palette temperature and type contrast; doesn't pin what page says or one risk it takes.
- **[`TELLS.md`](TELLS.md) sweep runs in full** — faux-OS window chrome and div-built fake screenshots stay banned (substance family) whatever minimalist preset elsewhere prescribes; text-only "minimalism" with no imagery reads unfinished, not minimal (same file).
- **Floor untouched** ([`USABILITY.md`](USABILITY.md)) — muted palette makes contrast first casualty: secondary text and hairlines on tinted washes need checking at boundaries.

**Done when** tokens derived per brief within bands, signature named, free axes listed for Critique.

## The check

Direction quoted from brief's own words; every color and type value in code traces to brief-derived token inside bands; zero gradients-as-color, heavy shadows, or high-chroma large surfaces; accent count small and semantic, each wash paired with AA-passing text; radius inside band with pills only on smallest elements; signature present on free axis; floor checked at boundary pairs, AA or better. One missing = direction not landed.
