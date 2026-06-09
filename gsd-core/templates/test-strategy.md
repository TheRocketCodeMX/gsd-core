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

## TDD stance

- Behavior-level tests, **small uniform increments**, regression floor, real RED step.
- Test-first vs test-after: [`workflow.tdd_mode` — on/off].

## Notes

- [project-specific decisions]

---
*Test strategy. Consumed by `/gsd:add-tests`, `/gsd:execute-phase`, `/gsd:plan-phase`.*
