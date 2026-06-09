# Architecture Decision — Two-Axis, Complexity-Matched

Reference for `/gsd:recommend-architecture`. Recommends an architecture that **matches complexity** — explicitly avoiding both over- and under-engineering. Consumes `DOMAIN-MODEL.md` (subdomain complexity). Recommends; the user decides.

## Core principle: two INDEPENDENT axes

Keep these separate — conflating them is the #1 architecture error.

- **Axis A — domain-logic organization:** Transaction Script → Domain Model → (Hexagonal/Clean wrapper) → CQRS → Event Sourcing. Driven by **domain complexity** (decide *per subdomain*, using DOMAIN-MODEL).
- **Axis B — deployment topology:** Modular Monolith → Microservices. Driven by **team structure + NFRs + ops maturity** — *not* by complexity.

The common sweet spot is a **Domain Model inside a modular monolith**. High scale does not imply a Domain Model; rich domain logic does not imply microservices.

## Axis A — domain logic (decide per subdomain)

Use the core subdomain's complexity from DOMAIN-MODEL. Apply per subdomain: the complex core may warrant a Domain Model (± Hexagonal); supporting/generic subdomains stay Transaction Script.

| Rung | Move up when | Over-engineering tell |
|------|--------------|-----------------------|
| **Transaction Script / simple layered CRUD** (floor) | "validate → persist → return"; few rules; supporting/generic subdomains | — |
| **Domain Model** | business rules multiply and tangle; the same invariant is duplicated across scripts; rich conditional behavior; long-lived core | rich aggregates wrapping what is really CRUD; anemic getter-bag "domain" objects |
| **Hexagonal / Clean wrapper** (orthogonal — wraps either above) | real domain logic worth isolating; multiple/swappable adapters (DB, queue, 3rd-party APIs); high testability need; long lifespan | ports/interfaces with exactly one forever-implementation; DTO-mapping boilerplate around a CRUD endpoint |
| **CQRS** | read and write models genuinely diverge; reads ≫ writes; write model under strain | separate read/write stacks where one model serves both fine |
| **Event Sourcing** | audit/temporal history is a hard requirement (finance, compliance, "reconstruct past state") | ES on a simple entity with no audit/temporal need |

## Axis B — deployment topology

- **Modular Monolith — the DEFAULT for greenfield.** One team; domain still being learned; few moving parts; fast to change. This is the recommended floor. Enforce internal module boundaries (separate schemas, dependency rules).
- **Microservices — only when ALL "you must be this tall" gates pass:**
  1. **Multiple independent teams** needing independent deploy cadence (Conway / Team Topologies).
  2. **CD / monitoring / DevOps maturity** already in place.
  3. **Bounded contexts well-understood** already (not still being discovered).
  If **any** is "no" → recommend **modular monolith and stop**, regardless of complexity. (The "microservice premium": below a complexity+org threshold the distributed tax is pure loss.)
- **Component-level split (Hard Parts):** for a specific component, score the **6 disintegrators** (low cohesion · divergent volatility · divergent scalability · fault isolation · differential security · independent extensibility) against the **4 integrators** (ACID across the data · tightly-coupled workflow · heavy shared code · tight data relationships). Net disintegrators ≫ integrators → candidate extraction; otherwise keep it in the monolith.
- **Distributed monolith** (services that can't deploy independently) is the failure mode — you pay the premium and get none of the autonomy. Avoid.

## Non-functional drivers (quick matrix)

| Driver | Low → | High → pushes toward |
|---|---|---|
| Domain complexity | Transaction Script | Domain Model (+ Hexagonal) |
| Read/write asymmetry | single model | CQRS |
| Audit / temporal requirement | normal persistence | Event Sourcing |
| Scale (uniform) | monolith + replicas | still monolith — scale ≠ microservices |
| Scale (divergent per component) | modular monolith | extract that component (disintegrator) |
| Availability / fault isolation | monolith | isolate failure-prone component |
| Differential security | one trust boundary | separate the stricter-security component |
| Integration count (adapters) | direct calls | Hexagonal ports & adapters |
| Expected lifespan | short → keep simple (sacrificial) | long → Domain Model + Hexagonal + fitness functions |
| Team count / ops maturity | 1 team / low → monolith | many independent teams / high → microservices viable |

## Over- AND under-engineering

**Over-engineering tells:** one-implementation ports; rich aggregates over structural CRUD; CQRS/ES with no asymmetry or audit need; "microservice envy"; distributed monolith; elaborate config/abstraction "wanting all options all the time."

**Under-engineering tells:** the same invariant duplicated across many transaction scripts; a big-ball-of-mud monolith with no enforced module boundaries; a complex/regulated domain modeled as thin CRUD; no audit trail where compliance needs it; no ADRs / no fitness functions.

**The meta-tell (use this to settle every rung):** if you cannot point to a **current, concrete** requirement — a real second adapter, a real divergent-scaling component, a real second team, a real audit mandate — that justifies a rung, you are **over-engineering**. If such a requirement exists and you ignored it, you are **under-engineering**.

## Default baseline (when in doubt)

**Modular monolith + Domain Model only in the complex core bounded contexts + Transaction Script in the simple/CRUD ones + ADRs + boundary fitness functions.** This is the modern consensus starting point.

## Always

- Record the decision as an **ADR** — capture the *why*, the trade-offs, and the alternatives rejected (*why* matters more than *how*).
- Recommend **fitness functions** to enforce the chosen boundaries (e.g., "no cross-module DB access," module dependency rules) so a modular monolith doesn't rot.
- Frame as a **sacrificial architecture** where appropriate (a monolith you may later split is fine if it gets you to market and teaches the boundaries).
- **Recommend, don't dictate.** Present the trade-offs and your recommended option with rationale; the user has context you lack — let them choose.

## Consumes / produces

- **Consumes** `DOMAIN-MODEL.md` (core/supporting/generic + complexity) → Axis A per subdomain. If absent, ask the complexity questions directly (and suggest running `/gsd:model-domain` first).
- **Produces** `.planning/adr/NNNN-architecture.md` (the decision) + an architectural-decisions table. Feeds `testing-strategy` (test shape follows architecture) and `plan-phase`.
