---
name: gsd:discover-product
description: Optional product discovery — demand vs interest, the narrowest wedge, four risks, outcome-framed.
argument-hint: "[--auto] [--text]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
requires: [new-project, model-domain, phase]
---

<objective>
Define WHAT to build and WHY before building it — separating real demand from interest, finding the narrowest valuable wedge, and framing success as an outcome. Optional; front-of-funnel.

**Position in workflow:** `discover-product (optional) → new-project → model-domain → recommend-architecture`

**How it works:**
1. Optionality gate — if requirements are already clear and evidenced, skip to lightweight RICE or exit
2. Frame the outcome (the behavior/metric to change, not a feature)
3. Forcing interview: job & specific user → demand-vs-interest (past behavior) → narrowest wedge → four risks → scope/RICE → success metric
4. Write an outcome-framed PRODUCT-BRIEF.md and commit

**Output:** `.planning/PRODUCT-BRIEF.md` — outcome, target user + wedge, demand evidence, job story, four-risks status, prioritized scope, explicit "not in scope." Feeds PROJECT.md and model-domain.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/discover-product.md
@~/.claude/gsd-core/references/product-discovery.md
@~/.claude/gsd-core/templates/product-brief.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`. They are equivalent.
</runtime_note>

<context>
**Flags:**
- `--auto` — Skip the forcing interview; synthesize DISCOVERY.md from any existing PROJECT.md / REQUIREMENTS.md using recommended defaults.
- `--text` — Use plain-text numbered lists instead of TUI menus (required for `/rc` remote sessions).

**When to run:** when product value is uncertain (new market, no past-behavior evidence, demand asserted from a hypothetical, or a large/irreversible bet). **Skip** when a client/customer has explicit, evidenced requirements — then go straight to `/gsd:new-project` or lightweight prioritization. Runs standalone — does not require an existing project.

Context files (if any) are resolved in-workflow during initialization.
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read the workflow file BEFORE taking any action. The workflow contains the complete process including the optionality gate, the forcing interview (push past polished first answers), demand-vs-interest probing, the wedge, the four risks, and DISCOVERY.md generation. Do not improvise from the objective summary above. Ask about the PAST, never hypotheticals; frame the vision as an outcome/opportunity (it must admit more than one solution) so the domain and architecture stay open.
</process>

<success_criteria>
- Optionality gate applied (skipped or lightweight path offered when requirements are already evidenced)
- Outcome framed as a behavior/metric, not a feature
- Specific user + solution-free job + job story captured
- Demand separated from interest via past-behavior evidence (not hypotheticals)
- Narrowest wedge identified; vision admits >1 solution
- Four risks assessed (unvalidated ones flagged with a cheapest test)
- Scope prioritized (thin slice + RICE; explicit "not in scope")
- PRODUCT-BRIEF.md written and committed (when commit_docs is true)
- User directed to /gsd:new-project or /gsd:model-domain
</success_criteria>
