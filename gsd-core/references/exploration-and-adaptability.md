# Exploration & Adaptability — Context Detection, Mode Routing & Runtime Tech Selection

Three things this reference adds to the durable core: **mandatory scouting** (code · design · live web), a **combinable mode taxonomy**, and a **runtime tech-selection discipline** — so the agent grounds every decision in *this* project and isn't locked into one shape. Consumed by every skill that detects context or picks technology (`new-project`, `model-domain`, `recommend-architecture`, `frontend-architecture`, the strategy skills, `discuss-phase`, the rewrite/legacy skills) and enforced by the reviewing agents.

## The spine — exploration is mandated, never discretionary

Models under-explore and over-anchor on the most salient artifact (the new design, the file already in context), and their training is stale. So the framework forces thoroughness with mode detection, coverage checklists, and a confirm-or-refute gate — the same way it forces calibration. What scales with the project is *which* explorations run and *how wide* — never *whether*.

The one rule that prevents the recurring failure (requirements derived from the salient artifact alone):

> **Derive understanding from (the design) ∪ (the existing code) ∪ (the live ecosystem) — then reconcile. Never from one source alone.**

## The mode taxonomy — orthogonal dimensions, combinable, detected per area

Context is three independent dimensions that combine, detected **per area / per change-site** (a brownfield repo can carry a new module; a greenfield repo can ingest a design and salvage an old codebase). Per-area detection is for variation **within one surface** — the recorded `## Mode` is **one combination per project**. A repo with multiple *independent* surfaces (a monorepo: a backend + a frontend + a CLI) is modelled by running GSD **per package/surface**, not by one averaged Mode (see `strategy-flow.md`, "Scope: one surface per project").

| Dimension | Values | Detect by |
|---|---|---|
| **Origin** | greenfield · brownfield-extend · rewrite/refactor | is there source for *this* area? add to it, or replace it? |
| **Design input** | none · a **new design provided** (a design-tool export / a deployed prototype / a generated-design artifact, to ingest) · an **existing design system** to honor | design files / a prototype / a tokens package or component lib present |
| **Code-quality baseline** | clean · legacy-debt · **vibe-coded-to-harden** (works but not production-grade) | tests present? structure coherent? or AI-prototyped, thin on tests/seams? |

