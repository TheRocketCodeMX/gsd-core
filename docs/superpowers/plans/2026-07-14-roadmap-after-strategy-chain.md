# Plan: Generate the roadmap AFTER the strategy chain (not before)

**Goal (one sentence):** the roadmap is generated once, at the transition into the build
loop, with every strategy artifact already present — so it is born fully-informed instead
of coarse-then-patched, and the user never sees a "stale" roadmap during the strategy chain.

**Keep unchanged:** the plan-phase §1.6 elaboration gate stays exactly as-is — it is a
*correct safety net* (it still fires when a roadmap genuinely predates a later strategy
change, e.g. a new milestone). This plan just makes the happy path never trip it.

**Architecture:** the roadmapper spawn is currently copy-pasted inline in `new-project`
Step 8 and `new-milestone`. Extract it into ONE thin `gsd-roadmap` skill (a dedup, not new
surface), dispatched at the single chokepoint every path already funnels through: the
strategy-chain → build-loop transition. The skill is idempotent (create if absent /
elaborate if coarse / offer re-elaborate if current) and is also usable standalone (a real
gap today — you can't currently regenerate a roadmap).

**Why there is no kraken:** everything reaches the build loop via `advance.md` (auto) or its
printed `Next:` pointer (interactive), both currently pointing at `discuss-phase 1`. We insert
`gsd-roadmap` one step earlier on that same transition. Auto and interactive share the
transition, so it is one conceptual change, not two paths. STATE.md rides with the roadmapper
(nothing in the strategy chain reads it). The reconciliation "ROADMAP predates this decision"
nags self-silence during new-project because there is no premature roadmap to read.

---

## CORE tasks (the reorder)

### Task 1 — Create the `gsd-roadmap` skill (owns the roadmapper spawn)
**Files:** create `gsd-core/workflows/roadmap.md` + `commands/gsd/roadmap.md`; register in
`src/clusters.cts`, `commands/gsd/ns-project.md` (`requires:` + table row),
`gsd-core/workflows/help/modes/full.md`, `docs/INVENTORY.md` + `INVENTORY-MANIFEST.json`,
`tests/enh-2790-skill-consolidation.test.cjs` allowlist.
- Move the roadmapper spawn prompt verbatim from `new-project.md:1407-1435` into `roadmap.md`.
- Idempotency logic (mirrors plan-phase §1.6 + roadmapper elaborate-mode):
  - ROADMAP.md absent → create (roadmapper reads all present strategy artifacts → writes
    ROADMAP.md + STATE.md + the `Elaborated against strategy` marker when artifacts exist).
  - ROADMAP.md present, no marker, strategy artifacts exist → elaborate-mode.
  - ROADMAP.md present + marker → "already current; re-elaborate? (y/N)".
- On completion in `--auto`: chain onward via `advance.md`-style dispatch to
  `Skill(gsd-discuss-phase, "1 --auto")`. Interactive: print `Next: /gsd:discuss-phase 1`.
- **Steps:** (1) write the skill body reusing the existing spawn prompt; (2) add the 3-way
  idempotency guard; (3) register across the 6 surfaces above; (4) `gen:capability-registry`
  / inventory regen if needed.

### Task 2 — `new-project`: remove the eager roadmapper spawn
**File:** `gsd-core/workflows/new-project.md`
- Delete Step 8's roadmapper spawn block (`:1378-1445`, the spawn + present/revise loop).
  The spawn prose now lives in Task 1's skill.
- Step 9 completion summary (`:1547`): change the `Roadmap` row to
  `Roadmap | created after your strategy chain`.
- Commit line (`:1544`): drop `.planning/ROADMAP.md .planning/STATE.md` (they don't exist
  yet) — commit only PROJECT/REQUIREMENTS/INSTRUCTION_FILE at this point.
- Step 9 handoff (`:1573-1600`): unchanged when `NEXT_STRATEGY` is set (the chain reaches the
  roadmap at its end). When `NEXT_STRATEGY` is **empty** (prototype / user skipped
  strategy): auto → `SlashCommand("/gsd:roadmap --auto")` (which then chains to discuss-phase);
  interactive → pointer `Next: /gsd:roadmap`.
- **Byte win:** new-project shrinks by ~55 lines — helps its budget, doesn't hurt it.

### Task 3 — `advance.md`: create the roadmap at chain completion
**File:** `gsd-core/workflows/strategy-chain/modes/advance.md`
- Step 4 (`:26-29`, auto, "no target remains"): replace the direct
  `Skill(gsd-discuss-phase, "1 --auto")` with `Skill(gsd-roadmap, "--auto")` (the roadmap
  skill ends by dispatching discuss-phase, so the chain continues). Roadmapper is a subagent
  spawn — forbidden directly in advance.md (flat-chain rule #686) — which is exactly why it
  goes through the **Skill** dispatch of `gsd-roadmap`, not an Agent spawn. ✓ compliant.
- Empty-plan fallback (`:31`): same substitution.
- Interactive no-op branch (`:17`): the printed `Next:` transition pointer becomes
  `/gsd:roadmap` instead of `/gsd:discuss-phase 1` when the next target is the build loop.

### Task 4 — `new-milestone`: defer its roadmapper spawn too
**File:** `gsd-core/workflows/new-milestone.md`
- Remove its eager roadmapper spawn (`:250-273`); its chain re-entry (via `advance.md`) now
  reaches `gsd-roadmap` at completion.
- **NUANCE TO VERIFY (the one real unknown):** new-milestone *extends* an existing roadmap
  (adds this milestone's phases). Confirm the roadmapper's milestone/extend behavior still
  triggers correctly when invoked via `gsd-roadmap` at chain-end against an existing
  ROADMAP.md — i.e., it appends the new milestone's phases + re-elaborates, not regenerates.
  If the extend path needs the milestone context, thread it (the skill reads STATE.md /
  `current_milestone`). This is a *verify-and-thread*, not a rewrite.

## DEFENSIVE tasks (small, bounded)

### Task 5 — `progress.md`: tolerate no-roadmap-yet
**File:** `gsd-core/workflows/progress.md` — when the strategy chain is mid-flight and
ROADMAP/STATE don't exist yet, print `Strategy chain in progress — roadmap pending` instead
of erroring on a missing roadmap. (Grep for its ROADMAP/STATE reads; guard them.)

### Task 6 — `discuss-phase` / `plan-phase`: last-resort guard (defense-in-depth)
If someone reaches `discuss-phase`/`plan-phase` with NO roadmap at all (skipped the flow),
point them to `/gsd:roadmap` rather than failing with "phase not found". One conditional
line each; §1.6 in plan-phase stays for the *elaborate* case.

## Tests (Task 7)
- **Flow-ordering contract** (`tests/strategy-config-and-marker-contracts.test.cjs` or a new
  `tests/roadmap-after-strategy.test.cjs`): assert new-project's Step 8 no longer spawns the
  roadmapper; assert `advance.md` step-4 dispatches `gsd-roadmap` before `discuss-phase`;
  assert the empty-plan path routes through `gsd-roadmap`.
- **Skill registration** (existing consolidation/ns/help contract tests updated for
  `gsd-roadmap`).
- **Born-elaborated invariant:** a fixture where strategy artifacts exist → `gsd-roadmap`
  produces a ROADMAP.md containing `Elaborated against strategy`, so §1.6 evaluates `skip`.
- Full `test:unit` EXIT 0; byte-budget suites green (new-project shrinks).

## Verification (realistic, on the shippable artifact)
1. **Auto greenfield:** new-project → strategy chain → confirm ROADMAP.md is created ONCE, at
   chain end, carrying the elaborate marker; run plan-phase → §1.6 never flags stale.
2. **Interactive:** last strategy step points to `/gsd:roadmap`; it creates the roadmap then
   points to discuss-phase.
3. **Skip-all-strategies:** empty Strategy Plan → roadmap still created (coarse) at the build
   entry before discuss-phase.
4. **New-milestone:** its strategy steps run → the milestone's phases get appended/elaborated
   at chain end (Task-4 nuance).
5. **Reconciliation nags** no longer fire during new-project (no roadmap to read).

## Risks (honest, bounded — none are blockers)
- **new-milestone extend-mode** (Task 4) — the one item needing a verify-and-thread, not a
  redesign. Mitigate with the Task-4 verification fixture first.
- **STATE.md exists later** — only `progress`/statusline assume it early; Task 5 covers
  progress, and a quick statusline check.
- **Skill surface** — +1 skill (`gsd-roadmap`), justified because it *dedups* two inline
  spawns and fills the standalone-regen gap.

## Sequencing
Task 1 (skill) → Task 2 (new-project) → Task 3 (advance) → verify auto path green →
Task 4 (new-milestone, with its verification) → Tasks 5–6 (defensive) → Task 7 (tests) →
realistic verification → PR into `next`. The gate and roadmapper agent are never touched.
