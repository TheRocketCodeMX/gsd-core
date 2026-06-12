# ADR-[NNNN]: Architecture for [PROJECT_TITLE]

- **Status:** [Proposed | Accepted]
- **Date:** [DATE]
- **Deciders:** [user / team]
- **Sources:** `DOMAIN-MODEL.md` (subdomain complexity), `PROJECT.md`, `REQUIREMENTS.md`

## Context

[The problem and the forces. Pull the core/supporting/generic split and complexity from DOMAIN-MODEL.md. State the non-functional drivers that matter (scale, lifespan, audit/regulatory, integration count) and the team/ops constraints (team count, CD maturity). Keep it about *why a decision is needed*, not the decision.]

## Decision

### Axis A — domain-logic organization (per subdomain)

| Subdomain | Type (from DOMAIN-MODEL) | Rung | Why |
|-----------|--------------------------|------|-----|
| [core subdomain] | Core | [Transaction Script / Domain Model / + Hexagonal / + CQRS / + Event Sourcing] | [the concrete signal that justifies this rung] |
| [supporting] | Supporting | [usually Transaction Script] | [why] |
| [generic] | Generic | Buy / off-the-shelf | [why] |

### Axis B — deployment topology

**Chosen:** [Modular Monolith (default) / Microservices / specific component extracted]

"You must be this tall" gates (required for microservices):
- Multiple independent teams needing independent deploy: [yes/no]
- CD / monitoring / DevOps maturity in place: [yes/no]
- Bounded contexts well-understood already: [yes/no]

[If any "no" → Modular Monolith. If a specific component is extracted, record the Hard-Parts disintegrators that justified it — extraction *now* requires current (not projected) pressure plus the CD/ops gate; otherwise it's a promotion trigger below.]

**Tenancy (required when serving multiple customer orgs):** [single-tenant / shared schema + tenant-scoped RLS (default) / schema-per-tenant / DB-per-tenant] — [the contractual/regulatory isolation mandate that climbs above the default, or "none — default holds"]

### Module map

[Derived from DOMAIN-MODEL: modules = bounded contexts when mapped, else subdomain groupings. Polysemes resolved: each flagged term → one owning module per meaning, or "none flagged".]

| Module | Owns (responsibility + schema) | Talks to | Via |
|--------|--------------------------------|----------|-----|
| [module] | [responsibility; its schema/tables] | [modules / 3rd-party behind ACL] | [sync call / event — mechanism: in-process / job queue / outbox] |

[Pipeline-shaped modules: note the data shape (buffer/queue, backpressure, retention). Scheduled/recurring work: where it runs (cron / job queue / recompute-on-read).]

### Promotion triggers

The concrete, observable signals that would change a decision above — re-check at `/gsd:new-milestone`.

| Component / axis | Observable condition | Response when it fires |
|------------------|----------------------|------------------------|
| [component, rung, or Axis B] | [e.g., sustained ingest > N/s today; a second team forms; an isolation mandate lands in a contract] | [e.g., extract via Strangler Fig + ACL; raise the rung; climb to schema-per-tenant] |

### Baseline note

[State how this compares to the default baseline — "modular monolith + Domain Model in the complex core + Transaction Script elsewhere + ADRs + fitness functions" — and where/why it deviates.]

## Consequences

- **Positive:** [what this buys]
- **Negative / cost:** [the tax we accept]
- **Fitness functions to enforce the chosen boundaries:** [e.g., "no cross-module DB access," module dependency rules, "domain layer imports no framework"]

## Alternatives considered (and rejected)

| Alternative | Why rejected |
|-------------|--------------|
| [e.g., Microservices now] | [e.g., single team, contexts still being learned — fails the "tall enough" gates] |
| [e.g., Hexagonal everywhere] | [e.g., most subdomains are CRUD — one-impl ports would be over-engineering] |

## Over-/under-engineering check

For each non-floor rung chosen above, the **current, concrete requirement** that justifies it:
- [Rung] ← [the real adapter / scaling need / team / audit mandate that exists today]

[If no concrete requirement exists for a rung, drop to the floor. If a known requirement was ignored, raise the rung.]

---
*Architecture decision. Next: `/gsd:plan-phase`. Test strategy will follow this shape (rich core → more unit tests; CRUD edges → integration tests).*
