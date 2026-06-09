# Realistic Test Data — Synthetic First, Dumps Anonymized

How-to reference for generating test data. Read when seeding integration/e2e tests. Pairs with `db-test-isolation.md`.

## Rule: synthetic by default; prod/staging dumps only anonymized + subset

- **Default = synthetic, domain-aware factories.** No real PII by construction → no GDPR/compliance/access burden; and you can target edge cases deterministically (a random prod sample won't reliably contain them).
- **Prod/staging dumps only** when reproducing a prod-shaped bug, perf/volume testing, or validating real distributions — and **never raw**: anonymize + subset first.

## Factories (deterministic, parallel-safe)

- `factory_bot` (Ruby) / **Fishery** (TS/JS) / test-data-builders. `.build()` = unsaved object, `.create()` = inserted.
- Unique fields via **sequences or UUID fragments** — never raw Faker in anything you assert on.
- Avoid shared mutable fixtures (static YAML blobs accumulate coupling and drift); each test builds exactly the graph it needs. A fixture used as a base inside a factory for stable *reference* data is fine.

```ts
// Fishery (TS) — sequence for uniqueness, onCreate to persist
import { Factory } from 'fishery';
export const userFactory = Factory.define<User>(({ sequence, onCreate }) => {
  onCreate(u => db.users.insert(u));
  return { id: crypto.randomUUID(), email: `user-${sequence}@test.example`, name: `User ${sequence}` };
});
// userFactory.build()  → unsaved    |    await userFactory.create()  → inserted
```

## Anonymization / subsetting (when a dump is justified)

- **PostgreSQL Anonymizer (`anon`)** — masking rules (`anon.dummy_free_email()`, `SECURITY LABEL`). FK columns can't be masked directly — mask the referenced primary key.
- **Neon branching + static masking** — mask once at branch creation (permanent masked copy).
- **Snaplet** — subset a large DB to a sample, then transform/anonymize PII via JS, producing production-shaped snapshots without the PII. (Note: Snaplet's hosted service was sunset / open-sourced in 2024 — use the OSS tooling or an equivalent subsetter.)
- Guardrail: build the masking habit early; don't over-engineer synthetic generators — simple factories cover ~90% of cases.

## Seeding lifecycle

- Build a migrated + reference-data **template** once (see `db-test-isolation.md`), copy per worker.
- Per test: factories for the specific graph; idempotent cleanup (rollback or schema/DB drop); teardown safe after a mid-test crash (`if: always()` cleanup in CI branch/ephemeral envs).

## Anti-patterns

- Raw production dump into a test DB (PII / compliance risk).
- Raw Faker values in assertions (non-reproducible Heisenbugs).
- One giant shared fixture file (coupling, drift).

*Sources: Neon / Snaplet anonymization docs; PostgreSQL Anonymizer; Fishery / factory_bot; betterdata (synthetic vs anonymization).*