The canonical hard combination: *greenfield-rewrite + new-design-provided + salvageable-old-code* — a clean rebuild whose spec is the new design and whose behavior oracle is the old app. **Name the detected combination and record it** (in `<context>`, and in **PROJECT.md's `## Mode` section** — written once by `new-project`/`new-milestone`, so downstream skills read it instead of re-running `ls`-based detection). It selects which explorations below are mandatory.

## The three explorations

Pick the ones the detected modes require; at least one always runs. All feed `<context>` **through the confirm-or-refute gate `scout-codebase.md` owns** (spot-check load-bearing claims against raw tool output; VERIFIED vs INFERRED).

- **CODE** — mandatory for brownfield-extend, rewrite/refactor, vibe-coded-to-harden. Exhaustive and checklist-driven (never "explore what seems relevant"): enumerate the full surface — every module, endpoint, DB table, job, integration, role/permission, env/secret, CI/CD config, infra, seed data, admin tool, notification template, feature flag, shadow-IT process — into a **coverage matrix** (= the explorer-contract surface enumeration + honest-coverage statement in `scout-codebase.md`: "covered 7/9, here's what I skipped and why"). For *extend*: "what is this system, so I can add to it." For *rewrite/refactor/harden*: "what does the old system DO, what hidden behavior, what's worth keeping" → a salvage inventory + a **three-way reconciliation** (design × old-code × requirements), resolved by **§ Source precedence** below. Replace behavior only behind characterization tests (`brownfield-adaptation.md`). A rewrite is still delivered **incrementally, never big-bang.**
- **DESIGN** — mandatory when a design or design system exists. A *new* design is ingested as the scope/UX spec (for a rewrite it forces a full FE rebuild — done incrementally — while old code stays the behavior oracle). An *existing* design system/tokens/component library is honored, not reinvented. The per-form reading mechanics (Figma / generated-export / deployed prototype / tokens package / in-repo system) live in `design-ingestion.md`. Never assume a design is complete — reconcile against code and requirements (designs routinely under-show already-built behavior). **The design's location is recorded once in PROJECT.md `## Mode` (Design input); every distilling skill (`ui-researcher`, `frontend-architecture`, `legacy-inventory`) ingests that same design from there — never re-locate it ad-hoc, so they don't drift onto different design sources.**
- **WEB / ecosystem — ALWAYS**, even pure greenfield with no code and no design, because training is stale. This is where the runtime tech-selection discipline (next) runs (`research-philosophy.md`, `research-verification-protocol.md`).

## Source precedence — per-source authority (fidelity ≠ blind reproduction)

This is the canonical statement; every other file points here instead of restating it (so it can't drift). Every agent — the strategy skills **and** the build-loop agents — works from **(strategy artifacts) ∪ (the literal sources)** and reconciles them by the rule below. Never from one salient artifact alone, and **never from an abstraction (DOMAIN-MODEL / ADR / UI-SPEC / PLAN) in place of the source it distills.** Just as a brownfield agent always keeps the actual code in view beside the plan, an agent working from a provided design, legacy code, a vibe-coded prototype, or an external dependency keeps that literal source in view too.

Each source is authoritative on **one axis** and explicitly **not** on the others. Fidelity means honoring each source on its axis — **not** blindly reproducing it:

| Source | Authority ON | NOT authority on |
|---|---|---|
| **Provided design** | the **observable shape** — the user-facing fields (which exist, required/optional/readonly), screens, states, flows; UX & scope. Its shape is law: don't invent a user-facing field it lacks, don't drop one it shows | internal modeling, the persistence schema, behavior the design under-shows |
| **Legacy / old code** | **behavior & result** to preserve, and "what was actually built" (hidden behavior, "is this a real requirement?") | **structure, schema, or quality** — a refactor REWORKS the schema fresh from `DOMAIN-MODEL.md` while preserving the result; blind structural reproduction is the failure, not the goal |
| **Vibe-coded prototype** | **intent** — what it was trying to do | its behavior, structure, or quality — **harden the intent; never pin its behavior as a parity oracle** (that would preserve its bugs) |
| **External dependency / 3rd-party** | its **real, verified contract** (API/types) | anything beyond its surface — never assume it |
| **Canonical spec** (role bible / domain spec) | **domain facts** (roles, entities) | UX or structure |
| **Strategy / DDD** (DOMAIN-MODEL, ADR) | **internal modeling, schema & quality** (value objects, normalization, the chosen rung) | the observable shape (design's), domain facts (spec's), behavior-to-preserve (legacy's) |

**Disambiguating "structure":** "the design wins on structure" means the **observable** structure (screens, the set of fields the user touches) — *not* the internal/persistence structure, which belongs to strategy/DDD. A design's one address input may be modeled internally as a rich `Address` value object or split into columns; it may **not** become four required user-facing fields the design never collected. Conversely a legacy schema is reworked, not reproduced. **Reconcile, never silently drop:** a field the *requirements* need but the design under-shows is kept (the design under-showed), not deleted — it's the design ∪ requirements, never the design alone.

**MIXTURE (refactor + new design):** new design wins on observable shape, legacy is the authority on behavior-to-preserve, DDD owns the new internal structure. Resolve it per-change-region via the three-way gap map (`brownfield-adaptation.md`), not by oscillation — a design-mandated shape change is *not* a behavior-parity violation.

State this precedence up front so no conflict needs a you-decide interruption.

## Runtime tech & library selection

Tool standings rot fast, so **doctrine prose never names a winning library.** Every tech/library decision follows one shape:

> **Principle (durable) → decision criteria + triggers → a runtime "verify the current best-maintained option for the detected stack" step → record the choice, dated, with maintenance-risk flags, in the produced artifact** (not a standing table that itself rots).

**Maintenance-health criteria** (the durable part): last-commit recency & release cadence · funding/ownership & bus factor · framework-version nativeness · standards/a11y depth where relevant · lock-in shape · ecosystem momentum (surveys, Tech Radar, downloads) · distribution model. Prefer **proven and still-actively-used** over merely new or merely old.

**Dependency-minimization — both ways:** use a maintained, proven library for the genuinely hard (a11y, crypto, date/timezone, validation, auth) — hand-rolling those is under-engineering; but don't import a heavy dependency to use 0.1% of it when a few clean, owned lines suffice (especially now an agent writes them correctly). The test: *is this hard enough (correctness, edge cases, a11y, security) that a library earns its weight — or trivial enough that a small owned implementation is clearer and safer?*

## Sufficiency stop (the over-exploration guardrail)

Exploration is *done* per `scout-codebase.md`'s sufficiency stop (confidence threshold met · budget cap · saturation — last round surfaced nothing new). Web research saturates similarly (~5 good sources; stop when new sources stop changing the answer). Both-directions: under-exploring locks a wrong premise; over-exploring is its own waste.

## Why this is enforced, not trusted

As in `engineering-standards.md`: prose asking for diligence is weak; the forcing functions are — mode detection (a required step), the coverage matrix (a required artifact), the confirm-or-refute gate, and runtime tech-verify with cited + dated evidence. Reviewers flag a library named without a health check, requirements derived from the design alone, or a heavy dependency added for trivial functionality.

## Anti-patterns (both directions)

- **Under-exploration:** "I already have the context"; requirements from the salient artifact alone; sampling code instead of enumerating it; trusting training memory for "the latest" library; reinventing a11y/crypto/tz.
- **Over-exploration / over-engineering:** re-scanning a known small area to paralysis; importing a heavy lib for one helper; building adaptability machinery a single-mode project never uses.
- **Lock-in:** hard-coding a tool in doctrine; assuming greenfield because the repo is new (missing a salvageable codebase or a provided design); one mode for the whole repo when areas differ.

## Consumes / produces

- **Consumes:** the project's files, design inputs, and the live web. Pairs with `scout-codebase.md` (code-exploration mechanics + the confirm-or-refute gate + sufficiency stop — it owns these), `brownfield-adaptation.md` (extend/rewrite/harden disciplines, salvage card, characterization gate), `research-philosophy.md` + `research-verification-protocol.md` (web rigor), `contract-testing.md`, `design-ingestion.md` + `sketch-*` (design ingestion).
- **Produces:** the recorded mode-combination, the exploration outputs feeding each skill's `<context>`, and — for every tech decision — a cited, dated recommendation grounded in current ecosystem health.

*Basis: agent-reliability evidence on under-exploration and salient-artifact anchoring; the slopsquatting / hallucinated-dependency study (≈1 in 5 generated package references across models — lower on frontier models, nonzero) and post-cutoff-API studies (well under half without docs); the calibration doctrine in `engineering-standards.md` / `architecture-decision.md`; the confirm-or-refute discipline in `scout-codebase.md`. Full citations in the research corpus.*
