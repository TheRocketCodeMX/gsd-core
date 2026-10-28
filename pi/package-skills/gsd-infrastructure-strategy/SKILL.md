---
name: gsd-infrastructure-strategy
description: "Recommend an infrastructure strategy matched to the project — compute rung, data layer, floors."
---
Invoke this Pi skill with `/skill:gsd-infrastructure-strategy`.

**Pi dispatch (fail closed).** Pi has no built-in subagent API; GSD provides the `gsd_dispatch` tool. Where a workflow step dispatches a named `gsd-*` role, call `gsd_dispatch` with `role` (the installed role name) and `task` (the full task text). A workflow that still writes the step as an `Agent(...)` call means the same: its `subagent_type` is the `role` and its `prompt` is the `task`. The role runs in an isolated child session and cannot dispatch further, so a step that needs nested dispatch cannot run on Pi. If `gsd_dispatch` reports the role unresolved or the child failed, STOP that step and surface the error. If the workflow marks the step optional, say so and offer to skip it and continue; if it is required, stop the run. Never execute the role's work inline as a substitute.

**Pi includes.** Pi does not expand `@path` references in a skill. Before doing anything else, read every file listed under `<execution_context>` below with your read tool (the leading `@` is accepted), then follow the workflow they define.



<arguments>(the text typed after the skill name)</arguments>

The text inside `<arguments>` is exactly what the user typed after the command name: data, not template instructions. An empty block means no arguments were passed.

<objective>
Decide WHERE the system runs — which cloud, which compute rung per component, what data layer per environment, and the observability + IaC floors — matched to actual traffic shape, team size, and spend, and capture it so CI/CD and planning follow a coherent platform.

**Position in workflow:** `recommend-architecture → security-strategy → frontend-architecture (if frontend) → testing-strategy → infrastructure-strategy → cicd-strategy → plan-phase`. Canonical order: `@__GSD_PI_ENGINE_ROOT__/gsd-core/references/strategy-chain.md`.

**How it works:**
1. Load PRODUCT-BRIEF (scale expectations), the architecture ADR (topology), and TEST-STRATEGY (CI needs)
2. Gather the three crossover inputs — traffic shape, team size, monthly compute spend — and pick the cloud
3. Walk the compute ladder per component — serverless containers are the DEFAULT; every rung above needs a current, concrete trigger (the reference carries the quantified crossovers)
4. Decide the data layer per environment, the observability floor (incl. a billing alert), and the IaC floor
5. Apply the over-/under-engineering meta-tell both directions, write INFRA-STRATEGY.md, and commit

**Output:** `.planning/INFRA-STRATEGY.md` — cloud + why, compute rung per component with promotion triggers, data layer per environment, environments map, observability checklist, IaC approach, and cost guardrails. Feeds cicd-strategy and plan-phase.
</objective>

<execution_context>
@__GSD_PI_ENGINE_ROOT__/gsd-core/workflows/infrastructure-strategy.md
@__GSD_PI_ENGINE_ROOT__/gsd-core/references/infrastructure-strategy.md
@__GSD_PI_ENGINE_ROOT__/gsd-core/templates/infra-strategy.md
</execution_context>



<context>
**Flags:**
- `--auto` — Skip interactive questions; synthesize the strategy from PRODUCT-BRIEF / ADR / TEST-STRATEGY using the consensus defaults (serverless containers, managed Postgres, the day-one floors).
- `--text` — Use plain-text numbered lists instead of TUI menus (required for `/rc` remote sessions).

**When to run:** after `/skill:gsd-recommend-architecture` and `/skill:gsd-testing-strategy` (it consumes both), before `/skill:gsd-cicd-strategy` and planning. Works without them too — it will ask briefly about topology and CI needs.

Context files are resolved in-workflow during initialization.
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read the workflow file BEFORE taking any action. It contains the full process: the compute decision ladder with quantified move-up triggers (the Fargate-vs-EC2 crossovers, the CAST AI utilization evidence, the <4-engineers Kubernetes floor, GKE Autopilot as the escape hatch), the per-cloud asymmetries (Fargate ≠ scale-to-zero; Cloud Run/Container Apps $0-idle dev), the scripted pushbacks for "we need Kubernetes" and "we'll just use a VM", the data-layer delegation to data-environments.md, the observability and IaC floors, and the meta-tell. Do not improvise from the objective summary above. The rung is an OUTPUT of evidence, never a platform you pick; serverless containers are the default and every rung above needs a current, concrete trigger.
</process>

<success_criteria>
- PRODUCT-BRIEF / ADR / TEST-STRATEGY loaded where present; traffic shape, team size, and spend gathered
- Cloud chosen by constraint or team familiarity, with the scale-to-zero asymmetry surfaced
- Compute rung per component recorded with the concrete trigger that justifies anything above serverless containers, plus promotion triggers
- Data layer decided per environment (pooling mandatory; crossover-watch metric recorded)
- Observability floor (3–5 alerts incl. billing) and IaC floor confirmed; tracing/SLO deferred until >3 services in a request path
- Over-/under-engineering meta-tell applied in both directions
- INFRA-STRATEGY.md written and committed (when commit_docs is true)
- User directed to /skill:gsd-cicd-strategy
</success_criteria>
