---
name: gsd-testing-strategy
description: "Recommend a test strategy matched to the architecture — test shape, levels, and what to test."
argument-hint: "[--auto] [--text] [--tune-up]"
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
4. Pick the persistent critical-path e2e smoke list — the gate is a regression check, not a validation of the app in the world
5. Probe (never survey) what can actually drive the app and record the certification tier CERT-0…CERT-2, its mechanism, and the four substrate policies (seed accounts, email safety, LLM calls, auth)
6. Apply the born-fast defaults and record the suite-health baseline the T1–T4 triggers compare against
7. Set coverage-as-floor + mutation + TDD stance; write TEST-STRATEGY.md and commit

**Output:** `.planning/TEST-STRATEGY.md` — level emphasis per subdomain, unit-test targets, no-duplicate-coverage rules, the persistent e2e smoke list, the certification tier + probe results + mechanism, the certification substrate, the suite-health baseline (and its append-only Coverage-debt sink), coverage/mutation stance, and TDD stance. Feeds add-tests, execute-phase, verify-work's certification step, and plan-phase.
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
- `--tune-up` — Run the suite tune-up flow instead of authoring a strategy: profile → config/cache → suite audit against the strategy → re-baseline (appends a dated `## Suite health` row and records the fix-class). Requires an existing TEST-STRATEGY.md.

**When to run:** after `/gsd-recommend-architecture` (it consumes the architecture decision), before planning/execution. Works without an ADR too — it will ask briefly about the architecture.

Context files are resolved in-workflow during initialization.
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read the workflow file BEFORE taking any action. It contains the full process: deriving the shape FROM the architecture (not picking a pyramid/diamond), the behavior-over-implementation + sociable-by-default rules, test-once-at-cheapest-level, the gnarly-bits list, persistent-vs-transient e2e, the certification ladder + substrate, the suite-health baseline, coverage-as-floor + mutation, and TDD stance. Do not improvise from the objective summary above. The shape is an OUTPUT of the architecture, never a target you pick; default to sociable tests and mock only at architectural boundaries; keep all existing TESTING-STANDARDS.md standards.

**This command has TWO modes, and the workflow routes between them at its first step.** With `--tune-up` the run does NOT author a strategy: it executes `steps/suite-tune-up.md` (profile → config/cache → suite audit against the recorded strategy → re-baseline, appending a dated `## Suite health` row and its fix-class) against an existing TEST-STRATEGY.md. Authoring on a `--tune-up` run is the failure mode — read the flag before priming yourself for authoring.
</process>

<success_criteria>
- Architecture decision (ADR/SKELETON) and DOMAIN-MODEL loaded; shape derived FROM it (not a picked pyramid/diamond)
- Per-subdomain level emphasis recorded with the architecture rung that justifies it
- Gnarly bits to unit-test identified (money/state-machines/parsers); what-not-to-test stated; no duplicate coverage
- Persistent critical-path e2e smoke list set; transient e2e distinguished
- Certification tier (CERT-0 … CERT-2) recorded from a live probe, never from tool presence; mechanism and brief source stated
- Certification substrate recorded — seed accounts, email safety, LLM call policy, auth — with the honest answer where a vendor has no test mode
- Suite-health baseline row written (or `unmeasured`), with the T1–T4 triggers and the `--tune-up` flow as its repair path
- Coverage-as-floor + mutation targets + TDD stance (behavior + small increments; test-first knob) recorded
- Existing TESTING-STANDARDS.md rigor preserved (sociable default, mock only at ports)
- TEST-STRATEGY.md written and committed (when commit_docs is true)
- User directed to /gsd-plan-phase
</success_criteria>
