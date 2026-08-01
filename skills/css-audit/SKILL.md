---
name: css-audit
description: Audit a whole stylesheet (CSS/SCSS/Sass/Less), or review a CSS or motion diff — cleaning up legacy CSS, inheriting a sheet, checking the styles in a PR. Not the mechanics — css-craft owns CSS mechanics, motion-craft owns motion decisions.
---

# CSS Audit

The per-edit hook only checks the lines you touch, so a stylesheet accretes defects it would catch on a fresh write — `transition: all`, `calc()` with no whitespace, a longhand set before its shorthand, `100vh`. Two scales, one bar — only provable defects; a motion review adds feel judgment. An **audit** reads the whole file; a **review** reads the changed lines of a diff.

## Audit — whole file

```sh
node "${CLAUDE_PLUGIN_ROOT}/skills/css-audit/audit.mjs" <file|dir|glob>... [--strict] [--json]
node "${CLAUDE_PLUGIN_ROOT}/skills/css-audit/audit.mjs" --list-rules
node "${CLAUDE_PLUGIN_ROOT}/skills/css-audit/audit.mjs" --help | --self-test
```

Pass every stylesheet (`.css`/`.scss`/`.sass`/`.less`). A directory argument is recursed for those extensions (no Node 22 needed); a glob expands inside the script, so any enumeration of the project's CSS works in any shell. Indented Sass (`.sass`) gets the rule table and custom-property checks only — the empty/duplicate rule checks are brace-based and report as skipped. Globs need Node 22+; a glob matching nothing or an unreadable file exits non-zero — a gate that audits nothing fails instead of passing. Prints `file:line` findings grouped by severity, uncapped, then a count; exits non-zero if any provable (BLOCK) defect remains. `--strict` gates ADVISE and whole-file findings too, for CI. `--json` emits one flat array `[{path,line,severity,msg}]` (no grouping, no count) for piping into another tool. `--list-rules` prints the rule table and exits; `--help` prints usage; no arguments runs the self-test.

Suppress a false positive: put `/* csspro-ignore */` on the line above the finding (or on the same line). It covers that line and the next, so a finding whose line is either is dropped from the report — the cheapest way to silence an intentional ADVISE or whole-file item without a `--strict` failure. Use it sparingly; a block of ignores is a smell that the rule is wrong for this codebase, not that the code is right.

Custom properties resolve only across the files passed in one run. Audit a single sheet and the script says so — every token it exports reads as dead, every token it imports as undefined. That note means the scope was too narrow, not that the sheet is dirty.

**Done when** every target file has been re-run and is clean, or carries only items kept on purpose — every remaining BLOCK a `file:line` with its keep-reason. ADVISE and whole-file findings are reported, not gated; each confirmed intentional, else fixed. The run prints how many are still awaiting that disposition; `--strict` turns the count into an exit code.

### In CI

Run with `--strict` so ADVISE and whole-file findings fail the build, not just BLOCK. Gate the whole sheet set on one command — a directory argument recurses, or a glob covers a subtree:

```sh
node "${CLAUDE_PLUGIN_ROOT}/skills/css-audit/audit.mjs" src/ --strict
# or per-sheet, exit code is the verdict
node "${CLAUDE_PLUGIN_ROOT}/skills/css-audit/audit.mjs" "src/**/*.css" --strict
```

Exit 0 is clean; 1 means a gated finding remains or a file/glob failed. `--json` gives a machine-readable list for a PR comment or check-run annotation; pipe it to whatever formats the report. An intentional finding that should not block the build gets a `/* csspro-ignore */` marker, not a CI exclusion — the marker stays next to the code it explains.

### Read the output

Three groups, highest impact first. BLOCK and ADVISE messages are full sentences from the rule table — read them as written. Each line is `path:line,...  message`, line-sorted; a message that fires on several lines collapses to one line listing every site (`path:8,33-34  message`), so a sheet with fifteen `calc()` defects shows one line, not fifteen. The trailing count is defect occurrences, not displayed lines — a grouped line still counts each site.

