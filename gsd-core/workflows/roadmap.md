<purpose>
Create — or bring current — the project ROADMAP.md, then hand off to the build loop. This is the single owner of the `gsd-roadmapper` spawn: `new-project` and `new-milestone` used to copy-paste that spawn inline; both now funnel here so the roadmap is generated **once, at the strategy-chain → build-loop transition**, born fully-informed against every strategy artifact that already exists (instead of coarse-then-patched before the chain runs).

This is the runtime procedure behind `/gsd:roadmap`. It is **idempotent** and safe to invoke more than once on the same transition:
- **create** — no ROADMAP.md yet → derive phases from requirements.
- **elaborate** — ROADMAP.md exists, unmarked, and strategy artifacts now exist → detail near-horizon phases against the locked decisions (mirrors plan-phase §1.6).
- **extend** — a new milestone's requirements exist on top of an existing ROADMAP.md → append this milestone's phases (continue or reset numbering), preserving prior phases.
- **current** — ROADMAP.md already carries the elaboration marker → nothing to do (interactive: offer a re-elaborate; auto: pass straight through to the build loop).

The `gsd-roadmapper` **agent** (elaborate-mode / milestone-numbering spec) and the plan-phase §1.6 elaboration gate are the source of truth for HOW the roadmap is shaped — this skill only *dispatches* the roadmapper in the right mode and routes onward. It never re-implements the roadmapper's logic.
</purpose>

<required_reading>
- @$HOME/.claude/gsd-core/references/ui-brand.md — display conventions
</required_reading>

<process>

## Step 1: Initialize

