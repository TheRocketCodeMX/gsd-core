# GSD Fork — Methodology & Design Spec

- **Date:** 2026-06-08
- **Status:** Draft for review
- **Owner:** brice@pivoty.ai
- **Base:** `TheRocketCodeMX/gsd-core` @ `v1.4.0` (MIT)
- **Scope:** Fork strategy + two methodology pillars (greenfield discovery, testing) + a six-skill build plan.

This is the source-of-truth design document. It captures *what* we are building and *why*, grounded in (a) analysis of the live `gsd-core` codebase and (b) cited research into current expert consensus. It decomposes into per-skill build cycles (each its own spec → plan → implementation).

---

## 0. Executive summary

We fork `gsd-core` — the clean, MIT-licensed, actively-maintained community continuation of GSD — and add two capabilities it lacks: a **greenfield discovery methodology** (product → domain → architecture) and a **testing methodology** (strategy + web-app test infrastructure). The unifying idea: **one complexity assessment, made during discovery, parameterizes both the recommended architecture and the test strategy** — a single thread from "what are we building" through "how do we test it" that no existing framework (GSD, superpowers, gstack) provides.

We **keep** gsd-core's execution engine, security suite, and existing test rigor (mutation testing, property tests, typed-surface mandate). We **add** six skills. We **rebrand** the package scope.

---

## 1. Fork strategy

### 1.1 Base selection (and a corrected premise)

The original assumption — "the GSD maintainer went rogue and injected malicious code" — is only partly true, and the correction matters:

- The `$GSD` crypto badge was added by the **original creator himself** (Lex Christopherson / "TÂCHES"), in an honestly-labeled docs commit — not a trojanized PR, and not by the contributor first suspected.
- The creator then went silent (~April 2026) and the `$GSD` Solana token was linked to a **rug-pull**. The *token* was the scam; the *software* was never backdoored.
- The community forked cleanly to **`TheRocketCodeMX/gsd-core`** (MIT, ~3.2k stars, `v1.4.0` shipped 2026-06-08, led by Tom Boucher). It scrubbed the crypto branding and **added its own anti-supply-chain security suite**. A fresh-clone scan came back clean (no wallets, no `eval`, no install hooks; runtime deps are just `@anthropic-ai/claude-agent-sdk` + `ws`).

**Decision:** Fork `TheRocketCodeMX/gsd-core` pinned at the `v1.4.0` tag. The "de-malware" workstream is effectively done by the community; we inherit a clean base.

> Residual uncertainty (stated, not guessed): the exact root cause of the rug-pull is unconfirmed by the maintainers themselves. This does not affect the software's safety but is worth noting for due diligence.

### 1.2 Keep / rebrand / add

- **Keep wholesale:** execution engine (new-project → roadmap → phase → discuss → plan → execute → verify), the `test:security` suite, `TESTING-STANDARDS.md` rigor (Stryker mutation ≥80%, `fast-check` property tests, typed-surface mandate, 12-case QA matrix), skill-authoring conventions, subagent patterns, config system, text-mode fallback.
- **Rebrand:** npm scope (`@opengsd/*` → our own private scope), package name, any "GSD"/"Open GSD" user-facing branding to avoid implying affiliation. Retain the MIT LICENSE/copyright notice as required.
- **Add:** the six skills in §3–§4.

### 1.3 Repo setup (WS0)

- Fork/clone `gsd-core@v1.4.0` into the project root (currently only `_reference/` exists; the project root is not yet a git repo).
- Initialize git, rename scope/branding, wire `test:security` into our CI, set `private: true` (or scope to an internal registry).
- Establish an upstream-tracking strategy so we can cherry-pick gsd-core improvements without re-merging branding.

---

## 2. Skill-authoring conventions (match gsd-core exactly)

Every new skill ships as:

