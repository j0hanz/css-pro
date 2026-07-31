# CSS Pro

**Stops agents wrecking your CSS.**

A Claude Code plugin that checks CSS as it is written. It catches defects that can be
demonstrated — invalid values, declarations that silently do nothing, dead custom
properties, accessibility failures — and says nothing about how your CSS should look.

**It blocks writes.** Eight rules refuse a write outright, because a defect that never
reaches disk is cheaper than one you argue about afterwards. Each blocking rule is
provable from the edit alone. Everything less certain advises instead, capped at three
findings per edit so the channel stays readable.

**It makes no style decisions for you.** No house palette, no naming convention, no
token taxonomy, no opinion on what looks templated. A plugin that ships taste makes every
project that installs it look the same, and takes decisions away from the person who has
to live with them. css-pro asserts only what can be shown wrong; the rest is yours.

## Scope

Raw CSS (`.css`, `.scss`, `.sass`, `.less`) and CSS-in-JS — styled-components, emotion,
vanilla-extract, and inline `style={{ }}` objects in `.ts`/`.tsx`/`.js`/`.jsx`/`.vue`/
`.svelte`.

**Tailwind is not supported.** Tailwind has no declarations and no selectors, so almost
none of these rules apply to it, and its own tooling already covers the equivalents. If
your styling is Tailwind, this plugin will be silent — install it for the CSS you do
write, or not at all.

## Install

```
/plugin marketplace add j0hanz/css-pro
/plugin install css-pro@css-pro
```

The checks run automatically. There is nothing to invoke.

## Skills

Two, both loaded by Claude when relevant. They are reference for how CSS behaves — the
enforcement lives in the hook, not here.

| Skill                                        | What it covers                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [css-craft](skills/css-craft/SKILL.md)       | custom properties and `var()`, shorthand and the reset trap, intrinsic layout, CSS value functions |
| [motion-craft](skills/motion-craft/SKILL.md) | whether and how to animate; easing, duration, origin; effect vocabulary and the physics of feel    |

## Development

```
node hooks/rules.test.mjs
```

Each rule has a defect that must fire and near-misses that must not. The near-misses are
the point: a rule that fires on a comment, or on legitimate CSS, is worse than no rule.
A blocking rule that produces a single false positive is demoted to an advisory.

## License

[MIT](LICENSE)