**Runtime shim (REQUIRED — copy-paste verbatim):**

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${GSD_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${GSD_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
AUTO_MODE=false; case " $ARGUMENTS " in *" --auto "*|*" --autonomous "*) AUTO_MODE=true;; esac
MILESTONE_MODE=false; case " $ARGUMENTS " in *" --milestone "*) MILESTONE_MODE=true;; esac
RESET_PHASES=false; case " $ARGUMENTS " in *" --reset-phase-numbers "*) RESET_PHASES=true;; esac
AGENT_SKILLS_ROADMAPPER=$(gsd_run query agent-skills gsd-roadmapper 2>/dev/null)
```

**Guard — no project yet.** If `.planning/PROJECT.md` and `.planning/REQUIREMENTS.md` do not both exist, there is nothing to roadmap:

```
No project to roadmap yet. Run /gsd:new-project first (it defines PROJECT.md + REQUIREMENTS.md, then routes here after the strategy chain).
```

Stop.

## Step 2: Decide the mode (idempotency guard — mirrors plan-phase §1.6)

```bash
MODE=create
if [ -f .planning/ROADMAP.md ]; then
  if grep -q 'Elaborated against strategy' .planning/ROADMAP.md; then
    MODE=current
  else
    MODE=elaborate   # unmarked roadmap present
    ELAB=skip
    for f in .planning/adr/*.md .planning/SECURITY-STRATEGY.md .planning/FRONTEND-ARCHITECTURE.md .planning/TEST-STRATEGY.md .planning/INFRA-STRATEGY.md .planning/CICD-STRATEGY.md; do
      [ -e "$f" ] && { ELAB=stale; break; }   # any present → roadmap may predate it
    done
    [ "$ELAB" = skip ] && MODE=current   # unmarked but no strategy artifacts → treat as current (coarse is intentional)
  fi
fi
# Milestone extend: a fresh milestone's requirements sit on top of an existing roadmap.
if [ "$MILESTONE_MODE" = true ] && [ -f .planning/ROADMAP.md ]; then MODE=extend; fi
echo "roadmap_mode: $MODE"
```

**Determine the phase-template mode** (Vertical MVP vs Horizontal Layers). `new-project` persists the user's Step-7.5 choice as a `<!-- roadmap-mode: ... -->` marker in PROJECT.md so the deferred roadmap honors it:

```bash
PROJECT_MODE=$(grep -oiE 'roadmap-mode:[[:space:]]*[a-z]+' .planning/PROJECT.md 2>/dev/null | head -1 | grep -oiE '(mvp|standard)' | tr 'A-Z' 'a-z')
if [ -z "$PROJECT_MODE" ]; then [ "$AUTO_MODE" = true ] && PROJECT_MODE=mvp || PROJECT_MODE=standard; fi
```

**MVP-mode template rule (passed to the roadmapper):** when `PROJECT_MODE=mvp`, under each `### Phase N:` header emit `**Mode:** mvp` on the line immediately after `**Goal:**` (per-phase mode). When `PROJECT_MODE=standard`, emit the standard template with no `**Mode:**` lines.

## Step 3: Dispatch by mode

**If `MODE=current`:**
- **Auto:** announce `Roadmap already elaborated against the strategy — nothing to regenerate.` and go to Step 5.
- **Interactive:** AskUserQuestion (header "Roadmap") — "Roadmap is already current (elaborated against your strategy). Re-elaborate anyway?" → options "No, continue" (default) / "Re-elaborate". "No" → Step 5. "Re-elaborate" → treat as `MODE=elaborate` and continue.

**If `MODE=create`, `elaborate`, or `extend`:** display the banner and spawn the roadmapper.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► CREATING ROADMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning roadmapper... (runs in a subagent — no output until it returns, ~1–5 min; expected, not a freeze)
```

Spawn `gsd-roadmapper` with the block for the resolved `MODE` (omit `model=` to inherit). Substitute `${AGENT_SKILLS_ROADMAPPER}` and, for MVP projects, the Step-2 template rule.

**MODE=create:**

```text
Agent(prompt="
<planning_context>
<files_to_read>
- .planning/PROJECT.md (Project context)
- .planning/REQUIREMENTS.md (v1 Requirements)
- .planning/research/SUMMARY.md (Research findings - if exists)
- .planning/config.json (Granularity and mode settings)
- .planning/adr/*.md, SECURITY-STRATEGY.md, FRONTEND-ARCHITECTURE.md, TEST-STRATEGY.md, INFRA-STRATEGY.md, CICD-STRATEGY.md (locked strategy decisions - read every one that exists)
</files_to_read>

${AGENT_SKILLS_ROADMAPPER}
</planning_context>

<instructions>
Create the roadmap:
1. Derive phases from requirements (don't impose structure)
2. Map every v1 requirement to exactly one phase
3. Derive 2-5 success criteria per phase (observable user behaviors)
4. Detail the near-horizon phase(s); keep later phases coarse. Where strategy artifacts (ADR / SECURITY / FRONTEND / TEST / INFRA / CICD) exist, shape phase boundaries against those locked decisions AND write the marker `**Elaborated against strategy:** <artifacts> (<date>)` near the top of ROADMAP.md so the build loop never re-elaborates.
5. Apply the phase-template mode: {MVP template rule if PROJECT_MODE=mvp, else standard}
6. Validate 100% coverage
7. Write files immediately (ROADMAP.md, STATE.md, update REQUIREMENTS.md traceability), then return ROADMAP CREATED with a summary.
</instructions>
", subagent_type="gsd-roadmapper", description="Create roadmap")
```

**MODE=elaborate** (a coarse roadmap predates the strategy artifacts — mirrors `workflows/plan-phase/modes/strategy-elaboration.md`):

```text
Agent(prompt="<objective>Run ELABORATE-MODE (per your elaborate-mode spec): detail near-horizon .planning/ROADMAP.md phases + adjust boundaries against the now-locked strategy artifacts (.planning/adr/*, SECURITY-STRATEGY.md, FRONTEND-ARCHITECTURE.md, TEST-STRATEGY.md, INFRA-STRATEGY.md, CICD-STRATEGY.md), preserving structure/numbering/requirement-mappings/user-edits, and write the idempotency marker `**Elaborated against strategy:** <artifacts> (<date>)`. Return ROADMAP ELABORATED + a change summary.</objective>", subagent_type="gsd-roadmapper", description="Elaborate roadmap against strategy")
```

**MODE=extend** (a new milestone's requirements on top of an existing roadmap):

```text
Agent(prompt="
<planning_context>
<files_to_read>
- .planning/PROJECT.md (current milestone context — `## Current Milestone`)
- .planning/REQUIREMENTS.md (this milestone's requirements)
- .planning/ROADMAP.md (existing roadmap — APPEND to it, do not regenerate)
- .planning/STATE.md (current_milestone / active milestone)
- .planning/MILESTONES.md (if exists)
- .planning/config.json (phase_id_convention, granularity)
- .planning/research/SUMMARY.md (if exists)
- strategy artifacts (.planning/adr/*, SECURITY/FRONTEND/TEST/INFRA/CICD-STRATEGY.md) — read every one that exists
</files_to_read>

${AGENT_SKILLS_ROADMAPPER}
</planning_context>

<instructions>
EXTEND the existing roadmap for the current milestone — do NOT regenerate:
1. Numbering: {when RESET_PHASES=true → "restart phase numbering at 1 for this milestone (the previous milestone's directories were already archived)"; else → "continue from the previous milestone's last phase number (v1.0 ended at phase 5 → v1.1 starts at phase 6)"}. Honor `phase_id_convention` from config.
2. Derive phases from THIS MILESTONE's requirements only; map each to exactly one phase.
3. Preserve all prior milestones' phases, numbering, requirement mappings, and user edits.
4. Detail the near-horizon phase(s); keep this milestone's later phases coarse — they get elaborated against this milestone's locked decisions at the end of ITS strategy chain (or at plan-phase §1.6), not baked now.
5. Do **NOT** write the `Elaborated against strategy` marker for the appended phases, and REMOVE any existing marker line: this milestone's strategy artifacts run AFTER this step, so the roadmap must stay unmarked until the chain-end elaborate pass (or plan-phase §1.6) details the new phases against the fresh decisions. Leaving it marked would suppress that elaboration.
6. Apply the phase-template mode: {MVP template rule if PROJECT_MODE=mvp, else standard}
7. Validate 100% coverage of this milestone's requirements. Write files immediately (ROADMAP.md, STATE.md, update REQUIREMENTS.md traceability), then return ROADMAP CREATED with a summary.
</instructions>
", subagent_type="gsd-roadmapper", description="Extend roadmap for milestone")
```

> **ORCHESTRATOR RULE:** the roadmapper **runs in a subagent** — after spawning, stop and wait (silence during the subagent run is expected; do not kill it, do not read files or run tests meanwhile). Then re-read ROADMAP.md — never route against the pre-spawn roadmap.

## Step 4: Present, approve, commit

**Handle the return.** If `## ROADMAP BLOCKED`: present the blocker, resolve with the user, re-spawn. If `## ROADMAP CREATED` / `ELABORATED`: read the ROADMAP.md and present it inline:

```
---

## Proposed Roadmap

**[N] phases** | **[X] requirements mapped** | All covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | [Name] | [Goal] | [REQ-IDs] | [count] |
...

### Phase Details

**Phase 1: [Name]** — Goal: [goal]; Requirements: [REQ-IDs]; success criteria: 1. … 2. …
[... continue for all phases ...]

---
```

**Approval:** In **auto** mode, skip the gate — auto-approve. In **interactive** mode, AskUserQuestion (header "Roadmap"): "Approve" (commit + continue) / "Adjust phases" (get notes, re-spawn the roadmapper with a `<revision>` block editing files in place, loop until approved) / "Review full file" (`cat .planning/ROADMAP.md`, re-ask).

**Commit** (after approval or in auto) with the message matching the mode:

```bash
if [ "$MODE" = extend ]; then MSG="docs: extend roadmap for milestone ([N] phases added)";
elif [ "$MODE" = elaborate ]; then MSG="docs: elaborate roadmap against strategy";
else MSG="docs: create roadmap ([N] phases)"; fi
gsd_run query commit "$MSG" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md
```

## Step 5: Route onward

**If `MILESTONE_MODE=true`:** do NOT chain. Return control to the caller (`new-milestone` finishes its own remaining steps — todo linking, on-ramp). Print a one-line confirmation and stop.

**Else if `AUTO_MODE=true`:** the roadmap now exists → land in the build loop by dispatching the first phase's discussion via the **Skill** tool (never an Agent spawn):

```
Skill(skill="gsd-discuss-phase", args="1 --auto")
```

**Else (interactive standalone / chain-end pointer):** print the next-step pointer and stop:

```
───────────────────────────────────────────────────────────────

## ▶ Next Up

**Phase 1: [Phase Name]** — [Goal from ROADMAP.md]

/clear then:

/gsd:discuss-phase 1 — gather context and clarify approach

Also: /gsd:plan-phase 1 — skip discussion, plan directly

───────────────────────────────────────────────────────────────
```

</process>

<success_criteria>
- [ ] Exactly one ROADMAP.md write path per transition (create / elaborate / extend / current), chosen by the idempotency guard.
- [ ] When strategy artifacts exist, the produced ROADMAP.md carries `**Elaborated against strategy:**` so plan-phase §1.6 evaluates `skip` (born-elaborated).
- [ ] Auto mode chains to `gsd-discuss-phase 1`; interactive prints the `/gsd:discuss-phase 1` pointer; `--milestone` returns to the caller without chaining.
- [ ] The `gsd-roadmapper` agent is spawned (never re-implemented) and the roadmapper agent + §1.6 gate are left untouched.
</success_criteria>
