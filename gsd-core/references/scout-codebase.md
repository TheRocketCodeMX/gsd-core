# Codebase scout — mandatory phase exploration via parallel agents

> Lazy-loaded reference for the `scout_codebase` step in
> `workflows/discuss-phase.md`. Read this before scouting a phase.

## Exploring the phase with parallel agents is MANDATORY — always

**If you are in discuss-phase, you WILL spawn dedicated parallel read-only explorer agents to explore this phase. This is not optional, not gated on how much you already know, and not something you can satisfy by reading a few files in your own context.** What scales is the *number* of explorers and *which* lenses — never *whether* you explore.

(Proportionality lives at the command boundary, not here: genuinely trivial work routes through `/gsd:fast` or `/gsd:quick`. The moment you are running discuss-phase, the phase is substantive enough to plan — so it is substantive enough to explore. There is no "too small to scout" case inside discuss-phase.)

### Why — so you respect it instead of routing around it

- **You are exploring THIS phase specifically — not reusing the global context you think you have.** Whatever you already know is about the project in general; the phase needs targeted grounding on the exact code paths, data flows, invariants, and failure modes it will touch. General context is not phase context.
- **Exploration COMPLEMENTS and STRESS-TESTS what you know — it does not repeat it.** Its job is to surface what you *don't* know and to verify what you *think* you know against ground truth. The points you're most confident about are the ones most worth checking — confidence is where stale assumptions hide.
- **The agent that "already has the context" is the highest-risk one.** ~20–30% of even careful single-context conclusions don't survive a check against raw tool output (stale memory, an assumed call path, a pattern that changed). Skipping exploration because you feel informed is exactly how a wrong premise gets locked into CONTEXT.md and propagated through plan → execute.
- **This is the highest-leverage moment in the whole workflow.** Decisions locked here become canonical references the planner and executor must follow. A cheap, thorough exploration now prevents expensive rework later. Thoroughness beats tokens here, always.
- **Parallel agents beat one big pass** because independent lenses see what a single sweep misses, and isolating each lens in its own context keeps each one sharp.

### Rationalization-killers — every one of these is INVALID

If you catch yourself thinking any of these, STOP — you are about to under-explore. Spawn the explorers anyway:

| The rationalization | Why it's invalid |
|---|---|
| "I already have the context from committed docs / the maps." | Docs and maps are *grounding input you feed the explorers* — never a substitute for exploring the phase. They're also potentially stale; the explorers verify them. |
| "It's mostly already mapped." | "Mostly" and "this phase, verified, right now" are different. Explore the delta and re-verify the rest. |
| "I know this codebase well." | Then exploration is cheap and confirms it. If it doesn't confirm it, you needed it. |
| "The angles are tightly coupled, so I'll just do it inline myself." | Tight coupling means *fewer explorers or one dedicated explorer* — never inline-in-your-own-context. A dedicated exploration pass is still mandatory. |
| "It's a small/clear phase." | Then it routed to /gsd:fast or /gsd:quick. You're in discuss-phase, so it isn't. |
| "I'll save tokens." | Re-work from a wrong premise costs far more than the exploration. Thoroughness over tokens — the user has said this repeatedly. |

**Violating the letter of this (a couple of inline greps labelled "deep scout") is violating the spirit.** The deliverable is dedicated parallel explorers + the confirm-or-refute gate, every time.

## Mode (detect FIRST — *what* to scout; never *whether*)

Detect per change-site, not per repo (a brownfield repo can have a brand-new module; a greenfield repo can carry rich docs). Mode picks the lenses; it never licenses skipping exploration.

- **Brownfield** — real source exists for this area → **code-comprehension** lenses (below). Depth-bounded: localize to spans + blast radius.
- **Greenfield** — little/no code yet (new project / foundational phase) → **external pre-research** lenses: verify *current* library/API versions & signatures against the web (training memory is stale — ~1 in 5 generated packages is hallucinated; post-cutoff APIs run <50% without docs), find reference implementations, surface pitfalls, reconcile locked decisions against ground truth. Breadth-bounded: ~5 good sources optimal. **Never skip because "there's no code to read" — that conflation is the classic foundational-rework miss.**
- **Greenfield-with-docs** — thin code but real specs/research exist → honor the docs the way brownfield honors tests; reconcile against them.

Mixed phases run both disciplines.

## Breadth assessment (how MANY explorers — not whether)

