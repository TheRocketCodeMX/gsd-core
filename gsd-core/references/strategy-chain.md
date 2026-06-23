# The Strategy Chain — Canonical Order & Wiring Manifest

The single source of truth for the planning→strategy→build sequence. Each command's "Position in workflow" header and end-of-run "Next:" pointer **must agree with this manifest** — they are a convenience for the user, not independent definitions. When they disagree, this file wins (the historical bug was per-skill pointers diverging, which orphaned `infrastructure-strategy` and left `cicd-strategy` not warning on a missing `INFRA-STRATEGY.md`).

## Canonical order

```
legacy-inventory        (rewrite/refactor/vibe-coded mode only · before new-project)  → LEGACY-INVENTORY.md
discover-product        (optional · front-of-funnel: outcome, wedge, demand)   → PRODUCT-BRIEF.md
  → new-project         (required · init · derives requirements from design ∪ old-behavior when LEGACY-INVENTORY exists)  → PROJECT / REQUIREMENTS / coarse ROADMAP / STATE
  → model-domain        (optional · recommended when the domain has real rules) → DOMAIN-MODEL.md  (+ actor/authz step)
  → recommend-architecture (recommended)                                        → adr/NNNN-architecture.md
  → security-strategy      (recommended · thin/scale-to-zero)                    → SECURITY-STRATEGY.md
  → frontend-architecture  (conditional on a frontend)                          → FRONTEND-ARCHITECTURE.md
  → testing-strategy    (recommended)                                           → TEST-STRATEGY.md
  → infrastructure-strategy (recommended when deploying · skippable)            → INFRA-STRATEGY.md
  → cicd-strategy       (recommended when deploying · skippable)                → CICD-STRATEGY.md
  → plan-phase ⇄ discuss-phase → execute-phase → verify-work   (the build loop, per phase)
```

**Conditional nodes** (skippable, but never silently orphaned — each must still be *offered*):
- `discover-product`, `model-domain` — optional; the chain reads their artifacts if present.
- `legacy-inventory` — rewrite/refactor/vibe-coded mode only (replacing an existing app), before `new-project`; produces LEGACY-INVENTORY.md so requirements derive from design ∪ old-behavior.
- `frontend-architecture` — runs only when the project has a frontend.
- `infrastructure-strategy`, `cicd-strategy` — skip both straight to `plan-phase` only for a local-only / no-deploy project.

## Per-link contract (consumes · warns-if-missing · next)

| Step | Consumes | Warns if missing | Next pointer |
|---|---|---|---|
| new-project | (spike/sketch if present) | — | plan-phase (minimum) / model-domain |
| model-domain | PROJECT, REQUIREMENTS | PROJECT | recommend-architecture |
| recommend-architecture | DOMAIN-MODEL | PROJECT (warns); DOMAIN-MODEL (soft) | security-strategy |
| security-strategy | PROJECT (Mode), ADR, DOMAIN-MODEL | ADR (soft) | frontend-architecture / testing-strategy |
| frontend-architecture *(if frontend)* | ADR, DOMAIN-MODEL, design input | ADR (soft) | testing-strategy |
| testing-strategy | ADR, DOMAIN-MODEL | PROJECT (warns); ADR (soft) | infrastructure-strategy → cicd-strategy → plan-phase |
| infrastructure-strategy | PRODUCT-BRIEF, ADR, TEST-STRATEGY | PROJECT (warns); ADR (soft) | cicd-strategy |
| cicd-strategy | TEST-STRATEGY, INFRA-STRATEGY, ADR | **TEST-STRATEGY (warns); INFRA-STRATEGY (warns)** | plan-phase |

**The missing-input rule (uniform):** every step that consumes an upstream artifact warns when it is absent and offers to run the producing step — then proceeds with a documented fallback if the user declines. This rule, not per-skill memory, is what keeps the chain from silently dropping a link.

**Skip-ledger exception (note-once, don't re-nag):** a producing step recorded in PROJECT.md's `## Strategy Plan` **skip-ledger** was *deliberately* declined (see `strategy-flow.md`). When the missing artifact corresponds to a ledgered skip, the consuming step **notes it once and does NOT re-offer** — it proceeds with the documented fallback. This distinguishes "deliberately skipped" from "not yet produced," so a chosen path doesn't read as a recurring error. `new-milestone` re-surfaces a ledgered skip only when the new milestone's scope makes it relevant again.

## Mode adaptation (applies to every step)

The chain is **mode-adaptive**, not greenfield-only. The mode-combination (Origin × Design-input × Code-quality) is detected and **recorded once in PROJECT.md's `## Mode` section** by `new-project`/`new-milestone`; every step reads it (falling back to per-area detection) and runs the matching exploration (code / design / web) per `@~/.claude/gsd-core/references/exploration-and-adaptability.md`. Brownfield/rewrite/from-design/from-vibe-coded change *what each step reads and recommends* (assess-and-evolve, not design-from-scratch), never *whether the step runs*. The rewrite/harden disciplines live in `@~/.claude/gsd-core/references/brownfield-adaptation.md`, and `legacy-inventory` produces the coverage matrix + three-way gap map + salvage dispositions in rewrite mode.

## Roadmap timing (known issue — to be corrected)

`new-project` currently produces the **detailed** ROADMAP before the strategy decisions that reshape it, so `model-domain`/`recommend-architecture` carry "Roadmap reconciliation" patch steps. Implemented (partial): the roadmapper now details only the **near-horizon** phase(s) and keeps later phases coarse, to be **elaborated** against the locked decisions at the end of the chain (the strategy skills' end-of-run reconciliation). The deeper restructuring — fully deferring detailed roadmap generation until after the strategy chain — is intentionally left for a dogfood-validated change, since it touches the most central workflow.

## Consumes / produces

- **Consumes:** read by every strategy command (to align its header/Next/warning) and by the build-loop and enforcement agents (to know which artifacts exist to honor).
- **Produces:** nothing at runtime — it is the wiring contract. Pairs with `exploration-and-adaptability.md` (mode detection), `architecture-decision.md` / `frontend-architecture.md` / `fe-be-seam.md` / `application-telemetry.md` (the decisions), `engineering-standards.md` (how well they're executed).
