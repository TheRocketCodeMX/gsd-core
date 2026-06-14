# Codebase scout — map selection + scaled deep-scout protocol

> Lazy-loaded reference for the `scout_codebase` step in
> `workflows/discuss-phase.md` (extracted via #2551 progressive-disclosure
> refactor). Read this when the workflow needs to scout the codebase before
> identifying gray areas.
>
> The scout has **two paths**. Assess depth FIRST (see "Depth assessment"),
> then run exactly one:
> - **Shallow path** (default for trivial/reversible phases) — the light
>   inline map-selection scan below. Cheap.
> - **Deep path** (complex / high-blast-radius / hard-to-reverse / touches
>   the core) — parallel read-only explorers on distinct lenses, then an
>   orchestrator confirm-or-refute gate. ~15× the tokens; earned, not default.
>
> Both feed the same internal `<codebase_context>`. The deep path adds a
> VERIFIED-vs-INFERRED split and a reconciled, evidence-backed understanding.

## Depth assessment (run first — gates the cheap vs deep path)

Do NOT always-max. Multi-agent scouting burns ~15× the tokens of a single
read; spend it only where blast-radius justifies it. Score the phase on four
axes (from the phase title, ROADMAP entry, and prior context):

| Axis | Light end (→ shallow) | Heavy end (→ deep) |
|---|---|---|
| **Complexity** | one file, clear-cut, CRUD | cross-cutting, many moving parts |
| **Blast radius** | isolated, leaf code | touches the core / shared infra / many call sites |
| **Reversibility** | trivially revertable | hard to reverse (schema, public API, data migration, payments) |
| **Decomposability** | n/a | understanding splits cleanly into independent angles |

**Routing rule:**
- **All axes light** → **shallow path**. Run the map-selection scan only.
- **Any of: high complexity, high blast-radius, low reversibility, or "touches
  the core"** → **deep path** (parallel lenses + confirm-or-refute gate).
- **Tightly-coupled / sequential understanding** (the angles can't be explored
  independently) → prefer **one deep continuous-context pass** over many
  parallel explorers (Cognition: parallel workers drift on conflicting
  assumptions). Use the deep path's verification gate, but a single explorer.

**Overrides:** an explicit `--deep` forces the deep path; `--shallow` forces
the light path. With no flag, the routing rule above decides. Log the resolved
path and the axis that triggered it (e.g. `[scout] deep — schema change,
low reversibility`).

## Shallow path — phase-type → recommended maps

The cheap, single-pass scan. Read 2–3 maps based on inferred phase type. Do
NOT read all seven — that inflates context without improving discussion
quality.

| Phase type (infer from title + ROADMAP entry) | Read these maps |
|---|---|
| UI / frontend / styling / design | CONVENTIONS.md, STRUCTURE.md, STACK.md |
| Backend / API / service / data model | STACK.md, ARCHITECTURE.md, INTEGRATIONS.md |
| Integration / third-party / provider | STACK.md, INTEGRATIONS.md, ARCHITECTURE.md |
| Infrastructure / DevOps / CI / deploy | STACK.md, ARCHITECTURE.md, INTEGRATIONS.md |
| Testing / QA / coverage | TESTING.md, CONVENTIONS.md, STRUCTURE.md |
| Documentation / content | CONVENTIONS.md, STRUCTURE.md |
| Mixed / unclear | STACK.md, ARCHITECTURE.md, CONVENTIONS.md |

Read CONCERNS.md only if the phase explicitly addresses known concerns or
security issues.

## Single-read rule

Read each map file in a **single** Read call. Do not read the same file at
two different offsets — split reads break prompt-cache reuse and cost more
than a single full read.

## No-maps fallback

If `.planning/codebase/*.md` does not exist:
1. Extract key terms from the phase goal (e.g., "feed" → "post", "card",
   "list"; "auth" → "login", "session", "token")
2. `grep -rlE "{term1}|{term2}" src/ app/ --include="*.ts" ...` (use `-E`
   for extended regex so the `|` alternation works on both GNU grep and BSD
   grep / macOS), and `ls` the conventional component/hook/util dirs
3. Read the 3–5 most relevant files

## Output (internal `<codebase_context>`)

From the scan, identify:
- **Reusable assets** — components, hooks, utilities usable in this phase
- **Established patterns** — state management, styling, data fetching
- **Integration points** — routes, nav, providers where new code connects
- **Creative options** — approaches the architecture enables or constrains

Used in `analyze_phase` and `present_gray_areas`. NOT written to a file —
session-only.

On the **deep path**, this same `<codebase_context>` additionally carries a
`VERIFIED facts` / `INFERRED facts` split and the explicit open questions left
at the stop (see below).

