---
name: gsd:cicd-strategy
description: "Recommend a right-sized CI/CD strategy — CI rung ladder, OIDC auth, deploy rung, forcing facts."
argument-hint: "[--auto] [--text]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
requires: [testing-strategy, plan-phase]
---

<objective>
Decide WHERE CI runs, HOW it authenticates to the cloud, WHAT automation runs and when, and HOW deploys promote — matched to the test strategy, the target infrastructure, and the team — and capture it so CI/deploy phases plan against a coherent, **right-sized** pipeline. Two independent ladders: the **CI rung ladder (Axis C)** and the **delivery rung ladder (Axis D)**. The floor is one workflow file, one job; every rung above it must name the concrete fact forcing it.

**Position in workflow:** `testing-strategy → infrastructure-strategy → cicd-strategy → plan-phase`. Canonical order: `@~/.claude/gsd-core/references/strategy-chain.md`.

**How it works:**
1. Load TEST-STRATEGY.md (the tiers + smoke list), INFRA-STRATEGY.md / ADR (the target cloud), and SECURITY-STRATEGY.md (data classification → blast radius); **measure** suite wall clock, merges/week, and contributors instead of asking
2. Pick the CI platform — GitHub Actions by default; cloud-native CI only as a deliberate exception
3. Set auth (OIDC with a pinned `sub` condition) and the secrets split (CI-scoped vs application)
4. **Pick the CI rung (C0 floor → tiered gate → scheduled jobs → merge queue), each above the floor justified by a measured fact** — keeping the ≤10-min PR budget, the flaky quarantine canon, and the no-matrix-without-a-support-promise default
5. Pick the **delivery rung (production-user exposure + blast radius)** and the free supply-chain table stakes
6. Write CICD-STRATEGY.md and commit

**Output:** `.planning/CICD-STRATEGY.md` — the CI rung and delivery rung with the fact forcing each non-floor rung, platform + why, auth + secrets split, the stage map with time budgets, matrix decision, flaky policy, cost guardrails, the supply-chain checklist, and everything deferred with its promotion trigger. Feeds plan-phase.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/cicd-strategy.md
@~/.claude/gsd-core/references/cicd-strategy.md
@~/.claude/gsd-core/templates/cicd-strategy.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`. They are equivalent.
</runtime_note>

<context>
**Flags:**
- `--auto` — Skip interactive questions; synthesize the strategy from TEST-STRATEGY / INFRA-STRATEGY / SECURITY-STRATEGY using the consensus defaults (GHA, pinned-`sub` OIDC, ≤10-min PR gate, and **C0/D0 unless a measured trigger fires**).
- `--text` — Use plain-text numbered lists instead of TUI menus (required for `/rc` remote sessions).

**When to run:** after `/gsd:testing-strategy` (it consumes the test tiers and smoke list), before planning CI/deploy phases. Works without a TEST-STRATEGY too — it will suggest running it first, then proceed with generic tiers.

Context files are resolved in-workflow during initialization.
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read the workflow file BEFORE taking any action. It contains the full process: the measure-don't-ask context step, the GHA-default platform decision with the cloud-native exception (and its scripted pushbacks in both directions), pinned-`sub` OIDC and the secrets split, the **CI rung ladder (Axis C: C0–C3)** with the hard ≤10-minute PR budget, the four scheduled-job triggers with their owner + triage-SLA admission gate, the matrix check, the flaky quarantine canon, the merge-queue trigger, the **delivery rung ladder (Axis D: D0–D5)** with the staging/canary pushbacks, the free-six supply-chain table stakes vs the deferred ceremony, and the two-directional over/under-engineering meta-tell check. Do not improvise from the objective summary above. **C0 + D0 is the default and a complete, passing answer** — a single-stage pipeline is not a gap; state it confidently, never apologetically. No rung above the floor without the concrete fact forcing it; no `schedule:` job without a named owner and a triage SLA; no matrix without a supported-platform promise. Never recommend bare "OIDC" without the pinned `sub` condition; never put application secrets anywhere but the cloud secret manager.
</process>

<success_criteria>
- TEST-STRATEGY.md tiers + smoke list loaded (or generic tiers with the gap noted); blast radius taken from SECURITY-STRATEGY.md rather than re-interviewed
- Suite wall clock measured and dated, or explicitly recorded as `unmeasured`; merges/week and contributors derived from `git`
- CI platform chosen with rationale; cloud-native CI only with a VPC/regulatory or compute-behind-GHA justification
- Auth = OIDC with pinned `sub` (repo + branch/environment), or the documented short-lived fallback; secrets split recorded
- CI rung (Axis C) and delivery rung (Axis D) recorded, each non-floor rung carrying the concrete fact that forced it; **a single-stage C0/D0 pipeline is a passing outcome**
- Pipeline map set: PR gate ≤10 min (unit + fast integration + 3–7 smoke e2e); a second stage only with its named C1 trigger
- Every scheduled job has a named owner + triage SLA, or there are none; a matrix is backed by a supported-platform promise, or is absent
- Flaky policy (quarantine from gate, keep post-merge, no blanket retries) and merge-queue trigger recorded
- Delivery rung matched to production-user exposure + blast radius; promotion triggers recorded for deferred capabilities
- Free-six supply-chain table stakes recommended plus explicit artifact retention and `concurrency: cancel-in-progress`; SLSA L3 / cosign / SBOM programs deferred
- CICD-STRATEGY.md written and committed (when commit_docs is true)
- User directed to /gsd:plan-phase
</success_criteria>
