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

## Rewrite & salvage (when replacing, not extending)

`map-codebase` answers "what is this system, so I can extend it." A **rewrite** asks a different question — "what does the old system actually DO, what hidden behavior does it encode, what's worth keeping, what debt justified the rebuild" — owned by the **`legacy-inventory`** skill (run in rewrite/refactor/vibe-coded mode, before `new-project`). It produces `LEGACY-INVENTORY.md`: an exhaustive coverage matrix, a per-subsystem salvage disposition, and a three-way gap map. Even a genuine rewrite ships **incrementally** (subsystem by subsystem), never big-bang.

**Two rewrite modes:**
- **With a new design** (the design is the spec): three-way reconcile — *design (intended) × old-code (actually built) × requirements (planned)*. The design forces a **full FE rebuild**; old code is the **behavior oracle** + the BE-logic salvage source.
- **Without a new design** (pure structural refactor, same product): the old code **is** the spec → two-way (*old-behavior × new-structure*); characterization tests matter even more (preserve behavior exactly while improving structure), and you can usually salvage more.

**The exhaustive coverage matrix (forced, not judged).** Enumerate the old system's *entire* surface: every module, endpoint, DB table, background job, integration, role/permission, env/secret, CI/CD config, infra resource, seed/test data, admin tool, notification template, feature flag, shadow-IT process. The rule: **derive requirements from (design) ∪ (old-system behavior), then reconcile — never from the design alone** (designs routinely under-show already-built behavior). "Never lose a feature" is an enforced gate: every capability in the inventory is covered by a requirement or explicitly dropped with sign-off.

**Source-of-truth precedence (resolve conflicts by rule, not oscillation):** the canonical statement is `@~/.claude/gsd-core/references/exploration-and-adaptability.md` § Source precedence. The rows that bite here: the **old code is the authority on what was actually built and on hidden behavior** (it wins on "is this a real requirement?") — but **never on quality/structure** (the schema is reworked fresh from `DOMAIN-MODEL.md`, not reproduced); a **vibe-coded prototype is the authority on intent only — never pin its behavior as a parity oracle** (that preserves its bugs); the **locked design wins on observable shape/UX/scope**. State this up front so every conflict resolves without a you-decide interruption.

**The salvage decision card (port vs rewrite — per subsystem, assessed at that subsystem's phase, default Rebuild):**
```
[subsystem] code quality · coupling to the debt being rewritten · test coverage (confidence) ·
            mappability to the new architecture · FE-vs-BE (FE: always rewritten to the new design;
            BE logic: salvage-candidate, clean-or-rewrite)
   → Retire | Retain/Port | Refactor-and-salvage | Rebuild     (default Rebuild; low-churn-but-working → Retain)
```

**Characterization-test gate (the hard gate):** for any subsystem dispositioned *Refactor-and-salvage* or *Rebuild* whose behavior must be preserved, pin the OLD behavior with characterization tests **first**, then run that same suite against the new implementation as the parity oracle — no cutover until it passes (or each divergence is an explicitly approved, recorded behavior change). Not for *Retire* (don't pin dead code). This parity-oracle gate is for **legacy-debt** rewrite/refactor (preserve real behavior). **Vibe-coded-to-harden is different: it is authoritative on *intent*, not behavior — harden the intent to the production bar; do NOT pin the prototype's behavior as the oracle, which would carry its bugs forward.** A vibe-harden region is verified on intent-preserved + hardened-to-rung + floor + security/test DoD, not behavior-parity (see the build-loop contract below).

**Salvage = backend LOGIC adapted onto the new clean model — never the old schema/tables.** The new schema is designed fresh from `DOMAIN-MODEL.md`; old-table artifacts have no place in it. (When a **new design** is the source of truth, the schema's *observable* shape — the fields the design actually collects — follows the design per § Source precedence; DDD owns only the internal modeling of those fields, never the user-facing field set.)

**Reuse-existing-infra (rewrite the app, keep the platform):** when reusing the cloud project, secrets, DB, domains, follow the safe sequence — **expand the schema (additive, backward-compatible) → dual-write/backfill → verify → backup → cutover (blue-green/canary) → contract (deletive — mandatory; skipping it leaves you worse off)**. `infrastructure-strategy`/`cicd-strategy` ask "existing infra/secrets/data to reuse or migrate?" and own the backup-then-reset path.

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

## Planning & verifying brownfield changes (the build-loop contract)

The discipline above is enforced **in the build loop**, not only the strategy chain — the planner, executor, and verifier read this file when PROJECT.md `## Mode` is non-greenfield (Origin ≠ greenfield, or Code-quality = legacy/vibe-coded). This is the contract that keeps `LEGACY-INVENTORY.md`'s gates from dead-ending.

*A **change-region** is the unit a disposition applies to: the smallest cohesive slice a task actually edits — typically a module/file or a function cluster, scaled to the task, not the whole subsystem. (The salvage card is per-subsystem; the decision card is per-area; this build-loop contract is per change-region — the code a task touches.)*

**Planner — what the PLAN must contain** when a task changes behavior-bearing existing code:
- Record the **disposition per change-region** (Follow / Improve / Refactor, default Improve) from the matrix above.
- For any **Refactor or behavior-preserving** disposition, **emit a characterization-test task BEFORE the change task** (pin current behavior → change → re-run the same suite as the parity oracle); the change task depends on it. Use Sprout/Wrap when full coverage is too costly.
- **Consume `LEGACY-INVENTORY.md` when present:** at each subsystem's build phase, finalize that subsystem's salvage disposition (default Rebuild) and honor its characterization gate + the **"never lose a feature"** coverage — every inventoried capability maps to a task or an explicitly recorded drop.
- Sequence **incrementally** (subsystem by subsystem; never a big-bang cutover) and keep structural vs behavioral changes in **separate tasks** (two hats).

**Verifier — what to check** for rewrite/refactor + vibe-harden: characterization/parity evidence exists for every preserve/refactor disposition; **behavior drift without a recorded, approved change is a BLOCKER**; the LEGACY-INVENTORY coverage gate (no silently-lost feature) holds.

## Anti-patterns

- Imposing a from-scratch ideal architecture/test/infra strategy on an existing system (ignoring the grain).
- Refactoring a hotspot with no characterization tests (changing behavior blind).
- Big-bang rewrite; "we'll clean it all up" sweeping refactors mixed with feature work.
- Propagating an existing bad pattern into new modules in the name of "consistency."
- DDD-ing the whole legacy monolith instead of carving a bubble context.
- Blocking work on a global coverage target instead of a local safety net.

*Basis: Feathers (Working Effectively with Legacy Code — seams, characterization tests, Sprout/Wrap); Fowler (Strangler Fig, preparatory refactoring, "make the change easy"); Beck (two hats, Tidy First); Evans (bubble context, ACL; "don't DDD the monolith"); Tornhill (churn×complexity hotspots); the big-bang-rewrite-loses consensus. Full citations in the research corpus.*

## Consumes / produces

Consumed by the strategy chain (`model-domain`, `recommend-architecture`, `testing-strategy`, `infrastructure-strategy`, `cicd-strategy`) **and the build loop — `gsd-planner` (emits the characterization/disposition tasks), `gsd-executor` (honors the gate), `gsd-verifier` (enforces parity)** — when existing code is present (`## Mode` non-greenfield). Reads `map-codebase`'s `.planning/codebase/*.md` and `LEGACY-INVENTORY.md`. Pairs with `engineering-standards.md` (rule 3, "match what exists") and `recommend-architecture.md`'s evolution/strangler section.
