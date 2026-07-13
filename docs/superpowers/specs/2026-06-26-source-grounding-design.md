# Source Grounding Enforcement — Design Spec

**Goal:** Guarantee that GSD's producing agents actually **read and honor** the project's strategy artifacts and sources of truth (design/legacy/vibe/dependency) instead of leaning on memory or abstractions — by making grounding **ambient, hard-read, mechanically verified, and memory-overriding**, reusing existing machinery rather than inventing a parallel system.

**Origin:** Real observed failure — agents sometimes build from memory/abstractions when reading the strategy/design is fundamental. Three-map exploration (2026-06-26) confirmed the root cause: the framework's creed is "forcing functions, not vibes," yet grounding is the one thing enforced almost entirely by vibes.

---

## 1. The gap (from the exploration)

- **Injection:** STATE/ROADMAP/REQ/CONTEXT/RESEARCH are auto-injected into producing agents; the strategy/design artifacts (DOMAIN-MODEL, ADR, TEST/SECURITY/FE/INFRA/CICD-STRATEGY, DESIGN-INVENTORY, the literal design) arrive only as **soft path-strings** in `<files_to_read>` with "MANDATORY" prose. The one hard-read mechanism (`mandatory-initial-read.md`) covers only *framework references*, never `.planning` docs.
- **Enforcement:** The only mechanical read-receipt is a grep for CONTEXT `D-NN` decision IDs (`decision-coverage-plan`). Design has a *conditional* LLM oracle-diff. ADR/TEST-STRATEGY/etc. have only a subjective "did the LLM notice a contradiction?" — which cannot catch "the producer never read it" when the omission isn't a visible contradiction.
- **Budget bias:** `context-budget.md` / `universal-anti-patterns.md` push agents toward "frontmatter only, don't read bodies"; below the 500k profile the executor's list drops even CONTEXT/RESEARCH — structurally under-grounded.
- **Ambient index already exists but is thin/stale/2-runtime:** `generate-claude-md` writes a marker-sectioned CLAUDE.md/AGENTS.md (embed-or-`@`-link modes), but its sections are project/stack/conventions/architecture/skills/workflow — **not** the strategy/design docs; it runs **only at new-project time** (no re-sync); it targets **only claude + codex** (Gemini gets an unread CLAUDE.md; ~9 runtimes get nothing).

**Three existing levers to extend:** `generate-claude-md` (the index), `<required_reading>`/`mandatory-initial-read` (the only hard-read), `decision-coverage-plan` (the only greppable gate).

## 2. The design — 5 layers

**0 · Deterministic "active sources" resolver** *(linchpin).* A `gsd-tools` verb — `grounding-set` (extends `artifacts.cjs`, which today omits every strategy artifact) — that, from `.planning/` + the `## Mode` block, returns the **live, phase-scoped source set**: the strategy docs that exist, the ADR, DESIGN/LEGACY-INVENTORY, PRODUCT-BRIEF, and the design/legacy/vibe pointers. Tested code, not LLM globbing. Phase-scoped so a backend phase pulls ADR+DOMAIN+TEST+SECURITY and a FE phase pulls FRONTEND-ARCH+seam+DESIGN-INVENTORY — tight sets get honored; "read all 8 every task" gets skipped. This is the consumer-backed registry cut in 1.13.0 for having no consumer; it now has three (index, required_reading, gate).

**1 · Ambient grounding index** *(the AGENTS.md idea, done right).* Add a *Sources of truth* managed section to `generate-claude-md`, fed by Layer 0, emitted in **link mode** (`@`-refs — never a stale snapshot). Contents: the `## Mode`, the active source `@`-paths (one line each on what each governs), the § Source-precedence rule, and the hard mandate: *"These are authoritative for THIS project — they override your memory and training. Read and cite them before planning or editing."* Fix the two map-found gaps: **regenerate on every strategy-skill produce** (+ a SessionStart hook) and **extend runtime coverage** (gemini→GEMINI.md, plus the runtimes that get nothing).

**2 · Promote the soft list to a hard read.** At plan/execute spawn, inject the Layer-0 set into a real `<required_reading>` block (the mechanism that already forces framework-ref reads), replacing the advisory `<files_to_read>` for the project's strategy/design.

