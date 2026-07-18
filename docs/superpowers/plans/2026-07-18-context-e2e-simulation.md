# Context Lifecycle — E2E Simulation Run-Book

**Status:** ready to execute after the `feat/context-lifecycle` branch merges (or on the branch itself).
**Spec:** `docs/superpowers/specs/2026-07-18-context-lifecycle-design.md` · **Plan:** `docs/superpowers/plans/2026-07-18-context-lifecycle.md` · **Doctrine:** `gsd-core/references/context-lifecycle.md`

## Why this run-book exists

The per-task unit suites (18k+ assertions) prove each mechanism in isolation. They do **not** prove the mechanisms compose into a working knowledge lifecycle across a real project arc, because several deliveries are *soft* — carried by workflow prose and orchestrator memory, not by hard host-side triggers. This is a **subagent-driven, realistic** validation: drive an actual scratch project through new-project → strategy → roadmap → seed → discuss → plan → flush → resume and assert the knowledge artifacts appear, verify, layer, and survive.

The highest-risk item is **Scenario 3** (the `plan:pre` capability fragment): Task 10 was re-scoped to a capability contribution with **no host-side plan-phase trigger** (the plan-phase.md byte ceiling forbade a directive line). The freshness gate and the `## Orchestrator curation` layer therefore rely on the plan-phase orchestrator *reading the injected envelope and acting on it from memory*. Scenario 3 is designed to catch that going soft in practice; it records the exact fallback if it does.

## How to run

Execute as a **driving orchestrator** with subagents, on a throwaway fixture — never against a real project. Each scenario lists exact shell commands, Skill dispatches, and assertion greps. An assertion is a `grep`/`test` that must exit `0` (match) or `1` (absence) as annotated. Stop and record on the first hard failure.

**Binary alias.** In an installed fixture the CLI is `npx @therocketcode/gsd-core <verb>`; workflows call it via the `gsd_run` alias. This run-book writes `gsd_run` for brevity — substitute `npx @therocketcode/gsd-core` (or `node <repo>/gsd-core/bin/gsd-tools.cjs`) when executing. Config is read/written with `gsd_run config-get <key>` / `gsd_run config-set <key> <value>`.

### Setup — scratch fixture

```bash
FIX=$(mktemp -d)/ctx-e2e && mkdir -p "$FIX" && cd "$FIX"
git init -q && git commit -q --allow-empty -m "root"
# Install / link the fork under test into the fixture (plugin or npm link), then:
gsd_run --version                                   # sanity: fork resolves
# Force the deterministic, non-interactive lifecycle behaviors:
gsd_run config-set context_lifecycle.enabled true
gsd_run config-set context_lifecycle.seed_offer auto        # seed without asking, quality-stamped
gsd_run config-set context_lifecycle.curation true
gsd_run config-set context_lifecycle.discussion_logs true
```

---

## Scenario 0 — seed at the strategy→build transition (capsules + provenance exist, verify all-ok)

**Goal:** a scripted `--auto` run from new-project through roadmap, with `seed_offer: auto`, produces quality-stamped capsules and a MASTER-CONTEXT index that verify clean at birth.

**Drive:**
```
Skill: gsd-new-project      (args: --auto ; feed a small but real multi-phase brief)
Skill: gsd-roadmap          (--auto ; runs at the strategy-chain → build-loop transition)
```
Seeding fires automatically at roadmap approval because `seed_offer=auto` (equivalent to `/gsd:context seed --milestone`). The orchestrator itself writes the capsules (never a fresh-context subagent).

