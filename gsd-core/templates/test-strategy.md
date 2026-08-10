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
- **Transient (dev-loop, throwaway):** validate freshly-built flows; not kept in CI; demote to integration once covered cheaper.

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

## TDD stance

- Behavior-level tests, **small uniform increments**, regression floor, real RED step.
- Test-first vs test-after: [`workflow.tdd_mode` — on/off].

## Notes

- [project-specific decisions]

---
*Test strategy. Consumed by `/gsd:add-tests`, `/gsd:execute-phase`, `/gsd:plan-phase`.*
