# plan-phase — roadmap elaboration (lazy mode)

Loaded by `plan-phase` Step 1.6 **only when `ELAB=stale`** (a coarse roadmap predates the strategy artifacts). Keeps this body out of the always-loaded plan-phase context for the common case where the roadmap is already elaborated or no strategy artifacts exist.

Elaborate ONCE so phase *boundaries* reflect the locked decisions (Phase 1 absorbs the IaC/CI-CD/security scaffolding; split phases that straddle seams). Per-phase *detail* still comes from canonical_refs at plan time — this gate fixes only **structure**.

- **Non-interactive (auto/autonomous/`--text`):** elaborate automatically; announce what changed.
- **Interactive:** offer once (AskUserQuestion, header "Roadmap") — "Roadmap predates the strategy decisions (*list them*); elaborate its phase structure before planning? (recommended)". Decline → plan against the coarse roadmap, and append a decline marker `**Elaborated against strategy:** declined (<date>)` to `.planning/ROADMAP.md` so the gate honors the decline (its grep matches) and doesn't re-ask each phase.

Spawn the roadmapper in elaborate-mode (omit `model=` to inherit):
```
Agent(
  prompt="<objective>Run ELABORATE-MODE (per your elaborate-mode spec): detail near-horizon .planning/ROADMAP.md phases + adjust boundaries against the now-locked strategy artifacts (.planning/adr/*, SECURITY-STRATEGY.md, FRONTEND-ARCHITECTURE.md, TEST-STRATEGY.md, INFRA-STRATEGY.md, CICD-STRATEGY.md), preserving structure/numbering/requirement-mappings/user-edits, and write the idempotency marker. Return ROADMAP ELABORATED + a change summary.</objective>",
  subagent_type="gsd-roadmapper",
  description="Elaborate roadmap against strategy"
)
```
> **ORCHESTRATOR RULE:** the roadmapper **runs in a subagent** — after spawning, stop and wait (silence during the subagent run is expected; don't kill it); then re-read ROADMAP.md — do NOT plan against the pre-elaboration roadmap.
