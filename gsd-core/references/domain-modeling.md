# Domain Modeling — Lightweight DDD for Greenfield

Reference for the `/gsd:model-domain` workflow. This skill does **strategic** Domain-Driven Design only: shared language + subdomain distillation (+ optional bounded contexts). It deliberately does **not** prescribe architecture — that is `/gsd:recommend-architecture`'s job, which consumes this model.

## Core principle: separate strategic from tactical DDD

DDD splits into two halves that are **not equally worth it**:

- **Strategic DDD** — ubiquitous language, subdomain distillation (core/supporting/generic), bounded contexts. **Cheap and broadly valuable**, even for simple apps. This is what `model-domain` captures.
- **Tactical DDD** — aggregates, value objects, domain events, rich domain model, hexagonal layering. **Conditional**: only worth it inside a core domain that is genuinely complex. Deciding this belongs to `recommend-architecture`, not here.

> The most common real-world failure is "tactical patterns without strategy" (DDD-Lite): copying aggregates/repositories everywhere while skipping the language and distillation work that actually creates value. `model-domain` exists to do the strategic half well so tactical effort later lands only where it pays.

## 1. Ubiquitous language

A shared glossary the whole team (business, product, engineering) uses consistently. Misaligned vocabulary is a compounding source of rework.

**How to elicit:**
- Listen for repeated nouns/verbs in PROJECT.md and REQUIREMENTS.md; reflect them back.
- Ask "What would you *call* this?" — capture the team's word, not the textbook word.
- Surface conflicts: "When you say *X*, do you mean A or B?" Polysemes (one word, two meanings) are a signal of a bounded-context boundary.
- Iterate to ~8–15 core terms, each with a one-line definition + usage context.

Ubiquitous language is cheap enough to keep even in simple apps. The *modeling depth* beyond it should scale with whether the app actually has domain logic.

## 2. Subdomain distillation (the pivotal step)

Classify each area of the system. This is the single highest-leverage output — it tells you where to invest.

| Type | Definition | What to do | Examples |
|---|---|---|---|
| **Core** | Differentiating **and** complex enough to be worth owning. Your competitive advantage. | Build in-house, best people, invest. Candidate for tactical DDD later. | Search ranking (a search engine), fraud detection (a payments product), matching (a marketplace) |
| **Supporting** | Necessary, not differentiating. Tightly coupled to the core. | "Good enough," build simply or buy-and-extend. | Onboarding flows, internal admin, notifications |
| **Generic** | Commodity every business needs; no edge. | Buy / off-the-shelf / library. | Auth, billing, email, logging, tax calculation |

### Three nuances that prevent misclassification

1. **Core = differentiating AND complex — not just complex (and not merely *critical* or *regulated*).** A complex-, critical-, or regulated-but-*generic* subdomain (tax, identity/auth, encryption, compliance) is a **buy**, not a build. Difficulty, security-criticality, and regulatory burden do not make something core — only competitive differentiation does. Don't invest core-grade effort there.
2. **Generic ≠ low quality.** "Generic" means *not differentiating*, not *low effort*. A battle-tested auth library is high-quality and generic.
3. **Watch for CRUD that will grow business rules.** The dangerous case is an app that "starts as a UI over the database, then evolves into real domain logic." Before classifying something Generic/CRUD, probe future features: *will this accumulate invariants and rules?* If yes, treat it as (emerging) core/supporting, not generic.

### Anti-sprawl rule

Start with **one** core domain and **one** bounded context. Additional contexts reveal themselves if they exist. Don't hunt for subdomains for the sake of it.

## 3. Bounded contexts (optional — via lightweight event storming)

Only when the domain is non-trivial. A **Big-Picture event storming** pass surfaces candidate context boundaries cheaply:

1. List the major **domain events** ("Order Placed", "Payment Captured", "Shipment Dispatched") on a timeline.
2. For each: *who triggers it? who reacts? what decision follows?*
3. Group events by actor/responsibility → each cluster is a candidate **bounded context**.

