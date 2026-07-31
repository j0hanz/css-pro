# AGENTS

Claude Code plugin that checks CSS as it is written and refuses writes carrying provable
defects. Two parts: a PreToolUse/PostToolUse hook (`hooks/`) and two reference skills
(`skills/`). No build step, no runtime dependencies.

## Rules

Rules live in `hooks/rules.mjs`. Ship one only if it asserts something that can be shown
wrong — spec behaviour, measurable cost, a WCAG criterion, a documented bug. Anything
resting on taste does not ship, in any tier.

Put a rule in `BLOCK` only when it is provable from the edit alone and produces no false
positives; everything else goes in `ADVISE`. A single false positive demotes a blocking
rule to an advisory.

Rule patterns are matched against comment- and string-stripped text — do not write
comment handling into a regex.

## Verifying

There is no test suite. Exercise a rule by piping a hook payload:

```
echo '{"tool_name":"Write","tool_input":{"file_path":"a.css","content":".x{transition:all .2s}"}}' | node hooks/runtime.mjs pre
```

Check both directions: the defect fires, and near-misses stay silent. A rule that fires
on legitimate CSS is worse than no rule.
