# `/gsd-learn` — Design Spec

**Goal:** Give developers a coherent, high-bar way to *learn* the engineering concepts the GSD framework enforces — each concept taught **concept-first (what it is, clearly), then application (when/why/how-it-fits)** — sourced entirely from the skills, in one consistent voice.

**Architecture:** A five-beat teaching engine renders concept nodes from a machine-checked catalog (`learn-catalog.md`). A `/gsd:learn` workflow orchestrates selection and the interactive loop; a `gsd-learning-coach` subagent reads each concept's source reference section and returns a structured lesson; personalization comes from the existing `USER-PROFILE.md`; an optional browser layer (reused from the superpowers mechanism) renders the genuinely-visual beats.

**Status:** Design approved (brainstorming). This spec feeds the implementation plan. Build wedge = the Testing track, end to end.

---

## 1. The problem it solves

The concepts are not missing from the internet — they are **scattered, contradictory, and half-finished**. One source defines "mock" as all five doubles; another teaches DDD as "aggregates everywhere"; nobody connects *what a thing is* to *when you'd reach for it* and *why*. The GSD references are the one place where every concept is explained **clearly, completely, coherently, and justified with evidence**, in a single voice, across all ten domains.

`/gsd-learn` is the **teaching twin of the building framework**: GSD turns the skills into a coherent way to *build*; this turns the same skills into a coherent way to *learn*. It does not re-author content — it is the pedagogy layer that renders the existing, agent-facing references for a human learner.

The two halves, in order, are non-negotiable:
1. **Concept** — taught clearly first, explicitly resolving the confusions the internet leaves.
2. **Application (calibration)** — when to use what, why, and how the framework builds with it. You cannot calibrate a concept you have not been taught.

## 2. The teaching pattern (the engine)

Every node is taught through five beats — the doctrine analog of `engineering-standards.md`, recorded in a new reference `teaching-pattern.md`. Each beat's content is *derived from the node's `Source` section*, never invented:

1. **Concept** — what it actually is, defined once and clearly; names and dispels the common confusions (e.g. hexagonal = clean = onion; mock ≠ spy ≠ stub ≠ fake ≠ dummy). → the skill's definitions.
2. **When to use what** — the calibration: floor, rungs, triggers, both-direction tells. → the skill's decision rules.
3. **Why** — the justification and the real evidence (K8s at 8–13% utilization; flakiness across 4.2M tests; the wrong abstraction costing more than duplication). → the skill's basis.
4. **How the framework builds with it** — how it shows up in GSD's own build flow, coherent with neighboring concepts. → the skill's consumes/produces + gates.
5. **Apply** — code both ways (scalable-vs-not / secure-vs-not), then *the learner's own repo* (grep for a real instance), then a short comprehension check.

Beat 1 is the foundation; 2–4 are the calibration on top; 5 makes it stick. The depth and ordering *within* a beat are personalized (§5).

## 3. The concept catalog

`gsd-core/references/learn-catalog.md` — the curriculum graph. **84 nodes across 10 tracks** (Domain, Architecture, Testing, Security, Frontend, FE↔BE Seam, CI/CD, Infrastructure & Ops, Process, Code Quality). Each node carries: `ID`, `Concept`, `Source` (reference § section), `Prereqs` (graph edges), `Visual` (diagram / code / —).

The catalog is the single source of *what is teachable* and *where its truth lives*. A node whose `Source` doesn't resolve to a real reference section is a build failure, not a silent gap (§9). Cross-track concepts live in exactly one home track and are referenced by ID (e.g. `test-contract` is the home of contract testing; the Seam track links to it).

## 4. Components & file footprint

| File | Role | New? |
|---|---|---|
| `skills/gsd-learn/SKILL.md` | the skill surface (objective, execution_context, flags) | new |
| `commands/gsd/learn.md` | command registration, argument-hint, routing | new |
| `gsd-core/workflows/learn.md` | orchestrator: load → select → teach loop → record | new |
| `gsd-core/references/teaching-pattern.md` | the five-beat doctrine (how the coach teaches) | new |
| `gsd-core/references/learn-catalog.md` | the concept graph | **created** |
| `agents/gsd-learning-coach.md` | reads a node's source section + profile → returns a structured five-beat lesson | new |
| `~/.claude/gsd-core/LEARNING-PROGRESS.md` | per-user, cross-project progress state | new (runtime) |
| `gsd-core/bin/gsd-tools.cjs` + `src/*.cts` | a `learn` query handler (catalog read, progress read/write) | extend |
| `docs/INVENTORY.md` + `docs/INVENTORY-MANIFEST.json` | registration (+counts) | extend |
| `.changeset/*.md` | release fragment (type: Added) | new |
| `tests/learn-catalog-*.test.cjs` | catalog completeness + graph-acyclicity tests | new |

## 5. Data flow

1. **`/gsd:learn`** (workflow, main thread) loads the catalog, `USER-PROFILE.md`, and `LEARNING-PROGRESS.md`.
2. **Selects** the concept(s) — by argument, by resume, or by walking prerequisite edges (§6).
3. **Spawns `gsd-learning-coach`** per concept. The coach reads *only that node's cited source section* + the profile, and returns a **structured lesson object**: the five beats pre-rendered, the code-both-ways pair, 2–3 comprehension questions with expected discriminators, and an optional graphviz spec. Heavy reference reads stay out of the main thread.
4. **Delivers it interactively** (main thread): renders beats 1–4; optionally opens the browser for `Visual` assets; runs beat 5 via `AskUserQuestion` and greps the learner's repo for their own example.
5. **Records** completion + the **calibration lean** (did the learner over- or under-engineer the drill) to `LEARNING-PROGRESS.md`.

