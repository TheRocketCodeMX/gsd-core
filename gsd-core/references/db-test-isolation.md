# Database Test Isolation & Parallelization

How-to reference for keeping DB integration tests deterministic under parallelism — the "passes in isolation, fails in parallel" problem. Read this when tests share a database. Pairs with `test-containers.md`.

## The problem

Tests that share a database and run in parallel clobber each other's data → flaky, order-dependent failures. Fix = per-worker isolation + deterministic, test-owned data.

## Strategy tradeoff table

| Strategy | How | Parallel-safe | Speed | Tradeoff |
|---|---|---|---|---|
| **Txn-per-test + rollback** | open a transaction in setup, roll back in teardown; nothing commits | yes, if each worker has its own connection | fastest (in-memory rollback) | breaks if app code opens its own transactions / parallel queries; can't test commit-time behavior |
| **TRUNCATE/DELETE between tests** | wipe tables after each test | hard on a shared DB | ok small; slows as data grows | serializes the suite |
| **Schema-per-worker** | `CREATE SCHEMA w$i` + `search_path`; drop after | yes | ~200 ms clone | conflicts if the app already uses schemas for multi-tenancy |
| **Database-per-worker** | each parallel worker gets its own DB (by worker index) | yes (strongest) | ~400 ms full clone | more DBs to manage |
| **Template DB** (`CREATE DATABASE x TEMPLATE app_template`) | build a migrated+seeded template once, copy per worker/test | yes | fast reset (copy beats re-migrating) | **no sessions may be connected to the template during the copy** |
| **No-truncate + UUID-scoped data** | each test inserts only its own rows keyed by UUID; never clean up | yes | very fast (no reset) | can't assert global counts; assertions must be scoped to test-owned rows |

## Recommended default (parallel CI)

**Database-per-worker (or schema-per-worker), seeded from a template DB, with transaction-per-test rollback inside each worker.** Stacks per-worker isolation (no cross-worker races) with cheap per-test reset. Fall back to template-copy or no-truncate+UUID where app code manages its own transactions (rollback won't work there).

## Determinism checklist

- One DB/schema per worker → zero shared mutable state.
- Unique keys via **UUID or a per-factory sequence** — never raw Faker values you assert on (Heisenbugs).
- Fixed clock + seeded RNG (see `flaky-test-checklist.md`).
- Order-independent: every test self-seeds; no test depends on another's leftover rows.

## Worker-indexed DB (Playwright example)

```ts
// derive a per-worker DB from the worker index, in a worker-scoped fixture
const dbName = `app_w${process.env.TEST_PARALLEL_INDEX ?? test.info().workerIndex}`;
// CREATE DATABASE ${dbName} TEMPLATE app_template;  (drain template connections first)
```

## Postgres template DB

```sql
-- build once (migrated + reference/seed data), then per worker/test:
-- drain the template first (it must have ZERO active connections):
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'app_template' AND pid <> pg_backend_pid();
CREATE DATABASE app_w0 TEMPLATE app_template;  -- run this while connected to another DB (e.g. postgres)
```

## Anti-patterns

- A single shared DB across parallel workers with TRUNCATE between tests (races; forces serialization).
- Raw random Faker values in assertions (intermittent failures you can't reproduce).
- Order-dependent tests (one test relying on another's leftover state).

*Sources: conroy.org (schema-per-test); Kevin Burke (parallel DB tests, UUID-scoped); Postgres template-DB docs; Playwright parallel docs. Genuine tradeoff: txn-rollback is fastest but incompatible with app-managed transactions; UUID-scoped never cleans up but can't assert global state — choose by whether your assertions need global counts.*
