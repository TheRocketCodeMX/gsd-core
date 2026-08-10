# Test Strategy — [PROJECT_TITLE]

**Created:** [DATE] via `/gsd:testing-strategy`
**Basis:** architecture decision [ADR-NNNN] · extends `TESTING-STANDARDS.md` (keep all existing standards).

## Level emphasis per subdomain (shape follows architecture)

The shape is an *output* of the architecture, not a chosen target. Sociable tests by default; mock only at ports.

| Subdomain | Architecture rung | Primary level (small/medium/large) | Why |
|-----------|-------------------|------------------------------------|-----|
| [core] | Domain Model | small (unit, via public API) + medium for adapters | rich pure logic |
| [crud area] | Transaction Script | medium (integration, real DB) | thin logic, DB-bound |

## What to unit-test (the gnarly bits)

- [money/currency — integer minor units / exact decimal, never float]
- [state machine / complex conditionals]
- [parser / algorithm / pure function]

## What NOT to test / no duplicate coverage

- [framework code, trivial getters/setters, mock behavior]
- Each behavior tested **once**, at the cheapest level that gives confidence.

## Integration tests

- Against **real** dependencies (DB / external services) — see the `test-containers` and `db-test-isolation` skills. Sociable; mock only at architectural boundaries.

## End-to-end

- **Persistent (CI smoke / critical journeys):** [auth] · [payment] · [core flow] — keep lean (<5 min).
- **Maintenance:** [agent-authored/healed (planner → generator → healer) | hand-maintained — why no authoring agent]
- **Transient (dev-loop, throwaway):** validate freshly-built flows; not kept in CI; demote to integration once covered cheaper.

## Certification

The gate above is a regression check; certification validates the app in real conditions (see `certification.md`). Never a CI gate.

- **Tier:** [CERT-0 | CERT-1 (limited) | CERT-1 | CERT-2 — from the probe, never from tool presence]
- **Probe results:** [driver → goto / snapshot / click round-trip / screenshot per-operation verdicts, dated — record the failures too]
- **Mechanism:** [dedicated certifier app + handed-over brief | building runtime drives the browser | inspection-grade flows only | human UAT (CERT-0)]
- **Brief source:** UAT items + the capsule's `## What Done Looks Like` — certifier-agnostic; [starter script emitted: yes/no — accelerant, never canonical]
- **Deferred:** [capability not available — the observable fact that promotes it, e.g. "full click-through — re-probe on a visible display session"]

<!-- Probe rows materialize from Step 5.5's live probe — do not pre-print driver rows here.
     A row written on spec becomes a "fact" downstream (tables beat prose). -->

## Certification substrate

| Policy | Decision |
|---|---|
| Seed test accounts | [idempotent seed script · role-tagged accounts · credentials in the env/secret store — never in the repo, never real user data] |
| Email safety | [sandbox catcher (Mailpit-class) | verified provider test mode — see the vendor honesty table | real recipients ONLY because deliverability IS the feature] |
| LLM integrations | [real calls: spend-capped test key + pinned model + shape-not-content assertions | stubs: which tiers and why] |
| OAuth / auth | [verified provider test mode | one-time human auth + persisted session (gitignored storage state)] |

## Coverage & mutation

- Coverage = **floor**, not a target.
- Mutation testing (Stryker) on: [critical modules — e.g. the pricing engine, money math].

## CI execution map (feeds `/gsd:cicd-strategy`)

| Pipeline stage | Runs | Budget |
|---|---|---|
| PR gate (blocking) | small + fast medium + 3–7 e2e smoke [+ changed-files mutation if fast] | ≤10 min |

<!-- One stage is the correct default. Add a second or scheduled row ONLY if cicd-strategy's
     C1/C2 triggers fire (measured suite >10 min · a tier that can't run on a PR · a job a PR
     run structurally cannot do). Do not pre-assert a nightly here — cicd-strategy reads this
     table as an input, so a row written on spec becomes a "fact" downstream. -->

- **Doesn't fit the PR gate:** [which tiers, and why they can't run there — feeds cicd-strategy's C1 decision]
- **Not a pipeline tier:** certification — runs outside CI by design (real conditions, human-adjacent); never map it to any CI stage, C1 does not apply (see `## Certification`)

## Suite health

Baseline at strategy time — **Step 6.5 writes the first row**; thereafter only the tune-up flow's fourth pass appends (the T1–T4 triggers in `test-strategy.md § Suite health` decide when a tune-up fires). Append-only: a re-baseline never rewrites, overwrites, or replaces an earlier row — the history is the trend the triggers read. `wall_clock` is **integer seconds**; `ms/test` is derived at compare time, never recorded here (one source per number).

| Date | test_count | wall_clock (s) | containers_started | fix-class of last tune-up |
|---|---|---|---|---|
| [DATE] | [N \| unmeasured] | [seconds \| unmeasured] | [—] | [— (none yet)] |

- **Born-fast defaults applied:** [container singleton (reuse local-only) · framework config at current APIs — see the reference checklist]

## Coverage debt

Appended by `verify-work`'s coverage-gap step — one row per gap that reached UAT or
certification unproven. Append-only; read by `/gsd:testing-strategy` when the strategy is
re-derived (the Update path in Step 1), because these rows are the only record of where
this project's pyramid actually leaks. Empty is the healthy state.

| Date | Phase / gap | Behavior that escaped | Fast test that was missing (and at which level) | Status |
|---|---|---|---|---|
| [—] | [—] | [none yet] | [—] | [—] |

## TDD stance

- Behavior-level tests, **small uniform increments**, regression floor, real RED step.
- Test-first vs test-after: [`workflow.tdd_mode` — on/off].

## Notes

- [project-specific decisions]

---
*Test strategy. Consumed by `/gsd:add-tests`, `/gsd:execute-phase`, `/gsd:plan-phase`.*
