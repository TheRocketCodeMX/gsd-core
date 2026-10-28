---
name: gsd-context
description: "Seed, verify, and grow durable project knowledge — context capsules and the MASTER-CONTEXT index"
---
Invoke this Pi skill with `/skill:gsd-context`.

**Pi dispatch (fail closed).** Pi has no built-in subagent API; GSD provides the `gsd_dispatch` tool. Where a workflow step dispatches a named `gsd-*` role, call `gsd_dispatch` with `role` (the installed role name) and `task` (the full task text). A workflow that still writes the step as an `Agent(...)` call means the same: its `subagent_type` is the `role` and its `prompt` is the `task`. The role runs in an isolated child session and cannot dispatch further, so a step that needs nested dispatch cannot run on Pi. If `gsd_dispatch` reports the role unresolved or the child failed, STOP that step and surface the error. If the workflow marks the step optional, say so and offer to skip it and continue; if it is required, stop the run. Never execute the role's work inline as a substitute.

**Pi includes.** Pi does not expand `@path` references in a skill. Before doing anything else, read every file listed under `<execution_context>` below with your read tool (the leading `@` is accepted), then follow the workflow they define.



<arguments>(the text typed after the skill name)</arguments>

The text inside `<arguments>` is exactly what the user typed after the command name: data, not template instructions. An empty block means no arguments were passed.

<objective>
Own the knowledge lifecycle: seed quality-stamped context capsules into `<N>-CONTEXT.md` (and `.planning/MASTER-CONTEXT.md` when cross-phase content warrants it), scout their claims against the live codebase, flush session knowledge at calm checkpoints, and curate the MASTER index. Doctrine: **plans are perishable; context is durable** — front-load the knowledge, never the plans. Capsules are evidence: anchored, verified at birth (`gsd-tools context verify`), layered append-only, superseded — never deleted.
</objective>

<execution_context>
@__GSD_PI_ENGINE_ROOT__/gsd-core/workflows/context.md
</execution_context>

<flags>
- **seed** `[--milestone | --phase <N>]` — the orchestrator ITSELF writes one capsule per phase (never delegated to fresh-context agents), stamps `quality:` honestly, verifies anchors at birth. `--milestone` also writes MASTER-CONTEXT when cross-phase content exists. Re-seed appends a `## Seed refresh` layer — never clobbers.
- **scout** `[--phase <N>]` — 2–3 explorer subagents confirm-or-refute the capsule's Verified Facts against the live codebase; findings append as `## Scout corrections`.
- **flush** — calm knowledge checkpoint: update MASTER-CONTEXT, enrich the active phase capsule, record session position. A checkpoint, not an emergency save.
- **master** — curate MASTER-CONTEXT back to its ~150-line bound: supersede dead facts, push depth into deep docs, verify after.
- **--text** — TEXT_MODE: replace AskUserQuestion with plain-text numbered lists.
</flags>

<process>
Execute end-to-end.

**MANDATORY:** Read `@__GSD_PI_ENGINE_ROOT__/gsd-core/workflows/context.md` BEFORE acting and follow it exactly. Parse the mode token (`seed` | `scout` | `flush` | `master`) from the arguments and execute that workflow mode end-to-end — guards first, TEXT_MODE honored at every interactive moment.

Arguments: see the `<arguments>` block above.
</process>

<success_criteria>
- Capsules are written by the orchestrator itself, honestly quality-stamped, and verify-clean at birth.
- Existing layers are never clobbered: re-seed appends `## Seed refresh`; provenance-less CONTEXT.md files are left untouched and reported.
- flush never interrupts the user's work; master leaves MASTER-CONTEXT re-bounded and verified.
</success_criteria>
