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
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; _gsd_at() { for _p; do if [ -f "$_p" ]; then GSD_TOOLS="$_p"; return 0; fi; done; return 1; }; _gsd_id_ok() { case "$("$1" runtime-identity --raw 2>/dev/null || true)" in '{"packageName":"@therocketcode/gsd-core"'*'}') return 0;; *) return 1;; esac; }; _gsd_homes() { set -- "${CLAUDE_CONFIG_DIR:-$HOME/.claude}" "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}" "$HOME/.gemini/antigravity-ide" "$HOME/.gemini/antigravity-cli" "${AUGMENT_CONFIG_DIR:-$HOME/.augment}" "${CLINE_CONFIG_DIR:-$HOME/.cline}" "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}" "${CODEX_HOME:-$HOME/.codex}" "${COPILOT_CONFIG_DIR:-${COPILOT_HOME:-$HOME/.copilot}}" "${CURSOR_CONFIG_DIR:-$HOME/.cursor}" "${HERMES_HOME:-$HOME/.hermes}" "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}" "${KIMI_CONFIG_DIR:-$HOME/.config/agents}" "$HOME/.agents" "${KIMI_CODE_HOME:-$HOME/.kimi-code}" "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}" "${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}" "${QWEN_CONFIG_DIR:-$HOME/.qwen}" "${TRAE_CONFIG_DIR:-$HOME/.trae}" "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}" "${ZCODE_CONFIG_DIR:-$HOME/.zcode}" "${GROK_AGENTS_HOME:-$HOME/.agents}"; for _h; do _gsd_at "$_h/gsd-core/bin/${_GSD_SHIM_NAME}" && return 0; done; return 1; }; if _gsd_at "${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}"; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif _gsd_homes; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif unset -f gsd_run; _G="$(command -v gsd_run)"; [ -n "$_G" ] && _gsd_id_ok "$_G"; then GSD_TOOLS="$_G"; gsd_run() { "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and no identity-proving gsd_run is on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi; GSD_IDENTITY_STATUS=unverified; _gsd_id_ok gsd_run && GSD_IDENTITY_STATUS=ok; export GSD_IDENTITY_STATUS; [ "$GSD_IDENTITY_STATUS" = ok ] || echo "WARNING: \"$GSD_TOOLS\" did not prove it is @therocketcode/gsd-core - it is either a different package or an @therocketcode/gsd-core older than the runtime-identity verb. See docs/how-to/diagnose-a-foreign-gsd-tools.md" >&2; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${GSD_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${GSD_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
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
