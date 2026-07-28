# Organization — structure, naming, comments, files

Reference for **Structuring a stylesheet** branch in [`SKILL.md`](SKILL.md); audited by `design-advisor`. CSS carries little built-in organization — consistency on you. Four levers above the token and cascade mechanics in [`TOKENS.md`](TOKENS.md) and [`LAYOUT.md`](LAYOUT.md): order sections, name selectors, comment the why, split files.

## Project style guide wins

Project has a CSS style guide (formatting, naming, file split) — follow it over personal preference. Team consistency beats your better idea. No guide: pick rules here, hold them everywhere. Cost of inconsistency is rot, not the wrong choice.

## Order sections general → specific

Reader hunting a rule should know which region to look. Order:

1. **General** — element defaults: `body`, headings, `p`, `ul`/`ol`, `table`, links.
2. **Utilities** — small reusable classes applied many places (`.no-bullets`, `.flow`).
3. **Sitewide** — header, nav, footer, page layout.
4. **Page / component** — scoped rules, broken down by context.

`@layer reset, theme, components, utilities;` ([`LAYOUT.md`](LAYOUT.md)) sets _cascade_ precedence; it does not replace this — order within a layer too, for navigability. Each section earns a comment header (below).

## Name selectors by component, not style

Class names what thing _is_, not what it looks like — `.product-card`, not `.blue-box`; `.is-open`, not `.visible`. One pattern page-wide; mixed schemes read as assembled from different kits.

**BEM** — Block Element Modifier, live convention for component CSS:

- **Block** — standalone entity: `.form`, `.card`, `.nav`.
- **Element** — part tied to block, two underscores: `.form__label`, `.card__title`.
- **Modifier** — flag changing block or element, two dashes: `.form--compact`, `.card__title--large`.

```html
<form class="form form--compact">
  <label class="form__label">…</label>
  <input class="form__input" />
</form>
```

Flat classes, low specificity — `.form__input`, not `.form .input` (descendant selector couples element to block DOM and fights override). Modifier extends base, never rewrites it. One convention per project; don't BEM half a codebase.

Systems you'll meet in existing work — recognize, work within the one chosen, don't rename:

- **OOCSS** — separate structure from skin, base class + modifier. Now expressed via tokens + composition; the habit survives.
- **SMACSS** — categorize rules base/layout/module/state/theme. Now expressed via `@layer` ([`LAYOUT.md`](LAYOUT.md)).
- **ITCSS** — inverted triangle, generic → specific. Now expressed via token tiers (`designer` `IDENTITY.md`) + `@layer`.

## Comment the why, not the what

CSS mostly self-explanatory; comment decisions and reasons, not every line. Section headers give a search target — a string that won't appear in code jumps section to section:

```css
/* || General styles */
/* || Utilities */
/* || Sitewide */
/* || Store pages */
```

Comment a non-obvious choice — fallback for old browsers, value picked around a bug, tutorial a trick came from. Reader (you, in a year) thanks you.

```css
.box {
  background-color: red; /* fallback: browsers without gradient support */
  background-image: linear-gradient(to right, red, #aa0000);
}
```

## Split large stylesheets by scope

Global stylesheet plus smaller ones per section, linked where needed; cascade applies, later-linked wins. Store-only CSS ships on store pages, not site-wide. Fewer editors per file = fewer source-control conflicts. Per-component files push the idea further — a framework or build tool (CSS Modules, Vite, Lightning CSS) usually handles that split; for hand-written CSS, split global from page-specific at minimum.

## Formatting and tooling

Pick one format, hold it: indent (tabs or N spaces), one color notation (project's — css-pro steers oklch + tokens), declarations one-per-line. Hand-enforcing is drudgery; a formatter (Prettier) and linter (Stylelint) enforce it and the rules above automatically — they enforce what css-pro teaches, not a new dependency. Use them where a build step already runs; don't add one to ship a single stylesheet.

## The check

Style guide followed or chosen-and-held; sections in general → specific order, each with a comment header; classes under one naming convention, named by component not style; non-obvious values commented with the why; large stylesheets split by scope. Existing codebase: convention drift is the finding, not "should be BEM" — a consistent non-BEM system is not a defect.
