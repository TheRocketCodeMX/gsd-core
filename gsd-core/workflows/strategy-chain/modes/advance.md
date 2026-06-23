# Strategy chain — auto-advance

The strategy-side equivalent of `discuss-phase/modes/chain.md`. Invoked at the END of each strategy skill (and from `new-project` / `new-milestone`) to traverse the **archetype-tailored** strategy path recorded in PROJECT.md `## Strategy Plan` — so `--auto` runs strategy → build hands-off instead of dead-ending after the first step.

**Flat-chain rule:** always dispatch via the `Skill` tool, **never** an `Agent`/subagent spawn — nested sessions freeze (#686) and would break top-level `AskUserQuestion`. Strategy artifacts are disk-persisted, so nothing in-session needs to survive the hop (a `/clear` between steps is safe; auto-mode just skips it to save tokens).

## auto_advance step

**Input:** `CURRENT` = the strategy step that just finished (e.g. `recommend-architecture`); empty when invoked from `new-project`/`new-milestone` (the cold on-ramp).

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi
AUTO_MODE=$(gsd_run query check auto-mode --pick active 2>/dev/null || echo "false")
gsd_run query project strategy-plan 2>/dev/null   # { steps:[{step,status}], next_recommended }
```

**If `AUTO_MODE` is not `true` (interactive / manual):** do NOT dispatch. Print the calling step's `Next:` pointer with the `/clear then:` hint and stop — the user drives the next step. (The driver is a no-op beyond this in interactive mode; the printed pointer is the existing behavior.)

**If `AUTO_MODE` is `true`:** pick the next step from the Strategy Plan's **ordered** `steps` and dispatch it:
1. **Cold on-ramp** (`CURRENT` empty): target = `next_recommended` (the first step with status `recommended`).
2. **Chain hop** (`CURRENT` set): target = the first step listed **after** `CURRENT` whose status is neither `skipped` nor `done`. (Skipping `skipped` steps is how the skip-ledger is honored in auto mode — a deliberately-skipped step is never dispatched.) If `CURRENT` is not found in `steps` (name mismatch / hand-run), fall back to `next_recommended`.
3. **If a target exists**, announce it, then dispatch the target step via the `Skill` tool with its name and `--auto` (it re-invokes this driver at its own end, continuing the chain). For example, when the target is `recommend-architecture`:
   ```
   Skill(skill="gsd-recommend-architecture", args="--auto")
   ```
4. **If no target remains** (every recommended step is done or skipped), the strategy chain is complete — land in the build loop:
   ```
   Skill(skill="gsd-discuss-phase", args="1 --auto")
   ```

> If `## Strategy Plan` is absent or empty (a project that skipped the recommender), there is no strategy path to traverse — land directly in the build loop (`Skill(skill="gsd-discuss-phase", args="1 --auto")`).