1. **Command file** — `commands/gsd/<name>.md`, light wrapper. Frontmatter:
   ```yaml
   ---
   name: gsd:<name>
   description: "User-facing one-liner"
   argument-hint: "<arg> [opt]"
   allowed-tools: [Read, Write, Edit, Bash, Agent, ...]
   requires: [config, phase, ...]
   ---
   ```
   Body: `<objective>`, `<execution_context>` (points at the workflow via `@~/.claude/gsd-core/workflows/<name>.md`), `<context>` (files to read), `<process>`.
2. **Workflow file** — `gsd-core/workflows/<name>.md`, the full logic: `<purpose>`, `<available_agent_types>`, numbered `<step>` blocks with embedded bash, approval gates, `AskUserQuestion` loops, and **text-mode fallback** (numbered lists when `AskUserQuestion` is unavailable).
3. **Reference docs** — `gsd-core/references/<topic>.md`, injected at runtime (e.g. `jtbd-discovery.md`, `architecture-patterns.md`, `test-isolation-patterns.md`).
4. **Templates** — `gsd-core/templates/<artifact>.md` for new persistent `.planning/` artifacts.
5. **Config flags** — new keys read via `gsd_run query config-get <key>` (e.g. `discovery.enabled`, `architecture.advisor`, `testing.shape_default`).
6. **Artifacts** — persisted to `.planning/` and committed via the existing `gsd_run query commit` mechanism so downstream phases inherit them across `/clear`.

Discipline-enforcing skills (TDD) additionally adopt superpowers' authoring style: a rationalization table, a red-flags list, and "close every loophole explicitly" phrasing, pressure-tested against a subagent before shipping.

---

## 3. Pillar 1 — Greenfield discovery methodology

### 3.1 Research-grounded principles

1. **Separate strategic from tactical DDD.** Ubiquitous language + subdomain distillation (core/supporting/generic) is cheap and broadly worth it; tactical DDD (aggregates, rich model, hexagonal) is reserved for a core that is **complex *and* competitively differentiating**. A complex-but-generic subdomain (tax, auth) is a *buy*, not a build. *(Sources: Thoughtworks DDD-in-10-min; Hickey "Stop Pretending to do DDD"; Fowler AnemicDomainModel; Vernon.)*
2. **Detect misclassification.** The real risk is an app that "starts as CRUD and evolves into business rules." Always probe future evolution before recommending CRUD-only. *(Sapiens Works CRUD-vs-DDD.)*
3. **Architecture is two independent axes.** **Axis A (domain logic):** Transaction Script → Domain Model → Hexagonal/Clean wrapper → CQRS → Event Sourcing — driven by *domain complexity*. **Axis B (topology):** Modular Monolith → Microservices — driven by *team structure + NFRs + ops maturity*. Conflating them is the #1 error. Microservices gate on "you must be this tall" (multiple independent teams + CD maturity), **not** complexity alone. *(Fowler MonolithFirst/MicroservicePremium; Newman; Simon Brown modular monoliths; Richards/Ford "Hard Parts"; Team Topologies.)*
4. **Default baseline:** modular monolith + Domain Model only in the complex bounded contexts + Transaction Script in the simple ones + ADRs + boundary fitness functions.
5. **Product discovery = demand over interest.** Ask about past behavior, never hypotheticals; find the narrowest valuable wedge; frame the vision as an **outcome/opportunity**, not a solution, so architecture stays unconstrained. Use Cagan's four risks (value/usability/feasibility/viability) as a coverage checklist. *(Torres Opportunity Solution Trees; YC interview canon; Cagan/SVPG four risks; Ulwick ODI; Intercom Job Stories; Perri "Escaping the Build Trap".)*
6. **Event Storming + Story Mapping bridge product → domain → architecture** — and per Patton it's collaborative co-work, not a serial handoff.

### 3.2 `discover-product` — *(gsd-core: PARTIAL → extend)* — **optional**

**Why optional:** when a client states clear, evidenced requirements, skip to lightweight prioritization (Impact/Effort or RICE). Run the full loop when value is uncertain (new market, no past-behavior evidence, stakeholder asserting demand from a hypothetical, or a large/irreversible bet).

**Extends:** gsd-core `new-project` questioning (`references/questioning.md`), `PROJECT.md` / `REQUIREMENTS.md` templates.

