# Brownfield Adaptation — Working an Existing Codebase

How GSD adapts when there is **already a codebase** (or existing infra/pipeline/tests), not a clean greenfield. The strategy chain and scout were greenfield-first by default; this reference is the brownfield half. Pairs with `engineering-standards.md` (the invariant bar), `recommend-architecture.md` (the evolution/strangler content), and the `map-codebase` outputs (`.planning/codebase/*.md`) it consumes.

## The principle

**Assess what exists, then recommend an *evolution path* — never "design the ideal from scratch" and impose it.** Greenfield defines; brownfield reconciles. The strategy skills, in brownfield mode, read the existing reality first (the `map-codebase` maps + the code) and produce a *current-state → target → migration* recommendation, not a blank-slate decision.

## Follow vs. improve vs. refactor (the decision matrix)

Three options, one matrix keyed by: **blast radius · reversibility · test-coverage-present · churn × centrality · am-I-already-editing-this.**

- **IMPROVE incrementally — the default.** Bring the code you touch up to the standard, scoped to the change. Most work lives here.
- **REFACTOR — reserved.** Only for **hotspots** (high churn × complexity, where the entrenchment tax compounds), and **only after characterization tests pin current behavior**. Gate it behind those tests; never refactor blind.
- **FOLLOW the existing pattern, even if poor — a deliberate, time-boxed tactic, never a silent default.** Choose it when blast radius is large, there is no coverage, the code is cold (rarely changes), or no target standard is agreed. Stay **locally consistent** — matching the surrounding code beats a lone island of "correct" — but do **not** propagate the bad pattern into *new* modules.

**The consistency rule:** make the target standard explicit *first*; **all new code follows the target**; only **old** patterns you actually touch get refactored; prefer **codemods** to convert at scale. "Be consistent with bad code" is *local* advice for the change region — not a mandate to spread it.

## The safe-change sequence (Feathers)

Before changing legacy code: **change point → find a seam → break the dependency at the seam → write characterization tests (pin the *current* behavior, bugs included) → then change.** Where full coverage is too costly, keep new code clean with **Sprout** (write the new logic in a fresh tested unit, call it from the legacy code) or **Wrap** (wrap the legacy call to add behavior around it).

**Where to start testing:** the highest **churn × risk** hotspots from git history — you need a *local* safety net around the change region, not global coverage. Do not block work on a coverage percentage.

## Architecture & domain on legacy

- **Do not "DDD the monolith"** (Evans: it almost always disappoints). Carve a **bubble context** around the core subdomain, defend it with an **Anti-Corruption Layer**, and grow it via **Strangler Fig** — new behavior to the clean core, old paths kept serving until strangled.
- **Incremental always beats big-bang rewrite** (rewrites lose near-universally). The real axis is big-bang vs incremental, not rewrite vs not. Even the genuine rewrite case (a whole technology generation is obsolete) is done as **incremental subsystem replacement**, never a stop-the-world rewrite.
- **Reverse-engineer, don't re-invent:** in brownfield, `model-domain` extracts the ubiquitous language and subdomains *from the existing code + docs* (names, modules, call paths) and reconciles them with the user's vision, flagging mismatches — it does not interview from a blank slate.

## Keeping improvement bounded

- **Two hats (Beck):** never mix a structural change and a behavioral change in one diff — separate commits.
- **Preparatory refactoring:** refactor only enough to make the change easy ("make the change easy, then make the easy change"), not the whole neighborhood.
- **Note bigger problems and return** — record the larger refactor as a candidate (a roadmap/backlog item), don't chase it now. Unbounded improvement is scope creep.

## The decision card (how to surface it — never impose)

When the assessment finds a gap between current code and the standard/strategy, present a **decision card** and let the human choose:

```
[area] current: <what the code does today>
       target:  <the standard / strategy recommendation>
       gap cost: <blast radius · churn/centrality · reversibility>
       options:  ▸ Follow (match existing, time-boxed)   ▸ Improve (default, scoped to what we touch)   ▸ Refactor (gated on characterization tests)
```

**Default-select Improve.** Gate Refactor behind characterization tests. Record the choice. The framework recommends and surfaces cost; the user owns the appetite for change.

## Anti-patterns

- Imposing a from-scratch ideal architecture/test/infra strategy on an existing system (ignoring the grain).
- Refactoring a hotspot with no characterization tests (changing behavior blind).
- Big-bang rewrite; "we'll clean it all up" sweeping refactors mixed with feature work.
- Propagating an existing bad pattern into new modules in the name of "consistency."
- DDD-ing the whole legacy monolith instead of carving a bubble context.
- Blocking work on a global coverage target instead of a local safety net.

*Basis: Feathers (Working Effectively with Legacy Code — seams, characterization tests, Sprout/Wrap); Fowler (Strangler Fig, preparatory refactoring, "make the change easy"); Beck (two hats, Tidy First); Evans (bubble context, ACL; "don't DDD the monolith"); Tornhill (churn×complexity hotspots); the big-bang-rewrite-loses consensus. Full citations in the research corpus.*

## Consumes / produces

Consumed by the strategy chain (`model-domain`, `recommend-architecture`, `testing-strategy`, `infrastructure-strategy`, `cicd-strategy`) and the executor **when existing code is present**; reads `map-codebase`'s `.planning/codebase/*.md`. Pairs with `engineering-standards.md` (rule 3, "match what exists") and `recommend-architecture.md`'s evolution/strangler section.