**BLOCK** — provable from the file alone; what the hook blocks on a write. Fix these.

**ADVISE** — measurable cost or accessibility risk, often intentional (handled globally, or a known trade-off). Capped to three on a write; the audit lists every occurrence with its line.

**WHOLE-FILE** — only visible at file scale. Each message names the finding, its line and its fix; below is what the message does not print — the threshold that made it fire, and how to dispose of it.

- _Repeated declarations_ — two different selectors carrying the same declarations, in any order, under the same at-rule conditions. Merging them into one selector list, or onto a shared class, changes nothing a browser can observe. Fewer than two shared declarations is not reported.
- _Overlapping declarations_ — the same, one declaration short of identical: a block copied from another and then drifted. Reported when the shared set is at least four declarations _and_ most of both blocks, so a long rule that merely agrees on some `font-*` lines does not fire.
- _Redeclares an earlier block_ — the shared set is the earlier block in full, so the re-assertion is likely dead: this selector may already inherit that rule. Fewer than five shared declarations stays an _Overlapping_ finding; a four-declaration reset fully inside a longer rule is usually a shared base, not a copied component.
- _Mixes direction conventions_ — a note, not a finding, and it lists lines. Block-axis properties (`margin-top`, `bottom`) are not counted — they mean the same thing in every writing mode. Which convention the project wants is its own call. Nothing to dispose.
- _Unused / undefined custom property_ — with the run scoped wide enough (above), a remaining one is dead or a typo (`--color-primayr`). Confirm before deleting.

## Review — a diff

Reads the changed lines of a CSS or motion diff. Scope is what the diff changes; a general code review asked for, say out of scope.

**Run the checks before reading the diff.** The rule table is executable — do not apply it from memory, and do not judge a declaration the script can decide for you. Two commands cover every file type:

```sh
# Stylesheets in the diff (.css/.scss/.sass/.less) — file:line, uncapped.
node "${CLAUDE_PLUGIN_ROOT}/skills/css-audit/audit.mjs" <changed-stylesheet>...

# CSS-in-JS, Vue/Svelte/Astro, HTML — the audit skips these; the hook reads them.
# Feed the ADDED text, exactly as the PreToolUse hook receives it.
echo '{"tool_name":"Write","tool_input":{"file_path":"Button.tsx","content":"<added text>"}}' \
  | node "${CLAUDE_PLUGIN_ROOT}/hooks/runtime.mjs" pre
# ...and again with `post` for the advisories.
```

The audit reads the whole file, so keep the findings whose line falls inside a changed hunk and drop the rest — those are the audit's business, not this review's. A stylesheet the diff touches that the audit reports as clean has no provable defects in it; say so rather than re-deriving it.

Then read the diff for what the script cannot decide: a motion diff adds the motion bar below — motion-specific regressions the rule table does not name, plus feel. Default to flagging — unsure whether motion feels right, delete it. css-craft's "What bites" covers the mechanical gotchas behind the rest.

The rule table is the authority for provable defects. Where it and the motion bar overlap, report once: `transition: all` and layout-property transitions are BLOCK in the rule table; `ungated :hover` is ADVISE there; `prefers-reduced-motion` is ADVISE there but the motion verdict Blocks it — the motion tier wins.

### The motion bar

Read every changed line against `## Done when` in motion-craft's [`SKILL.md`](../motion-craft/SKILL.md) — that list is the bar, and every line of it the diff misses is a finding. The values that list cites sit above it in the same file: the frequency table, the `--ease-*` tokens, the duration bands, the four decision-engine constraints. [`TECHNIQUES.md`](../motion-craft/TECHNIQUES.md) holds the blur ceiling and `will-change` scope; when feel can't be judged from code alone, say so and point at its `## Debugging`.

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

**Done when** the checks above have been run and their output quoted, every changed line measured against the bar (and the motion bar, plus feel, if motion), every provable defect flagged with `file:line`, and a Block/Approve verdict closes. ADVISE findings are reported in the table, not disposed — a review is lighter than an audit. A review that never ran the script is not done, however careful the reading was.
