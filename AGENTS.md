# AGENTS

Claude Code plugin that checks CSS as it is written. Rules live in `hooks/rules.mjs` and
must assert only what can be shown wrong — spec behaviour, measurable cost, a WCAG
criterion, a documented bug. Anything resting on taste does not ship, in any tier.

A rule blocks only if it is provable from the edit alone and produces no false positives;
everything else advises. Run `node hooks/rules.test.mjs` before changing rules — every
rule needs a defect that fires and near-misses that do not.
