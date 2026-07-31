# Context Lifecycle (`context` capability) — Design Spec

**Date:** 2026-07-18
**Status:** Approved design, pending implementation plan
**Reference implementation:** viken v47 milestone (`~/Pivoty/Projects/trinity/apps/viken/.planning/`, phases 390–396) — a live production milestone hand-rolling this exact practice. GSD must be able to produce what viken hand-rolled.

---

## 1. Problem

GSD's core bet — fresh subagent contexts + artifact handoffs — has a structural hole, proven
by a full interconnection audit (who creates / reads / updates / verifies every artifact) and
observed repeatedly in production: **phases drift from knowledge that was already grounded.**

Three mechanical causes:

- **Flaw A — upstream loss.** The pipeline preserves *decisions* and drops *evidence and
  exploration*. `research/{STACK,FEATURES,ARCHITECTURE,PITFALLS}.md` have **zero** downstream
  readers; `research/SUMMARY.md` is read exactly once (roadmap creation); PRODUCT-BRIEF never
  reaches the build loop; the new-project deep-questioning session — "the most leveraged
  moment" per GSD's own docs — leaves **no persistent trace at all**. Strategy elicitation
  debates collapse to one-line rationale cells.
- **Flaw B — reading-list holes.** discuss-phase harvests strategy-artifact *filenames* into
  canonical-refs without reading contents; the phase-researcher is told to fit the ADR rung
  but never given the ADR; the executor under a 500K context window never reads CONTEXT.md
  (PLAN prose only); the verifier's strategy-fit gate checks only FRONTEND + SECURITY — never
  DOMAIN-MODEL or TEST-STRATEGY — so execution drift from those artifacts **passes
  verification**; the grounding gate fires only at plan time, only for `done`-flipped
  Strategy-Plan rows.
- **Flaw C — forward loss.** Deviations live in SUMMARY *prose*; under the default 200K
  budget the planner reads SUMMARY frontmatter only → phase N's deviations are invisible to
  phase N+1 planning. LEARNINGS extraction is manual and 1M-gated. STATE.md is capped at
  ~100 lines and prunes to an unread STATE-ARCHIVE.md. DECISIONS-INDEX.md has a documented
  reader and **no writer anywhere in the codebase**.

The missing piece is a sixth artifact tier — **understanding** — between strategy decisions
and code facts: cross-repo topology, interconnections, experimental-vs-stable status,
verified seams with rationale. `intel/` cannot hold it (single-repo, no-temporal contract);
STATE.md cannot (size cap); PROJECT.md cannot (it is a definition, not a knowledge base).
Today that tier exists only in the orchestrator's session context — which dies at compaction.

## 2. Doctrine

> **Plans are perishable; context is durable. Front-load the context, never the plans.**

Pre-writing all PLAN.md files upfront (the Superpowers instinct) is rejected: later phases'
plans must be shaped by earlier phases' reality. What is front-loaded is *knowledge*:
verified facts with anchors, locked decisions with their why, cross-repo implications,
phase-scoped pitfalls. Knowledge is treated as **evidence**: anchored, verifiable,
superseded in layers, never silently trusted.

## 3. Naming (and a rename prep task)

The capability id is **`context`**, command family **`/gsd:context`**. The `rocket-` prefix
is dropped repo-wide as a prep task: `rocket-learn` → `learn`, `rocket-strategy` →
`strategy`, `rocket-grounding` → `grounding`. Rationale: fork-vs-upstream ownership is
already authoritatively tracked in `docs/FORK-DELTA.md`; the prefix duplicated that with a
branding smell unsuitable for a public multi-runtime OSS project. Fork capabilities are
first-class features and are named like upstream ones (`tdd`, `intel`, `research`). If a
future upstream ever ships a colliding id, the registry generator fails loudly at merge time
and the collision is resolved consciously then.

