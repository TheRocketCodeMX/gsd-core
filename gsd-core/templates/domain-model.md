# Domain Model — [PROJECT_TITLE]

**Created:** [DATE] via `/gsd:model-domain`
**Scope:** Strategic DDD only (language + subdomains [+ contexts]). Architecture is decided in `/gsd:recommend-architecture`, which reads this file.

## Ubiquitous Language

The shared vocabulary. Use these terms consistently in code, docs, and conversation.

| Term | Definition | Used by | Aliases / not to be confused with |
|------|-----------|---------|-----------------------------------|
| [Term] | [What it means in THIS domain] | [team / end-users / both — for dev tools: maintainers vs developer-users] | [aliases, or the term it's often confused with] |

> Polysemes (one word, two meanings across areas) are flagged here — they usually mark a bounded-context boundary.

## Subdomains

Strategic classification — drives where to invest and (downstream) the architecture and test strategy.

| Subdomain | Type | Description | Rationale (why this type) | Complexity |
|-----------|------|-------------|---------------------------|------------|
| [Name] | Core / Supporting / Generic | [What it does] | [Why this type + fired complexity signals] | low / medium / high (derived) |

> Complexity is derived, not asked — rated against the 5-signal rubric (invariants, lifecycle/state, derivation/tradeoffs, temporal logic, policy variance); fired signals go in the rationale. Core+low is a contradiction.

**Core** — differentiating *and* complex; build in-house, invest:
- [Subdomain] — [why it's the competitive edge]

**Supporting** — necessary, not differentiating; build simply or buy-and-extend:
- [Subdomain] — [why]

**Generic** — commodity; buy / off-the-shelf / library:
- [Subdomain] — [why]

**Instrument — venture-critical (own context; only when one exists)** — positional value (standard/benchmark/ecosystem), not product differentiation; core-grade rigor ≠ core:
- [Subdomain] — [its own destiny, e.g. "community standard — planned neutrality"]

> Misclassification check applied: each Generic/CRUD area was probed for future business rules. Areas expected to accumulate invariants are marked emerging-core/supporting, not generic.

## Bounded Contexts

[Filled when event storming was run; otherwise: "Deferred — single context assumed; planning will refine if boundaries emerge." Exception: a flagged polyseme or third-party/legacy upstream gets its candidate contexts and seam (default ACL) recorded here, marked "candidate — refine in planning" — never "single context assumed" beside a flagged boundary.]

| Context | Owns (responsibility) | Key domain events | Talks to | Language boundary |
|---------|----------------------|-------------------|----------|-------------------|
| [Name] | [What it's responsible for] | [Events] | [Other contexts] | [Where its terms differ] |

**Context map (relationships — only with ≥2 contexts):** name each boundary's relationship (Shared Kernel / Customer-Supplier / Conformist / ACL / Open Host Service / Published Language / Separate Ways). Default to an ACL against a messy/legacy/3rd-party upstream. Relationship only — no translator design.

| From | Relationship | To | Note |
|------|-------------|----|------|
| [Context A] | [ACL / OHS / Shared Kernel / …] | [Context B] | [why this relationship] |

```
[Optional ASCII sketch of the context map]
```

## Notes for downstream phases

- **Architecture (`recommend-architecture`):** [one line — e.g., "Core 'matching' is high-complexity → expect a richer domain model; the rest is CRUD."]
- **Open questions / deferred boundaries:** [anything left unresolved]

---
*Strategic domain model. Next: `/gsd:recommend-architecture` (uses subdomain complexity) → `/gsd:plan-phase`.*
