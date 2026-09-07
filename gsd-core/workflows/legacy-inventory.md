@~/.claude/gsd-core/references/response-language-directive.md

<purpose>
Exhaustively inventory a predecessor codebase being **replaced** (not extended), so requirements derive from `(design) ∪ (old-system behavior)`. Runs before new-project in rewrite/refactor/vibe-coded mode. Forced, checklist-driven exploration via parallel read-only explorers + a confirm-or-refute gate. Produces `.planning/LEGACY-INVENTORY.md` (coverage matrix · three-way gap map · salvage dispositions · characterization gates · reuse-infra plan). Recommends; the user signs off on dropped capabilities.
</purpose>

<required_reading>
@~/.claude/gsd-core/references/brownfield-adaptation.md
@~/.claude/gsd-core/references/scout-codebase.md
@~/.claude/gsd-core/references/exploration-and-adaptability.md
@~/.claude/gsd-core/templates/legacy-inventory.md
</required_reading>

<process>

## Step 1: Initialize

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; _gsd_at() { for _p; do if [ -f "$_p" ]; then GSD_TOOLS="$_p"; return 0; fi; done; return 1; }; if _gsd_at "${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}"; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif unset -f gsd_run; _G="$(command -v gsd_run)"; then GSD_TOOLS="$_G"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif _gsd_at "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/gsd-core/bin/${_GSD_SHIM_NAME}" "${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}" "${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}" "${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}" "${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}" "${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}" "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}" "${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}" "${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}" "${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}" "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}" "${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}" "${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}" "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}" "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}" "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}"; then gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd_run is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi; GSD_IDENTITY_STATUS=unverified; case "$(gsd_run runtime-identity --raw 2>/dev/null || true)" in '{"packageName":"@therocketcode/gsd-core"'*'}') GSD_IDENTITY_STATUS=ok;; esac; export GSD_IDENTITY_STATUS; [ "$GSD_IDENTITY_STATUS" = ok ] || echo "WARNING: \"$GSD_TOOLS\" did not prove it is @therocketcode/gsd-core - it is either a different package or an @therocketcode/gsd-core older than the runtime-identity verb. See docs/how-to/diagnose-a-foreign-gsd-tools.md" >&2; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${GSD_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${GSD_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
COMMIT_DOCS=$(gsd_run query config-get commit_docs --raw 2>/dev/null || echo "true")
RESPONSE_LANG=$(gsd_run query config-get response_language --raw 2>/dev/null || true)
ls .planning/LEGACY-INVENTORY.md >/dev/null 2>&1 && echo "EXISTS" || echo "NEW"
test -d .git && git ls-files | wc -l
```

**Text mode** (`--text` OR `workflow.text_mode: true`): replace every `AskUserQuestion` with a plain-text numbered list. **If `RESPONSE_LANG` non-empty:** user-facing text in that language; keep technical terms in English. **If `EXISTS` and no `--text`:** ask Update / View / Skip.

## Step 2: Confirm the mode (replace, not extend)

This skill is for **replacing** an existing app. Confirm there IS predecessor source, and the intent is to replace it:
- **No predecessor source** → exit: "Nothing to inventory — greenfield. Next: `/gsd:new-project`."
- **The intent is to ADD to the existing system** (extend), not replace → exit: "That's extend mode — use `/gsd:map-codebase`, then `/gsd:new-milestone`."
- Otherwise continue. Establish two sub-modes (AskUserQuestion / `$ARGUMENTS`): **with a new design** (`--design` or a provided design — the design is the intended-spec axis) vs **without** (pure structural refactor — old behavior is the spec); and **is existing infra/secrets/data reused?**

**Read `@~/.claude/gsd-core/references/brownfield-adaptation.md` ("Rewrite & salvage") + `scout-codebase.md` now** — the salvage card, the characterization gate, the precedence rule, and the explorer contract + confirm-or-refute gate.

## Step 3: Exhaustive exploration (forced — parallel explorers, never inline greps)

Spawn dedicated **parallel read-only explorer agents** (per `scout-codebase.md`), each owning a slice of the surface, to enumerate the old system **completely** into a coverage matrix. The mandatory surface checklist (every row accounted for, present-or-absent):

`modules/services · HTTP endpoints/APIs · DB tables + migrations · background jobs/crons · external integrations · roles/permissions · env/secrets · CI/CD config · infra resources · seed/reference data · admin/internal tools · notification/email/SMS templates · feature flags · auth/identity/PII handling · shadow-IT/manual processes`

Each explorer returns load-bearing claims with `file:line` citations + an **honest coverage statement** ("covered 8/10 dirs; skipped X because…") + a VERIFIED/INFERRED split.

> **ORCHESTRATOR RULE:** after spawning the `Agent()` explorers, do NOT independently scout while they run. Wait for all to return, then synthesize.

**Confirm-or-refute gate:** spot-check the highest-risk / exhaustiveness claims against raw tool output (re-grep, re-read cited `file:line`). ~20–30% of subagent claims don't survive a check — the count/coverage claims are the ones to verify. Carry VERIFIED vs INFERRED into the matrix.

## Step 4: Three-way gap map

Reconcile **design (intended) × old-code (actually built) × requirements (planned)** into the buckets in `@~/.claude/gsd-core/templates/legacy-inventory.md`'s gap-map table, and fill the **Parity disposition** column for each capability — it is the allowlist the build-loop gates read:
- **in old, not in design** → missed requirement or intentional drop? (the dangerous bucket — signing/messaging/admin hide here) → `preserve` if kept, else `dropped`
- **in design, not in old** → genuinely new → `new`
- **in both, behavior preserved** → salvage-candidate the design keeps as-is → `preserve`
- **in both, design changes this** → the new design reworks its flow/UX → `design-delta` (parity-exempt; design-fidelity governs it — a design-mandated change is not behavior drift)
- **in neither, but needed** → gap → `new`
**"Never lose a feature" gate:** every capability in the matrix must land in a requirement OR be explicitly dropped with the user's sign-off (AskUserQuestion). Without a new design, the map is two-way (old-behavior × new-structure) and there is no `design-delta`; vibe-coded regions are tagged `harden-intent`.

**Source-of-truth precedence (apply to every conflict, no oscillation):** the canonical statement is `@~/.claude/gsd-core/references/exploration-and-adaptability.md` § Source precedence — locked design wins on observable shape/UX/scope; the canonical spec on domain facts (roles, entities); the old code is the authority on what was actually built + hidden behavior (wins on "is this real?") — never on quality/structure.

## Step 5: Salvage dispositions + characterization gates

Per subsystem, fill the salvage card (recommend; user signs off): `code quality · coupling to the debt · test coverage · mappability to the new architecture · FE-vs-BE` → **Retire | Retain/Port | Refactor-and-salvage | Rebuild** (default Rebuild; low-churn-but-working → Retain; **FE always rewritten** to the new design; **BE logic** salvage-candidate, adapted onto the new clean schema — never the old tables). For each *Refactor-and-salvage* / *Rebuild* whose behavior must be preserved, **flag the characterization-test gate** (pin old behavior first, run as the parity oracle before cutover). The disposition is finalized at that subsystem's build phase, but record the recommendation now.

## Step 6: Reuse-infra plan (if infra is reused)

Record the safe sequence: **expand schema (additive) → dual-write/backfill → verify → backup → cutover (blue-green/canary) → contract (mandatory)**, and which infra/secrets/data are reused vs migrated. (Detail handed to `infrastructure-strategy`/`cicd-strategy`.)

<!-- FORK:context BEGIN -->
After each elicitation round, append it to `.planning/PROJECT-DISCUSSION-LOG.md` per `gsd-core/references/context-lifecycle.md` (skip if `context_lifecycle.discussion_logs` is disabled).
<!-- FORK:context END -->

## Step 7: Write & commit

Render `@~/.claude/gsd-core/templates/legacy-inventory.md` → `.planning/LEGACY-INVENTORY.md` (the coverage matrix + the three-way gap map + salvage dispositions + characterization gates + reuse-infra plan + the VERIFIED/INFERRED split + named open questions).

```bash
gsd_run project strategy-done legacy-inventory 2>/dev/null || true  # flip the Strategy Plan row (when present) — the grounding gate keys on `done`
if [ "$COMMIT_DOCS" = "true" ]; then
  # The discussion log is part of the durable record — commit it with the docs it explains (empty when absent/disabled).
  DLOG=$([ -f .planning/PROJECT-DISCUSSION-LOG.md ] && echo ".planning/PROJECT-DISCUSSION-LOG.md")
  gsd_run query commit "docs: legacy inventory (rewrite/salvage)" --files .planning/LEGACY-INVENTORY.md .planning/PROJECT.md $DLOG
else
  echo "LEGACY-INVENTORY.md written but not committed (commit_docs is false)."
fi
```

## Step 8: Wrap up

Display:
```
LEGACY-INVENTORY.md written — predecessor inventoried.

  Coverage: [N/M surface areas]; open questions: [N]
  Gap map: [in-old-not-design: N] [new: N] [salvage-candidate: N] [gap: N]
  Salvage: [Retire N · Port N · Refactor N · Rebuild N]; characterization gates: [N]
  Infra: [reuse plan recorded / from-scratch]
```

**Then route (#74 — an autonomous run must not stall here):** consult the consolidated auto-mode record — the same read `advance.md` and the discuss-phase family use:

```bash
AUTO_MODE=$(gsd_run query check auto-mode --pick active 2>/dev/null || echo "false")
```

**If `AUTO_MODE` is `true`** (the `--auto` flag, an active chain, or `workflow.auto_advance` on the config record): announce the hop and dispatch via the **Skill** tool (never an `Agent` spawn — flat-chain rule, #686):

```
Skill(skill="gsd-new-project", args="--auto")
```

**Else (interactive):** print the pointer and stop:

```
Next: /gsd:new-project — it derives requirements from (design) ∪ (old-system behavior) using this inventory.
```

</process>

<critical_rules>
- **Exploration is forced and exhaustive** — parallel explorers + the surface checklist + the confirm-or-refute gate; never a few inline greps. Honest coverage statement, always.
- **Requirements = (design) ∪ (old behavior), reconciled** — never the design alone. "Never lose a feature" is a sign-off gate.
- **Precedence rule resolves conflicts**; **salvage defaults to Rebuild**, FE always rewritten, salvage = BE logic onto the NEW clean schema (never old tables).
- **Characterization tests gate any preserved-behavior rewrite.** Deliver incrementally, never big-bang. Respect `commit_docs` / `response_language`.
- **ORCHESTRATOR RULE** after spawning explorers: stop, wait, synthesize.
</critical_rules>

<success_criteria>
- Mode confirmed (replace; exit to map-codebase for extend, skip for greenfield); sub-modes set (with/without design; reuse-infra)
- Full surface enumerated via parallel explorers into a coverage matrix; honest coverage + confirm-or-refute gate applied
- Three-way gap map (four buckets); every old capability covered or dropped-with-sign-off
- Salvage dispositions recorded (default Rebuild; FE rewritten); characterization gates flagged
- Precedence applied; reuse-infra plan recorded when applicable
- LEGACY-INVENTORY.md written + committed (when commit_docs is true); user directed to /gsd:new-project
</success_criteria>