**Assert (each must pass):**
```bash
# MASTER-CONTEXT index exists and is bounded knowledge, not a plan
test -f .planning/MASTER-CONTEXT.md
# at least one phase capsule was seeded
ls .planning/phases/*/*-CONTEXT.md >/dev/null 2>&1 && echo OK
# every capsule carries provenance frontmatter with an honest quality stamp
for f in .planning/phases/*/*-CONTEXT.md; do
  grep -q 'context_provenance:' "$f" || { echo "MISSING PROVENANCE: $f"; exit 1; }
  grep -Eq 'quality:\s*(rich|artifact-distilled|thin)' "$f" || { echo "NO QUALITY STAMP: $f"; exit 1; }
done; echo OK
# capsules verify clean at birth across the whole milestone (no stale/missing)
gsd_run context verify --milestone --raw | tee /tmp/verify0.json
grep -q '"stale": 0' /tmp/verify0.json && grep -q '"missing": 0' /tmp/verify0.json && echo OK
# provenance reads back for a single capsule
CAP=$(ls .planning/phases/*/*-CONTEXT.md | head -1)
gsd_run context provenance --file "$CAP" --raw | grep -q '"date":'
```
**Pass:** MASTER-CONTEXT + ≥1 capsule exist, all provenance-stamped, `context verify --milestone` reports `stale: 0, missing: 0`.

---

## Scenario 1 — tamper an anchor fact → `[STALE]` annotation appears

**Goal:** `context verify` deterministically detects a broken anchored claim and annotates it in-place (marked, never removed; advisory, never fails the run).

**Drive:**
```bash
CAP=$(ls .planning/phases/*/*-CONTEXT.md | head -1)
# pick a Verified-Facts anchor of the form `path:line — <fact>` and break the fact substring
grep -nE '^[-*].*:[0-9]+ — ' "$CAP" | head -1        # inspect an anchor
# edit the referenced SOURCE file so the anchored fact substring no longer matches
#   (change the identifier/string the fact asserts), then:
gsd_run context verify --file "$CAP"
```

**Assert:**
```bash
# the failed claim gained an inline [STALE — <date>] annotation, in-place
grep -q '\[STALE' "$CAP" && echo OK
# the claim text itself was NOT deleted (ledger is append-only / annotate-only)
grep -q ' — ' "$CAP" && echo OK
# verify surfaced a nonzero stale/missing count but still exited 0 (advisory)
gsd_run context verify --file "$CAP" --raw; echo "exit=$?"   # exit=0 expected
gsd_run context verify --file "$CAP" --raw | grep -Eq '"(stale|missing)": [1-9]'
```
**Pass:** `[STALE — …]` present, original claim intact, verify exit `0` with a nonzero stale/missing tally.

---

## Scenario 2 — discuss-phase appends a layer, prior layers byte-identical

**Goal:** discuss-phase on a seeded phase **extends** the pre-seeded capsule with a `## Discussion additions` layer and never rewrites earlier layers (the pre-seeded, provenance-bearing capsule is never overwritten).

**Drive:**
```bash
PH=$(ls -d .planning/phases/*/ | head -1); CAP=$(ls "$PH"*-CONTEXT.md | head -1)
sha256sum "$CAP" | cut -d' ' -f1 > /tmp/cap_before.sha
# capture the byte range of everything ABOVE where a new layer would append
cp "$CAP" /tmp/cap_before.md
```
```
Skill: gsd-discuss-phase    (target the seeded phase; answer 2–3 questions to produce <decisions>/<deferred>)
```

**Assert:**
```bash
# a Discussion-additions layer was appended
grep -q '## Discussion additions' "$CAP" && echo OK
# everything that existed before the new layer is byte-identical (prefix match)
python3 - "$CAP" /tmp/cap_before.md <<'PY'
import sys
new=open(sys.argv[1]).read(); old=open(sys.argv[2]).read()
assert new.startswith(old), "PRIOR LAYERS MUTATED — append-never-replace violated"
print("OK")
PY
# provenance frontmatter still present (capsule never re-stamped/clobbered)
grep -q 'context_provenance:' "$CAP" && echo OK
# per-round discussion log was written (discussion_logs=true)
ls "$PH"*-DISCUSSION-LOG.md >/dev/null 2>&1 && echo OK
```
**Pass:** new `## Discussion additions` layer present, old bytes are an exact prefix of the new file, provenance intact, discussion log written.

---

## Scenario 3 — plan-phase: freshness gate fires on an OLD capsule + `## Orchestrator curation` appended before the checker (the soft-delivery scenario)

**Goal (Task 10 carry-forward — the critical one):** prove the `plan:pre` capability fragment is *actually executed by the plan-phase orchestrator*, not silently skipped. The fragment has **no host-side trigger**; it is injected into the planner prompt and the orchestrator must (a) run `context verify` when the capsule is old, and (b) append a `## Orchestrator curation (<date>)` layer **before** spawning `gsd-plan-checker`.

