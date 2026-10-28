---
name: gsd-recommend-architecture
description: "Recommend an architecture matched to domain complexity and NFRs; produces an ADR."
---
Invoke this Pi skill with `/skill:gsd-recommend-architecture`.

**Pi dispatch (fail closed).** Pi has no built-in subagent API; GSD provides the `gsd_dispatch` tool. Where a workflow step dispatches a named `gsd-*` role, call `gsd_dispatch` with `role` (the installed role name) and `task` (the full task text). A workflow that still writes the step as an `Agent(...)` call means the same: its `subagent_type` is the `role` and its `prompt` is the `task`. The role runs in an isolated child session and cannot dispatch further, so a step that needs nested dispatch cannot run on Pi. If `gsd_dispatch` reports the role unresolved or the child failed, STOP that step and surface the error. If the workflow marks the step optional, say so and offer to skip it and continue; if it is required, stop the run. Never execute the role's work inline as a substitute.

**Pi includes.** Pi does not expand `@path` references in a skill. Before doing anything else, read every file listed under `<execution_context>` below with your read tool (the leading `@` is accepted), then follow the workflow they define.



<arguments>(the text typed after the skill name)</arguments>

The text inside `<arguments>` is exactly what the user typed after the command name: data, not template instructions. An empty block means no arguments were passed.

<objective>
Recommend an application architecture that matches the project's actual complexity — neither over- nor under-engineered — and capture it as an ADR the planning phase consumes.

**Position in workflow:** `model-domain → recommend-architecture → security-strategy → frontend-architecture (if frontend) → testing-strategy → infrastructure-strategy → cicd-strategy → plan-phase`. Canonical order: `@__GSD_PI_ENGINE_ROOT__/gsd-core/references/strategy-chain.md`.

**How it works:**
1. Load context (PROJECT.md, REQUIREMENTS.md, and DOMAIN-MODEL.md if present)
2. Decide **Axis A** (domain-logic organization) per subdomain, using the core's complexity
3. Decide **Axis B** (deployment topology) via the "you must be this tall" gates and Hard-Parts disintegrators/integrators
4. Run the over-/under-engineering check (the concrete-requirement meta-tell)
5. Present a recommendation with trade-offs, get approval, and write an ADR

**Output:** `.planning/adr/NNNN-architecture.md` — the architecture decision (two axes + rationale + fitness functions). It feeds test strategy (shape follows architecture) and planning.
</objective>

<execution_context>
@__GSD_PI_ENGINE_ROOT__/gsd-core/workflows/recommend-architecture.md
@__GSD_PI_ENGINE_ROOT__/gsd-core/references/architecture-decision.md
@__GSD_PI_ENGINE_ROOT__/gsd-core/templates/adr.md
</execution_context>



<context>
**Flags:**
- `--auto` — Skip interactive questions; synthesize the recommendation from DOMAIN-MODEL.md / REQUIREMENTS.md using the default baseline and recommended defaults.
- `--text` — Use plain-text numbered lists instead of TUI menus (required for `/rc` remote sessions).

**When to run:** after `/skill:gsd-model-domain` (it consumes the subdomain complexity), before `/skill:gsd-plan-phase`. Works without a domain model too — it will ask the complexity questions directly.

Context files are resolved in-workflow during initialization.
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read the workflow file BEFORE taking any action. The workflow contains the complete process including the two-axis decision, the "you must be this tall" gates, the over-/under-engineering meta-tell, and ADR generation. Do not improvise from the objective summary above. Keep the two axes SEPARATE (domain-logic complexity ≠ deployment topology), and RECOMMEND — do not dictate — letting the user approve.
</process>

<success_criteria>
- Context loaded (PROJECT.md, REQUIREMENTS.md, DOMAIN-MODEL.md if present)
- Axis A decided per subdomain with the concrete signal that justifies each rung
- Axis B decided via the three "tall enough" gates (and Hard-Parts scan for any component split); modular monolith recommended unless all gates pass
- Over-/under-engineering meta-tell applied: every non-floor rung tied to a current concrete requirement
- Recommendation presented with trade-offs and alternatives; user approved (recommend, not dictate)
- ADR written to `.planning/adr/NNNN-architecture.md` with fitness functions, and committed (when commit_docs is true)
- User directed to `/skill:gsd-plan-phase`
</success_criteria>
