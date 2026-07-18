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
# pick a Verified-Facts anchor of the form `[anchor: path[:line] "substring"]` and break the fact substring
grep -nE '\[anchor: [^ ]+ "' "$CAP" | head -1        # inspect an anchor
# edit the referenced SOURCE file so the anchored fact substring no longer matches
#   (change the identifier/string the fact asserts), then:
gsd_run context verify --file "$CAP"
```

**Assert:**
```bash
# the failed claim gained an inline [STALE — <date>] annotation, in-place
grep -q '\[STALE' "$CAP" && echo OK
# the claim text itself was NOT deleted (ledger is append-only / annotate-only)
grep -Eq '\[anchor: [^ ]+ "' "$CAP" && echo OK
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

**Drive — with the session transcript captured** (assert (a) greps it; without a transcript the assert cannot be mechanical — see the fallback note below):
```
Skill: gsd-plan-phase       (target the seeded, now-old phase)
```
```bash
# TRANSCRIPT CAPTURE — pick the form that matches how you are driving the fixture:
#  - Scripted/headless drive (claude -p / SDK runner): tee the full run output:
#      <your-driver-command> 2>&1 | tee /tmp/plan-phase-transcript.log
#      TRANSCRIPT=/tmp/plan-phase-transcript.log
#  - Interactive Claude Code session: the runtime writes a JSONL transcript per session;
#    grab the newest one for the fixture project after the run:
#      TRANSCRIPT=$(ls -t ~/.claude/projects/*"$(basename "$FIX" | tr '/' '-')"*/*.jsonl 2>/dev/null | head -1)
test -s "$TRANSCRIPT" || echo "NO TRANSCRIPT — assert (a) degrades to operator-observed (see below)"
```

**Assert — (a) the plan-phase orchestrator ACTUALLY ran the freshness verify (transcript is the evidence):**
```bash
# the orchestrator's own tool calls must show a context-verify invocation during the run —
# this proves plan-phase RAN the gate, not merely that the capsule is verifiable
grep -Eq 'context verify (--file|--phase)' "$TRANSCRIPT" && echo "GATE-RAN-OK" || { echo "FAIL: no context-verify call in the plan-phase transcript — freshness gate did not run"; }
# corroboration (optional): the gate prints the verify summary to the user when stale+missing > 0
grep -Eq '"(stale|missing)":' "$TRANSCRIPT" && echo "SUMMARY-PRINTED-OK (corroboration)"
# NOTE: a capsule-side [STALE — <today>] grep is deliberately OMITTED as a corroborator here.
# Scenario 1 already annotated this same $CAP with a same-day [STALE — <today>] tamper marker,
# so a capsule grep cannot distinguish a gate-authored annotation from Scenario 1's — it
# false-positives. The transcript summary grep above (SUMMARY-PRINTED-OK) is the unambiguous
# corroborator: it evidences the gate's OWN verify output, scoped to this run's transcript.
```
> **If a transcript is genuinely not capturable in your runtime** (no `-p` driver, no JSONL transcript path): this assert **degrades to operator-observed** — a human must watch the plan-phase run and attest they saw the `context verify` call fire before the planner spawn. Record the scenario as `OPERATOR-OBSERVED`, not `PASS`; do not fake the grep.

**Assert — (b) an Orchestrator curation layer was appended BEFORE the checker ran (mtime ordering — failable):**
```bash
# the curation layer exists, dated today
grep -Eq "## Orchestrator curation \($(date +%Y-%m-%d)\)" "$CAP" && echo "CURATION-OK" || echo "FAIL: no curation layer"
# it was appended (capsule changed since pre-plan snapshot)
test "$(sha256sum "$CAP" | cut -d' ' -f1)" != "$(cat /tmp/cap_pre_plan.sha)" && echo "APPENDED-OK" || echo "FAIL: capsule unchanged"
# ORDERING: the curation append must precede the checker artifact's creation.
# Evidence source: file mtimes — reliable here because in this flow the curation append is
# the capsule's LAST write (nothing touches it between curation and the checker verdict),
# so capsule-mtime <= earliest checker-artifact-mtime iff curation happened first.
# (git commit times are NOT usable: plan-phase commits capsule + plan + verdict together.)
CURATION_TS=$(stat -c %Y "$CAP")
CHECK_TS=$(stat -c %Y "$PH"*CHECK*.md "$PH"REVIEW.md 2>/dev/null | sort -n | head -1)
test -n "$CHECK_TS" || echo "FAIL: no checker artifact found — checker never ran"
[ "$CURATION_TS" -le "$CHECK_TS" ] && echo "ORDERING-OK" || echo "FAIL: checker artifact predates the curation append — checker ran BEFORE curation (ordering violation)"
```

**Assert — planner grounded on the capsule:**
```bash
# the produced PLAN.md (or planner output) references capsule Locked Decisions
grep -Eiq 'locked decision|per (the )?capsule|CONTEXT\.md' "$PH"PLAN.md && echo OK
```

**Pass:** the transcript grep proves the orchestrator ran `context verify` during plan-phase (`GATE-RAN-OK`) AND a today-dated `## Orchestrator curation` layer was appended (capsule hash changed) AND the mtime ordering check proves the curation append predates the earliest checker artifact (`ORDERING-OK`) AND the plan references the capsule. Transcript unavailable → record `OPERATOR-OBSERVED` at best, never `PASS`.

**FALLBACK (record if Scenario 3 is soft):** if the transcript shows **no** context-verify call, or `## Orchestrator curation` is **absent**, or the ordering check fails (checker artifact predates the curation append), the soft delivery has failed in practice. The recorded remediation (per Task 10 ledger) is: **add a single plan-phase.md directive line after an upstream shrink/extraction frees bytes** — an explicit host-loop instruction to run the plan:pre freshness verify and append the curation layer before spawning the checker, replacing the memory-only envelope read. File this as a follow-up issue with the transcript evidence; do not hand-patch plan-phase.md over its byte ceiling.

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
grep -Eiq 're-?anchor' <repo>/gsd-core/workflows/resume-project.md && echo OK
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
| 3 | **plan:pre freshness gate + curation (soft)** | transcript shows the verify call + `## Orchestrator curation` appended with mtime <= earliest checker artifact |
| 4 | Calm flush hook + tone contract + flush mode | nudge present, zero panic words, PreCompact re-anchor |
| 5 | Re-anchor on resume | MASTER + capsule + SUMMARY reads + phase verify |

Record each scenario's PASS/FAIL with the literal assertion output. **Scenario 3 is the acceptance gate for the whole capability** — if it is soft, file the plan-phase.md directive-line follow-up with transcript evidence and do not mark the lifecycle dogfood-complete until it is hard-delivered or the fallback is scheduled.

Tear down: `rm -rf "$FIX"`.