**Force the freshness gate to fire** (capsule age must exceed the max):
```bash
PH=$(ls -d .planning/phases/*/ | head -1); CAP=$(ls "$PH"*-CONTEXT.md | head -1)
# lower the age ceiling so ANY commit distance trips the gate
gsd_run config-set context_lifecycle.verify_max_age_commits 0
# ensure the provenance date is in the past relative to HEAD, then add commits so
# `git rev-list --count --since=<prov_date> HEAD` > 0
git commit -q --allow-empty -m "age the tree (1)"
git commit -q --allow-empty -m "age the tree (2)"
gsd_run context provenance --file "$CAP" --raw | jq -r '.date'   # confirm a real past date
sha256sum "$CAP" | cut -d' ' -f1 > /tmp/cap_pre_plan.sha
```

**Drive:**
```
Skill: gsd-plan-phase       (target the seeded, now-old phase)
```

**Assert — (a) the freshness verify actually ran on the old capsule:**
```bash
# the plan-phase transcript / STATE trail shows a context verify was run at plan:pre
#   (grep the run transcript OR re-derive: the capsule shows fresh [STALE] annotations
#    dated today if any anchor had drifted since seeding)
gsd_run context verify --file "$CAP" --raw | grep -Eq '"total": [1-9]'   # capsule was verifiable
# If any anchor drifted, a today-dated [STALE] annotation is present:
grep -Eq "\[STALE — $(date +%Y-%m-%d)" "$CAP" || echo "NOTE: no drift to annotate (acceptable if tree unchanged since seed)"
```

**Assert — (b) an Orchestrator curation layer was appended BEFORE the checker ran:**
```bash
# the curation layer exists, dated today
grep -Eq "## Orchestrator curation \($(date +%Y-%m-%d)\)" "$CAP" && echo "CURATION-OK"
# it was appended (capsule changed since pre-plan snapshot)
test "$(sha256sum "$CAP" | cut -d' ' -f1)" != "$(cat /tmp/cap_pre_plan.sha)" && echo "APPENDED-OK"
# ordering: the curation layer is in the capsule that the checker read — REVIEW/CHECK
#   artifacts for this phase exist and postdate the curation append
ls "$PH"*CHECK*.md "$PH"REVIEW.md 2>/dev/null | head -1
```

**Assert — planner grounded on the capsule:**
```bash
# the produced PLAN.md (or planner output) references capsule Locked Decisions
grep -Eiq 'locked decision|per (the )?capsule|CONTEXT\.md' "$PH"PLAN.md && echo OK
```

**Pass:** the freshness verify ran against the old capsule AND a today-dated `## Orchestrator curation` layer was appended (capsule hash changed) AND that layer predates the checker artifacts AND the plan references the capsule.

**FALLBACK (record if Scenario 3 is soft):** if `## Orchestrator curation` is **absent** or was appended **after** the checker ran (ordering violation), the soft delivery has failed in practice. The recorded remediation (per Task 10 ledger) is: **add a single plan-phase.md directive line after an upstream shrink/extraction frees bytes** — an explicit host-loop instruction to run the plan:pre freshness verify and append the curation layer before spawning the checker, replacing the memory-only envelope read. File this as a follow-up issue with the transcript evidence; do not hand-patch plan-phase.md over its byte ceiling.

---

## Scenario 4 — calm flush hook fires at high `used_pct`, then flush mode runs

**Goal:** the revived `gsd-context-monitor.js` hook emits a calm knowledge-flush nudge (never a panic) when metrics cross the threshold; `/gsd:context flush` then updates the knowledge artifacts.

**Drive — inject a 91% metrics file and fire the hook:**
```bash
SID="e2e-$(date +%s)"
TMP="${TMPDIR:-/tmp}"
cat > "$TMP/claude-ctx-$SID.json" <<JSON
{ "used_pct": 91, "timestamp": $(date +%s) }
JSON
# fire PostToolUse the way the runtime does (stdin = event JSON)
echo "{\"hook_event_name\":\"PostToolUse\",\"session_id\":\"$SID\",\"cwd\":\"$PWD\"}" \
  | node <repo>/hooks/gsd-context-monitor.js > /tmp/hook_out.json
```

