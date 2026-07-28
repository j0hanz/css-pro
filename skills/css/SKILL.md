---
name: css
description: Front door for css-pro — routes a frontend request to the right skill, in the right order.
disable-model-invocation: true
argument-hint: '[what you want to build, fix, or decide]'
---

# CSS

## Route

Match request, invoke skill. First match win.

| Request                                                                                                                                                               | Invoke               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| New UI, redesign, de-slop ("looks AI-generated"), palette, typography, layout, flow, states, copy, WCAG, or named aesthetic direction ("make it minimal / editorial") | [designer]           |
| Compare several live directions before commit — "try few layouts", "show me options for this page"                                                                    | [prototype]          |
| Write or refactor CSS — tokens, `var()`, shorthand, theming, dark mode, `@property`                                                                                   | [css-craft]          |
| Value should compute — `clamp`, `color-mix`, `oklch`, `light-dark`, `anchor`, `scroll`                                                                                | [css-functions]      |
| Animate one thing, pick easing / duration / origin, or review motion diff                                                                                             | [motion-craft]       |
| Name effect, or how motion should _feel_ (springs, momentum, rubber-banding)                                                                                          | [motion-foundations] |
| Audit motion across codebase, or find where motion belongs                                                                                                            | [motion-advisor] ⚑   |
| Audit design across existing codebase — what to fix or upgrade — as plans, not edits                                                                                  | [design-advisor] ⚑   |
| Which library for toasts, charts, drag-and-drop, virtualization, command menu…                                                                                        | [pick-ui-library]    |

⚑ = user-invoked only (`disable-model-invocation`) — can't call these via Skill tool. Point user at slash command (`/design-advisor …` or `/motion-advisor …`, variant like `quick`, `deep`, `plan <description>`) instead of routing.

Spans rows? Route by decision blocking work, not loudest noun — "make this hero pop" with no palette yet = [designer], not [motion-craft]. No match: answer direct, say left the map.

## Order

Spanning layers? Run top-down, skip settled ones.

1. [designer]
2. [css-craft] — tokens first, then rules.
3. [css-functions]
4. [motion-craft] — only where motion earns place.

Tokens at step 2 come from step 1 palette and scale; second set = parallel system.

[designer]: ../designer/SKILL.md
[prototype]: ../prototype/SKILL.md
[css-craft]: ../css-craft/SKILL.md
[css-functions]: ../css-functions/SKILL.md
[motion-craft]: ../motion-craft/SKILL.md
[motion-foundations]: ../motion-foundations/SKILL.md
[motion-advisor]: ../motion-advisor/SKILL.md
[design-advisor]: ../design-advisor/SKILL.md
[pick-ui-library]: ../pick-ui-library/SKILL.md