**Adds:** a distilled, ordered discovery question set (each question tagged to its framework), `gstack`-style "forcing" pressure (push 2–3 times past the first polished answer), demand-vs-interest separation, the four-risks coverage check, and **outcome-framed** success metrics.

**Output artifact:** `.planning/DISCOVERY.md` — outcome statement, target user + wedge, demand evidence, job story, four-risks status, prioritized scope, explicit "not in scope." Feeds `PROJECT.md` as new sections (JTBD, persona, outcome metrics) and flows into `model-domain`.

**Distilled question set (the deliverable, abridged):**
- *Frame:* what customer behavior/metric do we want to change (not what feature to ship)?
- *Job & user:* who specifically, for whom is it most acute/frequent/expensive? State the job solution-free.
- *Demand vs interest:* tell me about the last time you hit this; what are you doing about it today; what does that cost you; what real evidence (pre-pay, LOI, pilot) exists?
- *Wedge:* narrowest version that fully solves one opportunity for one user; can we imagine >1 solution? (if no, we smuggled in a solution).
- *Four risks:* unresolved value/usability/feasibility/viability; cheapest assumption test before building.
- *Scope:* end-to-end journey, thin first slice; RICE only on the candidate list; table-stakes/dependency overrides.

### 3.3 `model-domain` — *(gsd-core: ABSENT → new)*

**Always run (lightweight); scale depth to complexity.**

- **Always:** capture **ubiquitous language** (a domain glossary) and a **subdomain distillation** — classify each subdomain as **core / supporting / generic**. This alone directs effort and feeds the architecture advisor.
- **When complex:** optional **Big-Picture Event Storming** (domain events → commands → actors) to surface candidate **bounded contexts**; **Design-level Event Storming** only on subdomains already classified core/complex, to surface aggregates.
- **Guardrail:** "start with one core domain and one bounded context; more reveal themselves if they exist." Avoid subdomain sprawl.

**Output artifact:** `.planning/DOMAIN-MODEL.md` — ubiquitous-language glossary, subdomain map with core/supporting/generic tags, bounded contexts (if any), key domain events. May spawn a `gsd-domain-modeler` subagent for heavy event-storming.

### 3.4 `recommend-architecture` — *(gsd-core: PARTIAL → extend)*

**Extends:** gsd-core's MVP-only `SKELETON.md` (5-row tech table) and generic Key-Decisions table — generalized to all greenfield projects and all phases, plus a real ADR mechanism.

**Logic — the two-axis decision (encodable):**
- **Block 1 — domain complexity (Axis A):** validate→persist→return vs rich invariants/state machines? how many rules beyond the DB? reads structurally diverge from writes (→ CQRS)? audit/temporal requirement (→ Event Sourcing)?
- **Block 2 — infra coupling & lifespan (Hexagonal wrapper):** swappable/multiple adapters? multiple delivery mechanisms? lifespan > ~3y + high test-isolation need?
- **Block 3 — topology (Axis B) — Hard-Parts disintegrators vs integrators:** per component, score the 6 disintegrators (low cohesion, divergent volatility, divergent scaling, fault isolation, differential security, independent extensibility) against the 4 integrators (ACID across data, tight workflow, shared code, tight data relationships).
- **Block 4 — "you must be this tall" gates (ALL required for microservices):** multiple independent teams needing independent deploy cadence? CD/monitoring/DevOps maturity? bounded contexts well-understood *yet*? If any "no" → **recommend modular monolith and stop**, regardless of complexity.
- **Block 5 — always:** emit an **ADR** (capture the *why* and trade-offs), recommend **fitness functions** to enforce chosen boundaries, frame as **sacrificial architecture** where apt.

**Over/under-engineering guardrails (explicit output):**
- *Over:* ports/interfaces with one forever-only implementation; rich aggregates over structural CRUD; CQRS/ES with no read/write asymmetry or audit need; "microservice envy"; distributed monolith.
- *Under:* same invariant duplicated across transaction scripts; big-ball-of-mud monolith with no enforced boundaries; complex/regulated domain modeled as thin CRUD; no audit trail where compliance needs it; no ADRs/fitness functions.
- *Meta-tell:* if you can't point to a **current, concrete** requirement justifying a rung, you're over-engineering; if such a requirement exists and you ignored it, you're under-engineering.