Rename mechanics: 3 capability dirs, 3 `capability.json` ids, regenerate
`capability-registry.cjs`, ~15 hand-written references (command routers, 3 test files),
FORK-DELTA/FORK-PATCHES entries updated. Frontmatter key for capsules is
`context_provenance` (not `capsule_provenance`). "Capsule" survives only as informal prose
for "a seeded CONTEXT file".

## 4. Scope

**In scope (this spec):**
1. The artifact tier (MASTER-CONTEXT, phase seeds, future-milestone capsules, discussion logs).
2. The `/gsd:context` command family (seed / verify / scout / flush / master).
3. Lifecycle wiring: capture, deliver, verify, grow (including discuss-phase
   append-never-replace and the re-anchor procedure).
4. The revived calm context-monitor hook.
5. Enforcement-alignment core patches (verifier strategy set, grounding `recommended`-row,
   researcher ADR path, deviations→frontmatter).
6. Config slice, degradation rules, multi-runtime story, CI + subagent-simulation testing,
   reference doc.

**Out of scope (separate future specs):**
- Ledger integrity pack: evidence-backed verification flips, debug-session `resolved_by` +
  reconcile sweep, deferral prose-language gate, wave file-collision guard.
- Executable acceptance requirements (`kind: measured` criteria + captured-output evidence
  store). Viken dogfoods this manually; it comes later with field data.
- Cost/token telemetry (rejected: no API-level instrumentation available across runtimes).

## 5. Artifact tier

### 5.1 `.planning/MASTER-CONTEXT.md`

Bounded **index**, target ≤ ~150 lines. Sections (proven in viken):

1. Header note: written-by, date, re-verify guidance ("re-verify anchors older than ~N commits").
2. **Milestone thesis** — one paragraph.
3. **Topology** — cross-repo/what-lives-where, branch rules, deployed environments,
   read-only trees, standing "no planning artifacts in repo X" rules.
4. **Standing rules** — user non-negotiables, numbered, enforced-not-advisory.
5. **Load-bearing verified facts** — the "don't rediscover these" list, each anchored.
6. **Protect list** — verified competitive/functional leads whose regression is a review blocker.
7. **Process** — the per-phase re-anchor + curation procedure (see §7).
8. **Key references** — pointers into `research/`, investigation/deep-design docs, milestone
   history. This section is what resurrects the flaw-A graveyards: artifacts die because no
   reading list points at them; MASTER is the pointer hub.

Created **adaptively** (see §11): only when seeding has real cross-phase content. Curated by
`/gsd:context master`: supersede stale facts, overflow depth into deep docs, keep the bound.

### 5.2 Phase seeds — inside the existing `<N>-CONTEXT.md`

No new per-phase file. `context seed` writes the discuss-phase-compatible CONTEXT file with:

```yaml
---
phase: <N>
context_provenance:
  author: orchestrator | orchestrator-fork
  date: <date>
  quality: rich | artifact-distilled | thin
  note: "<how this was produced; append contract reminder>"
---
```

Sections: **Verified Facts** (every claim anchored `path:line` or doc-ref, with source),
**Locked Decisions** (+ why), **Cross-Repo Touchpoints**, **Phase-Scoped Pitfalls**,
**What Done Looks Like**, **References** (which deep docs matter for THIS phase and why).

**Quality gating:** the orchestrator writes only what its session actually knows. A rich
multi-day session stamps `rich`; a thin/auto session distills from artifacts and stamps
`artifact-distilled` or `thin`. Downstream treats non-`rich` capsules as starting points,
never as pre-answered questions. Hollow-but-plausible capsules are worse than none; the
stamp is the defense.

### 5.3 Append-only layers + supersession

Capsules grow in appended layers; later layers **override** earlier claims; nothing is
deleted. Canonical layer headings:

- `## Scout corrections (<date>)` — output of `/gsd:context scout` (confirm-or-refute pass).
- `## Discussion additions (<date>)` — discuss-phase's `<decisions>`/`<deferred>` output.
- `## Orchestrator curation (<date>)` — post-research/post-plan curation notes.

