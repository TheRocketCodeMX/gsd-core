@~/.claude/gsd-core/references/response-language-directive.md

<purpose>
Execute a trivial task inline without subagent overhead. No PLAN.md, no Task spawning,
no research, no plan checking. Just: understand → do → commit → log.

For tasks where you already know what to change: typos, config values, missing
imports, renames, removing a component along with its tests and styles, dead-code
cleanup, mechanical edits repeated across a few files, committing uncommitted work,
version bumps.

Use /gsd:quick only when the work needs research, genuine multi-step planning, or a
decision you cannot make from the code in front of you.
</purpose>

<process>

<step name="parse_task">
Parse `$ARGUMENTS` for the task description.

If empty, ask:
```
What's the quick fix? (one sentence)
```

Store as `$TASK`.
</step>

<step name="scope_check">
<!-- FORK:fast-scope BEGIN -->
**Sanity check only — the default is to PROCEED.**

The user already chose /gsd:fast. Trust that choice. Do NOT bounce a task merely
because it touches several files or takes more than a minute. Explicitly IN scope:
deletions, renames, removing a component along with its tests and styles, mechanical
edits repeated across a handful of files, dead-code cleanup, config changes.

Bounce to /gsd:quick ONLY if one of these is true:
- You do not know how to implement it and would have to research first
- The intent is ambiguous enough that you would be guessing at what the user wants
- It adds a dependency, a new architectural pattern, or a schema/API contract change
- It spans more than ~10 files, or the work must be sequenced across several commits

Only then say:

```
This needs planning. Use /gsd:quick instead:
  /gsd:quick "{task description}"
```

And stop.

Bouncing is expensive — it burns a full turn and the user then pays for the whole
quick pipeline on top. Never bounce on file count alone, on line count, or on a vague
sense that the change is "big". Bounce only on the four criteria above.
<!-- FORK:fast-scope END -->
</step>

<step name="execute_inline">
<!-- FORK:fast-scope BEGIN -->
Before touching anything, run `git status --porcelain` and note which paths were
ALREADY dirty. Those are the user's pre-existing changes — they are not yours and
must not end up in this commit.
<!-- FORK:fast-scope END -->

Do the work directly:

1. Read the relevant file(s)
2. Make the change(s)
3. Verify the change works (run existing tests if applicable, or do a quick sanity check)

<!-- FORK:fast-scope BEGIN -->
Keep an explicit list of every path YOU created, edited, or deleted. That list —
not the working tree — is what gets staged in the next step.
<!-- FORK:fast-scope END -->

**No PLAN.md.** Just do it.
</step>