**Assert — the nudge is present and calm:**
```bash
# a flush suggestion was injected as additionalContext
grep -q '/gsd:context flush' /tmp/hook_out.json && echo OK
grep -q 'knowledge checkpoint' /tmp/hook_out.json && echo OK
# TONE CONTRACT: never panic language
grep -Eqi 'CRITICAL|URGENT|immediately|STOP' /tmp/hook_out.json && { echo "TONE VIOLATION"; exit 1; } || echo "TONE-OK"
# subagent safety: no metrics file → silent (main-session-only)
echo "{\"hook_event_name\":\"PostToolUse\",\"session_id\":\"no-such\",\"cwd\":\"$PWD\"}" \
  | node <repo>/hooks/gsd-context-monitor.js > /tmp/hook_sub.json
test ! -s /tmp/hook_sub.json && echo "SUBAGENT-SILENT-OK"
# PreCompact always emits a final flush + re-anchor reminder
echo "{\"hook_event_name\":\"PreCompact\",\"cwd\":\"$PWD\"}" \
  | node <repo>/hooks/gsd-context-monitor.js | grep -q 're-anchor' && echo "PRECOMPACT-OK"
```

**Drive — run the flush and assert it curates knowledge:**
```
Skill: gsd-context   (mode: flush)
```
```bash
# MASTER-CONTEXT and the active capsule were touched by the flush (mtimes advance)
test .planning/MASTER-CONTEXT.md -nt /tmp/cap_before.md && echo OK
```
**Pass:** calm nudge injected (no panic words), subagent silent, PreCompact re-anchor reminder present, flush updated the knowledge index.

---

## Scenario 5 — fresh session resume-work performs the re-anchor reads

**Goal:** after a context reset, the standing first act is re-anchoring: read `MASTER-CONTEXT.md` + the active capsule (via `context provenance`) + the last `SUMMARY.md`, then `context verify --phase`.

**Drive (simulate a brand-new session — no carried state):**
```
Skill: gsd-resume-work     (or gsd-resume-project)
```

**Assert — the re-anchor reads happened:**
```bash
# resume ran the phase-scoped verify (its output/annotations are fresh)
gsd_run context verify --phase 1 --raw | grep -q '"total":' && echo OK
# the re-anchor procedure is discoverable/wired in the workflow the fixture ran
grep -q 'MASTER-CONTEXT' <repo>/gsd-core/workflows/resume-project.md && echo OK
grep -Eq 're-?anchor' <repo>/gsd-core/workflows/resume-project.md && echo OK
# resume silently no-ops when MASTER-CONTEXT is absent (zero-capability invariant)
mv .planning/MASTER-CONTEXT.md /tmp/mc.bak
#   re-run resume → must not error on the missing index
mv /tmp/mc.bak .planning/MASTER-CONTEXT.md
```
**Pass:** resume performs the MASTER-CONTEXT + capsule + SUMMARY reads and the phase verify, and degrades silently when no capsule exists.

---

## Exit criteria & reporting

| Scenario | Proves | Hard pass |
|---|---|---|
| 0 | Seed at transition, provenance + quality stamps | `verify --milestone` = stale 0 / missing 0 |
| 1 | Anchor verification + `[STALE]` annotation | annotation present, claim intact, exit 0 |
| 2 | Append-never-replace + discussion log | old bytes are exact prefix of new capsule |
| 3 | **plan:pre freshness gate + curation (soft)** | verify ran on old capsule + `## Orchestrator curation` appended before checker |
| 4 | Calm flush hook + tone contract + flush mode | nudge present, zero panic words, PreCompact re-anchor |
| 5 | Re-anchor on resume | MASTER + capsule + SUMMARY reads + phase verify |

Record each scenario's PASS/FAIL with the literal assertion output. **Scenario 3 is the acceptance gate for the whole capability** — if it is soft, file the plan-phase.md directive-line follow-up with transcript evidence and do not mark the lifecycle dogfood-complete until it is hard-delivered or the fallback is scheduled.

Tear down: `rm -rf "$FIX"`.