---

## Deep path — parallel read-only explorers on distinct lenses

Run this only when the depth assessment routed here. Reuses the exact
parallel-dispatch machinery the advisor mode (`modes/advisor.md`
`advisor_research`) and `discuss-phase-assumptions.md` already use: spawn
`Agent()` calls simultaneously, then synthesize. Do NOT invent new machinery.

**Read-only is a hard constraint.** Explorers answer questions; they never
write code (Cognition: parallel writers amplify conflicting decisions; parallel
read-only scouts are safe). They glob/grep/read/inspect git history only.

### Lens menu — pick 2–4 relevant to the phase type

Spawn one explorer per lens, each owning a DISTINCT angle (not N identical
agents — that just duplicates work). Give each Anthropic's 4-part contract:
objective, output format, tools/sources, and boundaries ("don't cover X —
that's another explorer's job").

| Lens | Owns | Pick when |
|---|---|---|
| **by-layer / structure & dependency** | architecture, modules, who-calls-whom, the real dependency graph | almost always (the spine) |
| **by-data-flow** | how data enters / transforms / exits; invariants; persistence | data models, schema, state, pipelines |
| **by-control-flow / call-path** | real execution paths, entry points (traced, not assumed) | behavior changes, request/handler flows |
| **by-goals/intent + tests-as-spec** | what it's supposed to do; tests read as the executable spec; existing conventions to imitate | any phase modifying established behavior |
| **by-failure-mode** | error handling, edge cases, where it breaks, retry/timeout paths | high-blast-radius, low-reversibility, infra |

Default selection: **by-layer + by-goals/tests** for most phases; add
**by-data-flow** for data/schema work, **by-control-flow** for behavior work,
**by-failure-mode** for high-blast-radius/infra.

### Explorer contract (required of every lens)

Each explorer MUST return:
- **Load-bearing claims with `file:line` citations** — and, for counts or
  exhaustiveness claims, the command + its raw output. No bare assertions.
- **An honest coverage statement** — "searched 2 of 5 dirs", not
  "searched all locations". Partial is fine; lying-by-omission is not.
- **A VERIFIED vs INFERRED split** — facts read from tool output vs
  conclusions drawn from them.

> **ORCHESTRATOR RULE — CODEX RUNTIME**: After calling all Agent() calls above
> to spawn explorers, do NOT independently scout or analyze the codebase while
> the subagents are active. Wait for all explorers to return before
> synthesizing. This prevents duplicate work and wasted context.

## Orchestrator confirm-or-refute gate (the load-bearing part)

~20–30% of subagent reports contain at least one claim that doesn't match the
underlying tool output, and self-verification is unreliable. So the
orchestrator does NOT trust the explorers' prose. After all explorers return,
before adopting anything into `<codebase_context>`:

1. **Spot-check the highest-risk / load-bearing claims against RAW TOOL
   OUTPUT** — re-read the actual file at the cited `file:line`, re-run the
   grep/count yourself. Check claims against the tool output, never against the
   agent's summary. Prioritize: inflated/exhaustiveness claims ("found 15
   files", "searched all", "applied successfully"), and any claim a gray area
   or plan would hang on. You need not re-verify everything — re-derive the
   pivotal facts.
2. **Require citations for load-bearing claims.** A load-bearing claim with no
   `file:line` (or no command+output) is treated as INFERRED, not VERIFIED,
   until you ground it yourself.
3. **Reconcile contradictions — mandatory, never silently pick.** When two
   explorers disagree (e.g. "3 call sites" vs "5 call sites"), surface the
   contradiction and resolve it against ground truth (re-grep), don't merge or
   pick one quietly.
4. **Separate VERIFIED from INFERRED** in the resulting `<codebase_context>`.
   Carry both forward labelled — never collapse inference into fact.
5. **Never summarize a summary.** On any disputed or load-bearing point,
   re-ground at the source rather than paraphrasing an explorer's paraphrase.

## Sufficiency stop (avoid analysis paralysis)

State the stop criterion explicitly. Stop scouting and proceed to
`analyze_phase` when **all three** hold:
- **Confidence threshold met** — the chosen lenses are covered and the real
  call-path / data-flow for the change site was traced, not assumed. Satisfice
  (~good enough to decide), don't optimize.
- **Budget cap not exceeded** — within the tool-call/explorer budget for this
  task class (cheap fact-finding gets few; complex/high-blast gets more).
- **Saturation** — the last round surfaced **no new load-bearing facts AND all
  contradictions are resolved.**

Record any remaining open questions explicitly (bounded, named) and carry them
into `<codebase_context>` — don't keep scouting to chase curiosity. Only once
the gate passes is the understanding "sufficient AND verified".
