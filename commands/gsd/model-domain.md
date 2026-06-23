---
name: gsd:model-domain
description: Greenfield DDD — capture ubiquitous language and classify subdomains (core/supporting/generic).
argument-hint: "[--auto] [--text] [--event-storming]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
requires: [new-project, plan-phase, phase]
---

<objective>
Establish the shared domain vocabulary and subdomain boundaries that downstream phases depend on — before any architecture decision.

**Position in workflow:** `new-project → model-domain (optional) → recommend-architecture → security-strategy → frontend-architecture (if frontend) → testing-strategy → … → plan-phase`. Canonical order: `@~/.claude/gsd-core/references/strategy-chain.md`.

**How it works:**
1. Load project context (PROJECT.md, REQUIREMENTS.md, ROADMAP.md if present)
2. Elicit ubiquitous language — the team's actual terms, with conflicts surfaced
3. Classify each subdomain as core / supporting / generic, with explicit rationale and a misclassification check
4. Optionally surface bounded contexts via lightweight (Big-Picture) event storming
5. Write DOMAIN-MODEL.md and commit it — architecture and testing phases read it

**Output:** `.planning/DOMAIN-MODEL.md` — strategic domain model (language + subdomain distillation [+ contexts]). It is the single complexity assessment that parameterizes architecture and test strategy.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/model-domain.md
@~/.claude/gsd-core/references/domain-modeling.md
@~/.claude/gsd-core/templates/domain-model.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`. They are equivalent.
</runtime_note>

<context>
**Flags:**
- `--auto` — Skip interactive questions; synthesize the domain model from PROJECT.md and REQUIREMENTS.md, choosing recommended defaults.
- `--text` — Use plain-text numbered lists instead of TUI menus (required for `/rc` remote sessions).
- `--event-storming` — Include a Big-Picture event-storming pass to surface bounded contexts.

**When to run:** after `/gsd:new-project`, before planning, when the domain has real business rules, multiple vocabularies, or a competitive core. Optional — simple CRUD projects may skip straight to `/gsd:plan-phase`.

Context files are resolved in-workflow during initialization.
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read the workflow file BEFORE taking any action. The workflow contains the complete process including ubiquitous-language elicitation, the subdomain classification logic with its misclassification check, optional event storming, and DOMAIN-MODEL.md generation. Do not improvise from the objective summary above. This skill captures the *problem* (domain); it must NOT prescribe architecture — that is a later phase.
</process>

<success_criteria>
- PROJECT.md and REQUIREMENTS.md loaded and analyzed before questioning
- Ubiquitous language captured (~8–15 terms) with definitions, usage context, and conflicts flagged
- Every subdomain classified core/supporting/generic WITH rationale, and a misclassification check applied (CRUD-that-will-grow probed; complex-but-generic flagged as buy)
- Bounded contexts surfaced via event storming, or explicitly deferred
- No architecture prescribed (handed off to recommend-architecture)
- DOMAIN-MODEL.md written from the template and committed atomically (when commit_docs is true)
- User directed to the next step
</success_criteria>
