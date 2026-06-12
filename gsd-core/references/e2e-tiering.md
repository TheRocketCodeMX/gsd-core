# E2E Test Tiering — Persistent Smoke vs Transient

How-to reference for structuring end-to-end tests so CI stays fast and the suite stays maintainable. Read when adding e2e tests. Pairs with `test-strategy.md`.

## The tiers

- **Persistent (in CI, every PR):** a small **smoke / critical-user-journey** suite of **3–7 journeys** — auth, payment, core nav. <5 min feedback. An "ultra-priority" set checking only vital flows validates build stability.
- **Deeper regression:** business-critical flows on staging / release candidates / scheduled runs — *not* every PR.
- **Transient:** throwaway e2e to validate a freshly-built flow during the dev loop; **not** kept in CI; demote to integration once the behavior is covered more cheaply.

## Keep e2e lean

- E2E is the most expensive layer to run and maintain. A portfolio of **50–200 well-chosen** e2e tests covering critical workflows beats 1,000 redundant ones. ≈50–200 well-chosen e2e tests is the cap on the **total** e2e portfolio across all tiers (PR smoke + staging regression + release/scheduled) — never the size of the PR gate, which stays at 3–7 journeys.
- Push edge cases **down** to unit/integration (test each behavior once, at the cheapest level — see `test-strategy.md`). E2E covers true end-to-end critical journeys only.
- The **ice-cream cone** (mostly e2e) is the anti-pattern.

## Ephemeral environments

Spin up a per-PR environment, run the suite, tear it down on merge (standard CI/CD). Add an `if: always()` cleanup so resources are freed even on failure.

## CI structure

```
on PR:       smoke suite          (persistent, <5 min, every PR)
on staging:  business-critical regression
on release:  broad coverage / scheduled
```

## Anti-patterns

- E2E for every feature/edge case (ice-cream cone; slow, flaky, costly).
- A fat e2e suite as the primary safety net instead of integration/unit.
- Keeping throwaway dev-loop e2e in CI.

*Sources: Ranger E2E-in-CI/CD guide; Google Testing Blog; "Software Engineering at Google" (testing).*
