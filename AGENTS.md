# AGENTS

Claude Code plugin that checks CSS as it is written and refuses writes carrying provable
defects. Two parts: a PreToolUse/PostToolUse hook (`hooks/`) and three skills (`skills/`):
css-craft (CSS mechanics), motion-craft (motion decisions), css-audit (a whole-file audit
script, `skills/css-audit/audit.mjs`, plus a diff review). No build step, no runtime
dependencies.

## Rules

Rules live in `hooks/rules.mjs`. Ship one only if it asserts something that can be shown
wrong — spec behaviour, measurable cost, a WCAG criterion, a documented bug. Anything
resting on taste does not ship, in any tier.

Put a rule in `BLOCK` only when it is provable from the edit alone and produces no false
positives; everything else goes in `ADVISE`. A single false positive demotes a blocking
rule to an advisory.

Rule patterns are matched against comment- and string-stripped text — do not write
comment handling into a regex. Object-form CSS-in-JS and markup files are reduced to
synthetic `x{ ... }` declaration blocks by `hooks/strip.mjs`, so rules see plain
declarations either way. A rule that should run only on some file types takes a
`files` regex.

## Verifying

There is no test suite. Exercise a rule by piping a hook payload:

```
echo '{"tool_name":"Write","tool_input":{"file_path":"a.css","content":".x{transition:all .2s}"}}' | node hooks/runtime.mjs pre
```

Check both directions: the defect fires, and near-misses stay silent. A rule that fires
on legitimate CSS is worse than no rule.
