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

- **CODE** — mandatory for brownfield-extend, rewrite/refactor, vibe-coded-to-harden. Exhaustive and checklist-driven (never "explore what seems relevant"): enumerate the full surface — every module, endpoint, DB table, job, integration, role/permission, env/secret, CI/CD config, infra, seed data, admin tool, notification template, feature flag, shadow-IT process — into a **coverage matrix** (= the explorer-contract surface enumeration + honest-coverage statement in `scout-codebase.md`: "covered 7/9, here's what I skipped and why"). For *extend*: "what is this system, so I can add to it." For *rewrite/refactor/harden*: "what does the old system DO, what hidden behavior, what's worth keeping" → a salvage inventory + a **three-way reconciliation** (design × old-code × requirements). Precedence when they conflict: **the locked design wins on UX/scope/structure; the canonical spec wins on domain facts (e.g. roles); the old code is the authority on what was actually built and on hidden behavior — never on quality/structure.** Replace behavior only behind characterization tests (`brownfield-adaptation.md`). A rewrite is still delivered **incrementally, never big-bang.**
- **DESIGN** — mandatory when a design or design system exists. A *new* design is ingested as the scope/UX spec (for a rewrite it forces a full FE rebuild — done incrementally — while old code stays the behavior oracle). An *existing* design system/tokens/component library is honored, not reinvented. The per-form reading mechanics (Figma / generated-export / deployed prototype / tokens package / in-repo system) live in `design-ingestion.md`. Never assume a design is complete — reconcile against code and requirements (designs routinely under-show already-built behavior). **The design's location is recorded once in PROJECT.md `## Mode` (Design input); every distilling skill (`ui-researcher`, `frontend-architecture`, `legacy-inventory`) ingests that same design from there — never re-locate it ad-hoc, so they don't drift onto different design sources.**
- **WEB / ecosystem — ALWAYS**, even pure greenfield with no code and no design, because training is stale. This is where the runtime tech-selection discipline (next) runs (`research-philosophy.md`, `research-verification-protocol.md`).

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
