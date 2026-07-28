# CSS Pro

A frontend design co-pilot for Claude Code: opinionated skills for design decisions, CSS mechanics, motion craft, and library picks. Covers raw CSS, custom properties, design tokens, motion, and accessibility.

## Install

```
/plugin marketplace add j0hanz/css-pro
/plugin install css-pro@css-pro
```

Most skills auto-fire when their trigger matches your prompt. The three marked in the table below are user-invoked, and `/css <ask>` is the manual front door to route a request by hand.

## Use

```
/css make this pricing page feel less AI-generated
```

Routes to `designer` for a redesign with a point of view.

```
/design-advisor quick
```

Slash-only codebase design audit → prioritized findings and fix plans for another agent to execute.

Asking "what should I use for toasts?" auto-fires `pick-ui-library` for a curated React-ecosystem pick.

## Skills

| Skill                                                    | What it does                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [css](skills/css/SKILL.md)                               | front-door router (slash: `/css <ask>`), user-invoked only (slash-only)            |
| [designer](skills/designer/SKILL.md)                     | design decisions: identity, tokens, states, accessibility floor, de-slopping       |
| [prototype](skills/prototype/SKILL.md)                   | compare live UI variants via `?variant=` switcher                                  |
| [css-craft](skills/css-craft/SKILL.md)                   | custom properties, `var()`, shorthand; maintainable CSS mechanics                  |
| [css-functions](skills/css-functions/SKILL.md)           | choosing CSS value functions (`clamp`, `color-mix`, `anchor`, …) and their gotchas |
| [motion-craft](skills/motion-craft/SKILL.md)             | whether/how to animate; easing, duration, origin; motion diff review               |
| [motion-foundations](skills/motion-foundations/SKILL.md) | naming effects; physics of how motion should feel                                  |
| [motion-advisor](skills/motion-advisor/SKILL.md)         | codebase-wide motion audit/discovery, outputs plans (slash-only)                   |
| [design-advisor](skills/design-advisor/SKILL.md)         | codebase-wide design audit, outputs plans (slash-only)                             |
| [pick-ui-library](skills/pick-ui-library/SKILL.md)       | curated React-ecosystem library picks                                              |

## How it fits together

`css` routes a request to the right skill in the right order. `designer` decides what the UI should be; `css-craft` and `css-functions` write those decisions as maintainable CSS; the `motion-*` skills handle whether and how things move. `design-advisor` and `motion-advisor` are read-only codebase audits that hand prioritized plans to any executor agent.

## License

[MIT](LICENSE)
