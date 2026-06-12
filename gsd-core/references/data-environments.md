# Data Layer, Secrets & Environments — Decision Reference

Reference for `/gsd:infrastructure-strategy` (data-layer step): Postgres hosting, database-per-environment, non-prod data, migrations, secrets. Recommends; the user decides. Pairs with `test-containers.md` and `db-test-isolation.md`.

## Postgres hosting: serverless/branching vs dedicated

**Serverless carries a 1.5–4× premium per capacity-hour. It wins only when idle most of the time.** 24/7 at 1 CU (1 vCPU/4 GB): Neon ~$77/mo (Launch) to ~$162/mo (Scale) vs ~$47–51/mo dedicated (RDS db.t4g.medium / Cloud SQL equiv). Storage widens it: ~$0.35/GB-mo vs ~$0.115–0.17 (**2–3× premium**). AWS's own blog concedes provisioned beats Aurora Serverless v2 at steady load.

**The inverse holds:** a dev/preview DB active ~2 h/day is **~8× cheaper** serverless (~$6/mo vs ~$50/mo always-on). Branching serverless is the correct *default for non-prod* and for pre-traffic MVPs.

| Stage | Recommend | Why |
|---|---|---|
| MVP / pre-traffic | Neon-class serverless (free/Launch tier) | Scale-to-zero; **branch-per-PR on day one** — free behavior you can't cheaply retrofit |
| Growing, spiky | Stay serverless while duty cycle <~50% (or avg utilization <~30%) | Premium only bites at sustained load; watch the two-month trend |
| Sustained steady load | Dedicated vanilla prod (RDS/Cloud SQL, RI/CUD pricing) + keep a serverless dev/preview twin | You keep branching without paying the 24/7 premium (the Dispatch pattern: Aurora prod, DMS-synced Neon branches per preview) |

