---
name: gsd-infrastructure-strategy
description: "Recommend an infrastructure strategy matched to the project — compute rung, data layer, floors."
argument-hint: "[--auto] [--text]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---


<objective>
Decide WHERE the system runs — which cloud, which compute rung per component, what data layer per environment, and the observability + IaC floors — matched to actual traffic shape, team size, and spend, and capture it so CI/CD and planning follow a coherent platform.

**Position in workflow:** `recommend-architecture → security-strategy → frontend-architecture (if frontend) → testing-strategy → infrastructure-strategy → cicd-strategy → plan-phase`. Canonical order: `@~/.claude/gsd-core/references/strategy-chain.md`.

**How it works:**
1. Load PRODUCT-BRIEF (scale expectations), the architecture ADR (topology), and TEST-STRATEGY (CI needs)
2. Gather the three crossover inputs — traffic shape, team size, monthly compute spend — and pick the cloud
3. Walk the compute ladder per component — serverless containers are the DEFAULT; every rung above needs a current, concrete trigger (the reference carries the quantified crossovers)
4. Decide the data layer per environment, the observability floor (incl. a billing alert), and the IaC floor
5. Apply the over-/under-engineering meta-tell both directions, write INFRA-STRATEGY.md, and commit

**Output:** `.planning/INFRA-STRATEGY.md` — cloud + why, compute rung per component with promotion triggers, data layer per environment, environments map, observability checklist, IaC approach, and cost guardrails. Feeds cicd-strategy and plan-phase.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/infrastructure-strategy.md
@~/.claude/gsd-core/references/infrastructure-strategy.md
@~/.claude/gsd-core/templates/infra-strategy.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`. They are equivalent.
</runtime_note>

<context>
**Flags:**
- `--auto` — Skip interactive questions; synthesize the strategy from PRODUCT-BRIEF / ADR / TEST-STRATEGY using the consensus defaults (serverless containers, managed Postgres, the day-one floors).
- `--text` — Use plain-text numbered lists instead of TUI menus (required for `/rc` remote sessions).

**When to run:** after `/gsd-recommend-architecture` and `/gsd-testing-strategy` (it consumes both), before `/gsd-cicd-strategy` and planning. Works without them too — it will ask briefly about topology and CI needs.

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
- User directed to /gsd-cicd-strategy
</success_criteria>
