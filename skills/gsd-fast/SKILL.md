---
name: gsd-fast
description: "Execute a trivial task inline — no subagents, no planning overhead"
argument-hint: "[task description]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---


<objective>
Execute a known, mechanical task directly in the current context without spawning
subagents or generating PLAN.md files. For tasks that do not justify planning
overhead: typo fixes, config changes, renames, removing a component along with its
tests and styles, dead-code cleanup, forgotten commits, simple additions.

This is NOT a replacement for /gsd-quick — use /gsd-quick when the work needs
research, genuine multi-step planning, or a decision you cannot make from the code
in front of you. /gsd-fast is for changes you already know how to make; the number of
files they touch is not the deciding factor.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/fast.md
</execution_context>

<process>
Execute end-to-end.
</process>
