# Step: post_wave_tracking_update

The orchestrator-owned tracking write for a completed wave, extracted from
`execute-phase.md` step 5.7 under the ADR-857 Phase-6 rule (the host loop body
shrinks; optional/branchy detail lives in a fragment). Read and execute this
after the post-merge gate.

**Only update tracking when the post-merge tests passed (`TEST_EXIT` = 0).**
A timeout (124) is inconclusive: plans are not marked complete when integration
tests are failing *or* inconclusive.

**The gate result crosses a process boundary.** `TEST_EXIT` is set by
`post-merge-gate.md`'s Step B — a different fenced block in a different file,
therefore a **different shell** (#381). It does not survive the hand-off. Run
verbatim with the variable unset, the old guard printed
`[: : integer expression expected` twice and then
`⚠ Skipping tracking update — post-merge tests failed (exit ).`, so a **green**
wave left its plans in-progress and blamed the user's suite (e2e-4 F2). The gate
therefore records its result and this step re-derives from it; when neither the
variable nor the record exists, that is announced as its own outcome. **Absence
of a result is not a test verdict.**

An in-shell `TEST_EXIT` always wins, so the same-process case is unchanged. The
record is consumed (`rm -f`) so a stale result can never leak into the next wave.

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${GSD_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${GSD_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
# Cross-shell hand-off (#381): prefer this shell's value, else the gate's record.
# Read via node (a hard dependency of gsd_run itself — no jq required); jq stays as a fallback.
GATE_RECORD_PRESENT=0
if [ -f .planning/.gsd-post-merge-gate.json ]; then
  GATE_RECORD_PRESENT=1
  if [ -z "${TEST_EXIT:-}" ]; then
    TEST_EXIT=$(node -e 'try{const v=JSON.parse(require("fs").readFileSync(".planning/.gsd-post-merge-gate.json","utf8")).test_exit;if(v!==undefined&&v!==null)process.stdout.write(String(v))}catch{}' 2>/dev/null || true)
    [ -z "${TEST_EXIT:-}" ] && TEST_EXIT=$(jq -r '.test_exit // empty' .planning/.gsd-post-merge-gate.json 2>/dev/null || true)
  fi
fi
rm -f .planning/.gsd-post-merge-gate.json 2>/dev/null || true
if [ -z "${TEST_EXIT:-}" ]; then
  if [ "$GATE_RECORD_PRESENT" = "1" ]; then
    echo "⚠ Skipping tracking update — a gate record exists but could not be read (malformed JSON or no test_exit field). This is NOT a test failure: inspect/re-run the post-merge gate, then this step."
  else
    echo "⚠ Skipping tracking update — the post-merge gate result is unavailable (no TEST_EXIT in this shell and no recorded gate result). This is NOT a test failure: re-run the post-merge gate, then this step."
  fi
elif [ "${TEST_EXIT}" -eq 0 ]; then
  # Update ROADMAP plan progress for each completed plan in this wave
  for plan_id in {completed_plan_ids}; do
    gsd_run query roadmap.update-plan-progress "${PHASE_NUMBER}" "${plan_id}" "complete"
  done

  # Only commit tracking files if they actually changed
  if ! git diff --quiet .planning/ROADMAP.md .planning/STATE.md 2>/dev/null; then
    gsd_run query commit "docs(phase-${PHASE_NUMBER}): update tracking after wave ${N}" --files .planning/ROADMAP.md .planning/STATE.md
  fi
elif [ "${TEST_EXIT}" -eq 124 ]; then
  echo "⚠ Skipping tracking update — test suite timed out. Plans remain in-progress. Run tests manually to confirm."
else
  echo "⚠ Skipping tracking update — post-merge tests failed (exit ${TEST_EXIT}). Plans remain in-progress until tests pass."
fi
```

`{completed_plan_ids}` is the space-separated list of plan IDs that completed in
this wave (`WAVE_PLAN_IDS`).
