# Planner Source Audit & Authority Limits

Reference for `agents/gsd-planner.md` — extended rules for multi-source coverage audits and planner authority constraints.

## Multi-Source Coverage Audit Format

Before finalizing plans, produce a **source audit** covering ALL four artifact types:

```
SOURCE    | ID      | Feature/Requirement          | Plan  | Status    | Notes
--------- | ------- | ---------------------------- | ----- | --------- | ------
GOAL      | —       | {phase goal from ROADMAP.md}  | 01-03 | COVERED   |
REQ       | REQ-14  | OAuth login with Google + GH | 02    | COVERED   |
REQ       | REQ-22  | Email verification flow      | 03    | COVERED   |
RESEARCH  | —       | Rate limiting on auth routes | 01    | COVERED   |
RESEARCH  | —       | Refresh token rotation       | NONE  | ⚠ MISSING | No plan covers this
CONTEXT   | D-01    | Use jose library for JWT     | 02    | COVERED   |
CONTEXT   | D-04    | 15min access / 7day refresh  | 02    | COVERED   |
DESIGN    | address | one address input (design)   | 02    | COVERED   |
```

### Five Source Types

1. **GOAL** — The `goal:` field from ROADMAP.md for this phase. The primary success condition.
2. **REQ** — Every REQ-ID in `phase_req_ids`. Cross-reference REQUIREMENTS.md for descriptions.
3. **RESEARCH** — Technical approaches, discovered constraints, and features identified in RESEARCH.md. Exclude items explicitly marked "out of scope" or "future work" by the researcher.
4. **CONTEXT** — Every D-XX decision from CONTEXT.md `<decisions>` section.
<!-- FORK:fidelity BEGIN -->
5. **DESIGN** — *Only when PROJECT.md `## Mode` records a provided design (`gsd-tools query project mode` → `has_provided_design: true`).* The literal design is a source of truth, not just the abstractions above — re-ground the plan's data shape/contract/screens in the design **oracle** (`.planning/DESIGN-INVENTORY.md`'s user-facing-field list, or the phase UI-SPEC), per `@~/.claude/gsd-core/references/design-ingestion.md` and `exploration-and-adaptability.md` § Source precedence. If no oracle exists yet (model-domain was skipped), ingest the design slice this phase needs and record `.planning/DESIGN-INVENTORY.md` (from `gsd-core/templates/design-inventory.md`) before finalizing — so the plan, and the downstream gate, have an in-repo oracle to check.
<!-- FORK:fidelity END -->

<!-- FORK:fidelity BEGIN -->
### Design fidelity (the address-failure guard)

When DESIGN is an active source, audit the plan's **observable shape** against the oracle — this is what prevents "one `address` input" becoming an invented `street/city/state/zip`:
- A planned **user-facing** field present in **neither the design nor requirements** is an **invention → ⚠ gap** (don't finalize). The design is the authority on the observable field set: don't add fields it lacks, don't drop fields it shows.
- DDD/strategy owns only the **internal** modeling of those fields — a rich value object, normalization, or a column split that doesn't change the captured/observable shape is **fine**, not a gap.
- A field the **requirements** need but the design under-showed is **kept** (it's design ∪ requirements), tagged `source: requirement` in the oracle — never silently dropped.
`gsd-plan-checker` re-checks this at plan time and `gsd-verifier` at build time; surfacing it here stops the drift before execution burns context.
<!-- FORK:fidelity END -->

### What is NOT a Gap

Do not flag these as MISSING:
- Items in `## Deferred Ideas` in CONTEXT.md — developer chose to defer these
- Items scoped to a different phase via `phase_req_ids` — not assigned to this phase
- Items in RESEARCH.md explicitly marked "out of scope" or "future work" by the researcher

### Handling MISSING Items

If ANY row is `⚠ MISSING`, do NOT finalize the plan set silently. Return to the orchestrator:

```
## ⚠ Source Audit: Unplanned Items Found

The following items from source artifacts have no corresponding plan:

1. **{SOURCE}: {item description}** (from {artifact file}, section "{section}")
   - {why this was identified as required}

   Options:
   A) Add a plan to cover this item
   B) Split phase: move to a sub-phase
   C) Defer explicitly: add to backlog with developer confirmation

   → Awaiting developer decision before finalizing plan set.
```

If ALL rows are COVERED → return `## PLANNING COMPLETE` as normal.

---

## Authority Limits — Constraint Examples

The planner's only legitimate reasons to split or flag a feature are **constraints**, not judgments about difficulty:

**Valid (constraints):**
- ✓ "This task touches 9 files and would consume ~45% context — split into two tasks"
- ✓ "No API key or endpoint is defined in any source artifact — need developer input"
- ✓ "This feature depends on the auth system built in Phase 03, which is not yet complete"

**Invalid (difficulty judgments):**
- ✗ "This is complex and would be difficult to implement correctly"
- ✗ "Integrating with an external service could take a long time"
- ✗ "This is a challenging feature that might be better left to a future phase"

If a feature has none of the three legitimate constraints (context cost, missing information, dependency conflict), it gets planned. Period.

<!-- FORK:grounding BEGIN -->
## Fill the plan's `## Grounding` block (blocking gate)

Every PLAN.md carries a `## Grounding` block — the proof the plan grounded in the project's active strategy sources. Get the required set with `gsd_run query grounding required` (the `done` strategy steps + present DESIGN/LEGACY-INVENTORY, per the `## Strategy Plan`; skipped/not-yet-run steps are exempt). Write **one line per required source**, citing the decision that exists only in that file (the ADR rung per subdomain, etc.), per `@~/.claude/gsd-core/references/grounding-citations.md`. `check.grounding-plan` cross-checks each citation against the source file and **blocks the plan (`exit 1`)** on any missing or mismatched required source — so you cannot fake it from memory. When the phase grounds in a literal source file (exported design, legacy/vibe/additional-app code), add a source-direct citation with `file:line`.
<!-- FORK:grounding END -->
