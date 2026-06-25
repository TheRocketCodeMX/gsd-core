# `/gsd-learn` — Design Spec

**Goal:** Give developers a coherent, high-bar way to *learn* the engineering concepts the GSD framework enforces — each concept taught **concept-first (what it is, clearly), then application (when/why/how-it-fits)** — sourced entirely from the skills, in one consistent voice.

**Architecture:** `/gsd:learn` is an **inline skill the main agent runs** — not a subagent pipeline. Teaching is conversational and cross-concept (a learner asks about architecture, then testing, then how they connect), so the lesson must live in one context where the agent holds every concept at once and synthesizes across them live. The skill reads the machine-checked catalog (`learn-catalog.md`), loads only the source section(s) for the concept(s) in play, teaches through the five-beat pattern personalized by the existing `USER-PROFILE.md`, and tracks progress. An optional browser layer (reused from the superpowers mechanism) renders the genuinely-visual beats. **No subagents** — they would isolate each concept and defeat the cross-concept teaching that is the point.

**Status:** Design approved (brainstorming). This spec feeds the implementation plan. Build wedge = the Testing track, end to end.

---

## 1. The problem it solves

The concepts are not missing from the internet — they are **scattered, contradictory, and half-finished**. One source defines "mock" as all five doubles; another teaches DDD as "aggregates everywhere"; nobody connects *what a thing is* to *when you'd reach for it* and *why*. The GSD references are the one place where every concept is explained **clearly, completely, coherently, and justified with evidence**, in a single voice, across all ten domains.

`/gsd-learn` is the **teaching twin of the building framework**: GSD turns the skills into a coherent way to *build*; this turns the same skills into a coherent way to *learn*. It does not re-author content — it is the pedagogy layer that renders the existing, agent-facing references for a human learner.

The two halves, in order, are non-negotiable:
1. **Concept** — taught clearly first, explicitly resolving the confusions the internet leaves.
2. **Application (calibration)** — when to use what, why, and how the framework builds with it. You cannot calibrate a concept you have not been taught.

## 2. The teaching pattern (the engine)

Every node is taught through five beats — the doctrine analog of `engineering-standards.md`, recorded in a new reference `teaching-pattern.md`. Each beat's content is *derived from the node's `Source` section*, never invented. The arc is **what it is → how to build it → when to build it (and when not) → why → make it yours**:

1. **Concept** — what it actually is, defined once and clearly; names and dispels the common confusions (hexagonal = clean = onion; mock ≠ spy ≠ stub ≠ fake ≠ dummy). → the skill's definitions.
2. **How to implement it** — the concrete construction, with the reference's real code: where it lives, how it's wired, the pattern (e.g. the fake-at-ports + contract suite from `test-doubles.md`). This is *production* — how you build the right thing yourself, not the framework's API syntax (the internet covers that). → the skill's code/patterns.
3. **When to use what** — the calibration: floor / rungs / triggers / both-direction tells, taught through the **good-vs-bad contrast** (the over- and under-engineered versions beside the calibrated one). Beat 2 teaches *how*; this teaches *when, and when not*. → the skill's decision rules.
4. **Why** — *universal first*: the engineering justification + real evidence (mocking-the-wrong-seam is brittle; agents reward-hack their own tests; K8s at 8–13% utilization). *Then the coherence capstone*: "and this is why the framework holds you to it" — kept subordinate, so a learner who never uses GSD still gets full value. → the skill's basis + gates.
5. **Practice + check** — a "now you try" drill on a **constructed scenario** the agent invents (no repo required); the learner answers, the agent confirms and feeds the calibration mirror. *Optional bonus when the learner is in a relevant project:* grep their code for a real instance and show it.

**Two distinctions this pattern keeps separate (earlier drafts conflated them):**
- *Production vs recognition* — beat 2 (how to build it) is a different skill from beat 3 (recognizing good-vs-bad). Seeing that a fake beats a mock ≠ being able to write the fake. Both are taught.
- *Application vs calibration* — they are not rivals. Calibration is the higher-value, more-unique goal (the internet is saturated with how-to and weak on when); but it is taught *through* concrete construction and contrast, never as abstract preaching. Beat 1 is the foundation; 2 is production; 3 is calibration; 4 is justification; 5 makes it stick. Depth and ordering *within* a beat are personalized (§5).