The orchestrator/coach split mirrors the existing GSD pattern (workflow routes; subagent does the heavy read). Per `universal-anti-patterns.md`, the workflow never reads agent definitions and never inlines large references into the coach prompt — it passes the node ID and the coach reads from disk.

## 6. Entry modes

- `/gsd:learn <concept-or-topic>` — jump to a node (resolves fuzzy topic → node ID). If prerequisites are unmet, offer them first; proceed if the learner insists.
- `/gsd:learn` — guided: resume the last in-progress node, or suggest the next by profile + prerequisite order, or browse tracks.
- `/gsd:learn --track <track>` — work a whole track in dependency order.

Flags: `--text` (no browser, terminal-only), `--visual` (force-open the browser where a node has assets), `--review` (re-run comprehension checks on completed nodes; spaced repetition).

## 7. Personalization

- **`USER-PROFILE.md`** (already produced by `gsd-user-profiler`): `Learning Style` sets the order *within* a beat — example-driven leads with code, conceptual leads with the principle, hands-on adds drills, self-directed shows the map and steps back; `Explanation Depth` sets prose vs terse.
- **The calibration mirror:** because the framework's thesis is that *both* over- and under-engineering are failures, the coach tracks the learner's calibration choices across drills and reflects the lean back — *"you reach for the heavier rung 8/10; you lean toward over-engineering; here's the trigger you keep skipping."* Native to the framework, and absent from every other learning resource.

## 8. Progress state schema

`~/.claude/gsd-core/LEARNING-PROGRESS.md` (front-matter + body), written only via the `gsd-tools` `learn` handler (never direct Write, per state-management rules):

```yaml
---
version: "1.0"
updated: "<ISO-8601>"
calibration_lean: { over: <int>, under: <int>, on_target: <int> }   # the mirror
concepts:
  - id: test-doubles
    status: completed            # not-started | in-progress | completed
    checks_passed: 3
    checks_total: 3
    last_seen: "<ISO-8601>"
    lean: on-target              # this drill's calibration result
---
```

Cross-project (user-global) so progress follows the developer, mirroring `USER-PROFILE.md`.

## 9. Error & edge handling

- **No profile yet** → neutral defaults (concise depth, example-then-principle) + a one-line offer to run `/gsd:profile`.
- **Browser unavailable / headless** → graceful terminal-only render; `Visual` beats degrade to an ASCII sketch + prose.
- **Unmet prerequisites** → offer the prereq chain; respect an explicit override.
- **Catalog integrity** → `tests/learn-catalog-*.test.cjs` enforces the completeness contract: every `Source` resolves to a real reference section, every `Prereqs` ID exists, the graph is acyclic, no cross-track duplication. A drift here fails CI.
- **Reference moved/renamed** → the catalog test catches the broken `Source` pointer before release (the same discipline that keeps the build agents honest).

## 10. The visual layer (optional, where it earns it)

Reuse the superpowers mechanism (tiny local Node server watching a content dir + WebSocket reload + graphviz for diagrams) — copied in, coordinate-rewritten, not depended upon. The browser is used only for nodes flagged `diagram` or `code`: the pyramid/diamond emerging from an architecture, the hexagon's ports/adapters, the compute ladder, code-both-ways side-by-side, the over↔under spectrum slider. The terminal carries the Socratic dialogue. HTML is generated per node (and per the learner's answer), never pre-baked. Fully optional — the feature is complete and useful terminal-only.

## 11. The build wedge

**Testing track first, all 18 nodes, end to end.** It is the highest-value gap the learner named ("nobody tells you *what* to test or *how*"), the deepest set of references, and it exercises every part of the engine: the catalog graph (prereq chains like `test-doubles → test-sociable-vs-solitary → test-fake-at-ports`), the coach, profile personalization, code-both-ways, the calibration mirror, and the visual layer (pyramid/diamond). Once Testing teaches well, the other nine tracks are content in the same catalog — the engine does not change.

## 12. Out of scope (v1)

- **`/gsd:learn this`** — explaining the calibration the framework *just made in the learner's project* (the ADR that chose Domain Model, the test shape it derived). High value, but couples to the build loop; design toward it, ship it as a fast-follow.
- Authoring *new* concept content beyond what the references hold (the catalog only renders existing skills).
- A hosted/web version, accounts, or multi-user progress. Local, single-developer, file-based only.
- Quizzes-as-assessment / certification. The comprehension check is formative, not graded.

## 13. Decisions locked during design

- **Concept first, then calibration** — both halves, in order. (Not calibration-only — that was the corrected misread.)
- **Render the references; don't re-author** — one source of truth per concept; coherence is the product.
- **84 nodes, 10 tracks, cross-linked not duplicated** — granularity matches the material (deep in Testing/Architecture/Security; tight in Code Quality).
- **Catalog is machine-checked** — a dangling source/prereq is a build failure.
- **Visual layer is optional** — terminal-complete; browser only where visual genuinely wins.
- **Testing track is the wedge.**
