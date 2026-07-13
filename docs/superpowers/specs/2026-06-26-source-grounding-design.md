# Source Grounding Enforcement — Design Spec (v2, post-validation)

**Goal:** Guarantee GSD's producing agents actually **read and honor** the project's strategy artifacts and sources of truth (design/legacy/vibe/dependency) instead of leaning on memory or abstractions — by **grounding once at plan-time, gating the plan mechanically, and making the source set ambient** — reusing existing machinery (`canonical_refs`, `decision-coverage-plan`, `generate-claude-md`, `artifacts.cjs`) rather than inventing a parallel system.

**Origin:** Real observed failure — agents build from memory/abstractions when reading the strategy/design is fundamental. Root cause (3-map exploration, 2026-06-26): the framework's creed is "forcing functions, not vibes," yet grounding is the one thing enforced almost entirely by vibes.

**This is v2** — a 4-agent validation pass corrected the v1 five-layer plan (see §2). Key change: **ground once at plan-time and gate the plan**, not force-re-read at every agent.

---

## 1. The gap (from exploration)

- Producing agents get STATE/ROADMAP/REQ/CONTEXT/RESEARCH injected; the strategy/design artifacts arrive only as **soft path-strings** with "MANDATORY" prose. The one hard-read mechanism (`mandatory-initial-read`) covers only *framework references*.
- The only mechanical read-receipt is a grep for CONTEXT `D-NN` IDs (`decision-coverage-plan`). Design has a conditional LLM diff. ADR/TEST-STRATEGY/etc. have only a subjective "did the LLM notice a contradiction?" — which can't catch "never read it" when the omission isn't a visible contradiction.
- Context-budget rules bias agents toward "frontmatter only, don't read bodies"; below the 500k profile the executor's list drops even CONTEXT/RESEARCH.
- The ambient grounding index (`generate-claude-md`) exists but omits the strategy/design docs, runs only at new-project time, and targets only claude+codex.

## 2. What the validation corrected (v1 → v2)

| v1 assumption | Validation finding | v2 correction |
|---|---|---|
| Ambient index uses `@`-link-mode for freshness across CLIs | `@`-expansion is **Claude-only** (config docs say so; no cross-CLI conversion); eager `@`-import is also byte-unsafe (Codex 32 KB cap, "gaming the proxy") | Index is a **plain instructive path-list + mandate** — identical on all runtimes, still fresh (paths, not snapshots) |
| Layer 2: inject sources into `<required_reading>` to force reading | `<required_reading>`/`mandatory-initial-read` is **prose-only, zero mechanical enforcement** (no hook/gate/verb) | **Cut Layer 2.** Reading is forced by the **plan gate**, not a stronger prose list |
| Force every agent (planner+executor+researchers) to re-read every source | The **executor's primary grounding is the PLAN, always**; it only reads CONTEXT/`canonical_refs` on ≥500k windows | **Ground once at plan-time; distill into the plan; the executor inherits it for free** |
| Build a new "active sources" registry (Layer 0) | `canonical_refs` **already is** that registry — just assembled lossily by an LLM | **Resolver populates `canonical_refs`** deterministically; no parallel structure |
| Phase-scope the source set | **No deterministic phase-type signal** exists (inferred from title at read-time) | **Drop phase-scoping for v1**; resolve the full active set (~5–7 docs) |
| Citation gate is optional "teeth" on top | Gate is the **only** thing with teeth; 3 of 4 artifacts support a real scripted cross-check | **Citation gate is the core enforcement**, extending `decision-coverage-plan` |
| Adding strategy docs to `artifacts.cjs` might cause health false-positives | Backwards — the root strategy docs are **currently W019-flagged** as "unrecognized"; adding them **removes** false-positives | Register them (single consumer = W019) |

## 3. The corrected design — 3 core mechanisms + 3 supports

### Core (the enforcement — "ground once, gate the plan")

