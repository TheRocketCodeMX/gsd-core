Apply response_language to all user-facing prose — narration between tool calls, status updates, progress notes, and findings included; preserve code, paths, and identifiers.

# plan-phase — roadmap elaboration (lazy mode)

Loaded by `plan-phase` Step 1.6 **only when `ELAB=stale`** (a coarse roadmap predates the strategy artifacts). Keeps this body out of the always-loaded plan-phase context for the common case where the roadmap is already elaborated or no strategy artifacts exist.

**Detection (run first — gated + idempotent via the marker):**
```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; _gsd_at() { for _p; do if [ -f "$_p" ]; then GSD_TOOLS="$_p"; return 0; fi; done; return 1; }; _gsd_id_ok() { case "$("$1" runtime-identity --raw 2>/dev/null || true)" in '{"packageName":"@therocketcode/gsd-core"'*'}') return 0;; *) return 1;; esac; }; _gsd_homes() { set -- "${CLAUDE_CONFIG_DIR:-$HOME/.claude}" "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}" "$HOME/.gemini/antigravity-ide" "$HOME/.gemini/antigravity-cli" "${AUGMENT_CONFIG_DIR:-$HOME/.augment}" "${CLINE_CONFIG_DIR:-$HOME/.cline}" "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}" "${CODEX_HOME:-$HOME/.codex}" "${COPILOT_CONFIG_DIR:-${COPILOT_HOME:-$HOME/.copilot}}" "${CURSOR_CONFIG_DIR:-$HOME/.cursor}" "${HERMES_HOME:-$HOME/.hermes}" "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}" "${KIMI_CONFIG_DIR:-$HOME/.config/agents}" "$HOME/.agents" "${KIMI_CODE_HOME:-$HOME/.kimi-code}" "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}" "${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}" "${QWEN_CONFIG_DIR:-$HOME/.qwen}" "${TRAE_CONFIG_DIR:-$HOME/.trae}" "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}" "${ZCODE_CONFIG_DIR:-$HOME/.zcode}" "${GROK_AGENTS_HOME:-$HOME/.agents}"; for _h; do _gsd_at "$_h/gsd-core/bin/${_GSD_SHIM_NAME}" && return 0; done; return 1; }; if _gsd_at "${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}"; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif _gsd_homes; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif unset -f gsd_run; _G="$(command -v gsd_run)"; [ -n "$_G" ] && _gsd_id_ok "$_G"; then GSD_TOOLS="$_G"; gsd_run() { "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and no identity-proving gsd_run is on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi; GSD_IDENTITY_STATUS=unverified; _gsd_id_ok gsd_run && GSD_IDENTITY_STATUS=ok; export GSD_IDENTITY_STATUS; [ "$GSD_IDENTITY_STATUS" = ok ] || echo "WARNING: \"$GSD_TOOLS\" did not prove it is @therocketcode/gsd-core - it is either a different package or an @therocketcode/gsd-core older than the runtime-identity verb. See docs/how-to/diagnose-a-foreign-gsd-tools.md" >&2; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${GSD_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${GSD_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
PLANNING_ROOT=$(gsd_run query planning.inspect ${GSD_WS:+--ws=${GSD_WS##* }} --pick generated_from.planning_root)
: "${PLANNING_ROOT:?}"
GSD_WS="${GSD_WS:-}"; PROJECT_PATH=$(gsd_run query init.resume ${GSD_WS:+--ws=${GSD_WS##* }} --pick project_path); : "${PROJECT_PATH:?}"; PROJECT_DIR="${PROJECT_PATH%/*}"   # strategy artifacts sit next to PROJECT.md
ELAB=skip
if [ -f "${PLANNING_ROOT}/ROADMAP.md" ] && ! grep -q 'Elaborated against strategy' "${PLANNING_ROOT}/ROADMAP.md"; then
  for f in "${PROJECT_DIR}"/adr/*.md "${PROJECT_DIR}"/SECURITY-STRATEGY.md "${PROJECT_DIR}"/FRONTEND-ARCHITECTURE.md "${PROJECT_DIR}"/TEST-STRATEGY.md "${PROJECT_DIR}"/INFRA-STRATEGY.md "${PROJECT_DIR}"/CICD-STRATEGY.md; do
    [ -e "$f" ] && { ELAB=stale; break; }   # any present → roadmap may predate it
  done
fi
echo "roadmap_elaboration: $ELAB"
```
`ELAB=skip` → return to plan-phase and proceed; `ELAB=stale` → continue below.

Elaborate ONCE so phase *boundaries* reflect the locked decisions (Phase 1 absorbs the IaC/CI-CD/security scaffolding; split phases that straddle seams). Per-phase *detail* still comes from canonical_refs at plan time — this gate fixes only **structure**.

- **Non-interactive (auto/autonomous/`--text`):** elaborate automatically; announce what changed.
- **Interactive:** offer once (AskUserQuestion, header "Roadmap") — "Roadmap predates the strategy decisions (*list them*); elaborate its phase structure before planning? (recommended)". Decline → plan against the coarse roadmap, and append a decline marker `**Elaborated against strategy:** declined (<date>)` to `{roadmap_path}` so the gate honors the decline (its grep matches) and doesn't re-ask each phase.

Spawn the roadmapper in elaborate-mode (omit `model=` to inherit):
```
Agent(
  prompt="<objective>Run ELABORATE-MODE (per your elaborate-mode spec): detail near-horizon {roadmap_path} phases + adjust boundaries against the now-locked strategy artifacts beside PROJECT.md (adr/*, SECURITY-STRATEGY.md, FRONTEND-ARCHITECTURE.md, TEST-STRATEGY.md, INFRA-STRATEGY.md, CICD-STRATEGY.md), preserving structure/numbering/requirement-mappings/user-edits, and write the idempotency marker. Return ROADMAP ELABORATED + a change summary.</objective>\n<write_targets>\n- ROADMAP.md: {roadmap_path}\n- STATE.md: {state_path}\n- REQUIREMENTS.md: {requirements_path}\n</write_targets>",
  subagent_type="gsd-roadmapper",
  description="Elaborate roadmap against strategy"
)
```
> **ORCHESTRATOR RULE:** the roadmapper **runs in a subagent** — after spawning, stop and wait (silence during the subagent run is expected; don't kill it); then re-read ROADMAP.md — do NOT plan against the pre-elaboration roadmap.