The capsule is an auditable knowledge ledger. `[STALE — <date>]` markers from `verify` are
inline annotations, also append-style (the claim is marked, not removed).

### 5.4 Future-milestone capsules

`.planning/milestones/next/<label>-CAPSULE.md`. Deferred items and forward-routed decisions
land here ("recorded here so v49 picks it up" pattern). `new-milestone` reads a matching
capsule at opening and folds it into the milestone's context. `complete-milestone` offers
routing of acknowledged deferrals into the appropriate future capsule.

### 5.5 Discussion logs

- `<N>-DISCUSSION-LOG.md` — per-phase; discuss-phase appends its Q&A rounds.
- `.planning/PROJECT-DISCUSSION-LOG.md` — new-project deep questioning + strategy-chain
  elicitation rounds append here (question, answer, and any rejected alternative discussed).

Raw capture at source, append-only, no size bound (they are logs, read on demand, indexed
from MASTER's Key references when relevant). Capsules and strategy artifacts distill from
them; the logs preserve what distillation drops.

## 6. Command family — `/gsd:context`

Dispatched via the capability registry `default:` case to a `context-command-router.cts`
(ADR-959 command-family pattern, same as `learn`/`grounding`).

| Verb | Behavior |
|---|---|
| `seed --milestone` | Write/refresh MASTER-CONTEXT + one capsule per roadmap phase of the active milestone. The orchestrator writes them ITSELF. Where the runtime supports context-inheriting forks, the workflow MAY parallelize per phase; otherwise degrade to sequential inline writing. Never delegate capsule writing to fresh-context agents — that defeats the feature. |
| `seed --phase <N>` | Write/refresh one phase capsule. Refuses to overwrite an existing capsule's layers — it may only update the seed layer with an appended `## Seed refresh (<date>)` layer. |
| `verify [--phase <N>]` | Deterministic bash/CLI verb: parse every anchored claim in Verified Facts (and MASTER's load-bearing facts with `--milestone`); for each, check file exists + fact substring present (reuse `checkSourceCitation` mechanics — line numbers advisory, fact must be present). Output: per-claim OK/STALE; STALE claims get `[STALE — <date>]` appended annotations. Exit code 0 with report (verification informs; the freshness *gate* is in plan-phase, §7.3). |
| `scout [--phase <N>]` | Deep pass: spawn explorer subagents instructed to **refute** each capsule claim against the live codebase. Findings append as `## Scout corrections`. Offered (not forced) before discuss-phase on `rich` capsules older than the freshness threshold. |
| `flush` | The hook's target, also manual: instruct the orchestrator to update MASTER-CONTEXT (supersede stale entries, add new load-bearing facts), enrich the current phase capsule, and record session position in STATE — a calm knowledge checkpoint, not a panic save. |
| `master` | Curate MASTER-CONTEXT: re-bound to ~150 lines, supersede dead facts, push depth into deep docs, refresh Key references. |

All verbs have TEXT_MODE fallbacks for every interaction.

## 7. Lifecycle wiring

### 7.1 Capture (knowledge flows in)

| Moment | Mechanism | Integration |
|---|---|---|
| Post-roadmap | Roadmap workflow Step 5.5: offer `context seed --milestone` (auto modes: run with quality stamping; interactive: one prompt, skippable) | `gsd-core/workflows/roadmap.md` — fork-owned file, no upstream patch |
| Phase end | Promotion: SUMMARY discoveries + deviations reviewed for master-worthiness; forward-relevant items appended to later-phase capsules / future-milestone capsules | Marked patch in `transition.md` |
| Context pressure | Hook flush at 90%/95% + PreCompact (§8) | Fork-owned `hooks/` |
| Milestone end | Deferral routing into `.planning/milestones/next/*-CAPSULE.md` | Marked patch in `complete-milestone.md` |
| Elicitation sessions | Discussion-log appends | Marked patches in `new-project.md`, strategy skills' write steps, `discuss-phase.md` |

### 7.2 Deliver (knowledge flows out)

- **Planning pipeline — free.** Researcher, pattern-mapper, planner, and checker already
  read `<N>-CONTEXT.md`; seeding into that file reaches them with zero new wiring. This is
  the decisive reason capsules live in CONTEXT.md rather than a new file.
- **discuss-phase — append, never replace.** When CONTEXT.md carries `context_provenance`,
  discuss-phase presents it as pre-seeded context, asks only questions the capsule does not
  answer, and appends under `## Discussion additions`. The current overwrite path
  (`discuss-phase/resume.md` "Update it" branch) is patched: on provenance-carrying files,
  "Update it" becomes "extend it". Contract test required.
- **Executor — sectional injection.** The execute-phase spawn block's `<files_to_read>`
  gains the capsule's **Locked Decisions + Phase-Scoped Pitfalls sections only**
  (budget-light; fixes the executor's sub-500K blindness without re-bloating prompts).
  1M-mode behavior (full CONTEXT read) unchanged.
- **Verifier — What Done Looks Like.** The verifier spawn gains the capsule's What Done
  Looks Like section as acceptance-shaping input, alongside roadmap success criteria.
- **Re-anchor procedure.** `resume-project` step 0 (and documented as the standing
  post-compaction first act, injected by the PreCompact hook message): read MASTER-CONTEXT
  (if present) + active phase capsule + last phase SUMMARY, then run `context verify` and
  spot-check flagged anchors. Documented in the reference doc and the generated
  instruction-file ambient rules for non-hook runtimes.

### 7.3 Verify (knowledge stays true)

- At seed time: `seed` runs `verify` on its own output (anchors must resolve at birth).
- Pre-discussion: `scout` offered when the capsule is `rich` and older than
  `verify_max_age_commits`.
- Plan-phase freshness gate: before §4 consumes a CONTEXT.md whose provenance is older than
  `verify_max_age_commits` commits, run `context verify`; STALE-flagged claims are surfaced
  to the planner as untrusted (mirrors the §1.6 elaboration-gate pattern; deterministic).

### 7.4 Grow (knowledge compounds)

- Layered appends + supersession (§5.3).
- **Curation step** (config `context_lifecycle.curation`, default **true** — it works
  because re-anchoring makes the orchestrator's review meaningful): after researcher and
  planner outputs return, control passes to the orchestrator with an explicit instruction to
  review the artifact against MASTER + capsule and append an `## Orchestrator curation`
  layer (corrections, re-bounded tasks, locked open questions) before the checker runs.
  Registered via existing loop points (`plan:pre` contribution for the instruction;
  orchestrator-side step in plan-phase via marked patch where a loop point is absent).
- Deviations promotion: deviations gain a structured SUMMARY **frontmatter** field
  (`deviations: [{rule, what, why}]`) so frontmatter-only readers see them; transition
  promotes master-worthy ones (§7.1).

## 8. The hook — revived context monitor

`hooks/gsd-context-monitor.js` goes from deliberate no-op to calm curation prompt:

- **Main-session only:** presence of the statusline metrics bridge file
  (`/tmp/claude-ctx-{session_id}.json`) — the proven discriminator (subagents have none).
  Absent file → silent exit 0.
- **Measurement:** `used_pct` / `remaining_percentage` from the bridge file (written by the
  statusline hook); stale metrics (>60s) ignored.
- **Thresholds (config):** at **90% used** — inject calm `additionalContext`: *"Good moment
  for a break: run `/gsd:context flush` — update MASTER-CONTEXT, supersede stale entries,
  enrich the current phase capsule."* At **95%** — one firmer repeat. Debounced (no repeat
  within N tool uses), escalation bypasses debounce once.
- **PreCompact:** final flush instruction + reminder that the post-compaction first act is
  the re-anchor procedure (§7.2).
- **Tone contract:** zero urgency language. The fork disabled the upstream hook because
  panic messages derail work; the mechanism was never the problem. No "CRITICAL", no
  "immediately", no "fresh session".
- **Runtimes:** Claude Code PostToolUse/PreCompact + Gemini AfterTool (as the original
  supported). Other runtimes: no hook; the re-anchor + flush guidance ships in the generated
  instruction files (AGENTS.md et al.) as ambient rules.
- The Windows detached-spawn cwd rule (gsd-tools `--cwd`, spawn opt-out env) applies to any
  child process the hook spawns.

## 9. Enforcement alignment (marked core patches, `FORK:context`)

These hold even when nobody writes good capsules — the mechanical backstop for flaw B:

1. **Verifier strategy set:** extend the strategy-fit gate in `agents/gsd-verifier.md` to
   also honor `DOMAIN-MODEL.md` and `TEST-STRATEGY.md` when present (today: only
   FRONTEND-ARCHITECTURE + SECURITY-STRATEGY), closing the drift-passes-verification hole.
2. **Grounding `recommended`-row hole:** in `src/grounding.cts` `resolveRequiredSources`, an
   artifact that exists on disk while its Strategy-Plan row is still `recommended` becomes
   **required** (with a message prompting the `strategy-done` flip), not a warning.
3. **Researcher ADR path:** `agents/gsd-phase-researcher.md` inputs gain the latest
   `.planning/adr/*.md` (and DOMAIN-MODEL.md) so "fit the rung" is groundable.
4. **Deviations frontmatter:** SUMMARY template + executor instructions add the structured
   `deviations` frontmatter field (consumed in §7.4).

DECISIONS-INDEX.md gets **no writer**: the capsule tier supersedes it. Its lone reader
(discuss-phase) keeps working if a user hand-maintains one; the reference doc notes it as
superseded.

## 10. Config slice (capability-owned)

Following the grounding precedent (capability owns its slice, moved atomically):

```json
"context_lifecycle": {
  "enabled": true,
  "seed_offer": "prompt",            // prompt | auto | off
  "curation": true,
  "hook": { "enabled": true, "warn_pct": 90, "urge_pct": 95 },
  "verify_max_age_commits": 50,
  "discussion_logs": true
}
```

## 11. Adaptive behavior & degradation

- **Small projects feel nothing:** seeding is one skippable offer at roadmap time; declining
  writes nothing; no MASTER file → no re-anchor overhead; hook silent below thresholds.
- **MASTER creation signals:** created when `seed --milestone` produces cross-phase content —
  multi-repo (`planning.sub_repos`), brownfield mode, existing investigation/research corpus,
  or a `rich`-quality session. Otherwise phase capsules only.
- **No capsule → today's behavior exactly** (zero-capability invariant: core runs with the
  capability disabled; every consumer's current path is untouched when no provenance
  frontmatter is present).
- **Thin sessions:** quality-stamped, treated as starting points (§5.2).
- **Missing anchors:** STALE annotations, never failures.
- **No fork support:** sequential inline seeding.
- **No statusline/hook runtime:** documented manual procedure.

## 12. Testing & validation

**CI contract tests (fixtures modeled on viken's real artifacts):**
- `context_provenance` frontmatter parse (strict-YAML rules — respect the known
  YAML-description strict-parse trap for command registration).
- Append-never-replace: discuss-phase flow on a seeded CONTEXT must append a
  `## Discussion additions` layer and leave prior layers byte-identical.
- `verify` on live fixture → all OK; on tampered fixture (anchor fact removed) → STALE
  annotation appended, report lists it.
- Hook: threshold/debounce/escalation logic against fake metrics files; main-session
  discrimination; PreCompact message; tone lint (banned words list: "CRITICAL",
  "immediately", "urgent").
- Seed idempotency: re-seed refuses to clobber layers, appends `## Seed refresh`.
- Registry/command registration, config-slice federation, workflow byte budgets
  (`tests/workflow-size-budget.test.cjs`), FORK-DELTA/FORK-PATCHES manifest guard.
- Rename: registry regenerates with plain ids; no `rocket-` string remains outside history.

**Subagent E2E simulation (realistic flow proof):** a synthetic fixture project driven by
agents playing the orchestrator: new-project → strategy chain → roadmap → `seed --milestone`
→ tamper one anchor → `verify` catches it → discuss-phase appends → plan-phase consumes the
capsule (planner output cites capsule decisions) → `flush` → fresh session (simulated
compaction) → re-anchor procedure reproduces working context. Artifacts asserted at each
stage. Full `test:unit` must EXIT 0 (checked via `$?`, never a tail-grep).

**Dogfood:** user runs the viken v48 new-milestone opening on the RC build (user-driven, in
parallel; not a release blocker per the CI-first decision, but informs fixes before
`latest`).

## 13. Documentation

`gsd-core/references/context-lifecycle.md`: the doctrine (§2), when to seed (immediately
after roadmap approval, while orchestrator context is richest), capsule-vs-plan distinction
(what belongs in a capsule vs a PLAN), layering/supersession rules, the re-anchor procedure,
quality stamps, multi-runtime degradation table. Plus: README feature entry, INVENTORY +
manifest, help workflow entry, install-contract entries for all supported runtimes.

## 14. Implementation shape

- **Prep task 0:** the `rocket-` → plain rename (§3).
- **Capability `context`:** `capabilities/context/capability.json` (command family,
  config slice, hook registration, loop contributions), `src/context-command-router.cts`,
  templates (MASTER-CONTEXT, capsule seed, future-milestone capsule),
  `gsd-core/workflows/context.md` + `commands/gsd/context.md`.
- **Fork-owned file edits (no patch cost):** `roadmap.md` Step 5.5, `hooks/`.
- **Marked patches (`FORK:context`), each anchored + manifested:** `discuss-phase.md` +
  `discuss-phase/resume.md` (append contract, log), `new-project.md` + strategy skill write
  steps (discussion logs), `transition.md` (promotion), `complete-milestone.md` (deferral
  routing), `new-milestone.md` (future-capsule consumption), `execute-phase.md` (executor
  sectional injection, verifier input), `plan-phase.md` (freshness gate, curation step),
  `resume-project.md` (re-anchor step), `agents/gsd-verifier.md`,
  `agents/gsd-phase-researcher.md`, `src/grounding.cts`, SUMMARY template. Estimated ~12–15
  new manifest entries; every one updates `docs/FORK-PATCHES.json` + `docs/FORK-DELTA.md`
  and passes `tests/fork-delta-manifest.test.cjs`.
- **Branch/release:** feature branch → `next`; ships as a minor (changeset `type: Changed`).

## 15. Risks

- **Capsule quality variance** — mitigated by quality stamps + verify-at-birth + scout.
- **MASTER bloat over long engagements** — mitigated by the `master` curation verb, the
  ~150-line bound, and overflow-to-deep-docs; the bound is checked by the curation
  instruction, not a hard gate (knowledge loss from a hard truncation would be worse).
- **Patch-count growth (~12–15)** — accepted deliberately (enforcement over purity,
  grounding precedent); all anchored/manifested/guard-tested for upstream merges.
- **Hook regression on runtimes without statusline** — fails silent by design (file-absence
  check is the first line).
- **Byte budgets** — new-project/discuss-phase patches are small appends; the budget suite
  runs in CI; if a workflow busts its budget the patch moves content to a referenced file.

## 16. Follow-up specs (explicitly deferred)

1. **Ledger integrity:** evidence-backed verification flips, debug `resolved_by` +
   reconcile sweep, deferral prose-language gate, wave file-collision guard.
2. **Executable acceptance:** `kind: measured` success criteria + captured-output evidence
   store (viken dogfoods manually today; spec after field data).