**M1 · Deterministic source resolver → populates `canonical_refs`.** A `gsd-tools` verb globs the mechanical source-classes — the ROADMAP `Canonical refs:` line + the fixed `.planning/{DOMAIN-MODEL,TEST-STRATEGY,SECURITY-STRATEGY,INFRA-STRATEGY,CICD-STRATEGY,FRONTEND-ARCHITECTURE,LEGACY-INVENTORY,DESIGN-INVENTORY}.md`, `.planning/adr/*.md`, `PRODUCT-BRIEF.md` — plus the design/legacy/vibe pointers from the `## Mode` block. `discuss-phase` uses this to seed `<canonical_refs>` deterministically (LLM only *appends* user-referenced docs). Fixes the lossy accumulator that drops artifacts today.

**M2 · Planner distills a `## Grounding` block into PLAN.md (once).** The planner already reads every source (`plan-phase.md:858/923`). It emits a structured, **subdomain-keyed** grounding block: e.g. `core:matching → ADR rung: Domain Model`, `core:matching → test level: small`, `DESIGN-INVENTORY: address = single input (design)`. The executor inherits it **for free** because the plan is its unconditional primary grounding (`execute-phase.md:643`) — unlike `canonical_refs`, which it skips below 500k. Ground once, propagate via the plan.

**M3 · Extend `decision-coverage-plan` to gate the sources (BLOCKING).** Add `grounding` to `DESIGNATED_HEADINGS_RE`; parse `<canonical_refs>` as a second required list; mirror the existing coverage loop so an **uncited required source blocks the plan** exactly like an uncovered `D-NN` (`plan-phase.md:1567`, `exit 1`). For the **3 strong artifacts** (DESIGN-INVENTORY, DOMAIN-MODEL, TEST-STRATEGY) the value sits in a controlled-vocabulary **table column**, so the gate **cross-checks the cited value against the doc** (subdomain-keyed) — not just "was it mentioned." The **ADR is medium** — needs a small purpose-built Axis-A table parser to extract the rung (the shipped `adr-parser` doesn't); until then it's mention-level. The symmetric `decision-coverage-verify` already exists as the back-end gate (`verify-phase.md:218`).

### Supports (salience + hygiene — not the enforcement)

**S1 · Ambient index (the AGENTS.md idea).** Add a *Sources of truth* section to `generate-claude-md`, fed by M1, as a **plain instructive path-list** (*"Read and cite these before planning/editing"*) + the § Source-precedence rule + the memory-override line. Fix the two map-found gaps: **regenerate on every strategy-skill produce + a SessionStart hook**, and **extend runtime coverage** (gemini→GEMINI.md, plus runtimes that get nothing). Makes the source set *salient and ambient*; the *enforcement* is still M2/M3.

**S2 · Register strategy docs in `artifacts.cjs`** (`CANONICAL_EXACT`) + `templates/README.md` index — safe, single-consumer (W019), removes existing false-positive warnings.

**S3 · Memory-override rule.** One line in § Source precedence + the index: *"If your memory and the artifact disagree, the artifact wins — re-read it."* (None exists today; only "training is stale re: libraries.")

**Ship order:** M1 + M2 + M3 = the enforced core (ground-once + gate). Then S1 (ambient/cross-CLI salience) + S2/S3 (hygiene). M1+M2+M3 deliver the actual behavior fix; S1 makes it visible everywhere.

## 4. How it works with the 3 entry points

The entry points **write** the sources + `## Mode`; **M1 reads** them into `canonical_refs`; **M2/M3 enforce** at plan time; **S1** keeps the source set ambient. Entry-point-agnostic — M1 just reflects current `.planning` state.

- **`/gsd-discover-product`** → `PRODUCT-BRIEF.md` enters M1's set (outcome/wedge/must-NOT authority) and S1's index.
- **`/gsd-new-project`** → seeds `## Mode`; each strategy skill's output is picked up by M1 at the next `discuss-phase`, and S1 refreshes the ambient index as each doc is produced. By plan-phase the plan must cite them (M3).
- **`/gsd-new-milestone`** → re-evaluates `## Mode` (design-input may flip to "provided design" → DESIGN-INVENTORY appears); the Strategy-Plan refresh updates strategies; M1 re-resolves per milestone (new sources in, retired ones out); S1 refreshes. Grounding is **per-milestone-correct** instead of frozen at project init.
- **Build loop** → `discuss` seeds `canonical_refs` via M1; `plan` distills `## Grounding` (M2) and is gated (M3); `execute` inherits the plan's grounding; `verify` re-checks via the symmetric coverage gate.

## 5. Realistic end-to-end testing

**The gate makes behavior observable** — the `## Grounding` block + M3's cross-check turn "did it read/honor the source" into greppable evidence.

**A. Planted-discrepancy fixture (behavioral oracle).** A dogfood project with deliberately **counter-instinctive** artifacts (memory vs artifact disagree):
- ADR mandates **Transaction Script** for a subdomain a model would over-engineer into a Domain Model (and Domain Model where it looks like CRUD).
- DESIGN-INVENTORY declares **one `address` input** (the 1.13.0 failure) where instinct explodes it into street/city/state/zip.
- TEST-STRATEGY says **integration-heavy** where a model defaults to unit.
Run `plan-phase` → assert the `## Grounding` block cites the counter-instinctive values **and M3's cross-check passes** (the citation matches the doc's table). Run `execute-phase` → assert the built code honors them (Transaction Script, single address field, integration tests). Honoring the counter-instinctive choice = proof it grounded, not guessed.

