# Redesign — audit first, change deliberately

Reference for **Redesigning an existing interface** branch in [`SKILL.md`](SKILL.md). Redesign not greenfield with old site in way: existing site starting material — brand, IA, users' muscle memory. Misread mode = biggest source bad redesign output.

## Detect the mode

- **Preserve** — modernize, keep brand. Existing tokens constraints; evolve them.
- **Overhaul** — new visual language over existing content. Greenfield for visuals; content/IA preserved.

Brief ambiguous between them? Ask once — preserve brand, or start visually fresh? — then proceed. No question dump.

**Done when** mode named and, if asked, one question answered.

## Audit before touching

Document current state before proposing anything:

- **Brand tokens** — colors, type stack, logo treatment, radii, spacing rhythm, as found on site.
- **Information architecture** — page tree, primary nav, key conversion paths.
- **Patterns to keep** — signature interactions, recognisable hero, copy voice, accessibility wins already landed.
- **Patterns to retire** — run [`TELLS.md`](TELLS.md) sweep over existing site; every firing tell = retire candidate. Broken layouts and floor violations ([`USABILITY.md`](USABILITY.md)) join list.
- **Tracking surface** — URL slugs, anchor IDs, form field names, event-bearing labels downstream analytics/SEO depend on.

**Done when** all five documented, keep/retire lists concrete with locations.

## Never change silently

Explicit user approval before touching: URL structure and slugs, primary nav labels, form field names or order, brand logo or wordmark, legal/consent copy. Break SEO, analytics, autofill, muscle memory — costs invisible in visual diff.

## Modernization levers

Apply in order; stop when brief satisfied. Preserve mode usually stops at 3–4; overhaul runs further.

1. **Typography refresh** — biggest visual lift per unit risk.
2. **Spacing and rhythm** — section padding, vertical rhythm, alignment.
3. **Color recalibration** — unify neutrals, keep brand accent recognisable.
4. **Motion layer** — bar lives in `motion-craft`; whole-site motion audit is `motion-advisor`.
5. **Hero and key-section recomposition.**
6. **Full replacement** — only for blocks unsalvageable after 1–5.

Each applied lever runs through SKILL.md's normal steps — plan against **tokens**, critique against [`IDENTITY.md`](IDENTITY.md) and [`TELLS.md`](TELLS.md), land **floor**. Preserve mode: uniqueness test compares against _this brand's_ existing choices, not blank slate — right answer often already on old site.

**Done when** levers applied in order to point brief asked for, each change traceable to audit finding or brief request, nothing on never-change list touched without approval.

## The check

Mode named; audit's five parts documented; every shipped change traces to keep/retire finding or explicit brief ask; never-change list intact or approved; **floor** at least as good as before — regressed focus states, contrast, or alt text = failed redesign regardless how it looks.