**3 · Mechanical source-citation gate** *(the teeth).* Generalize `decision-coverage-plan`: every PLAN.md carries a `## Grounding` block that, per active source, names the decision taken from it (ADR rung, TEST-STRATEGY level, the design fields honored). A script greps that each Layer-0 path is cited **and cross-checks the cited value against the artifact** (you can't cite the wrong rung). Generic/missing → block at plan, non-soft at verify.

**4 · Name the failure explicitly.** Add to § Source precedence + the index: *"If your memory and the artifact disagree, the artifact wins — re-read it."* There is currently no such rule (only "training is stale re: libraries").

**Ship order:** 0 + 1 + 4 = the ambient/fresh/cross-CLI/memory-overriding core. Then 2 + 3 = the mechanical teeth.

## 3. How it works with the 3 entry points

**Unifying model:** the entry points (and the strategy skills after them) **write** the sources + the `## Mode` block; the Layer-0 resolver **reads** "what sources exist now"; the index + required_reading + citation gate **enforce** them. Same machinery for all three — the resolver just reflects current `.planning` state, so it's entry-point-agnostic.

- **`/gsd-discover-product`** → `PRODUCT-BRIEF.md` becomes a source (the outcome / wedge / must-NOT authority). The resolver includes it; the index lists it. Optional, runs before new-project.
- **`/gsd-new-project`** → seeds the `## Mode` block and writes the **initial** index (it already calls `generate-claude-md`). Each strategy skill that runs after (model-domain, recommend-architecture, testing/security/frontend/infra/cicd-strategy) **refreshes the index** as it emits its doc. By plan-phase the index lists every active source.
- **`/gsd-new-milestone`** → **re-evaluates `## Mode`** for the new cycle (design-input may now be "provided design" → DESIGN-INVENTORY gets produced). The Strategy Plan refresh (Step 4.5) re-runs/updates strategies → index refresh. New sources enter; sources retired for this milestone drop out. Grounding is **per-milestone-correct**, not frozen at project init (the current staleness bug).
- **Build loop (`discuss → plan → execute → verify`)** → consumes the resolver via `<required_reading>` + the citation gate. `discuss-phase` already accumulates `<canonical_refs>`; now it seeds that list from the resolver so nothing is missed by a lossy hand-assembly.

Net change per entry point: each one ends by (re)writing the grounding index from the resolver, so the ambient file is always current for the phase you're about to build.

## 4. Realistic end-to-end testing

The hard part: the value is **agent behavior** (does it read/honor the source vs default to instinct?), which no unit test fully captures. Strategy — a **planted-discrepancy dogfood fixture** + ablation, plus mechanical tests:

**A. The planted-discrepancy fixture (the realistic behavioral test).** A dogfood project whose strategy artifacts are deliberately **counter-instinctive** — i.e. where memory/instinct and the artifact disagree, reproducing the real failure mode:
- ADR mandates **Transaction Script** for a subdomain a model would instinctively over-engineer into a Domain Model — *and* Domain Model for one that looks like CRUD (both calibration directions).
- DESIGN-INVENTORY declares **one `address` input** (the exact 1.13.0 failure) where a model instinctively explodes it into street/city/state/zip.
- TEST-STRATEGY says **integration-heavy** for a DB-bound subdomain where a model defaults to unit tests.
Run `plan-phase` + `execute-phase` on the fixture and assert the output **honors the counter-instinctive artifacts** (Transaction Script where mandated, single address field, integration tests). Honoring the counter-instinctive choice is proof the agent read the source, not memory.

**B. Ablation (before/after proof).** Same fixture, enforcement OFF (baseline) vs ON. OFF drifts to instinct (over-engineers, explodes the address); ON honors the artifact. The flip *is* the proof the enforcement works — not a claim, a demonstrated behavior change.

**C. The citation gate as test instrument.** Because Layer 3 forces a `## Grounding` block that cites each source's actual decision and cross-checks it against the doc, "did it engage each source" becomes **greppable and scriptable**. The gate does double duty: enforcement + automated evidence.

**D. Mechanical/unit tests (deterministic):**
- Resolver: fake `.planning` + Mode → correct phase-scoped source set.
- Index: *Sources of truth* section emitted in link mode, lists the right `@`-paths, updates on regen; lands per-runtime (AGENTS.md/codex, CLAUDE.md/claude, GEMINI.md/gemini).
- Citation gate: PLAN.md missing a citation for an active source → blocks; wrong cited rung → blocks; complete + correct → passes.
- required_reading: spawn prompt contains the active source paths as a hard-read block.

**E. Per-entry-point integration tests:**
- new-project → run strategy skills → index accrues each source.
- new-milestone that changes design-input → Mode + index update, DESIGN-INVENTORY appears, prior-milestone sources don't leak.
- discover-product → PRODUCT-BRIEF enters the source set.

The end-to-end "prove it works" run = the planted-discrepancy fixture through each entry point, asserting the output honors the counter-instinctive artifacts + the citation gate fires + the index lands per-runtime — the same realistic-dogfood approach used for `/gsd-learn`, but with the discrepancy fixture as the behavioral oracle.

## 5. Guardrails (so it doesn't rot)

- **Pointers, not payloads** — link mode only; docs stay in `.planning`. Avoids context bloat + snapshot staleness.
- **Every field has a consumer** — the index reads Layer 0, the gate reads Layer 0, required_reading reads Layer 0. No write-only plumbing (the 1.13.0 "inert plumbing" trap).
- **Phase-scoped** — over-broad required_reading gets ignored; tight relevant sets get honored.
- **Cheap grep, not bureaucracy** — the citation gate is a greppable cross-check, not an unverified self-attested table (the existing `planner-source-audit` coverage table is exactly the un-verified version to avoid).
- **Backwards-compatible** — a project with no strategy docs yet resolves to an empty set and nothing blocks; enforcement scales with what exists.

## 6. Out of scope (v1)

- Rewriting the context-budget doctrine (the frontmatter-only bias) — instead, Layer 2 exempts the active source set from it (hard-read wins over budget bias). A broader budget rethink is separate.
- Full field-level scripted oracles for every strategy doc — start with the ADR rung + design fields (the highest-value, already-structured) as scripted; the rest stay LLM-diff with the citation cross-check as the mechanical floor.
- Runtimes beyond the ambient-file ones for v1 — cover claude/codex/gemini first (the natively-ambient trio), then the rest.

## 7. Decisions locked

- Extend `generate-claude-md` + `mandatory-initial-read` + `decision-coverage-plan` — reuse, don't reinvent.
- Link mode (`@`-refs), never embedded snapshots, for the Sources section.
- Phase-scoped resolver is the single source of "what to ground on"; three consumers.
- Realistic proof = planted-discrepancy fixture + ablation, with the citation gate as the automated evidence layer.
- Ship 0+1+4 first (ambient/fresh/cross-CLI/memory), then 2+3 (mechanical teeth).