## 3. The concept catalog

`gsd-core/references/learn-catalog.md` — the curriculum graph. **84 nodes across 10 tracks** (Domain, Architecture, Testing, Security, Frontend, FE↔BE Seam, CI/CD, Infrastructure & Ops, Process, Code Quality). Each node carries: `ID`, `Concept`, `Source` (reference § section), `Prereqs` (graph edges), `Visual` (diagram / code / —).

The catalog is the single source of *what is teachable* and *where its truth lives*. A node whose `Source` doesn't resolve to a real reference section is a build failure, not a silent gap (§9). Cross-track concepts live in exactly one home track and are referenced by ID (e.g. `test-contract` is the home of contract testing; the Seam track links to it).

## 4. Components & file footprint

| File | Role | New? |
|---|---|---|
| `skills/gsd-learn/SKILL.md` | the skill surface (objective, execution_context, flags) | new |
| `commands/gsd/learn.md` | command registration, argument-hint, routing | new |
| `gsd-core/workflows/learn.md` | the inline teaching procedure the skill follows: load → select → teach → record | new |
| `gsd-core/references/teaching-pattern.md` | the five-beat doctrine (how the main agent teaches a node) | new |
| `gsd-core/references/learn-catalog.md` | the concept graph | **created** |
| `~/.claude/gsd-core/LEARNING-PROGRESS.md` | per-user, cross-project progress state | new (runtime) |
| `gsd-core/bin/gsd-tools.cjs` + `src/*.cts` | a `learn` query handler (catalog read, progress read/write) | extend |
| `docs/INVENTORY.md` + `docs/INVENTORY-MANIFEST.json` | registration (+counts) | extend |
| `.changeset/*.md` | release fragment (type: Added) | new |
| `tests/learn-catalog-*.test.cjs` | catalog completeness + graph-acyclicity tests | new |

## 5. Data flow (all inline, one context)

1. **Invoke** `/gsd:learn` → the main agent loads the catalog, `USER-PROFILE.md`, and `LEARNING-PROGRESS.md` (all small).
2. **Select** the concept(s) — by argument, by resume, or by walking prerequisite edges (§6).
3. **Load on demand** *only* the source section(s) for the concept(s) in play (the catalog's `Source` pointers; read the section, not the whole file — per `context-budget.md`). The agent now holds the concept(s) in its own context.
4. **Teach inline** through the five beats, conversationally — render beats 1–4, optionally open the browser for `Visual` assets, and run beat 5 via `AskUserQuestion` on a constructed scenario (no repo required). *If* the learner is in a relevant project, optionally grep it for a real instance as a personalized bonus.
5. **Record** completion + the **calibration lean** (over/under/on-target) to `LEARNING-PROGRESS.md`.

**Cross-concept teaching is the reason it's inline.** When the learner asks "how do architecture and testing fit together?", the agent loads *both* relevant nodes (`arch-when-to-use` and `test-shape-follows-arch`, which the catalog already links by prerequisite) and teaches the connection live — *"the test shape isn't a choice; it falls out of the architecture you just learned"* — in one continuous context. A subagent-per-concept design could not do this; it would return two isolated lessons that never meet. The agent also follows arbitrary follow-ups ("wait, why a fake and not a mock here?") without spawning anything, because every concept it has touched this session is still in context.

Context stays bounded by reading **per-section, on demand** (the catalog is the index; references are read only when a concept is actually taught), not by farming reads out to subagents.

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

- **Runs standalone — no project required.** The curriculum (references), profile, and progress all live in `~/.claude/gsd-core/`, so `/gsd:learn` works in an empty directory or on a fresh machine. The full lesson (concept → how → when → why → practice on a constructed scenario) needs no repo. A junior who has never touched a codebase gets the complete lesson.
- **No profile yet** → neutral defaults (concise depth, example-then-principle) + a one-line offer to run `/gsd:profile`.
- **Browser unavailable / headless** → graceful terminal-only render; `Visual` beats degrade to an ASCII sketch + prose.
- **Unmet prerequisites** → offer the prereq chain; respect an explicit override.
- **Catalog integrity** → `tests/learn-catalog-*.test.cjs` enforces the completeness contract: every `Source` resolves to a real reference section, every `Prereqs` ID exists, the graph is acyclic, no cross-track duplication. A drift here fails CI.
- **Reference moved/renamed** → the catalog test catches the broken `Source` pointer before release (the same discipline that keeps the build agents honest).

## 10. The visual layer (optional, where it earns it)

Reuse the superpowers mechanism (tiny local Node server watching a content dir + WebSocket reload + graphviz for diagrams) — copied in, coordinate-rewritten, not depended upon. The browser is used only for nodes flagged `diagram` or `code`: the pyramid/diamond emerging from an architecture, the hexagon's ports/adapters, the compute ladder, code-both-ways side-by-side, the over↔under spectrum slider. The terminal carries the Socratic dialogue. HTML is generated per node (and per the learner's answer), never pre-baked. Fully optional — the feature is complete and useful terminal-only.

