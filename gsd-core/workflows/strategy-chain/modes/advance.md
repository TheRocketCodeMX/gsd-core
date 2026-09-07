Apply response_language to all user-facing prose — narration between tool calls, status updates, progress notes, and findings included; preserve code, paths, and identifiers.

# Strategy chain — auto-advance

The strategy-side equivalent of `discuss-phase/modes/chain.md`. Invoked at the END of each strategy skill (and from `new-project` / `new-milestone`) to traverse the **archetype-tailored** strategy path recorded in PROJECT.md `## Strategy Plan` — so `--auto` runs strategy → build hands-off instead of dead-ending after the first step.

**Flat-chain rule:** always dispatch via the `Skill` tool, **never** an `Agent`/subagent spawn — nested sessions freeze (#686) and would break top-level `AskUserQuestion`. Strategy artifacts are disk-persisted, so nothing in-session needs to survive the hop (a `/clear` between steps is safe; auto-mode just skips it to save tokens).

## auto_advance step

**Input:** `CURRENT` = the strategy step that just finished (e.g. `recommend-architecture`); empty when invoked from `new-project`/`new-milestone` (the cold on-ramp).

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; _gsd_at() { for _p; do if [ -f "$_p" ]; then GSD_TOOLS="$_p"; return 0; fi; done; return 1; }; if _gsd_at "${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}"; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif unset -f gsd_run; _G="$(command -v gsd_run)"; then GSD_TOOLS="$_G"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif _gsd_at "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/gsd-core/bin/${_GSD_SHIM_NAME}" "${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}" "${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}" "${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}" "${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}" "${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}" "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}" "${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}" "${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}" "${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}" "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}" "${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}" "${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}" "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}" "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}" "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}"; then gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd_run is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi; GSD_IDENTITY_STATUS=unverified; case "$(gsd_run runtime-identity --raw 2>/dev/null || true)" in '{"packageName":"@therocketcode/gsd-core"'*'}') GSD_IDENTITY_STATUS=ok;; esac; export GSD_IDENTITY_STATUS; [ "$GSD_IDENTITY_STATUS" = ok ] || echo "WARNING: \"$GSD_TOOLS\" did not prove it is @therocketcode/gsd-core - it is either a different package or an @therocketcode/gsd-core older than the runtime-identity verb. See docs/how-to/diagnose-a-foreign-gsd-tools.md" >&2; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${GSD_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${GSD_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
AUTO_MODE=$(gsd_run query check auto-mode --pick active 2>/dev/null || echo "false")
gsd_run query project strategy-plan 2>/dev/null   # { steps:[{step,status}], next_recommended }
```

**If `AUTO_MODE` is not `true` (interactive / manual):** do NOT dispatch. Print the calling step's `Next:` pointer with the `/clear then:` hint and stop — the user drives the next step. (The driver is a no-op beyond this in interactive mode; the printed pointer is the existing behavior.) **When no strategy target remains** (this was the last step and the next target is the build loop), the terminal pointer is `/gsd:roadmap` — print `Next: /gsd:roadmap` (it generates the now-fully-informed roadmap, then points onward to `/gsd:discuss-phase 1`), **not** `/gsd:discuss-phase 1` directly.

**If `AUTO_MODE` is `true`:** pick the next step from the Strategy Plan's **ordered** `steps` and dispatch it:
1. **Cold on-ramp** (`CURRENT` empty): target = `next_recommended` (the first step with status `recommended`).
2. **Chain hop** (`CURRENT` set): target = the first step listed **after** `CURRENT` whose status is neither `skipped` nor `done`. (Skipping `skipped` steps is how the skip-ledger is honored in auto mode — a deliberately-skipped step is never dispatched.) If `CURRENT` is not found in `steps` (name mismatch / hand-run), fall back to `next_recommended`.
3. **If a target exists**, announce it, then dispatch the target step via the `Skill` tool with its name and `--auto` (it re-invokes this driver at its own end, continuing the chain). For example, when the target is `recommend-architecture`:
   ```
   Skill(skill="gsd-recommend-architecture", args="--auto")
   ```
4. **If no target remains** (every recommended step is done or skipped), the strategy chain is complete — generate the roadmap **now** (it is finally fully-informed by every locked strategy artifact), which then chains onward into the build loop:
   ```
   Skill(skill="gsd-roadmap", args="--auto")
   ```
   `gsd-roadmap` creates (or elaborates/extends) ROADMAP.md and ends by dispatching `Skill(gsd-discuss-phase, "1 --auto")`, so the chain continues. Dispatch it via the **Skill** tool — never an `Agent` spawn (flat-chain rule #686); `gsd-roadmap` performs the `gsd-roadmapper` Agent spawn itself, at the top level of its own session. ✓ compliant.

> If `## Strategy Plan` is absent or empty (a project that skipped the recommender), there is no strategy path to traverse — go straight to the roadmap-then-build transition (`Skill(skill="gsd-roadmap", args="--auto")`).
