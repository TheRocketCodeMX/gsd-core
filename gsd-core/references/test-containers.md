# Testcontainers — Real Dependencies in Integration Tests

How-to reference for spinning up real databases/services (Postgres, Redis, etc.) in integration tests with Testcontainers. Read this when writing integration tests against a real dependency. Pairs with `db-test-isolation.md`.

## Core rules

1. **Pin exact image tags** — `postgres:16-alpine`, never `latest` (reproducibility).
2. **Singleton container, started once** — one container per test run, reused across all test files/classes. Do **not** combine the singleton with per-class lifecycle annotations/extensions (they stop the container after each class and break the next one).
3. **Wait on a real readiness signal, never `sleep`** — a health check, a log message, or a DB-ready probe.
4. **`withReuse` is local-dev-only** — it keeps containers alive between runs (fast inner loop), but **Ryuk does not reap reused containers**, and CI wants fresh, reproducible environments. **Never enable reuse in CI.**
5. **Run migrations in test setup** so schema drift surfaces immediately.

## Canonical pattern (TypeScript/Node — ports to Java/Go/.NET)

```ts
// test/support/postgres.ts — one container, started once for the whole run
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer | undefined;

export async function getDb(): Promise<StartedPostgreSqlContainer> {
  if (!container) {
    container = await new PostgreSqlContainer('postgres:16-alpine') // pinned tag, never :latest
      .withDatabase('app_test')
      // built-in wait for postgres; for custom services:
      // .withWaitStrategy(Wait.forLogMessage(/ready to accept connections/))
      .start();
    // run migrations ONCE here, against the base/template DB
  }
  return container;
}
// Vitest/Jest: start in globalSetup, stop in globalTeardown — NOT in beforeEach.
```

Java/JUnit 5 equivalent: a `static` field started in a `static {}` block on an abstract base class every test class `extends` — and do **not** put `@Container`/`@Testcontainers` on it (that hands lifecycle to the extension, which stops it per class).

## Cleanup

Testcontainers labels its containers; **Ryuk** removes them when the run's process exits — an explicit `stop()` is optional. Reused containers are the exception (not reaped).

## CI considerations

- **Ryuk under Docker-in-Docker / restricted CI** sometimes fails. Mitigate: set `TESTCONTAINERS_RYUK_DISABLED=true` **and** add an explicit cleanup step — `docker container prune -f --filter "label=org.testcontainers=true"` (or stop containers in global teardown).
- Cache Docker layers; prefer `alpine` images; cap memory on heavy services (e.g. Elasticsearch `ES_JAVA_OPTS=-Xms512m -Xmx1g`).
- **First run pulls the image** — pre-pull images in CI, or set a generous `withStartupTimeout(...)`, so the first test doesn't time out on a cold pull.
- **Parallelize at the file level**, not within a file, to bound container count and resource use.

## Anti-patterns

- `:latest` image tags (non-reproducible).
- A fresh container per test (slow — use the singleton + per-test **data** isolation, see `db-test-isolation.md`).
- `sleep(2000)` for readiness (flaky) — use a wait strategy.
- `withReuse(true)` in CI (leaks containers; not reproducible).

*Sources: testcontainers.com & Docker Testcontainers official guides; qaskills 2026 best practices.*
