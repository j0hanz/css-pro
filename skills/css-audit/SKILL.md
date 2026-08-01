---
name: css-audit
description: Audit a whole CSS file — use when checking a whole stylesheet, one file or every sheet in a project: cleaning up legacy CSS, inheriting a sheet, auditing before a refactor. Re-runs the css-pro rule table over the whole file (defects the per-edit hook never re-checks) plus whole-file checks it cannot do — empty rules, duplicate blocks, unused and undefined custom properties. Not a diff (css-craft reviews changed lines); not motion (motion-craft).
---

# CSS Audit

The per-edit hook only checks the lines you touch, so pre-existing CSS never gets re-checked. A stylesheet accretes defects the hook would refuse on a fresh write — `transition: all`, `calc()` with no whitespace, a longhand set before its shorthand, `100vh`. An **audit** runs the same rule table over the whole file, then the checks that need the whole file to see.

A review reads changed lines (css-craft, motion-craft). An audit reads the whole file. Same bar as the per-edit hook — only provable defects, nothing on taste.

## Run it

```sh
node "${CLAUDE_PLUGIN_ROOT}/skills/css-audit/audit.mjs" <file.css>...
```

Pass every stylesheet to audit; globs expand, so any enumeration of the project's CSS works. The script reads each, prints `file:line` findings grouped by severity, uncapped, then a count; exits non-zero if any provable (BLOCK) defect remains. Run with no arguments to self-test.

**Done when** every target file has run and every BLOCK finding carries a `file:line` you have acted on — fixed, or noted why it stays. ADVISE and whole-file findings are reported, not gated; each confirmed intentional or fixed.

## Read the output

Three groups, highest impact first. BLOCK and ADVISE messages are full sentences from the rule table — read them as written; the script adds no wording of its own to those.

**BLOCK** — provable from the file alone; the same defects the hook refuses on a write. Fix these.

**ADVISE** — measurable cost or accessibility risk, often intentional (handled globally, or a known trade-off). Capped to three on a write; the audit lists every occurrence with its line. Confirm or fix.

**WHOLE-FILE** — only visible at file scale:

- _Empty rule_ — a selector with no declarations. Dead weight; delete or fill.
- _Duplicate block_ — the same selector and body appeared earlier. The later copy is dead; delete it.
- _Unused custom property_ — `--name` declared, never read by `var()` in this file. May be exported for another sheet; if not, dead.
- _Undefined custom property_ — `var(--name)` with no declaration in this file. Often a typo (`--color-primayr`); sometimes defined in another sheet. Check before assuming.

## After running

Fix BLOCK findings — the hook re-checks each fix on write, so a fixed defect cannot regress past it. Re-run; a clean run, or only items you have decided to keep, is the end. Custom-property findings span files: a prop unused in one sheet may be the API another reads — confirm across the project before deleting.
