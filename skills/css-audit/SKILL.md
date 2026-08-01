---
name: css-audit
description: Audit a whole stylesheet (CSS/SCSS/Sass/Less), or review a CSS or motion diff — re-reading existing code for defects the per-edit hook never re-checks: cleaning up legacy CSS, inheriting a sheet. Not the mechanics — css-craft owns CSS mechanics, motion-craft owns motion decisions.
---

# CSS Audit

The per-edit hook only checks the lines you touch, so a stylesheet accretes defects it would catch on a fresh write — `transition: all`, `calc()` with no whitespace, a longhand set before its shorthand, `100vh`. Two scales, one bar — only provable defects; a motion review adds feel judgment. An **audit** reads the whole file; a **review** reads the changed lines of a diff.

## Audit — whole file

```sh
node "${CLAUDE_PLUGIN_ROOT}/skills/css-audit/audit.mjs" <file.css>...
```

Pass every stylesheet (`.css`/`.scss`/`.sass`/`.less`); globs expand inside the script, so any enumeration of the project's CSS works in any shell. Globs need Node 22+; a glob matching nothing or an unreadable file exits non-zero — a gate that audits nothing fails instead of passing. Prints `file:line` findings grouped by severity, uncapped, then a count; exits non-zero if any provable (BLOCK) defect remains. No arguments runs the self-test.

**Done when** every target file has been re-run and is clean, or carries only items kept on purpose — every remaining BLOCK a `file:line` with its keep-reason. ADVISE and whole-file findings are reported, not gated; each confirmed intentional, else fixed.

### Read the output

Three groups, highest impact first. BLOCK and ADVISE messages are full sentences from the rule table — read them as written.

**BLOCK** — provable from the file alone; what the hook blocks on a write. Fix these.

**ADVISE** — measurable cost or accessibility risk, often intentional (handled globally, or a known trade-off). Capped to three on a write; the audit lists every occurrence with its line.

**WHOLE-FILE** — only visible at file scale:

- _Empty rule_ — selector with no declarations. Dead weight — delete; fill only if the selector was meant to hold declarations.
- _Duplicate block_ — same selector and body appeared earlier. The later copy is dead; delete it.
- _Unused custom property_ — `--name` declared, never read by `var()` in this file. May be exported for another sheet; if not, dead.
- _Undefined custom property_ — `var(--name)` with no declaration in this file. Often a typo (`--color-primayr`); sometimes defined in another sheet.

Custom-property findings span files: a prop unused in one sheet may be the API another reads — confirm across the project before deleting.

## Review — a diff

Reads the changed lines of a CSS or motion diff. The bar is the rule table (`hooks/rules.mjs`, the same one the audit runs) and css-craft's "What bites" — provable defects and the mechanical gotchas behind them — applied to every changed declaration, any diff. A motion diff adds the "Flag these on sight" list below: motion-specific regressions the rule table does not name, plus feel. Default to flagging — unsure whether motion feels right, delete it. Scope is what the diff changes; a general code review asked for, say out of scope.

The rule table is the authority for provable defects. Where it and the motion list overlap, report once: `transition: all` and layout-property transitions are BLOCK in the rule table; `ungated :hover` is ADVISE there; `prefers-reduced-motion` is ADVISE there but the motion verdict Blocks it — the motion tier wins.

### Flag these on sight (motion)

Pull the values this list cites from motion-craft's [`SKILL.md`](../motion-craft/SKILL.md) ([`TECHNIQUES.md`](../motion-craft/TECHNIQUES.md) for the blur ceiling and `will-change` scope); when feel can't be judged from code alone, say so and point at `## Debugging` in TECHNIQUES.md.

`transition: all`; `scale(0)` or pure-fade entrances with no initial transform; `ease-in` on any UI interaction, or a built-in easing on entering/exiting or on-screen movement where an `--ease-*` token belongs (hover and colour changes keep `ease`); animation on a keyboard shortcut / command-palette toggle / high-frequency action; UI duration past motion-craft's bar with no stated reason (modals and drawers sit outside that bar); `transform-origin: center` on trigger-anchored popover/dropdown/tooltip; keyframes on toasts/toggles/anything added or triggered rapidly; animating layout properties (`width`/`height`/`margin`/`padding`/`top`/`left`); Framer Motion `x`/`y`/`scale` shorthands where a full `transform` string would hand the animation off; updating a CSS variable on parent to drive a child transform; missing `prefers-reduced-motion` handling on movement; ungated `:hover` motion; symmetric enter/exit timing on press-and-release or hold; everything-at-once entrance where a stagger belongs.

### Output format

Two parts.

**Part 1 — Findings table.** Single markdown table, one row per issue.

| Before                                | After                                  | Why                                                                         |
| ------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| `100vh`                               | `100dvh`                               | `100vh` ignores mobile browser chrome; `100dvh` tracks the visible viewport |
| `transition: all 300ms`               | `transition: transform 200ms ease-out` | Name the properties; `all` animates unintended ones off-GPU                 |
| `transform: scale(0)`                 | `transform: scale(0.95); opacity: 0`   | Nothing appears from nothing — `scale(0)` looks like it came from nowhere   |
| `transform-origin: center` on popover | `var(--transform-origin)` (Base UI)    | Popovers scale from the trigger, not center (modals exempt)                 |

**Part 2 — Verdict.** Group remaining commentary by impact, highest first. Close with an explicit decision. **Block** on a provable defect — a rule-table BLOCK, or a measurable motion defect (non-GPU animation with an easy GPU fix, missing `prefers-reduced-motion` on movement) — or, in a motion review, a design judgment: feel-breaking regression, animation on a keyboard/high-frequency action, `scale(0)` or `ease-in` on UI. Say which kind each blocking item is. **Approve** when every provable defect is cleared and, for motion, feel holds — durations/easing within bounds, interruptibility handled, reduced-motion respected, nothing left worth deleting. Cite `file:line`.

**Done when** every changed line measured against the bar (and the motion list, plus feel, if motion), every provable defect flagged with `file:line`, and a Block/Approve verdict closes. ADVISE findings are reported in the table, not disposed — a review is lighter than an audit.
