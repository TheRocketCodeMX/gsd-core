Apply response_language to all user-facing prose — narration between tool calls, status updates, progress notes, and findings included; preserve code, paths, and identifiers.

# Strategy chain — auto-advance

The strategy-side equivalent of `discuss-phase/modes/chain.md`. Invoked at the END of each strategy skill (and from `new-project` / `new-milestone`) to traverse the **archetype-tailored** strategy path recorded in PROJECT.md `## Strategy Plan` — so `--auto` runs strategy → build hands-off instead of dead-ending after the first step.

**Flat-chain rule:** always dispatch via the `Skill` tool, **never** an `Agent`/subagent spawn — nested sessions freeze (#686) and would break top-level `AskUserQuestion`. Strategy artifacts are disk-persisted, so nothing in-session needs to survive the hop (a `/clear` between steps is safe; auto-mode just skips it to save tokens).

## auto_advance step

**Input:** `CURRENT` = the strategy step that just finished (e.g. `recommend-architecture`); empty when invoked from `new-project`/`new-milestone` (the cold on-ramp).

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; _gsd_at() { for _p; do if [ -f "$_p" ]; then GSD_TOOLS="$_p"; return 0; fi; done; return 1; }; _gsd_id_ok() { case "$("$1" runtime-identity --raw 2>/dev/null || true)" in '{"packageName":"@therocketcode/gsd-core"'*'}') return 0;; *) return 1;; esac; }; _gsd_homes() { set -- "${CLAUDE_CONFIG_DIR:-$HOME/.claude}" "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}" "$HOME/.gemini/antigravity-ide" "$HOME/.gemini/antigravity-cli" "${AUGMENT_CONFIG_DIR:-$HOME/.augment}" "${CLINE_CONFIG_DIR:-$HOME/.cline}" "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}" "${CODEX_HOME:-$HOME/.codex}" "${COPILOT_CONFIG_DIR:-${COPILOT_HOME:-$HOME/.copilot}}" "${CURSOR_CONFIG_DIR:-$HOME/.cursor}" "${HERMES_HOME:-$HOME/.hermes}" "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}" "${KIMI_CONFIG_DIR:-$HOME/.config/agents}" "$HOME/.agents" "${KIMI_CODE_HOME:-$HOME/.kimi-code}" "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}" "${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}" "${QWEN_CONFIG_DIR:-$HOME/.qwen}" "${TRAE_CONFIG_DIR:-$HOME/.trae}" "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}" "${ZCODE_CONFIG_DIR:-$HOME/.zcode}" "${GROK_AGENTS_HOME:-$HOME/.agents}"; for _h; do _gsd_at "$_h/gsd-core/bin/${_GSD_SHIM_NAME}" && return 0; done; return 1; }; if _gsd_at "${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}"; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif _gsd_homes; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif unset -f gsd_run; _G="$(command -v gsd_run)"; [ -n "$_G" ] && _gsd_id_ok "$_G"; then GSD_TOOLS="$_G"; gsd_run() { "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and no identity-proving gsd_run is on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi; GSD_IDENTITY_STATUS=unverified; _gsd_id_ok gsd_run && GSD_IDENTITY_STATUS=ok; export GSD_IDENTITY_STATUS; [ "$GSD_IDENTITY_STATUS" = ok ] || echo "WARNING: \"$GSD_TOOLS\" did not prove it is @therocketcode/gsd-core - it is either a different package or an @therocketcode/gsd-core older than the runtime-identity verb. See docs/how-to/diagnose-a-foreign-gsd-tools.md" >&2; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${GSD_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${GSD_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
# Workstream scope (#4456/#4545): the `--ws <name>` the calling skill was started with — forwarded on every dispatch below.
GSD_WS=$(echo " $ARGUMENTS" | sed -nE 's/.* --ws +([A-Za-z0-9][A-Za-z0-9._-]*).*/--ws \1/p' | head -n 1)
AUTO_MODE=$(gsd_run query check auto-mode --pick active ${GSD_WS:+--ws=${GSD_WS##* }} 2>/dev/null || echo "false")
gsd_run query project strategy-plan 2>/dev/null   # { steps:[{step,status,skipped}], next_recommended }
```

**If `AUTO_MODE` is not `true` (interactive / manual):** do NOT dispatch. Print the calling step's `Next:` pointer with the `/clear then:` hint and stop — the user drives the next step. (The driver is a no-op beyond this in interactive mode; the printed pointer is the existing behavior.) **When no strategy target remains** (this was the last step and the next target is the build loop), the terminal pointer is `/gsd:roadmap` — print `Next: /gsd:roadmap ${GSD_WS}` (it generates the now-fully-informed roadmap, then points onward to `/gsd:discuss-phase 1`), **not** `/gsd:discuss-phase 1` directly.

**If `AUTO_MODE` is `true`:** pick the next step from the Strategy Plan's **ordered** `steps` and dispatch it:
1. **Cold on-ramp** (`CURRENT` empty): target = `next_recommended` (the first step with status `recommended` that is not skipped — it already excludes ledgered skips).
2. **Chain hop** (`CURRENT` set): target = the first step listed **after** `CURRENT` whose status is not `done` and that does not carry `skipped: true`. A ledgered skip keeps its row's `recommended` status — the skip-ledger line is the record of the decision — so read the `skipped` flag, which covers both a ledgered skip and a row whose status is `skipped`. (This is how the skip-ledger is honored in auto mode — a deliberately-skipped step is never dispatched.) If `CURRENT` is not found in `steps` (name mismatch / hand-run), fall back to `next_recommended`.
3. **If a target exists**, announce it, then dispatch the target step via the `Skill` tool with its name, `--auto` and `${GSD_WS}` (empty in flat mode; it re-invokes this driver at its own end, continuing the chain). For example, when the target is `recommend-architecture`:
   ```
   Skill(skill="gsd-recommend-architecture", args="--auto ${GSD_WS}")
   ```
4. **If no target remains** (every recommended step is done or skipped), the strategy chain is complete — generate the roadmap **now** (it is finally fully-informed by every locked strategy artifact), which then chains onward into the build loop:
   ```
   Skill(skill="gsd-roadmap", args="--auto ${GSD_WS}")
   ```
   `gsd-roadmap` creates (or elaborates/extends) ROADMAP.md and ends by dispatching `Skill(gsd-discuss-phase, "1 --auto")`, so the chain continues. Dispatch it via the **Skill** tool — never an `Agent` spawn (flat-chain rule #686); `gsd-roadmap` performs the `gsd-roadmapper` Agent spawn itself, at the top level of its own session. ✓ compliant.

> If `## Strategy Plan` is absent or empty (a project that skipped the recommender), there is no strategy path to traverse — go straight to the roadmap-then-build transition (`Skill(skill="gsd-roadmap", args="--auto ${GSD_WS}")`).
