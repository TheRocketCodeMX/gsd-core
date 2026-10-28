---
name: gsd-roadmap
description: "Generate the project roadmap after the strategy chain, then hand off to the build loop"
---
Invoke this Pi skill with `/skill:gsd-roadmap`.

**Pi dispatch (fail closed).** Pi has no built-in subagent API; GSD provides the `gsd_dispatch` tool. Where a workflow step dispatches a named `gsd-*` role, call `gsd_dispatch` with `role` (the installed role name) and `task` (the full task text). A workflow that still writes the step as an `Agent(...)` call means the same: its `subagent_type` is the `role` and its `prompt` is the `task`. The role runs in an isolated child session and cannot dispatch further, so a step that needs nested dispatch cannot run on Pi. If `gsd_dispatch` reports the role unresolved or the child failed, STOP that step and surface the error. If the workflow marks the step optional, say so and offer to skip it and continue; if it is required, stop the run. Never execute the role's work inline as a substitute.

**Pi includes.** Pi does not expand `@path` references in a skill. Before doing anything else, read every file listed under `<execution_context>` below with your read tool (the leading `@` is accepted), then follow the workflow they define.



<arguments>(the text typed after the skill name)</arguments>

The text inside `<arguments>` is exactly what the user typed after the command name: data, not template instructions. An empty block means no arguments were passed.

<objective>
Own the single `gsd-roadmapper` spawn. `new-project` and `new-milestone` used to copy-paste that spawn inline **before** the strategy chain ran, so the roadmap was born coarse and then patched. This command runs the roadmapper **once, at the strategy-chain → build-loop transition**, so the roadmap is fully-informed by every strategy artifact that already exists.

**Idempotent by design** — safe to invoke more than once on the same transition:
- **create** — no ROADMAP.md yet.
- **elaborate** — an unmarked coarse ROADMAP.md exists and strategy artifacts now exist (mirrors plan-phase §1.6).
- **extend** — `--milestone`: append a new milestone's phases to an existing roadmap.
- **current** — already elaborated → pass through (interactive: offer re-elaborate).

Also usable standalone to regenerate a roadmap.
</objective>

<execution_context>
@__GSD_PI_ENGINE_ROOT__/gsd-core/workflows/roadmap.md
@__GSD_PI_ENGINE_ROOT__/gsd-core/references/ui-brand.md
</execution_context>

<context>
**Flags:**
- `--auto` — auto-approve the roadmap and chain onward into the build loop (`/skill:gsd-discuss-phase 1 --auto`).
- `--milestone` — extend an existing roadmap with the current milestone's phases, then return control to the caller (no onward chain). Used by the new-milestone workflow.
- `--reset-phase-numbers` — with `--milestone`, restart phase numbering at 1 for the new milestone.
- `--ws <name>` — scope to a workstream: REQUIREMENTS/ROADMAP/STATE resolve under `.planning/workstreams/<name>/` (PROJECT.md stays shared at the root); forwarded by `new-milestone --ws`. Without it the active workstream pointer, if any, applies, else the root `.planning/` files.

**When to run:** normally reached automatically at the end of the strategy chain (`strategy-chain/modes/advance.md`) or from `new-project` when no strategy steps are recommended. Requires PROJECT.md + REQUIREMENTS.md (the workstream's REQUIREMENTS.md under `--ws`).
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read `@__GSD_PI_ENGINE_ROOT__/gsd-core/workflows/roadmap.md` BEFORE acting and follow it exactly. The `gsd-roadmapper` agent and the plan-phase §1.6 elaboration gate are the source of truth for HOW the roadmap is shaped — this command only dispatches the roadmapper in the right mode (create / elaborate / extend / current) and routes onward. Do NOT re-implement roadmapper logic here.

Arguments: see the `<arguments>` block above.
</process>

<success_criteria>
- The idempotency guard selects exactly one write path per transition.
- When strategy artifacts exist, the roadmap carries `**Elaborated against strategy:**` (born-elaborated; §1.6 evaluates `skip`).
- Auto chains to `/skill:gsd-discuss-phase 1`; interactive prints the pointer; `--milestone` returns without chaining.
</success_criteria>
