<purpose>
The runtime procedure behind `/gsd:context` — the knowledge lifecycle for durable project context. Doctrine: **plans are perishable; context is durable** — front-load knowledge, never plans. Capsules are evidence: anchored, verifiable (`gsd-tools context verify`), layered append-only, superseded — never deleted.

Modes:
- **seed** (`--milestone` | `--phase <N>`) — write quality-stamped context capsules while this session's context is richest (immediately after roadmap approval is ideal).
- **scout** (`--phase <N>`) — confirm-or-refute a capsule's Verified Facts against the live codebase.
- **flush** — calm knowledge checkpoint under context pressure (the context-monitor hook's target; also manual).
- **master** — curate `.planning/MASTER-CONTEXT.md` back to its ~150-line bound.
</purpose>

**TEXT_MODE fallback (issue #2012):** `AskUserQuestion` is Claude Code-only. Set `TEXT_MODE=true` if `--text` is present in `$ARGUMENTS` OR `text_mode` from config is true. When `TEXT_MODE` is active, replace every `AskUserQuestion` moment below (the scout offer, the master seed-first offer, any genuine choice in flush) with a plain-text numbered list and ask the user to type their choice number.

<process>

## Step 1: Initialize

**Runtime shim (REQUIRED — copy-paste verbatim):**

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${GSD_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${GSD_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
MODE=""; case " $ARGUMENTS " in *" seed "*) MODE=seed;; *" scout "*) MODE=scout;; *" flush "*) MODE=flush;; *" master "*) MODE=master;; esac
PHASE=$(printf '%s\n' "$ARGUMENTS" | sed -n 's/.*--phase[= ]*\([^ ]*\).*/\1/p')
MILESTONE_MODE=false; case " $ARGUMENTS " in *" --milestone "*) MILESTONE_MODE=true;; esac
ENABLED=$(gsd_run query config-get context_lifecycle.enabled --raw 2>/dev/null || echo true)
DATE=$(date +%Y-%m-%d)
```

**Guards:**
- `ENABLED` is `false` → print `Context lifecycle is disabled (context_lifecycle.enabled: false).` and stop.
- No `.planning/` directory → `No GSD project here — nothing to seed or flush.` Stop.
- No `MODE` → print `Usage: /gsd:context <seed|scout|flush|master> [--milestone] [--phase <N>]` and stop.
- seed/scout with no ROADMAP.md → `No roadmap yet — run /gsd:roadmap first, then seed.` Stop.

Then execute the matching mode below, end-to-end.

## Mode: seed

**Scope:** `--phase <N>` → that phase only. Otherwise (or with `--milestone`) → every phase of the active milestone, plus MASTER-CONTEXT when warranted (step 6).

**1. Ingest** (skip what doesn't exist): ROADMAP.md (active-milestone phases + goals), PROJECT.md, STATE.md, all strategy artifacts (`.planning/adr/*.md`, DOMAIN-MODEL.md, SECURITY-STRATEGY.md, FRONTEND-ARCHITECTURE.md, TEST-STRATEGY.md, INFRA-STRATEGY.md, CICD-STRATEGY.md), `research/` (SUMMARY.md first), and investigation/deep-design docs they point at.

**2. The writing rule (non-negotiable):** THE ORCHESTRATOR WRITES CAPSULES ITSELF — never delegate capsule writing to fresh-context agents: their empty context is the very thing this feature exists to fix, and a capsule authored by an agent that just skimmed the artifacts is hollow-but-plausible — worse than none. Where the runtime offers **context-inheriting forks** you MAY fork per phase to parallelize; otherwise write sequentially inline. (Explore agents may *check* facts — never author the capsule.)

**3. Per phase** — resolve paths, then branch on what exists:

```bash
INIT=$(gsd_run query init.phase-op "${N}"); [[ "$INIT" == @file:* ]] && INIT=$(cat "${INIT#@file:}")
# parse: phase_dir, padded_phase → capsule = ${phase_dir}/${padded_phase}-CONTEXT.md
gsd_run context provenance --file "${phase_dir}/${padded_phase}-CONTEXT.md" 2>/dev/null
```

- **No file** → Read `gsd-core/templates/context-capsule.md` now (lazily). It is RENDER-DIRECT: copy its body as the skeleton (frontmatter starts at byte 0), REPLACE every `[placeholder]`, and **STRIP all HTML guidance comments AND the placeholder example bullets** (e.g. the `src/example.js:42` anchor line) before writing — leftovers make `context verify` flag phantom anchors at birth.
- **File exists WITH provenance** (non-null) → append a `## Seed refresh (<date>)` layer at the bottom ONLY — new/updated facts, decisions, pitfalls. Never edit, reorder, or delete earlier layers; later layers supersede.
- **File exists WITHOUT provenance** (plain discuss-phase output) → do NOT touch it; list it in the final report as "already has discussion context — left as-is".

**4. Anchor every Verified Fact:** `[anchor: path[:line] "exact substring from the file"]` — line advisory; the substring is what verify greps. `ext:<repo>/path` for other repos (skipped by verify). No anchor → not a Verified Fact: move it to Locked Decisions or drop it.

**5. Stamp quality honestly** — the frontmatter contract is `quality: rich | artifact-distilled | thin`:

| Stamp | When |
|---|---|
| `rich` | this session did substantial verified exploration relevant to the phase (read the code, ran things, confirmed claims first-hand) |
| `artifact-distilled` | synthesized from artifacts only (roadmap/strategy/research) — no first-hand verification |
| `thin` | neither — sparse session; downstream treats it as a starting point, not answers |

Never inflate the stamp: it is the defense that lets downstream calibrate trust.

**6. MASTER-CONTEXT (milestone scope only):** render `gsd-core/templates/master-context.md` → `.planning/MASTER-CONTEXT.md` (same render-direct strip rules) ONLY when cross-phase content exists: multi-repo (`planning.sub_repos` in config), brownfield (**Mode:** in PROJECT.md), an existing investigation/research corpus, or a `rich`-quality session. Otherwise skip — no MASTER means zero re-anchor overhead for small projects. If MASTER already exists, refresh it in place per its curation rules (supersede; never silently drop what is still true).

**7. Verify at birth, then commit:**

```bash
gsd_run context verify --phase "${N}"   # per capsule; after a milestone seed: gsd_run context verify --milestone (covers MASTER too)
```

Fix every claim that fails at birth — correct the path/substring or demote the claim — and re-run until clean. Then commit (`query commit` honors `commit_docs`):

```bash
gsd_run query commit "docs(context): seed context capsules" --files <every file written>
```

Report: capsules written (with quality stamps), plain CONTEXT.md files skipped, and whether MASTER was created — with the reason either way.

## Mode: scout

Requires a phase (`--phase <N>`, default: the active phase from STATE.md). Guard: the capsule must exist WITH provenance; otherwise report `Nothing to scout — seed this phase first.` and stop.

1. Extract the capsule's **Verified Facts** claims across all layers (latest layer supersedes).
2. Spawn **2–3 explorer subagents** ("Explore" type) in parallel, splitting the claims between them. Prompt each: "For each claim, CONFIRM or REFUTE it against the live codebase. Do not trust the claim — hunt for counter-evidence first. Return per claim: verdict, evidence (path + exact substring), and the corrected claim when refuted."
3. Append the findings as a `## Scout corrections (<date>)` layer, opening with the line: *corrections below override the corresponding claims above.* Refuted/corrected claims get full entries with fresh anchors; confirmed claims share one summary line.
4. Commit: `gsd_run query commit "docs(context): scout corrections phase ${N}" --files <capsule>`.

**When offered:** pre-discussion, when provenance quality is `rich` AND the capsule is older than `context_lifecycle.verify_max_age_commits` commits — offered, never forced. AskUserQuestion (header "Scout") — "Capsule is rich but aging. Confirm-or-refute its facts against the live code first?" → "Scout" / "Skip" (TEXT_MODE: numbered list).

## Mode: flush

A **calm knowledge checkpoint** — the context-monitor hook's target, also invocable manually. Explicitly: this is a checkpoint, not an emergency save — do not stop the user's work, do not suggest a fresh session, no urgency language. Make the three writes and return to what you were doing.

1. **MASTER-CONTEXT.md** (if present): supersede stale entries in place per its curation rules; add the new load-bearing facts this session established (anchored).
2. **Active phase capsule** (active phase from STATE.md): append an `## Orchestrator curation (<date>)` layer with this session's phase-scoped knowledge — decisions taken, pitfalls hit, facts verified.
3. **Session position + commit:**

```bash
gsd_run query state.record-session --stopped-at "<one line: current position>" --resume-file "<active capsule path>"
gsd_run query commit "docs(context): flush knowledge checkpoint" --files .planning/MASTER-CONTEXT.md <capsule> .planning/STATE.md
```

No interaction is normally needed; if a genuine choice arises (e.g. two candidate active phases), AskUserQuestion (TEXT_MODE: numbered list).

## Mode: master

Curate `.planning/MASTER-CONTEXT.md` — it is an INDEX, not an archive.

Guard: no MASTER file → AskUserQuestion (header "Master") — "No MASTER-CONTEXT.md yet. Seed the milestone now?" → "Seed" (run Mode: seed with milestone scope, then continue here) / "Cancel" (stop). TEXT_MODE: numbered list.

1. **Re-bound to ~150 lines** — a curation target, not a truncation: losing knowledge is worse than a long-ish file.
2. **Supersede dead facts** — replace/annotate in place; never silently drop what is still true.
3. **Push depth into deep docs** — any section past a few lines moves its detail into `research/`, an ADR, or an investigation doc, and **Key references** gains a pointer line (path — what the reader gets and when to open it).
4. **Verify + commit:**

```bash
gsd_run context verify --milestone
gsd_run query commit "docs(context): curate MASTER-CONTEXT" --files .planning/MASTER-CONTEXT.md
```

Fix flagged anchors — or annotate them `[STALE — <date>]` — before committing.

</process>

<success_criteria>
- [ ] seed: capsules written by THIS orchestrator (forks only when context-inheriting), honestly quality-stamped, verify-clean at birth; re-seed appended `## Seed refresh`; provenance-less CONTEXT.md untouched and reported.
- [ ] scout: 2–3 explorers confirm-or-refute; findings landed as `## Scout corrections` overriding earlier claims.
- [ ] flush: MASTER + active capsule + `state.record-session` updated calmly; the user's work was never interrupted.
- [ ] master: MASTER re-bounded to ~150 lines, depth pushed into deep docs, `context verify --milestone` run after.
- [ ] Every `.planning/` write committed via `query commit`; every interactive moment has a TEXT_MODE fallback.
</success_criteria>