Always spawn explorers; scale the count to the phase:
- **Focused phase** (one subsystem, clear boundary) → 2 lenses.
- **Sprawling / high-blast-radius / hard-to-reverse / touches-the-core** → 3–4+ lenses.
- **Tightly-coupled / sequential** (angles can't be explored independently — Cognition: parallel workers drift on conflicting assumptions) → **one dedicated deep explorer** with continuous context, still read-only, still through the confirm-or-refute gate. This is "fewer explorers," NOT "do it inline."

`--deep` forces the maximal fan-out; `--shallow` reduces to the 2-lens minimum (it does NOT mean "no agents"). Log the resolved breadth + the trigger (e.g. `[scout] 4 lenses — touches the core, low reversibility`).

## Lens menus — pick the relevant ones (each explorer owns a DISTINCT angle)

Give each explorer Anthropic's 4-part contract: objective, output format, tools/sources, boundaries ("don't cover X — another explorer owns it"). Feed each the grounding input (existing maps/docs) as starting context, with instructions to *verify and go deeper*, not restate.

### Brownfield lenses (existing code)

| Lens | Owns | Pick when |
|---|---|---|
| **by-layer / structure & dependency** | architecture, modules, who-calls-whom, the real dependency graph | almost always (the spine) |
| **by-data-flow** | how data enters/transforms/exits; invariants; persistence | data models, schema, state, pipelines |
| **by-control-flow / call-path** | real execution paths, entry points (traced, not assumed) | behavior changes, request/handler flows |
| **by-goals/intent + tests-as-spec** | what it should do; tests as the executable spec; conventions to imitate | any phase modifying established behavior |
| **by-failure-mode** | error handling, edge cases, where it breaks, retry/timeout paths | high-blast-radius, low-reversibility, infra |

### Greenfield lenses (external pre-research — area has no code yet)

| Lens | Owns | Pick when |
|---|---|---|
| **by-ecosystem / version ground-truth** | current lib/framework versions, signatures, breaking changes vs stale memory; deps exist & maintained | always — the greenfield spine |
| **by-reference-implementation** | how comparable real systems structure this — layout, seams, gotchas | foundational scaffolding; unfamiliar domain |
| **by-canonical-doc reconciliation** | the project's locked decisions (spec/ADR/STACK) checked against current ground truth | a strategy chain produced artifacts |
| **by-pitfalls / failure-modes** | footguns, deprecations, security advisories for the chosen stack | high-blast-radius foundational choices |

### Grounding input (feed it; don't let it replace exploration)

Maps in `.planning/codebase/*.md` (if present) and design docs are *inputs* to the explorers. If no maps exist for a brownfield area, the explorers build understanding directly (glob/grep/read/git-history). Reading a map is never the exploration — it's the starting point the explorers verify and extend.

When maps exist, select which to feed by phase type (don't dump all seven):

| Phase type (infer from title + ROADMAP entry) | Read these maps |
|---|---|
| UI / frontend / styling / design | CONVENTIONS.md, STRUCTURE.md, STACK.md |
| Backend / API / service / data model | STACK.md, ARCHITECTURE.md, INTEGRATIONS.md |
| Integration / third-party / provider | STACK.md, INTEGRATIONS.md, ARCHITECTURE.md |
| Infrastructure / DevOps / CI / deploy | STACK.md, ARCHITECTURE.md, INTEGRATIONS.md |
| Testing / QA / coverage | TESTING.md, CONVENTIONS.md, STRUCTURE.md |
| Documentation / content | CONVENTIONS.md, STRUCTURE.md |
| Mixed / unclear | STACK.md, ARCHITECTURE.md, CONVENTIONS.md |

Read each map in a **single** Read call — never split reads of the same file at two offsets (it breaks prompt-cache reuse and costs more than one full read).

### Explorer contract (required of every lens)

Each explorer MUST return: **load-bearing claims with `file:line` (or `url`+access-date) citations** — counts/exhaustiveness claims include the command + raw output; **an honest coverage statement** ("searched 2 of 5 dirs", not "searched all"); **a VERIFIED vs INFERRED split**.

> **ORCHESTRATOR RULE — CODEX RUNTIME**: After spawning the Agent() explorers, do NOT independently scout/analyze while they run. Wait for all to return, then synthesize. (Reuses the exact parallel-dispatch machinery in `modes/advisor.md` and `discuss-phase-assumptions.md` — do not invent new machinery.)

## Orchestrator confirm-or-refute gate (the load-bearing part)

Self-verification is unreliable and ~20–30% of subagent reports contain a claim that doesn't match tool output — so do NOT trust explorer prose. Before adopting anything into `<codebase_context>`:

1. **Spot-check the highest-risk / load-bearing claims against RAW TOOL OUTPUT** — re-read the cited `file:line`, re-run the grep/count yourself. Check the tool output, never the summary. Prioritize inflated/exhaustiveness claims and anything a gray area or plan will hang on. Re-derive the pivotal facts; you needn't re-verify everything.
2. **Require citations for load-bearing claims** — an uncited one is INFERRED, not VERIFIED, until you ground it.
3. **Reconcile contradictions — mandatory, never silently pick.** Two explorers disagree → resolve against ground truth (re-grep), don't merge or pick quietly.
4. **Separate VERIFIED from INFERRED** in `<codebase_context>` — carry both labelled; never collapse inference into fact.
5. **Never summarize a summary** — on any disputed/load-bearing point, re-ground at the source.

## Sufficiency stop (avoid analysis paralysis)

Stop and proceed to `analyze_phase` when **all three** hold: **confidence threshold met** (lenses covered; the real call-path/data-flow for the change site traced, not assumed; satisfice, don't optimize); **budget cap not exceeded** (scaled to the phase class); **saturation** (last round surfaced no new load-bearing facts AND all contradictions resolved). Record remaining open questions explicitly (bounded, named) and carry them into `<codebase_context>`. Only then is the understanding "sufficient AND verified".

## Output (internal `<codebase_context>`)

Reusable assets · established patterns · integration points · creative options the architecture enables/constrains — plus the **VERIFIED / INFERRED** split and the named open questions. Used in `analyze_phase` and `present_gray_areas`; session-only, not written to a file.