**Migrate OFF serverless when any two hold (then plan the move):**
1. Compute >~50–65% duty cycle at stable size for **2+ consecutive months**
2. Autoscaler curve is flat — min ≈ max ≈ steady load (you're paying premium for elasticity you don't use)
3. Storage in the 100s of GB (the 2–3×/GB premium becomes material)
4. Cold starts ever hit a **user-facing** path (Neon ~500 ms resume is preview-tolerable; Aurora SLv2's ~15 s is not)

**Connection limits — pooled endpoint, ALWAYS, with serverless app compute.** Postgres = one OS process per connection; serverless/edge functions open one per invocation. A small serverless instance allows only ~104 direct connections at 0.25 CU — **connection storms are the classic serverless-Postgres outage**. App traffic goes through the pooler (PgBouncer/Supavisor/RDS Proxy); the direct endpoint is reserved for migrations, pg_dump, logical replication.

## Database-per-environment

| Environment | Setup |
|---|---|
| **Production** | Dedicated, **vanilla engine** (RDS/Cloud SQL — not a fork), least-privilege roles, private endpoint |
| **Staging** | Same engine + major version, **sized down**; fewer replicas is fine; own isolated DB |
| **Preview (per-PR)** | Copy-on-write branch (Neon-class) or per-PR small instance, auto-created/destroyed by CI; migrations run on every branch |
| **Dev / test** | Branch per developer, or local Testcontainers pinned to prod's major version (see `test-containers.md`) |

**The parity rule (12-factor, original + 2024 official revision — unchanged):** what must match across envs is engine **type + major version**, the extension list you actually use, the **migration history** (same ordered migrations everywhere), and the config mechanism shape. What may differ: instance size, replica count, HA topology, data volume/realism, **and vendor**.

**Nuance worth teaching:** Neon runs the unmodified Postgres query engine (the fork is at the storage layer), so vanilla-prod + Neon-dev satisfies "same type and version" — it is *more* parity-faithful than Aurora-prod with anything in dev, because **Aurora/AlloyDB are themselves non-vanilla forks** that lag upstream majors. Checklist, not blocker: diff the serverless vendor's extension list and compatibility caveats (no superuser, unlogged tables) against your dependencies.

## Non-prod data

**A masked prod clone is still personal data under GDPR** (EDPB Guidelines 01/2025: pseudonymization does not exit scope; only irreversible anonymization does). Therefore:

- **Default: synthetic seed** — schema-only branches + factory-generated data (see `@~/.claude/gsd-core/references/realistic-test-data.md`).
- **When realism is needed: irreversible anonymization at branch/clone time** — `postgresql_anonymizer` (Neon's anonymized branches use it) or Greenmask.
- **Raw production PII never lands in dev/preview/staging.** No exceptions for "it's just staging."

## Migration discipline

- **Expand–contract (parallel change):** a breaking schema change is never zero-downtime in one deploy — expand + backfill first, contract later.
- **Destructive steps (drop column/table) go in a separate, later deploy** than the code that stops using them.
- **Lint migrations** in CI: strong_migrations (Rails) or squawk (any stack, SQL-level) — catches unsafe locks; always set `lock_timeout`/`statement_timeout` (one unguarded FK's AccessExclusive lock has caused real outages).
- **Run the forward migration on every preview branch** — validates it against prod-shaped schema before it ever touches prod.
- **Separate roles:** migrator (DDL) ≠ app (DML-only) ≠ admin. The app user never holds DROP/TRUNCATE — and **never superuser** (managed providers refuse true superuser anyway; code assuming it breaks in prod).

## Secrets — the floor for any team (~$0–15/mo)

**Every major secrets breach indicts secrets *copied* (into files, repos, scripts, CI config) and *long-lived*. None was a firewall failure.** The record: **28.65M secrets leaked on public GitHub in 2025** (GitGuardian); a mass-extortion campaign harvested exposed **`.env` files across 110,000 domains** (Unit 42); Uber, CircleCI, and LastPass were all long-lived-credential compromises.

The floor — non-negotiable at any team size:
1. **Cloud secret manager as single source of truth** (SSM Parameter Store standard tier is $0; Secrets Manager/GCP SM ≈ $10–15/mo at app scale)
2. **Runtime references, never copies** — Cloud Run `--update-secrets` refs, ECS `valueFrom` SSM/SM ARNs, K8s External Secrets Operator. Secrets never appear in images, task defs, repos, or CI config.
3. **CI via OIDC** — short-lived job-scoped cloud tokens; zero long-lived deploy keys (kills the CircleCI failure mode).
4. **Local dev via CLI injection** — `doppler run -- npm run dev`, `op run`, or a wrapper fetching from the secret manager with the dev's own IAM identity; `direnv` may *trigger* the fetch but `.envrc` never contains values. **Never a committed `.env`.** Dev gets dev-scoped creds only — prod creds never on laptops.

| Option | Cost | Pick when |
|---|---|---|
| **Cloud-native SM** (SSM/Secrets Manager/GCP SM) | $0–15/mo | Single cloud — the default; full audit trail |
| **Doppler / Infisical** | free dev tier; $12–18/user-or-identity/mo | Multi-cloud or DX-first teams (watch Infisical's per-machine-identity billing) |
| **SOPS+age / sealed-secrets** | $0 | GitOps-heavy, few humans — eyes open: **no per-read audit trail**, leaked key decrypts all history |
| **Vault** | self-hosted clusters or enterprise contract | Enterprise ceremony now (BSL, IBM-owned; cheap SaaS on-ramp sunsetted) — earns it only for dynamic creds at scale / strict compliance. OpenBao is the OSS fork |

Everything beyond the floor (HSMs, dynamic DB creds, Vault clusters) is scale/compliance-driven, not security baseline.

## Anti-patterns

- **Shared mutable staging DB** — contention; one bad migration blocks every team. Fix: branch-per-PR.
- **Prod creds on laptops** — Uber/CircleCI/LastPass; one endpoint compromise = full prod compromise.
- **Secrets echoed into CI logs** — masking is best-effort exact-match; supply-chain payloads (CVE-2025-30066) dumped runner secrets into *public* logs past the redactor. Fix: OIDC + minimal job-scoped secrets.
- **Committed `.env` / drifting `.env.example`** — the 110k-domain harvest target. No value-bearing env files in repos at all.
- **Superuser/admin app connections** — app role is DML-only; assume no superuser exists.
- **Serverless compute without a pooler** — connection storm at the first traffic spike.
- **"Masked = anonymous" GDPR mistake** — pseudonymized clones remain in scope (EDPB 01/2025); anonymize irreversibly or seed synthetically.
- **Paying for scale-to-zero you never get** — persistent connections/RDS Proxy defeat Aurora auto-pause.

## Consumes / produces

- **Read by** `/gsd:infrastructure-strategy` (data-layer step) — hosting, environments, and secrets decisions feed the infrastructure ADR.
- **Read alongside** `@~/.claude/gsd-core/references/test-containers.md` and `@~/.claude/gsd-core/references/db-test-isolation.md` when designing test infrastructure — the parity rule (engine type + version) and the synthetic-seed default apply to test DBs too.

*Sources: vendor pricing pages (Neon/AWS/GCP, 2026 — spot-check JS-rendered AWS/GCP rates), AWS Database Blog (against-interest), cloudonaut & Jeremy Daly break-evens, 12factor.net + official revision, EDPB 01/2025, GitGuardian Sprawl 2026, Unit 42, CircleCI/Uber/LastPass incident reports, Fowler ParallelChange, strong_migrations/squawk docs.*