Boundaries often fall where the **language changes** (the same word means different things) or where the **rate of change** differs. If boundaries are unclear, **defer** them — say so explicitly and let planning refine them.

A **Process-level** pass is the optional middle gear between Big-Picture and Design-level storming: take one important event flow (e.g., "Order → Payment → Fulfillment") and walk its commands, policies ("whenever X, then Y"), and read-models. It sharpens *one* boundary and its hand-offs without dropping to aggregates. Use it only when a single flow's boundary is genuinely contested; otherwise stay Big-Picture. Do **not** run design-level (aggregate-level) event storming here — that is tactical and belongs to a core subdomain you've already identified.

## 4. Context mapping (only when there are ≥2 bounded contexts)

Once two contexts exist, name the **relationship** at each boundary — it dictates integration and team coupling downstream. The vocabulary (pick the one that fits; don't apply all):

| Pattern | When it applies |
|---|---|
| **Shared Kernel** | two contexts share a small agreed model; changes need both teams' consent (high coupling — keep tiny) |
| **Customer/Supplier** | downstream's needs are honored in the upstream's roadmap (upstream agrees to flex) |
| **Conformist** | downstream just accepts the upstream model as-is (no leverage to negotiate) |
| **Anticorruption Layer (ACL)** | downstream translates the upstream model at the seam to protect its own — the safe default against a messy/legacy/3rd-party upstream |
| **Open Host Service (OHS)** | upstream publishes a well-defined protocol many consumers use |
| **Published Language** | a shared, well-documented interchange format (e.g. a schema/spec) the integration speaks |
| **Separate Ways** | the cheapest answer — don't integrate at all; duplicate the little that's needed |

Capture each as `Context A —[relationship]→ Context B`. The **ACL** here is the same tool architecture uses when later extracting a service — naming it now tells planning where a translation seam belongs. Strategic only: name the relationship, don't design the translator.

## What this skill does NOT do

- **No architecture prescription.** Whether the project needs hexagonal, CQRS, a modular monolith, etc. is decided by `/gsd:recommend-architecture`, which reads `DOMAIN-MODEL.md`. Keep this artifact about the *problem*, not the *solution*.
- **No tactical modeling.** No aggregates, no class design. Strategic only.

## Handoff (why this artifact matters downstream)

`DOMAIN-MODEL.md` is the single complexity assessment that parameterizes the rest of the project:

- → **`recommend-architecture`**: subdomain complexity drives the domain-logic axis (Transaction Script ↔ Domain Model ↔ Hexagonal). Core+complex ⇒ richer; supporting/generic ⇒ simple.
- → **`testing-strategy`**: where the behavior lives drives test shape — a rich core wants more unit tests; CRUD-over-DB edges want integration tests.

**Anemic vs rich is an architecture decision, deferred — but flag it.** Whether the core's logic lives *in* the domain objects (rich) or in services over data-bags (anemic) is decided by `recommend-architecture`, not here. But if distillation found a genuinely complex, differentiating core, note it for downstream: a thin/anemic model over that core is the classic under-engineering tell. Just flag the expectation ("core 'X' is rich → expect a Domain Model, not a service-over-DTOs"); don't design the aggregates.

## When to run / when to skip

**Run** after `/gsd:new-project`, before planning, when: the domain has real business rules, multiple stakeholder vocabularies, distinct business areas, or a genuine competitive core.

**Skip / keep minimal** for: a truly simple CRUD app over a stable, obvious domain; a throwaway prototype (formalize after the MVP validates direction). Even then, capturing the ubiquitous language is cheap and usually worth it.

## Anti-patterns

- **Tactical without strategy (DDD-Lite):** aggregates everywhere, no distillation. The thing this skill prevents.
- **Subdomain sprawl:** inventing contexts that don't exist. Start with one.
- **Treating language as optional:** inconsistent terms → compounding ambiguity.
- **Confusing complex with core:** a hard-but-commodity area is a buy, not your advantage.
- **Prescribing architecture here:** keep it about the domain; hand the decision to `recommend-architecture`.
