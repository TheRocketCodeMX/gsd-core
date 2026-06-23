---
name: gsd:cicd-strategy
description: Recommend a CI/CD strategy — CI platform, OIDC auth, test-tier pipeline stages, deploy ladder.
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
Decide WHERE CI runs, HOW it authenticates to the cloud, WHICH test tiers gate which pipeline stage, and HOW deploys promote — matched to the test strategy, the target infrastructure, and the team — and capture it so CI/deploy phases plan against a coherent pipeline.

**Position in workflow:** `testing-strategy → infrastructure-strategy → cicd-strategy → plan-phase`. Canonical order: `@~/.claude/gsd-core/references/strategy-chain.md`.

**How it works:**
1. Load TEST-STRATEGY.md (the tiers + smoke list) and INFRA-STRATEGY.md / ADR (the target cloud)
2. Pick the CI platform — GitHub Actions by default; cloud-native CI only as a deliberate exception
3. Set auth (OIDC with a pinned `sub` condition) and the secrets split (CI-scoped vs application)
4. Map test tiers to stages: PR gate ≤10 min, merge-to-main, nightly + mutation; flaky quarantine policy
5. Pick the deployment ladder rung (team size + blast radius) and the free supply-chain table stakes
6. Write CICD-STRATEGY.md and commit

**Output:** `.planning/CICD-STRATEGY.md` — platform + why, auth + secrets split, the stage map with time budgets, flaky policy, deployment ladder rung with promotion triggers, and the supply-chain checklist. Feeds plan-phase.
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
- `--auto` — Skip interactive questions; synthesize the strategy from TEST-STRATEGY / INFRA-STRATEGY using the consensus defaults (GHA, pinned-`sub` OIDC, ≤10-min PR gate, ladder rung from recorded team size).
- `--text` — Use plain-text numbered lists instead of TUI menus (required for `/rc` remote sessions).

**When to run:** after `/gsd:testing-strategy` (it consumes the test tiers and smoke list), before planning CI/deploy phases. Works without a TEST-STRATEGY too — it will suggest running it first, then proceed with generic tiers.

Context files are resolved in-workflow during initialization.
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read the workflow file BEFORE taking any action. It contains the full process: the GHA-default platform decision with the cloud-native exception (and its scripted pushbacks in both directions), pinned-`sub` OIDC and the secrets split, the tier→stage mapping with the hard ≤10-minute PR budget, the flaky quarantine canon, the merge-queue trigger, the deployment ladder with the staging/canary pushbacks, the free-six supply-chain table stakes vs the deferred ceremony, and the over/under-engineering meta-tell check. Do not improvise from the objective summary above. Never recommend bare "OIDC" without the pinned `sub` condition; never put application secrets anywhere but the cloud secret manager.
</process>

<success_criteria>
- TEST-STRATEGY.md tiers + smoke list loaded (or generic tiers with the gap noted); team size + blast radius established
- CI platform chosen with rationale; cloud-native CI only with a VPC/regulatory or compute-behind-GHA justification
- Auth = OIDC with pinned `sub` (repo + branch/environment), or the documented short-lived fallback; secrets split recorded
- Pipeline map set: PR gate ≤10 min (unit + fast integration + 3–7 smoke e2e), merge-to-main, nightly + mutation
- Flaky policy (quarantine from gate, keep post-merge, no blanket retries) and merge-queue trigger recorded
- Deployment ladder rung matched to team size + blast radius; promotion triggers recorded for deferred capabilities
- Free-six supply-chain table stakes recommended; SLSA L3 / cosign / SBOM programs deferred
- CICD-STRATEGY.md written and committed (when commit_docs is true)
- User directed to /gsd:plan-phase
</success_criteria>