<step name="commit">
Commit the change atomically:

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; _gsd_at() { for _p; do if [ -f "$_p" ]; then GSD_TOOLS="$_p"; return 0; fi; done; return 1; }; _gsd_id_ok() { case "$("$1" runtime-identity --raw 2>/dev/null || true)" in '{"packageName":"@therocketcode/gsd-core"'*'}') return 0;; *) return 1;; esac; }; _gsd_homes() { set -- "${CLAUDE_CONFIG_DIR:-$HOME/.claude}" "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}" "$HOME/.gemini/antigravity-ide" "$HOME/.gemini/antigravity-cli" "${AUGMENT_CONFIG_DIR:-$HOME/.augment}" "${CLINE_CONFIG_DIR:-$HOME/.cline}" "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}" "${CODEX_HOME:-$HOME/.codex}" "${COPILOT_CONFIG_DIR:-${COPILOT_HOME:-$HOME/.copilot}}" "${CURSOR_CONFIG_DIR:-$HOME/.cursor}" "${HERMES_HOME:-$HOME/.hermes}" "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}" "${KIMI_CONFIG_DIR:-$HOME/.config/agents}" "$HOME/.agents" "${KIMI_CODE_HOME:-$HOME/.kimi-code}" "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}" "${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}" "${QWEN_CONFIG_DIR:-$HOME/.qwen}" "${TRAE_CONFIG_DIR:-$HOME/.trae}" "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}" "${ZCODE_CONFIG_DIR:-$HOME/.zcode}" "${GROK_AGENTS_HOME:-$HOME/.agents}"; for _h; do _gsd_at "$_h/gsd-core/bin/${_GSD_SHIM_NAME}" && return 0; done; return 1; }; if _gsd_at "${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}"; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif _gsd_homes; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif unset -f gsd_run; _G="$(command -v gsd_run)"; [ -n "$_G" ] && _gsd_id_ok "$_G"; then GSD_TOOLS="$_G"; gsd_run() { "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and no identity-proving gsd_run is on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi; GSD_IDENTITY_STATUS=unverified; _gsd_id_ok gsd_run && GSD_IDENTITY_STATUS=ok; export GSD_IDENTITY_STATUS; [ "$GSD_IDENTITY_STATUS" = ok ] || echo "WARNING: \"$GSD_TOOLS\" did not prove it is @therocketcode/gsd-core - it is either a different package or an @therocketcode/gsd-core older than the runtime-identity verb. See docs/how-to/diagnose-a-foreign-gsd-tools.md" >&2; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${GSD_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${GSD_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
# Stage ONLY the paths execute_inline actually touched. A blanket `git add -A` sweeps
# the whole working tree, so any pre-existing unrelated change the user had in flight
# lands inside this commit — which breaks the "atomic commit" guarantee this workflow
# claims in <success_criteria>. Substitute the explicit path list you recorded in
# execute_inline for {touched paths} below; do NOT fall back to `git add -A`.
#
# fast writes no planning artifacts (its own guardrails forbid PLAN.md/SUMMARY.md);
# .planning/ is excluded from staging when commit_docs is false.
COMMIT_DOCS=$(gsd_run query config-get commit_docs --raw 2>/dev/null || echo "true")
if [ "$COMMIT_DOCS" = "false" ]; then
  git add -- {touched paths} ':!.planning'
else
  git add -- {touched paths}
fi

# Guard: confirm nothing foreign got staged. Compare this against the pre-existing
# dirty paths from execute_inline; if an unrelated path appears, unstage it with
# `git restore --staged <path>` before committing.
git diff --cached --name-only

git commit -m "fix: {concise description of what changed}"
```

Use conventional commit format: `fix:`, `feat:`, `docs:`, `chore:`, `refactor:` as appropriate.
</step>

<step name="log_to_state">
If `.planning/STATE.md` exists and has a "Quick Tasks Completed" table, append a row
that matches the existing table's schema via the schema-backed `gsd-tools
quick-tasks-append` helper (`markdown-table.cjs`'s `appendQuickTaskRow`; #2133,
ADR-2143 §3/§7). If no table exists, skip silently. If the table's schema is
unrecognized, the helper fails loud (non-zero exit) instead of silently guessing
a column count — this replaces the prior inline `awk NF-2` arithmetic that was
the root cause of #2133.

```bash
# Detect whether STATE.md has a Quick Tasks Completed table
if grep -q "Quick Tasks Completed" .planning/STATE.md 2>/dev/null; then
  # #3730: bring a legacy pre-registry table onto the canonical schema BEFORE
  # appending — silent no-op when already canonical, so this runs harmlessly
  # on every fast task and migrates exactly once, on the first.
  gsd_run quick-tasks-migrate || true
  gsd_run quick-tasks-append --task "$TASK" || echo "⚠ fast.md log_to_state: could not append Quick Tasks row (see message above); continuing."
fi
```
</step>

<step name="done">
Report completion:

```
✅ Done: {what was changed}
   Commit: {short hash}
   Files: {list of changed files}
```

No next-step suggestions. No workflow routing. Just done.
</step>

</process>

<guardrails>
- NEVER spawn a Task/subagent — this runs inline
- NEVER create PLAN.md or SUMMARY.md files
- NEVER run research or plan-checking
<!-- FORK:fast-scope BEGIN -->
- If the task spans more than ~10 files or needs work sequenced across several
  commits, STOP and redirect to /gsd:quick
<!-- FORK:fast-scope END -->
- If you're unsure how to implement it, STOP and redirect to /gsd:quick
<!-- FORK:fast-scope BEGIN -->
- Do NOT bounce on file count below that ceiling — a 5-file deletion belongs here
<!-- FORK:fast-scope END -->
</guardrails>

<success_criteria>
- [ ] Task completed in current context (no subagents)
- [ ] Atomic git commit with conventional message
- [ ] STATE.md updated if it exists
<!-- FORK:fast-scope BEGIN -->
- [ ] No subagents spawned and no PLAN.md written — that is the point of this lane
<!-- FORK:fast-scope END -->
</success_criteria>
