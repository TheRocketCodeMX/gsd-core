---
name: gsd:security-strategy
description: Decide the app-wide security posture — data classification, ASVS level, authz model, security DoD.
argument-hint: "[--auto] [--text]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - WebSearch
  - WebFetch
requires: [recommend-architecture, plan-phase, phase]
---

<objective>
Decide the **app-wide, decide-once** security posture — the prerequisite gate that per-feature enforcement inherits — and capture it thin and scale-to-zero. Enforcement stays folded (the planner's threat models, the security-auditor, secure-phase, cicd supply-chain); this owns only the cross-cutting decisions that have no other home.

**Position in workflow:** `recommend-architecture → security-strategy → frontend-architecture (if frontend) → testing-strategy → infrastructure-strategy → cicd-strategy → plan-phase`. Canonical order: `@~/.claude/gsd-core/references/strategy-chain.md`.

**How it works:**
1. Classify the data (public / internal / confidential / regulated) and identify the regime(s) (GDPR / HIPAA / PCI / FedRAMP / none) — the master switch
2. Derive the ASVS level (1/2/3) from context and write it back to the `workflow.security_asvs_level` config (replacing the static default)
3. Record the authn/authz model (RBAC/ABAC/ReBAC + the auth method) — consuming the actor/role model from model-domain
4. Draw the app-wide trust-boundary / data-flow + top-level STRIDE — the parent that per-phase threat models inherit
5. State the secrets/key strategy (pointer to infra) and the security DoD (which CI gates block at this tier)
6. Write SECURITY-STRATEGY.md and commit — registered as a canonical reference

**Output:** `.planning/SECURITY-STRATEGY.md` — data classification, derived ASVS level, authn/authz model, the app-wide threat-model parent, secrets/key strategy, and the security DoD. Half a page for an L1 app; grows with the tier. Feeds plan-phase, the security-auditor, and the strategy chain.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/security-strategy.md
@~/.claude/gsd-core/references/security-posture.md
@~/.claude/gsd-core/templates/security-strategy.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`. They are equivalent.
</runtime_note>

<context>
**Flags:**
- `--auto` — Skip interactive questions; derive the posture from PROJECT.md / the ADR / DOMAIN-MODEL using the floor + recommended defaults (still derives the ASVS level from context and writes it back).
- `--text` — Use plain-text numbered lists instead of TUI menus (required for `/rc` remote sessions).

**When to run:** after `recommend-architecture` (it consumes the topology + trust boundaries), before `infrastructure-strategy`/`cicd-strategy`/`plan-phase`. Thin and scale-to-zero — an L1 app resolves in one screen. Enforcement stays folded; this is the decide-once posture only.

Context files are resolved in-workflow during initialization.
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read the workflow file BEFORE taking any action. It contains the full process: data classification → regime detection → ASVS-level derivation (+ config write-back) → authz model → the app-wide threat-model parent → secrets/key strategy → security DoD. Do not improvise. Keep it **scale-to-zero** (don't impose ceremony on a low-sensitivity app — that's the security-binder trap), but never leave the ASVS level at the static default for a real app (the under-engineering trap). RECOMMEND, don't dictate.
</process>

<success_criteria>
- Data classified (public/internal/confidential/regulated) and regime(s) identified
- ASVS level derived from context and written back to `workflow.security_asvs_level` config (not left at the default)
- Authn/authz model recorded (RBAC/ABAC/ReBAC + auth method), consuming model-domain's actors/roles
- App-wide trust-boundary/data-flow + top-level STRIDE recorded as the parent per-phase models inherit
- Secrets/key strategy (pointer to infra) + the security DoD (blocking CI gates for this tier) recorded
- Scale-to-zero respected (half-page for L1; ceremony grows only with the tier)
- SECURITY-STRATEGY.md written and committed (when commit_docs is true); user directed to the next step
</success_criteria>
