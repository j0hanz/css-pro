---
name: css-audit
description: Audit whole CSS files for defects the per-edit hook never re-checks — duplicated rules, unused or undefined custom properties — review a CSS or motion diff, or gate styles in CI. Reads stylesheets, CSS-in-JS, Vue/Svelte/Astro/HTML component styles. Not mechanics — css-craft; not motion decisions — motion-craft; nothing to audit in Tailwind utilities.
---

# CSS Audit

Two scales, one bar — only provable defects; a motion review adds feel judgment. An **audit** reads the whole file, catching what the per-edit hook cannot see because it only reads the lines you touch. A **review** reads the changed lines of a diff.

## Audit — whole file

```sh
node "${CLAUDE_PLUGIN_ROOT}/skills/css-audit/audit.mjs" <file|dir|glob>... [--strict] [--json]
node "${CLAUDE_PLUGIN_ROOT}/skills/css-audit/audit.mjs" --help
```

Pass every file that holds CSS in one run — a directory recurses, a glob expands inside the script, so any enumeration of the project's files works in any shell. `--help` prints the file types it reads, the flags and the exit codes. Two things the run itself does not explain:

- **Scope decides the custom-property findings.** They resolve only across the files passed in one run, so a single sheet reports every token it exports as dead and every token it imports as undefined. The script says so when it happens — that note means the scope was too narrow, not that the sheet is dirty.
- **Whole-file structure checks run on stylesheets only.** A host file's styles become synthetic blocks that are siblings by construction, so every component with two styled objects would read as a duplicate rule.

Suppress a false positive with `/* csspro-ignore */` above the finding. Use it sparingly; a block of ignores says the rule is wrong for this codebase, not that the code is right. In CI, `--strict` gates ADVISE and whole-file findings too — and an intentional finding gets the marker, next to the code it explains, rather than a CI exclusion.

**Done when** every target file has been re-run and is clean, or carries only items kept on purpose — every remaining BLOCK a `file:line` with its keep-reason, every ADVISE and whole-file finding either confirmed intentional or fixed.

### Read the output

Groups print highest impact first, in the rule table's own sentences — report them as written. Each line is `path:line,line,…  message`: one message that fired on several lines collapses to a single line listing every site, so a sheet with fifteen `calc()` defects shows one line, not fifteen. The trailing count is defect occurrences, not displayed lines.

**BLOCK** — provable from the file alone; what the hook blocks on a write. Fix these.

**ADVISE** — measurable cost or accessibility risk, often intentional: handled globally, or a known trade-off.

**WHOLE-FILE** — only visible at file scale. Each message names the finding, its line and its fix; the threshold that made it fire is not printed:

- _Repeated declarations_ — two different selectors carrying the same declarations, in any order, under the same at-rule conditions. Merging them onto one selector list or a shared class changes nothing a browser can observe. Fewer than two shared declarations is not reported.
- _Overlapping declarations_ — one declaration short of identical: a block copied from another and then drifted. Needs at least four shared declarations _and_ most of both blocks, so a long rule that merely agrees on some `font-*` lines does not fire.
- _Unused / undefined custom property_ — with the run scoped wide enough (above), a remaining one is dead or a typo (`--color-primayr`). Confirm before deleting.

A finding inside an object-form style — `style={{ }}`, `sx`, `styled.div({ })` — is reported against the line its object literal opens on, because the declarations are read out of camelCase keys into one synthetic block. That line is also where the `/* csspro-ignore */` marker goes.

## Review — a diff

Scope is what the diff changes; a general code review asked for, say out of scope.

**Run the checks before reading the diff** — the rule table is executable, so no declaration the script can decide gets judged from memory:

```sh
node "${CLAUDE_PLUGIN_ROOT}/skills/css-audit/audit.mjs" <changed-file>...
```

The audit reads the whole file, so keep the findings whose line falls inside a changed hunk and drop the rest — those are the audit's business, not this review's. A file the diff touches that the audit reports as clean has no provable defects in it; say so rather than re-deriving it.

Then read the diff for what the script cannot decide: css-craft's "What bites" for the mechanical gotchas, and for a motion diff the bar below plus feel. Default to flagging — unsure whether motion feels right, delete it. Report each issue once; where the motion bar and the rule table both reach a line, the motion tier wins.

### The motion bar

Read every changed line against `## Done when` in motion-craft's [`SKILL.md`](../motion-craft/SKILL.md) — that list is the bar, every line of it the diff misses is a finding, and the values it cites sit in the sections above it in the same file. When feel cannot be judged from code alone, say so and point at [`TECHNIQUES.md`](../motion-craft/TECHNIQUES.md)'s `## Debugging`.

### Output format

Two parts.

**Part 1 — Findings table.** Single markdown table, one row per issue.

| Before                                | After                                | Why                                                                       |
| ------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `transform: scale(0)`                 | `transform: scale(0.95); opacity: 0` | Nothing appears from nothing — `scale(0)` looks like it came from nowhere |
| `transform-origin: center` on popover | `var(--transform-origin)` (Base UI)  | Popovers scale from the trigger, not center (modals exempt)               |

**Part 2 — Verdict.** Group remaining commentary by impact, highest first. Close with an explicit decision. **Block** on a provable defect — a rule-table BLOCK, or a measurable motion defect — or, in a motion review, on a design judgment the bar names; say which kind each blocking item is. **Approve** when every provable defect is cleared and, for motion, feel holds with nothing left worth deleting. Cite `file:line`.

**Done when** the checks above have been run and their output quoted, every changed line measured against the bar (and the motion bar, plus feel, if motion), every provable defect flagged with `file:line`, and a Block/Approve verdict closes. ADVISE findings are reported in the table, not disposed — a review is lighter than an audit. A review that never ran the script is not done, however careful the reading was.
