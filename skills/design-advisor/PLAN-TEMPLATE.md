# Plan Template

Every plan written by `design-advisor` follows this structure. Executor may be less capable model, zero context, zero taste — plan must contain everything, exactly. No refs to "audit above" or "palette we discussed."

````markdown
# NNN — <Short imperative title>

- **Status**: TODO
- **Commit**: <output of `git rev-parse --short HEAD` when this plan was written>
- **Severity**: HIGH | MEDIUM | LOW
- **Category**: <audit category>
- **Estimated scope**: <n files, rough size>

## Problem

What's wrong, where, why it matters to how product reads or works. Cite
every location as `path/to/file.tsx:123`, include current code verbatim:

```css
/* src/components/pricing.css:31 — current */
.tier-cta {
  margin-top: 24px; /* CTAs land at random heights across tiers */
}
```

## Target

Exact end state. Every value spelled out — hex, rem, font stack, selector,
token name. Decision-bearing values (replacement typeface, retired tell's
substitute, corrected palette entry) already decided — uniqueness test
ran at plan time. Never "pick nicer font":

```css
/* target */
.tier {
  display: flex;
  flex-direction: column;
}
.tier-cta {
  margin-top: auto; /* pin to card bottom; CTAs form one line */
}
```

## Repo conventions to follow

How codebase already does it, with one exemplar executor should
imitate (token names, file placement, class patterns):

- Color and spacing tokens live in `src/styles/tokens.css`; extend there, never inline.
- <exemplar file:line that already does this correctly>

## Steps

1. <One concrete edit per step: file, what changes, resulting code.>
2. …

## Boundaries

- Do NOT touch <files/components out of scope>.
- Do NOT change URL slugs, nav labels, form field names, logo, or legal copy — never-change list. Step requiring one must carry explicit user approval, noted here.
- Do NOT add new dependencies.
- If step doesn't match code found (drift since commit stamp), STOP, report instead of improvising.

## Verification

- **Mechanical**: <exact commands — typecheck, lint, build — with expected outcome>.
- **Render check**: run UI, open <page>, confirm:
  - <observable check, e.g. "tier CTAs form one horizontal line at every content length">
  - Tab through page — focus visible on every interactive element, order matches reading order.
  - Spot-check named contrast pairs against AA (per `designer`'s USABILITY.md).
  - At mobile width (375px): no horizontal scroll, layout holds.
- **Done when**: <machine- or eye-checkable completion criteria>.
````

## Notes for plan author

- One plan per finding. If two findings share every file and same fix pattern (e.g. same literal→token swap across components), may merge into one plan.
- Decide every value at plan time, never delegate taste: floor values from `designer`'s USABILITY.md, tell replacements passing `designer`'s uniqueness test (against this brand's existing choices in preserve mode), token moves per `css-craft`, computed values per `css-functions`.
- Render check not optional. Design can be mechanically correct, still read wrong; give executor (or human reviewing diff) concrete things to look at — before/after screenshots when environment supports them.
- After writing plans, create or update `plans/README.md` with: table of plans (number, title, severity, status), recommended execution order (follow `designer` REDESIGN.md's lever order), dependencies between plans.
