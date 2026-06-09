# Flaky-Test Avoidance Checklist

How-to reference for preventing flaky tests (intermittent pass/fail). Read when a test is flaky, or proactively when writing integration/e2e tests. (Empirically, async-wait is the #1 cause (~45%), then concurrency (~20%) and test-order dependence (~12%) — Luo et al., FSE 2014.)

## Checklist

- [ ] **Mock the clock** — inject a fixed/controllable clock; never call `now()` / `Date.now()` directly in code under test.
- [ ] **Seed randomness** — fixed RNG seed; never raw Faker values in assertions (use sequences/UUIDs).
- [ ] **Poll, don't sleep** — wait for a **condition** (element visible, API responded, row present), not a fixed interval. `sleep(2000)` is slow-when-fast and still flaky-when-slow. Poll with backoff for eventually-consistent reads.
- [ ] **Use framework actionability waits** — Playwright auto-waits; Testcontainers `Wait.*` strategies. Removes the #1 flake cause by construction.
- [ ] **Order independence** — every test self-seeds; no test depends on another's leftover state. (Randomize test order to surface hidden dependence.)
- [ ] **No shared mutable global state** — separate temp dirs / DBs / schemas per worker (see `db-test-isolation.md`).
- [ ] **Isolate external services** — fakes/stubs/contract tests at the boundary; retry-with-backoff ONLY at genuine integration edges.
- [ ] **Quarantine, don't ignore** — detect/mark flaky tests, auto-rerun, stage new tests before the critical path; treat flakiness as infra debt, not noise.

## The big three causes (fix structurally, not with retries)

1. **Async/timing (~45%)** → poll for conditions, framework waits, fixed clock.
2. **Concurrency / shared state (~20%)** → per-worker isolation, no shared globals.
3. **Order dependence (~12%)** → self-seeding tests; randomized order to surface it.

*Sources: Luo et al., "An Empirical Analysis of Flaky Tests" (FSE 2014) for the cause breakdown; Google Testing Blog (flaky tests at Google); OpenReplay (time/async in tests); patterns from `db-test-isolation.md` & `test-containers.md`.*