## 11. Scope: all ten tracks at once (with Testing as the validation focus)

**v1 ships all 84 nodes across all ten tracks** — not a single-track wedge. The wedge instinct comes from *building* products (each slice is real work); it does not apply here because:

- **The content already exists** — the references, for every domain. There is no per-track authoring.
- **The engine is track-agnostic** — the five-beat pattern teaches any node the same way (every reference shares the floor/rungs/tells/evidence skeleton). Building it once covers all 84.
- **The prerequisite graph is already cross-wired** — `test-shape-follows-arch → arch-when-to-use`, `test-fake-at-ports → arch-hexagonal`, `seam-cors-csrf → sec-authn`. Shipping one track alone would leave those edges dangling at un-built tracks. The cross-links *require* the tracks to ship together.

What Testing-first legitimately buys is a **development-time validation focus, not a shipping gate**: the Testing track is the deepest set of references and the learner's highest-value gap, so it's where we tune the five-beat pattern until the teaching quality is right. Once the pattern teaches Testing well, it teaches every track well — same engine, same skeleton. So: build the engine, validate it hard against Testing, ship all ten tracks together.

## 12. Out of scope (v1)

- **`/gsd:learn this`** — explaining the calibration the framework *just made in the learner's project* (the ADR that chose Domain Model, the test shape it derived). High value, but couples to the build loop; design toward it, ship it as a fast-follow.
- Authoring *new* concept content beyond what the references hold (the catalog only renders existing skills).
- A hosted/web version, accounts, or multi-user progress. Local, single-developer, file-based only.
- Quizzes-as-assessment / certification. The comprehension check is formative, not graded.

## 13. Decisions locked during design

- **Inline skill, not subagents** — teaching is conversational and cross-concept; the lesson must live in one context so the agent can connect concepts live and follow arbitrary follow-ups. Subagents would isolate each concept and defeat the purpose. (We build with subagents; we teach inline.)
- **Five beats: concept → how to implement → when (calibration) → why → practice+check.** Production (beat 2) and recognition (beat 3) are distinct skills, both taught; application and calibration are not rivals — calibration is taught *through* construction and contrast, never as abstract preaching; the framework-why (beat 4) is a subordinate coherence capstone, never the core.
- **Runs standalone** — no repo or GSD project required; the practice drill uses a constructed scenario, and "show it in your own code" is an optional bonus only.
- **Concept first, then calibration** — both halves, in order. (Not calibration-only — that was the corrected misread.)
- **Render the references; don't re-author** — one source of truth per concept; coherence is the product.
- **84 nodes, 10 tracks, cross-linked not duplicated** — granularity matches the material (deep in Testing/Architecture/Security; tight in Code Quality).
- **Catalog is machine-checked** — a dangling source/prereq is a build failure.
- **Visual layer is optional** — terminal-complete; browser only where visual genuinely wins.
- **All ten tracks ship in v1** — the content exists, the engine is track-agnostic, and the prereq graph is cross-wired; a single-track release would dangle its edges. Testing is the *validation focus* during the build, not a scope gate.
