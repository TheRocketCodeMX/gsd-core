# Context Lifecycle — durable knowledge across a project

Reference for the `context` capability (`/gsd:context`) and the elicitation discussion logs. GSD's core bet — fresh subagent contexts + artifact handoffs — has a structural hole: phases drift from knowledge that was already grounded, and the richest sessions (new-project questioning, strategy trade-off debates) leave no persistent trace. This doc is the doctrine and the procedures that close it.

## Doctrine

> **Plans are perishable; context is durable. Front-load the context, never the plans.**

Pre-writing all PLAN.md files upfront is rejected — later phases' plans must be shaped by earlier phases' reality. What is front-loaded is *knowledge*: verified facts with anchors, locked decisions with their why, cross-repo implications, phase-scoped pitfalls. Knowledge is treated as **evidence**: anchored, verifiable, superseded in layers, never silently trusted.

## When to seed

Seed **right after roadmap approval** — the orchestrator's context is richest then (it just reasoned across the whole strategy chain and roadmap), and every downstream planner reads the phase `CONTEXT.md` for free. Seeding is one skippable offer (`context seed --milestone`); declining writes nothing and costs nothing. Small projects feel nothing.

## Capsule vs plan — what belongs where

A "capsule" is a seeded `<N>-CONTEXT.md`. It holds durable knowledge; the PLAN.md holds the perishable how-to.

| Belongs in the capsule (CONTEXT.md) | Belongs in the PLAN.md |
|---|---|
| Verified facts, each anchored `path:line` or doc-ref | Task breakdown, ordering, waves |
| Locked decisions **+ why** | The concrete edits/commands for this phase |
| Cross-repo touchpoints, seams | File-by-file change list |
| Phase-scoped pitfalls | Verification steps for these tasks |
| What Done Looks Like (acceptance shape) | Test plan specifics |
| References — which deep docs matter for THIS phase, and why | — |

Rule of thumb: if it stays true after this phase ships, it is context; if it is throwaway once the phase is done, it is plan.

## Layers + supersession

Capsules grow in **appended layers**; later layers **override** earlier claims; nothing is ever deleted (the capsule is an auditable knowledge ledger). Canonical layer headings, each dated:

- `## Scout corrections (<date>)` — output of `/gsd:context scout` (confirm-or-refute pass).
- `## Discussion additions (<date>)` — discuss-phase's `<decisions>`/`<deferred>` output.
- `## Orchestrator curation (<date>)` — post-research / post-plan curation notes.
- `## Seed refresh (<date>)` — a re-seed that may only touch the seed layer.

A pre-seeded capsule (one carrying `context_provenance` frontmatter) is **never overwritten** — always extended with a new layer; prior layers stay byte-identical.

## Anchor grammar + `[STALE]`

Every claim in **Verified Facts** (and MASTER-CONTEXT's load-bearing facts) is anchored so it can be re-verified:

- `path/to/file.ext:line — <the fact>` — a source-line anchor (line numbers advisory; the fact substring must be present).
- `doc:<relative-path> — <the fact>` — a document anchor.

`context verify` parses each anchor, checks the file exists and the fact substring is present, and for a failed claim **appends** an inline `[STALE — <date>]` annotation (the claim is marked, never removed). STALE is advisory: it surfaces the claim to the planner as untrusted; it never fails a run.

## Quality stamps

The `context_provenance.quality` stamp is the defense against hollow-but-plausible capsules. The orchestrator writes only what its session actually knows.

| Stamp | Stamp it when | Downstream treatment |
|---|---|---|
| `rich` | a real multi-day / multi-session engagement genuinely grounded the facts | trustworthy starting knowledge; scout offered when stale |
| `artifact-distilled` | a thin/auto session distilled the capsule from existing artifacts | starting point, not pre-answered questions |
| `thin` | little session knowledge; scaffold only | treat every claim as an open question |

Non-`rich` capsules are **never** treated as pre-answered questions. A hollow capsule is worse than none.

## Re-anchor procedure

The standing first act after any context reset / compaction (also `resume-project` step 0, and the PreCompact hook message):

1. Read `.planning/MASTER-CONTEXT.md` if present (the bounded knowledge index).
2. Read the active phase capsule (`<N>-CONTEXT.md`) + the last phase `SUMMARY.md`.
3. Run `gsd_run context verify --phase <N>` and spot-check any `[STALE]`-flagged anchors against the live tree.
4. Resume work from the re-verified picture — not from half-remembered session state.

## Discussion logs

Elicitation sessions are the highest-leverage, most-lossy moment in GSD. The distilled artifact (PROJECT.md, a strategy doc, a capsule) keeps the *decision*; the log keeps the *reasoning and the rejected alternatives* that distillation drops.

### Enable check (decidable)

The per-round append is active when the capability-owned key **`context_lifecycle.discussion_logs`** is true. Resolution rules:

- **Default true.** Per the `context_lifecycle` config slice, `discussion_logs` defaults to **true**. Treat logging as ON unless the project's config explicitly sets it to `false`.
- **Resolve once, reuse.** A workflow that already loads a config bundle at init reads the flag from that bundle **once** and reuses the resolved boolean for every round. Do not issue a per-round lookup.
- **Host-loop constraint.** Host-loop workflows (discuss-phase, plan-phase, execute-phase, verify-work, ship) MUST NOT read this key with an inline `config-get` — that trips the phase-6 config-leak guard (#1169). They resolve it through the init config bundle (or the documented default) and the owning capability renders behavior via hooks.
- **No config-load step → default.** A workflow with no config bundle applies the documented default (true).

### Log format

Append one block per Q&A round (raw capture at source, append-only, no size bound):

```
### <date> — <topic>
Q: <the question actually asked>
A: <the user's answer>
Rejected/considered: <alternatives weighed and why they lost>  (omit if none)
```

### Where logs live

| Log | Path | Fed by |
|---|---|---|
| Project-level | `.planning/PROJECT-DISCUSSION-LOG.md` | new-project deep questioning + the strategy-chain skills |
| Phase-level | `{phase_dir}/{padded_phase}-DISCUSSION-LOG.md` | discuss-phase's per-round appends |

Logs are for humans (audits, retrospectives) and are **not** consumed by downstream agents. Capsules and strategy artifacts distill from them; MASTER-CONTEXT's Key references points at them when relevant.

## Multi-runtime degradation

The knowledge-flush nudge and the re-anchor reminder ship differently per runtime; the *practice* is identical everywhere.

| Runtime | Flush nudge | Re-anchor |
|---|---|---|
| Claude Code, Gemini | calm hook nudge at the configured thresholds + a PreCompact flush reminder | injected by the PreCompact hook message |
| All other runtimes | no hook — run `/gsd:context flush` manually at a natural break | the re-anchor procedure (above) as documented ambient practice, carried in the generated instruction files (AGENTS.md et al.) |

The nudge is calm by contract — a knowledge checkpoint, never a panic save. No urgency language.

## Notes

- **No capsule → today's behavior exactly.** Every consumer's current path is untouched when no `context_provenance` frontmatter is present (zero-capability invariant).
- **DECISIONS-INDEX.md is superseded** by the capsule tier — it has a reader (discuss-phase) but no writer; the layered capsule ledger replaces it.
