---
name: gsd-testing-strategy
description: "Recommend a test strategy matched to the architecture — test shape, levels, and what to test."
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
Decide WHAT to test, at WHICH level, and HOW MUCH — matched to the architecture — and capture it so execution and add-tests follow a coherent shape. Extends the project's existing test rigor (TESTING-STANDARDS.md), it does not replace it.

**Position in workflow:** `recommend-architecture → security-strategy → frontend-architecture (if frontend) → testing-strategy → infrastructure-strategy → cicd-strategy → plan-phase` (security/frontend/infra/cicd are conditional or skippable per project). Canonical order: `@~/.claude/gsd-core/references/strategy-chain.md`.

**How it works:**
1. Load the architecture decision (ADR / SKELETON) and DOMAIN-MODEL
2. Derive the test-level emphasis per subdomain — shape FOLLOWS architecture (rich core → unit; CRUD-over-DB → integration)
3. Identify the gnarly bits to unit-test (money, state machines, parsers) and what NOT to test
4. Pick the persistent critical-path e2e smoke list; set coverage-as-floor + mutation + TDD stance
5. Write TEST-STRATEGY.md and commit

**Output:** `.planning/TEST-STRATEGY.md` — level emphasis per subdomain, unit-test targets, no-duplicate-coverage rules, the persistent e2e smoke list, coverage/mutation stance, and TDD stance. Feeds add-tests, execute-phase, and plan-phase.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/testing-strategy.md
@~/.claude/gsd-core/references/test-strategy.md
@~/.claude/gsd-core/templates/test-strategy.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`. They are equivalent.
</runtime_note>

<context>
**Flags:**
- `--auto` — Skip interactive questions; synthesize the strategy from the ADR / DOMAIN-MODEL using the consensus defaults (behavior-first, sociable, shape-follows-architecture).
- `--text` — Use plain-text numbered lists instead of TUI menus (required for `/rc` remote sessions).

**When to run:** after `/gsd-recommend-architecture` (it consumes the architecture decision), before planning/execution. Works without an ADR too — it will ask briefly about the architecture.

Context files are resolved in-workflow during initialization.
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read the workflow file BEFORE taking any action. It contains the full process: deriving the shape FROM the architecture (not picking a pyramid/diamond), the behavior-over-implementation + sociable-by-default rules, test-once-at-cheapest-level, the gnarly-bits list, persistent-vs-transient e2e, coverage-as-floor + mutation, and TDD stance. Do not improvise from the objective summary above. The shape is an OUTPUT of the architecture, never a target you pick; default to sociable tests and mock only at architectural boundaries; keep all existing TESTING-STANDARDS.md standards.
</process>

<success_criteria>
- Architecture decision (ADR/SKELETON) and DOMAIN-MODEL loaded; shape derived FROM it (not a picked pyramid/diamond)
- Per-subdomain level emphasis recorded with the architecture rung that justifies it
- Gnarly bits to unit-test identified (money/state-machines/parsers); what-not-to-test stated; no duplicate coverage
- Persistent critical-path e2e smoke list set; transient e2e distinguished
- Coverage-as-floor + mutation targets + TDD stance (behavior + small increments; test-first knob) recorded
- Existing TESTING-STANDARDS.md rigor preserved (sociable default, mock only at ports)
- TEST-STRATEGY.md written and committed (when commit_docs is true)
- User directed to /gsd-plan-phase
</success_criteria>