**Output artifact:** `.planning/adr/NNNN-*.md` (Decision | Context | Options considered | Choice | Rationale | Consequences) + a generalized `SKELETON.md` carrying the chosen Axis-A/Axis-B position forward to every phase.

---

## 4. Pillar 2 — Testing methodology

### 4.1 Research-grounded principles

1. **Behavior over implementation — strongest consensus in the entire research.** Test through public APIs/observable behavior so tests survive refactoring; a test changes only when behavior changes. **Default to sociable tests; mock only at architectural boundaries (ports/external systems).** *(Fowler UnitTest/test-shapes; Beck Canon TDD; Cooper "TDD where did it go wrong"; Google SWE book; Dodds.)*
2. **Test each behavior once, at the cheapest level that gives confidence.** Push tests down; drop the higher-level test once lower levels cover the condition. Avoid ice-cream-cone and hourglass anti-patterns. *(Vocke Practical Test Pyramid; Google.)*
3. **Coverage is a floor, not a target; mutation testing checks assertion quality.** gsd-core **already runs Stryker at ≥80%** — we lean on it, and reserve mutation runs for critical modules (it's expensive). *(Google; optivem coverage-vs-mutation.)*
4. **Shape follows architecture — framed correctly.** Not "pick the diamond for CRUD," but *"architecture determines where the testable behavior lives → the shape emerges."* Rich pure-logic core → more unit (small) tests; CRUD-over-DB/APIs → integration-heavy (medium) tests. Map onto Google's **size axis** (small=in-process/no-I/O, medium=localhost, large=multi-machine) rather than arguing labels. *(Fowler test-shapes; hexagonal testing strategy; Google.)*
5. **Unit-test the gnarly bits:** money (integer minor units / exact decimal, **never float**), complex conditionals/state machines, parsers, algorithms, pure functions. *(Google; Modern Treasury on float-for-money.)*
6. **TDD, honestly:** the quality benefit is real but the evidence favors **small, uniform increments** over *test-first specifically* (a controlled study found test-first vs test-after didn't matter). **Mandate:** behavior-level tests + small increments + a regression floor. **Knob:** test-first vs test-after. *(Nagappan et al.; Fucci et al.; Rafique & Mišić.)* This keeps superpowers' RED-GREEN rigor but aims it at behavior, not ritual.
7. **Persistent vs transient E2E is a real practice:** a small **smoke / critical-user-journey** suite (auth, payment, core nav) lives permanently in CI (<5 min); **ephemeral** per-PR environments validate fresh work and are torn down. Keep the permanent E2E set small (50–200 well-chosen tests). *(Ranger E2E-in-CI guide; Google.)*

### 4.2 `testing-strategy` — *(gsd-core: PARTIAL → extend, don't replace)*

Builds **on** `TESTING-STANDARDS.md`. Adds the missing *strategic* layer: given the architecture decision from §3.4, it recommends the test shape (size distribution), what to test / what **not** to test, the "test-once-at-cheapest-level" rule, sociable-by-default + mock-only-at-ports, and where to apply mutation testing. Output: a `.planning/TEST-STRATEGY.md` for the project/phase that the executor and `add-tests` consume.

### 4.3 Behavior-first TDD as the default — *(upgrade existing)*

Upgrade gsd-core's opt-in `tdd_mode` and `add-tests` TDD/E2E/Skip classification to a **behavior-first default**: write behavior-level tests in small uniform increments with a real RED step, sociable by default. Preserve superpowers-style enforcement (rationalization table, red flags, verification-before-completion evidence) but explicitly target behavior, and expose test-first-vs-after as a config knob. Reuse gsd-core's `execute-plan` RED-GREEN-REFACTOR machinery and `verify-work` UAT flow.

### 4.4 Test-infrastructure how-to skills — *(gsd-core: ABSENT → new; the web-app gap)*

gsd-core is a CLI tool, so it never needed these. Apps our users build do. Each ships as a SKILL with a reference doc and **reusable example code** to adapt.

- **`test-containers`** — singleton-container pattern (start once, reuse across classes; do **not** combine with the per-class lifecycle extension); pin exact image tags; wait-on-condition (not sleeps); reuse is local-dev-only (Ryuk doesn't reap reused containers — never in CI); CI: handle Ryuk-under-DinD via `TESTCONTAINERS_RYUK_DISABLED` + explicit prune; alpine images, capped memory, migrations-in-setup, file-level parallelism. *(Testcontainers + Docker official docs; qaskills 2026.)*
- **`db-test-isolation`** — the strategy-tradeoff table:

  | Strategy | Parallel-safe | Speed | Tradeoff |
  |---|---|---|---|
  | Txn-per-test rollback | yes (own conn/DB) | fastest | breaks if app code manages its own txns / parallel queries |
  | TRUNCATE/DELETE between tests | hard on shared DB | ok small | serializes the suite |
  | Schema-per-worker | yes | ~200ms | conflicts with app schema multi-tenancy |
  | Database-per-worker | yes (strongest) | ~400ms | more DBs to manage |
  | Template DB (`CREATE DATABASE … TEMPLATE`) | yes | fast reset | no connections during copy |
  | No-truncate + UUID-scoped data | yes | very fast | can't assert global counts |

  **Recommended default:** database-per-worker (or schema-per-worker) seeded from a **template DB**, with txn-per-test rollback inside each worker. Determinism via per-worker DB + UUID/sequence keys + fixed clock + seeded RNG + order-independent tests. *(conroy.org; Kevin Burke; Postgres docs; Playwright worker fixtures.)*
- **`auth-in-tests`** — authenticate-once + reuse (Playwright `storageState` via setup project + `dependencies`; Cypress `cy.session` with `validate` + `cacheAcrossSpecs`); prefer **programmatic/token-minting** login (test the real UI login in exactly one spec); **multi-role factory** (one `storageState` per role; cross-role via two contexts); **one-account-per-worker** keyed on `parallelIndex` to avoid collisions; **JWT vs cookie/session** = different injection (Authorization header / `localStorage` vs cookie jar / `storageState`), plus CSRF token forwarding for cookie auth; mock the IdP only at unit/integration level, real test-instance IdP at E2E. *(Playwright/Cypress official docs; Clerk/Supabase/Auth.js guides; OWASP CSRF.)*
- **`realistic-test-data`** — **default to synthetic, domain-aware factories** (Fishery/factory_bot; sequences/UUIDs, not raw Faker in assertions); treat prod/staging dumps as **opt-in and only anonymized/subset** (PostgreSQL Anonymizer, Neon static masking, Snaplet subset+transform). Confirmed position: synthetic-first for privacy/compliance; dumps only for reproducing prod-shaped bugs or volume tests. *(Neon/Snaplet docs; Fishery; betterdata.)*
- **`e2e-tiering`** — persistent smoke/critical-journey suite (auth, payment, core nav) on every PR; deeper regression on staging; ephemeral environments per-PR torn down on merge; keep permanent E2E lean. *(Ranger guide.)*
- **`flaky-test-checklist`** — fixed clock, seeded RNG, poll-don't-sleep, framework actionability waits, order independence, no shared mutable global state, isolate external services, quarantine-don't-ignore. *(Google flaky-tests; OpenReplay.)*

---

## 5. The unifying spine

The complexity judgment made in `model-domain` / `recommend-architecture` (rich core vs CRUD-over-DB; Axis-A rung) is the **same input** that `testing-strategy` needs to choose the test shape. We thread it through the artifacts:

```
DISCOVERY.md ──▶ DOMAIN-MODEL.md ──▶ adr/*.md + SKELETON.md ──▶ TEST-STRATEGY.md ──▶ plans/execute/verify
   (outcome,         (core vs            (Axis-A rung +            (shape follows
    wedge)            supporting,         topology)                 the rung)
                      complexity)
```

So a project that lands on "Domain Model in a rich core" automatically gets a unit-heavier strategy for that core, while its CRUD edges get integration tests against real DBs via `test-containers`. **This cross-pillar coupling is the differentiator of the fork** — no existing framework does it.

---

## 6. Build decomposition (sub-projects & suggested sequence)

Each becomes its own spec → plan → implementation cycle.

1. **WS0 — Fork setup** *(small, mechanical)*: clone `gsd-core@v1.4.0`, git init, rebrand scope, wire `test:security`, upstream-tracking strategy.
2. **WS1 — Pillar 1**: `model-domain` (ABSENT, highest-value net-new) → `recommend-architecture` (extends SKELETON + ADRs) → `discover-product` (optional, extends questioning). Suggested order builds the domain→architecture spine first.
3. **WS2 — Pillar 2**: `testing-strategy` (extends TESTING-STANDARDS) + behavior-first TDD default → infra skills (`test-containers`, `db-test-isolation`, `auth-in-tests`, `realistic-test-data`, `e2e-tiering`, `flaky-test-checklist`).
4. **WS3 — Wire the spine** (§5): thread the complexity assessment from WS1 artifacts into WS2's `TEST-STRATEGY.md`.

WS0 first; WS1 and WS2 are largely independent and could proceed in parallel; WS3 depends on both.

---

## 7. Open questions / decisions deferred

- **Spec/artifact location** in the fork (`.planning/` vs `docs/`) — follow gsd-core's `.planning/` convention; confirm.
- **Upstream cadence** — how aggressively to track gsd-core releases vs. stabilize.
- **Optionality defaults** — `discover-product` optional (confirmed); should `model-domain`/`recommend-architecture` be skippable for trivial projects, or always-on-but-lightweight? (Lean: always-on, lightweight, auto-scaling depth.)
- **Naming** of the fork and its command namespace.
- **Pressure-testing** each discipline skill against subagents before shipping (superpowers method) — confirm we adopt this as a release gate.

---

## Appendix A — Sources (grouped)

**DDD / architecture:** Thoughtworks DDD-in-10-min; Hickey "Stop Pretending to do DDD"; Fowler BoundedContext / AnemicDomainModel / MonolithFirst / MicroservicePremium / test-shapes; Tilkov "Don't start with a monolith"; Newman "Monolith to Microservices"; Simon Brown modular monoliths; Richards & Ford "Fundamentals" / "Hard Parts"; Cockburn hexagonal; Azure CQRS; Team Topologies / Reverse Conway; Hohpe "Gregor's Law"; Nick Tune sociotechnical heuristics; arXiv 2310.01905 (DDD SLR); Brandolini EventStorming; Qlerify event-storming guides.

**Product discovery:** Torres Opportunity Solution Trees; Cagan/SVPG four risks; Ulwick ODI; Intercom Job Stories / RICE; YC startup library; Sean Ellis 40% PMF (+ Kromatic caveat); Perri "Escaping the Build Trap"; Patton story mapping.

**Testing strategy:** Fowler test-shapes/UnitTest/Practical-Test-Pyramid; Kent C. Dodds Testing Trophy; Ian Cooper TDD talk; Beck Canon TDD; *Software Engineering at Google* ch.11; Nagappan et al. + Fucci et al. (TDD evidence); optivem coverage-vs-mutation; Modern Treasury float-for-money; hexagonal testing strategy.

**Test infrastructure:** Testcontainers + Docker official docs; qaskills 2026; conroy.org per-test isolation; Kevin Burke parallel DB tests; Postgres template-DB docs; Playwright auth/parallel docs; Cypress `cy.session`; Clerk/Supabase/Auth.js testing guides; OWASP CSRF; Neon/Snaplet anonymization; Fishery; Google flaky-tests; OpenReplay async/time testing; Ranger E2E-in-CI.

*(Full inline URLs are preserved in the seven research briefs that fed this spec and will be embedded in each skill's reference doc at build time.)*