**B. Ablation (before/after proof).** Same fixture, enforcement OFF vs ON: OFF drifts to instinct (over-engineers, explodes the address); ON honors the artifact. A demonstrated behavior flip.

**C. Negative gate test.** A plan that omits/mis-cites a required source (wrong ADR rung for the subdomain) → M3 **blocks** (`exit 1`); a correct, complete `## Grounding` → passes. Fully scriptable.

**D. Mechanical unit tests.** M1 resolver (fake `.planning` + Mode → correct source set); M3 coverage + cross-check per artifact (strong: DESIGN-INVENTORY/DOMAIN-MODEL/TEST-STRATEGY enum match; ADR: Axis-A parse); S1 index emitted as path-list, per-runtime target (AGENTS.md/GEMINI.md/CLAUDE.md), auto-resync; S2 W019 no longer flags the strategy docs.

**E. Per-entry-point integration.** new-project → strategy skills → `canonical_refs` + index accrue each source; new-milestone changing design-input → Mode+index update, DESIGN-INVENTORY appears, prior-milestone sources don't leak; discover-product → PRODUCT-BRIEF in the set.

## 6. Guardrails

- **Pointers, not payloads** — path-lists only (never `@`-imports of strategy docs; byte-unsafe + Claude-only). Docs stay in `.planning`.
- **Ground once** — the planner distills; every other agent inherits via the plan. No N× re-reads, no window-gated misses.
- **Cheap grep + real cross-check where possible** — mention-coverage for all; enum cross-check for the 3 strong artifacts; ADR mention-only until the Axis-A parser lands.
- **Subdomain-keyed citations** — ADR/TEST/DOMAIN are per-subdomain; a flat "rung = Domain Model" is ambiguous and rejected.
- **Backwards-compatible** — no strategy docs yet → empty required set → nothing blocks. Enforcement scales with what exists.
- **Every field has a consumer** — M1 feeds M3 + S1; no write-only plumbing.

## 7. Out of scope (v1)

- Rewriting the context-budget "frontmatter-only" doctrine — M2/M3 sidestep it (grounding rides the plan, which is always read).
- Phase-scoping the source set — no deterministic signal; revisit if the set grows unwieldy (would need a `phase_type`/`domains` frontmatter field).
- Full scripted oracles for every artifact — ship enum cross-check for the 3 strong ones + ADR Axis-A parser; the rest stay mention-coverage.
- Runtimes beyond the natively-ambient trio (claude/codex/gemini) for S1 v1.

## 8. Decisions locked (v2)

- **Ground once at plan-time; gate the plan** — not force-re-read at every agent (executor rides the plan; required_reading has no teeth).
- Reuse `canonical_refs` (resolver populates it), `decision-coverage-plan` (extend to gate sources), `generate-claude-md` (path-list index), `artifacts.cjs` (register). No parallel systems.
- Ambient index = **plain path-list**, never `@`-link-mode (Claude-only + byte-unsafe).
- Citations **subdomain-keyed**; real cross-check on DESIGN-INVENTORY/DOMAIN-MODEL/TEST-STRATEGY, custom parser for ADR, mention-coverage as the floor.
- Drop phase-scoping for v1.
- Realistic proof = planted-discrepancy fixture + ablation + negative gate test.
