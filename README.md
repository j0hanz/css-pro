# CSS Pro

**Stops agents wrecking your CSS.**

A Claude Code plugin that checks CSS as it is written. The checks catch defects that can
be demonstrated — invalid values, declarations that silently do nothing, measurable
performance traps, accessibility failures — and say nothing about how your CSS should
look.

**It announces itself, once.** At session start (and again after a compaction), if the
repo holds styles, a short reminder tells the agent the gate is deliberate and fixable
— so the first refused write is read as a repair to make, not a bug to route around. In a
repo with no CSS it says nothing.

**It blocks writes.** Eight rules refuse a write outright, because a defect that never
reaches disk is cheaper than one you argue about afterwards. Each blocking rule is
provable from the edit alone. Everything less certain advises instead, capped at three
findings per edit so the channel stays readable.

**It sweeps once more at the end of a turn.** The per-edit check reads the text of one
write, which leaves two things it cannot see. CSS that reached disk another way — a shell
heredoc, `sed`, a generator, a formatter — was never offered to it. And a defect only
provable against the whole block, such as a declaration added onto a block that already
carries it, reads as clean in the added lines alone. So at turn end the same eight rules
run over the files `git` reports as changed, reporting only what lands on a changed line;
nothing pre-existing is dragged in, and a finding is reported once, not once per turn.

**It resolves your tokens against the whole repository.** Every other check reads one
file, so none of them can tell a real token from a typo — `var(--colour-brand)` looks the
same as `var(--color-brand)` in the sheet that uses it. At turn end the names read by a
`var()` with no fallback on a changed line are matched against every custom property
declared anywhere in the repo, including ones set from JavaScript; what nothing declares
is named. A `var()` that carries a fallback renders correctly either way and stays
silent. The session-start reminder also names the sheets your tokens actually live in.

**The subagent hears its own defects.** The turn-end sweep also runs when a subagent
finishes, so CSS it wrote through a shell comes back while it can still fix it, rather
than surfacing to its parent after it is gone.

**The hook makes no style decisions for you.** No house palette, no naming convention, no
token taxonomy, no opinion on what looks templated. A check that ships taste makes every
project that installs it look the same, and takes decisions away from the person who has
to live with them. What blocks or advises asserts only what can be shown wrong; the rest
is yours.

## Scope

Raw CSS (`.css`, `.scss`, `.sass`, `.less`) and CSS-in-JS in `.js`/`.jsx`/`.ts`/`.tsx`
and their `.mjs`/`.cjs`/`.mts`/`.cts` variants — styled-components and emotion in both
template and object form, vanilla-extract, MUI `sx`, and inline `style={{ }}` objects. In
`.vue`, `.svelte`, `.astro`, and `.html`/`.htm` the hook reads `<style>` blocks,
`style=""` attributes, and CSS-in-JS inside `<script>`.

Object values it cannot read statically — template literals, ternaries, variables — are
skipped, not guessed at.

**Tailwind is not supported.** Tailwind has no declarations and no selectors, so almost
none of these rules apply to it, and its own tooling already covers the equivalents. If
your styling is Tailwind, this plugin will be silent — install it for the CSS you do
write, or not at all.

## Install

```
/plugin marketplace add j0hanz/css-pro
/plugin install css-pro@css-pro
```

The checks run automatically. There is nothing to invoke. They need `node` on your `PATH`
and nothing else — no bash, no `jq`, so they behave the same under Git Bash, PowerShell
and a POSIX shell. Without `node` the hooks report an error and no write is ever blocked.
The turn-end sweep also asks `git` what changed; outside a repository, or with no `git`,
that sweep stays silent and every per-edit check is unaffected.

## Skills

Three, loaded by Claude when relevant. css-craft is reference: how CSS behaves, no
opinion on what you write. motion-craft is prescriptive — it names durations, easing and
scale values. css-audit re-reads existing code the hook let through: a whole-file audit
and a CSS or motion diff review. None blocks a write; that is the hook.

| Skill                                        | What it covers                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [css-craft](skills/css-craft/SKILL.md)       | custom properties and `var()`, shorthand and the reset trap, intrinsic layout, CSS value functions                      |
| [motion-craft](skills/motion-craft/SKILL.md) | whether and how to animate; easing, duration, origin; effect names and physics                                          |
| [css-audit](skills/css-audit/SKILL.md)       | whole-file audit of any file the hook reads; reviewing a CSS or motion diff — defects the per-edit hook never re-checks |

## License

[MIT](LICENSE)
