---
name: gsd:recommend-architecture
description: Recommend an architecture matched to domain complexity and NFRs; produces an ADR.
argument-hint: "[--auto] [--text]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
requires: [model-domain, plan-phase, phase]
---

<objective>
Recommend an application architecture that matches the project's actual complexity — neither over- nor under-engineered — and capture it as an ADR the planning phase consumes.

**Position in workflow:** `new-project → model-domain → recommend-architecture → plan-phase`

**How it works:**
1. Load context (PROJECT.md, REQUIREMENTS.md, and DOMAIN-MODEL.md if present)
2. Decide **Axis A** (domain-logic organization) per subdomain, using the core's complexity
3. Decide **Axis B** (deployment topology) via the "you must be this tall" gates and Hard-Parts disintegrators/integrators
4. Run the over-/under-engineering check (the concrete-requirement meta-tell)
5. Present a recommendation with trade-offs, get approval, and write an ADR

**Output:** `.planning/adr/NNNN-architecture.md` — the architecture decision (two axes + rationale + fitness functions). It feeds test strategy (shape follows architecture) and planning.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/recommend-architecture.md
@~/.claude/gsd-core/references/architecture-decision.md
@~/.claude/gsd-core/templates/adr.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`. They are equivalent.
</runtime_note>

<context>
**Flags:**
- `--auto` — Skip interactive questions; synthesize the recommendation from DOMAIN-MODEL.md / REQUIREMENTS.md using the default baseline and recommended defaults.
- `--text` — Use plain-text numbered lists instead of TUI menus (required for `/rc` remote sessions).

**When to run:** after `/gsd:model-domain` (it consumes the subdomain complexity), before `/gsd:plan-phase`. Works without a domain model too — it will ask the complexity questions directly.

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
- User directed to `/gsd:plan-phase`
</success_criteria>
