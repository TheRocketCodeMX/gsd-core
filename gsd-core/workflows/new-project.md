<purpose>
<!-- FORK:strategy END -->
Initialize a new project through unified flow: questioning, research (optional), requirements, roadmap. This is the most leveraged moment in any project — deep questioning here means better plans, better execution, better outcomes. One workflow takes you from idea to ready-for-planning.
<!-- FORK:strategy END -->
</purpose>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<required_reading>
<!-- FORK:strategy END -->
Read all files referenced by the invoking prompt's execution_context before starting.
<!-- FORK:strategy END -->
</required_reading>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<available_agent_types>
<!-- FORK:strategy END -->
Valid GSD subagent types (use exact names — do not fall back to 'general-purpose'):
<!-- FORK:strategy END -->
- gsd-project-researcher — Researches project-level technical decisions
<!-- FORK:strategy END -->
- gsd-research-synthesizer — Synthesizes findings from parallel research agents
<!-- FORK:strategy END -->
- gsd-roadmapper — Creates phased execution roadmaps
<!-- FORK:strategy END -->
</available_agent_types>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<auto_mode>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<!-- gsd:section id="auto-mode-detection" when="flag:--auto" -->
<!-- FORK:strategy END -->
If `section_manifest` is `null` or `"auto-mode-detection"` is in its `included` list: read and execute `gsd-core/workflows/new-project/steps/auto-mode-detection.md`. Otherwise skip — do not read the file.
<!-- FORK:strategy END -->
<!-- /gsd:section -->
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
</auto_mode>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<process>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## 1. Setup
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**MANDATORY FIRST STEP — Execute these checks before ANY user interaction:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; _gsd_at() { for _p; do if [ -f "$_p" ]; then GSD_TOOLS="$_p"; return 0; fi; done; return 1; }; if _gsd_at "${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" "${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}"; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif unset -f gsd_run; _G="$(command -v gsd_run)"; then GSD_TOOLS="$_G"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif _gsd_at "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/gsd-core/bin/${_GSD_SHIM_NAME}" "${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}" "${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}" "${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}" "${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}" "${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}" "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}" "${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}" "${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}" "${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}" "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}" "${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}" "${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}" "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}" "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}" "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}"; then gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd_run is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi; GSD_IDENTITY_STATUS=unverified; case "$(gsd_run runtime-identity --raw 2>/dev/null || true)" in '{"packageName":"@therocketcode/gsd-core"'*'}') GSD_IDENTITY_STATUS=ok;; esac; export GSD_IDENTITY_STATUS; [ "$GSD_IDENTITY_STATUS" = ok ] || echo "WARNING: \"$GSD_TOOLS\" did not prove it is @therocketcode/gsd-core - it is either a different package or an @therocketcode/gsd-core older than the runtime-identity verb. See docs/how-to/diagnose-a-foreign-gsd-tools.md" >&2; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${GSD_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${GSD_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
<!-- FORK:strategy END -->
AUTO_PARAM=""; if [[ "$ARGUMENTS" =~ (^|[[:space:]])--auto([[:space:]]|$) ]]; then AUTO_PARAM="--auto"; fi
<!-- FORK:strategy END -->
INIT=$(gsd_run query init.new-project $AUTO_PARAM)
<!-- FORK:strategy END -->
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
<!-- FORK:strategy END -->
AGENT_SKILLS_RESEARCHER=$(gsd_run query agent-skills gsd-project-researcher)
<!-- FORK:strategy END -->
AGENT_SKILLS_SYNTHESIZER=$(gsd_run query agent-skills gsd-research-synthesizer)
<!-- FORK:strategy END -->
AGENT_SKILLS_ROADMAPPER=$(gsd_run query agent-skills gsd-roadmapper)
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Parse JSON for: `researcher_model`, `synthesizer_model`, `roadmapper_model`, `commit_docs`, `project_exists`, `has_codebase_map`, `planning_exists`, `has_existing_code`, `has_package_file`, `is_brownfield`, `needs_codebase_map`, `has_design_hint`, `design_pointer`, `design_hint_source`, `design_dismissed`, `has_git`, `git_worktree_root`, `in_nested_subdir`, `project_path`, `project_root`, `agents_installed`, `missing_agents`, `agent_runtime`, `agents_dir`, `requirements_exists`, `init_incomplete`, `requirements_path`, `roadmap_path`, `config_path`, `research_dir`, `response_language`. (This is the key set `init.new-project` actually emits — do not expect others.)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If `response_language` is set:** All user-facing output of this workflow — narration between tool calls, status updates, progress notes, findings, questions, prompts, and explanations — MUST be presented in `{response_language}`. Technical terms, code, file paths, and subagent prompts stay in English — only user-facing output is translated.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If `agents_installed` is false:** Display a warning before proceeding:
<!-- FORK:strategy END -->
```text
<!-- FORK:strategy END -->
⚠ GSD agents not installed. The following agents are missing from your agents directory:
<!-- FORK:strategy END -->
  {missing_agents joined with newline}
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Runtime checked: {agent_runtime}
<!-- FORK:strategy END -->
Agents directory checked: {agents_dir}
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Subagent spawns (gsd-project-researcher, gsd-research-synthesizer, gsd-roadmapper) will fail
<!-- FORK:strategy END -->
with "agent type not found" while they are missing. Run the installer with --global to make agents available:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
  npx @therocketcode/gsd-core@latest --global
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Proceeding without research subagents — roadmap will be generated inline.
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
Skip Steps 6–7 (parallel research and synthesis) and proceed directly to roadmap creation in Step 8.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Detect runtime and set instruction file name:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Derive `RUNTIME` from the invoking prompt's `execution_context` path:
<!-- FORK:strategy END -->
- Path contains `/.codex/` → `RUNTIME=codex`
<!-- FORK:strategy END -->
- Path contains `/.gemini/` → `RUNTIME=gemini`
<!-- FORK:strategy END -->
- Path contains `/.config/opencode/` or `/.opencode/` → `RUNTIME=opencode`
<!-- FORK:strategy END -->
- Path contains `/.trae/` → `RUNTIME=trae`
<!-- FORK:strategy END -->
- Otherwise → `RUNTIME=claude`
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
If `execution_context` path is not available, fall back to env vars:
<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
if [ -n "$CODEX_HOME" ]; then RUNTIME="codex"
<!-- FORK:strategy END -->
elif [ -n "$GEMINI_CONFIG_DIR" ]; then RUNTIME="gemini"
<!-- FORK:strategy END -->
elif [ -n "$OPENCODE_CONFIG_DIR" ] || [ -n "$OPENCODE_CONFIG" ]; then RUNTIME="opencode"
<!-- FORK:strategy END -->
elif [ -n "$TRAE_CONFIG_DIR" ]; then RUNTIME="trae"
<!-- FORK:strategy END -->
else RUNTIME="claude"; fi
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Set the instruction file variable via the shared runtime-name policy adapter (`gsd_run query project-instruction-file`, backed by `getProjectInstructionFile` in `runtime-name-policy.cjs` — the single source of truth shared with `profile-output.cjs`):
<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
INSTRUCTION_FILE=$(gsd_run query project-instruction-file --runtime "$RUNTIME")
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
All subsequent references to the project instruction file use `$INSTRUCTION_FILE`.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If `project_exists` is true and `init_incomplete` is true (#4040 — interrupted bootstrap):** Resume initialization instead of erroring. `.planning/` exists but initialization stopped before all core artifacts landed. Keep the existing `PROJECT.md` and any already-created artifacts (`REQUIREMENTS.md` if present, `config.json`); skip the steps that would recreate them and continue the flow from the first missing artifact in init order — `REQUIREMENTS.md` → `ROADMAP.md` + `STATE.md` — until all exist. Do not error and do not bounce the user back to `/gsd:progress` (that routing loop is the #4040 bug).
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<!-- FORK:strategy BEGIN -->
<!-- FORK:strategy END -->
**Roadmap-after-strategy caveat:** in this fork `ROADMAP.md` and `STATE.md` are written by the `gsd-roadmap` skill after the strategy chain, never by this workflow (Step 8). A `.planning/` with PROJECT.md (carrying a `## Strategy Plan`) and REQUIREMENTS.md but no ROADMAP.md/STATE.md is **mid-chain, not an interrupted bootstrap** — `/gsd:progress` detects that shape first and points at the next strategy step or the roadmap skill. When resuming here, stop after REQUIREMENTS.md exists and hand off via Steps 7.6/9.
<!-- FORK:strategy END -->
<!-- FORK:strategy END -->
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If `project_exists` is true and `init_incomplete` is false:** Error — project already initialized. Use `/gsd:progress`.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Git init (#3491 — never nest `.git` inside an existing worktree):**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- If `has_git` true and `in_nested_subdir` true: skip `git init`; warn `⚠ Initializing inside existing worktree (${git_worktree_root}); planning files will track to outer repo.`
<!-- FORK:strategy END -->
- If `has_git` true and `in_nested_subdir` false: skip `git init` (already at worktree root).
<!-- FORK:strategy END -->
- If `has_git` false: `git init`.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## 2. Brownfield Offer
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If auto mode:** Skip the interactive router and go to Step 4, but set Origin from `is_brownfield`/`has_existing_code` (existing code → brownfield-extend; else greenfield) — do not blindly assume greenfield. Synthesize PROJECT.md from the provided document.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<!-- gsd:section id="codebase-map-offer" when="state:needs-codebase-map" -->
<!-- FORK:strategy END -->
If `section_manifest` is `null` or `"codebase-map-offer"` is in its `included` list: read and execute `gsd-core/workflows/new-project/steps/codebase-map-offer.md`. Otherwise skip — do not read the file.
<!-- FORK:strategy END -->
<!-- /gsd:section -->
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<!-- FORK:strategy BEGIN -->
<!-- FORK:strategy END -->
**Provided-design detection (runs regardless of whether there is existing code — the design axis is orthogonal to Origin).** A provided design is a source of truth and must be detected + routed here, symmetric to the legacy path above — otherwise it gets laundered into vision-derived requirements and the build drifts from it (the address-failure: one design input → an invented multi-field schema). Init pre-detects the signal — branch on it (it is a **hint that you CONFIRM**, never a silent lock):
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- **`design_dismissed` is true** (user passed `--no-design`) → Design-input: none; skip the prompt.
<!-- FORK:strategy END -->
- **`has_design_hint` is true and `design_hint_source` is `arg`** (an explicit `--design <path-or-link>`) → confirm by showing `design_pointer`, default Yes → record it.
<!-- FORK:strategy END -->
- **`has_design_hint` is true with a weaker source** (`design-export` / `tokens-file` / `designs-dir`) → ask once with the detected `design_pointer` **pre-filled** so a false positive is one keystroke to reject: "I found `{design_pointer}` — is that a design to build to?"
<!-- FORK:strategy END -->
- **`has_design_hint` is false** → still ask once (covers a Figma/Stitch URL the user will paste, which init can't detect), unless the user already said there's none.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- header: "Provided design"
<!-- FORK:strategy END -->
- question: "Do you have a provided design or prototype to build to (Figma, an export, a clickable prototype, a tokens/component package)?"
<!-- FORK:strategy END -->
- options:
<!-- FORK:strategy END -->
  - "Yes — here's the path/link" — record it → Step 4 sets `## Mode` Design-input to the pointer; the design is the authority on the observable shape
<!-- FORK:strategy END -->
  - "An existing design system to honor" — record it → Design-input = existing system
<!-- FORK:strategy END -->
  - "No / none" — Design-input: none
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If a provided design is recorded:** (a) record its pointer in `## Mode` Design-input (Step 4); (b) **ground requirements (Steps 3 + 7) by reading the design directly** — the pointer, per `@~/.claude/gsd-core/references/design-ingestion.md` — deriving them from **(the design) ∪ (the vision)**, lifting the design's literal user-facing fields and never generalizing them (mirrors the legacy `design ∪ old-behavior` rule); (c) the design is ingested into the in-repo oracle (`.planning/DESIGN-INVENTORY.md`) by the **next strategy step**, not here — Step 7.6 puts `model-domain` (or `frontend-architecture` for a frontend surface) first in the `## Strategy Plan` and auto-advances into it, and it writes the oracle before the build loop's design-fidelity gate runs (the planner is the fallback if both are skipped). **Do NOT run `model-domain` mid-new-project** — it reads the PROJECT.md/REQUIREMENTS that Steps 4/7 write, so it can only run after; the recorded design pointer + the Step-7.6 on-ramp are the correct mechanism (unlike `legacy-inventory`, which is a true pre-step because it reads only the old code).
<!-- FORK:strategy END -->
<!-- FORK:strategy END -->
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<!-- gsd:section id="auto-mode-config" when="flag:--auto" -->
<!-- FORK:strategy END -->
If `section_manifest` is `null` or `"auto-mode-config"` is in its `included` list: read and execute `gsd-core/workflows/new-project/steps/auto-mode-config.md`. Otherwise skip — do not read the file.
<!-- FORK:strategy END -->
<!-- /gsd:section -->
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## 2b. Prior Spike/Sketch Detection
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Check for existing spike and sketch work that should inform project setup:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
# Check for spike findings skill (project-local)
<!-- FORK:strategy END -->
SPIKE_SKILL=$(ls ./.claude/skills/spike-findings-*/SKILL.md 2>/dev/null | head -1 || true)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
# Check for sketch findings skill (project-local)
<!-- FORK:strategy END -->
SKETCH_SKILL=$(ls ./.claude/skills/sketch-findings-*/SKILL.md 2>/dev/null | head -1 || true)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
# Check for raw spikes/sketches in .planning/
<!-- FORK:strategy END -->
HAS_SPIKES=$(ls .planning/spikes/MANIFEST.md 2>/dev/null)
<!-- FORK:strategy END -->
HAS_SKETCHES=$(ls .planning/sketches/MANIFEST.md 2>/dev/null)
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
If any of these exist, surface them before questioning:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
⚡ Prior exploration detected:
<!-- FORK:strategy END -->
{if SPIKE_SKILL}  ✓ Spike findings skill: {path} — validated patterns from experiments
<!-- FORK:strategy END -->
{if SKETCH_SKILL}  ✓ Sketch findings skill: {path} — validated design decisions
<!-- FORK:strategy END -->
{if HAS_SPIKES && !SPIKE_SKILL}  ◆ Raw spikes in .planning/spikes/ — consider `/gsd:spike --wrap-up` to package findings
<!-- FORK:strategy END -->
{if HAS_SKETCHES && !SKETCH_SKILL}  ◆ Raw sketches in .planning/sketches/ — consider `/gsd:sketch --wrap-up` to package findings
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
These findings will be incorporated into project context and available to planning agents.
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
If spike/sketch findings skills exist, read their SKILL.md files to inform the questioning phase — they contain validated patterns, constraints, and design decisions that should shape the project definition.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## 3. Deep Questioning
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If auto mode:** Skip (already handled in Step 2a). Extract project context from provided document instead and proceed to Step 4.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Display stage banner:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
### GSD ► QUESTIONING
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<!-- FORK:strategy BEGIN -->
<!-- FORK:strategy END -->
**If `.planning/PRODUCT-BRIEF.md` exists, read it first.** It is a validated product definition from `/gsd:discover-product` (outcome, target user, narrowest wedge, demand evidence, four-risks status, prioritized scope, explicit "not in scope"). Ground the questioning in it — **confirm and fill gaps rather than re-asking what it already answers** — and carry its outcome, wedge, and prioritized scope into PROJECT.md (Core Value / What This Is) and the requirements (Steps 4 and 7). Frame PROJECT.md around the brief's *outcome*, not a re-derived feature list.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If `.planning/LEGACY-INVENTORY.md` exists** (rewrite/refactor/vibe-coded mode, from `/gsd:legacy-inventory`), read it too and **derive requirements from (the design) ∪ (the old-system behavior)** per its coverage matrix + three-way gap map — never from the design alone. Honor its **"never lose a feature" gate** (every old capability becomes a requirement or an explicitly-dropped item with the user's prior sign-off) and carry its salvage dispositions + source-of-truth precedence into the requirements (Steps 4 and 7).
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If a provided design is recorded (Step 2's design detection),** **read the design directly** — the `## Mode` Design-input pointer, per `@~/.claude/gsd-core/references/design-ingestion.md` (the in-repo oracle doesn't exist yet; `model-domain`/`frontend-architecture` write it as the next strategy step) — and **derive requirements from (the design) ∪ (the vision)**: lift its literal user-facing fields (a single `address` input is one `address` field, not four), never generalize or invent beyond them, and never drop a design-shown field. The design is the authority on the observable shape (§ Source precedence in `@~/.claude/gsd-core/references/exploration-and-adaptability.md`).
<!-- FORK:strategy END -->
<!-- FORK:strategy END -->
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Open the conversation:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Ask inline (freeform, NOT AskUserQuestion):
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
"What do you want to build?"
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Wait for their response. This gives you the context needed to ask intelligent follow-up questions.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Research-before-questions mode:** Check if `workflow.research_before_questions` is enabled in `.planning/config.json` (or the config from init context). When enabled, before asking follow-up questions about a topic area:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
1. Do a brief web search for best practices related to what the user described
<!-- FORK:strategy END -->
2. Mention key findings naturally as you ask questions (e.g., "Most projects like this use X — is that what you're thinking, or something different?")
<!-- FORK:strategy END -->
3. This makes questions more informed without changing the conversational flow
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
When disabled (default), ask questions directly as before.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Follow the thread:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Based on what they said, ask follow-up questions that dig into their response. Use AskUserQuestion with options that probe what they mentioned — interpretations, clarifications, concrete examples.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Keep following threads. Each answer opens new threads to explore. Ask about:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- What excited them
<!-- FORK:strategy END -->
- What problem sparked this
<!-- FORK:strategy END -->
- What they mean by vague terms
<!-- FORK:strategy END -->
- What it would actually look like
<!-- FORK:strategy END -->
- What's already decided
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Consult `questioning.md` for techniques:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- Challenge vagueness
<!-- FORK:strategy END -->
- Make abstract concrete
<!-- FORK:strategy END -->
- Surface assumptions
<!-- FORK:strategy END -->
- Find edges
<!-- FORK:strategy END -->
- Reveal motivation
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Check context (background, not out loud):**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
As you go, mentally check the context checklist from `questioning.md`. If gaps remain, weave questions naturally. Don't suddenly switch to checklist mode.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Decision gate:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
When you could write a clear PROJECT.md, use AskUserQuestion:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- header: "Ready?"
<!-- FORK:strategy END -->
- question: "I think I understand what you're after. Ready to create PROJECT.md?"
<!-- FORK:strategy END -->
- options:
<!-- FORK:strategy END -->
  - "Create PROJECT.md" — Let's move forward
<!-- FORK:strategy END -->
  - "Keep exploring" — I want to share more / ask me more
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
If "Keep exploring" — ask what they want to add, or identify gaps and probe naturally.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Loop until "Create PROJECT.md" selected.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<!-- FORK:context BEGIN -->
<!-- FORK:strategy END -->
After each elicitation round, append it to `.planning/PROJECT-DISCUSSION-LOG.md` per `gsd-core/references/context-lifecycle.md` (skip if `context_lifecycle.discussion_logs` is disabled). When the log exists at commit time, include `.planning/PROJECT-DISCUSSION-LOG.md` in the PROJECT.md docs commit below — the log is the durable record of the reasoning and must not be left untracked.
<!-- FORK:strategy END -->
<!-- FORK:context END -->
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## 4. Write PROJECT.md
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If auto mode:** Synthesize from provided document. No "Ready?" gate was shown — proceed directly to commit.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Synthesize all context into `.planning/PROJECT.md` using the template from `templates/project.md`.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<!-- FORK:strategy BEGIN -->
<!-- FORK:strategy END -->
**Fill the `## Mode` section (the persisted mode-combination — read by every downstream strategy/build skill so they don't re-detect).** Detect the three orthogonal dimensions per `@~/.claude/gsd-core/references/exploration-and-adaptability.md`, using the init signals + the conversation + any PRODUCT-BRIEF / provided design:
<!-- FORK:strategy END -->
- **Origin:** greenfield (no existing code) · brownfield-extend (`is_brownfield`/`has_existing_code` and the intent is to *add to* it) · rewrite/refactor (existing code but the intent is to *replace* it).
<!-- FORK:strategy END -->
- **Design input:** none · a provided design to ingest (a design-tool export / prototype / generated-design artifact the user supplied) · an existing design system to honor.
<!-- FORK:strategy END -->
- **Code-quality baseline:** clean · legacy-debt · vibe-coded-to-harden (AI-prototyped, thin on tests/seams).
<!-- FORK:strategy END -->
Record the named combination (e.g. "greenfield-rewrite + new-design + salvageable-old-code"). When a dimension is genuinely unclear, ask one targeted question rather than guessing.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Record `## Sources` rows (the literal-source registry) as you fill `## Mode`.** One line per literal source this project grounds in — `- <kind> · <path-or-url> — <note>`, kinds `design` / `legacy` / `vibe` / `context-app`:
<!-- FORK:strategy END -->
- provided design → `- design · <the Design-input pointer> — <form, e.g. Stitch export>` (mirrors Design-input);
<!-- FORK:strategy END -->
- Origin rewrite/refactor → `- legacy · <old codebase root> — behavior source (rewrite)`;
<!-- FORK:strategy END -->
- Code-quality vibe-coded-to-harden → `- vibe · <prototype root> — intent source; do not pin its behavior`;
<!-- FORK:strategy END -->
- any additional reference/context app the user pointed at → `- context-app · <path-or-url> — <what it evidences>`.
<!-- FORK:strategy END -->
`gsd_run query grounding required` reads these (the `sources` field) and downstream agents explore them directly — an unrecorded source is invisible to the grounding loop.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Multi-surface nudge.** If you detect multiple *independent* surfaces with genuinely different archetypes (e.g. a backend service **and** a separate frontend app **and** a CLI in one repo), say so: GSD models **one surface per project** (`@~/.claude/gsd-core/references/strategy-flow.md`). Recommend running GSD **per package/surface**, or ask the user to pick the **primary** surface for this project and record its Mode — do not average divergent surfaces into one Mode.
<!-- FORK:strategy END -->
<!-- FORK:strategy END -->
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**For greenfield projects:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Initialize requirements as hypotheses:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```markdown
<!-- FORK:strategy END -->
## Requirements
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
### Validated
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
(None yet — ship to validate)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
### Active
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- [ ] [Requirement 1]
<!-- FORK:strategy END -->
- [ ] [Requirement 2]
<!-- FORK:strategy END -->
- [ ] [Requirement 3]
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
### Out of Scope
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- [Exclusion 1] — [why]
<!-- FORK:strategy END -->
- [Exclusion 2] — [why]
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
All Active requirements are hypotheses until shipped and validated.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**For brownfield projects (codebase map exists):**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Infer Validated requirements from existing code:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
1. Read `.planning/codebase/ARCHITECTURE.md` and `STACK.md`
<!-- FORK:strategy END -->
2. Identify what the codebase already does
<!-- FORK:strategy END -->
3. These become the initial Validated set
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```markdown
<!-- FORK:strategy END -->
## Requirements
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
### Validated
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- ✓ [Existing capability 1] — existing
<!-- FORK:strategy END -->
- ✓ [Existing capability 2] — existing
<!-- FORK:strategy END -->
- ✓ [Existing capability 3] — existing
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
### Active
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- [ ] [New requirement 1]
<!-- FORK:strategy END -->
- [ ] [New requirement 2]
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
### Out of Scope
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- [Exclusion 1] — [why]
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Key Decisions:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Initialize with any decisions made during questioning:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```markdown
<!-- FORK:strategy END -->
## Key Decisions
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
| Decision | Rationale | Outcome |
<!-- FORK:strategy END -->
|----------|-----------|---------|
<!-- FORK:strategy END -->
| [Choice from questioning] | [Why] | — Pending |
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Last updated footer:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```markdown
<!-- FORK:strategy END -->
---
<!-- FORK:strategy END -->
*Last updated: [date] after initialization*
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Evolution section** (include at the end of PROJECT.md, before the footer):
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```markdown
<!-- FORK:strategy END -->
## Evolution
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
This document evolves at phase transitions and milestone boundaries.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**After each phase transition** (via `/gsd-transition`):
<!-- FORK:strategy END -->
1. Requirements invalidated? → Move to Out of Scope with reason
<!-- FORK:strategy END -->
2. Requirements validated? → Move to Validated with phase reference
<!-- FORK:strategy END -->
3. New requirements emerged? → Add to Active
<!-- FORK:strategy END -->
4. Decisions to log? → Add to Key Decisions
<!-- FORK:strategy END -->
5. "What This Is" still accurate? → Update if drifted
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**After each milestone** (via `/gsd:complete-milestone`):
<!-- FORK:strategy END -->
1. Full review of all sections
<!-- FORK:strategy END -->
2. Core Value check — still the right priority?
<!-- FORK:strategy END -->
3. Audit Out of Scope — reasons still valid?
<!-- FORK:strategy END -->
4. Update Context with current state
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Do not compress. Capture everything gathered.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Commit PROJECT.md:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
mkdir -p .planning
<!-- FORK:strategy END -->
gsd_run query commit "docs: initialize project" --files .planning/PROJECT.md
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## 5. Workflow Preferences
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If auto mode:** Skip — config was collected in Step 2a. Proceed to Step 5.5.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Check for global defaults** at `~/.gsd/defaults.json`. If the file exists, read and display its contents before asking:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
DEFAULTS_RAW=$(cat ~/.gsd/defaults.json 2>/dev/null)
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Format the JSON into human-readable bullets using these label mappings:
<!-- FORK:strategy END -->
- `mode` → "Mode"
<!-- FORK:strategy END -->
- `granularity` → "Granularity"
<!-- FORK:strategy END -->
- `parallelization` → "Execution" (`true` → "Parallel", `false` → "Sequential")
<!-- FORK:strategy END -->
- `commit_docs` → "Git Tracking" (`true` → "Yes", `false` → "No")
<!-- FORK:strategy END -->
- `model_profile` → "AI Models"
<!-- FORK:strategy END -->
- `workflow.research` → "Research" (`true` → "Yes", `false` → "No")
<!-- FORK:strategy END -->
- `workflow.plan_check` → "Plan Check" (`true` → "Yes", `false` → "No")
<!-- FORK:strategy END -->
- `workflow.verifier` → "Verifier" (`true` → "Yes", `false` → "No")
<!-- FORK:strategy END -->
- `plan_review.source_grounding` → "Drift Guard" (`true` → "Yes", `false` → "No")
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Display above the prompt:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```text
<!-- FORK:strategy END -->
Your saved defaults (~/.gsd/defaults.json):
<!-- FORK:strategy END -->
  • Mode: [value]
<!-- FORK:strategy END -->
  • Granularity: [value]
<!-- FORK:strategy END -->
  • Execution: [Parallel|Sequential]
<!-- FORK:strategy END -->
  • Git Tracking: [Yes|No]
<!-- FORK:strategy END -->
  • AI Models: [value]
<!-- FORK:strategy END -->
  • Research: [Yes|No]
<!-- FORK:strategy END -->
  • Plan Check: [Yes|No]
<!-- FORK:strategy END -->
  • Verifier: [Yes|No]
<!-- FORK:strategy END -->
  • Drift Guard: [Yes|No]
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Then ask:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```text
<!-- FORK:strategy END -->
AskUserQuestion([
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    question: "Use these saved defaults?",
<!-- FORK:strategy END -->
    header: "Defaults",
<!-- FORK:strategy END -->
    multiSelect: false,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "Use as-is (Recommended)", description: "Proceed with the defaults shown above" },
<!-- FORK:strategy END -->
      { label: "Modify some settings", description: "Keep defaults, change a few" },
<!-- FORK:strategy END -->
      { label: "Configure fresh", description: "Walk through all questions from scratch" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  }
<!-- FORK:strategy END -->
])
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If "Use as-is":** use the defaults values for config.json and skip directly to **Commit config.json** below.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If "Modify some settings":** present a selection of every setting with its current saved value.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If TEXT_MODE is active** (non-Claude runtimes): display a numbered list and ask the user to type the numbers of settings they want to change (comma-separated). Parse the response and proceed.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```text
<!-- FORK:strategy END -->
Which settings do you want to change? (enter numbers, comma-separated)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
  1. Mode — Currently: [value]
<!-- FORK:strategy END -->
  2. Granularity — Currently: [value]
<!-- FORK:strategy END -->
  3. Execution — Currently: [Parallel|Sequential]
<!-- FORK:strategy END -->
  4. Git Tracking — Currently: [Yes|No]
<!-- FORK:strategy END -->
  5. AI Models — Currently: [value]
<!-- FORK:strategy END -->
  6. Research — Currently: [Yes|No]
<!-- FORK:strategy END -->
  7. Plan Check — Currently: [Yes|No]
<!-- FORK:strategy END -->
  8. Verifier — Currently: [Yes|No]
<!-- FORK:strategy END -->
  9. Drift Guard — Currently: [Yes|No]
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Otherwise** (Claude runtime with AskUserQuestion): use a two-block split
<!-- FORK:strategy END -->
to stay within the 4-option runtime cap.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```text
<!-- FORK:strategy END -->
AskUserQuestion([
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    question: "Do you want to change any core workflow settings (Mode, Granularity, Execution, Git Tracking)?",
<!-- FORK:strategy END -->
    header: "Core Settings",
<!-- FORK:strategy END -->
    multiSelect: false,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "Yes", description: "Choose from core workflow settings" },
<!-- FORK:strategy END -->
      { label: "No", description: "Skip core workflow settings" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  }
<!-- FORK:strategy END -->
])
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
If "Yes", ask:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```text
<!-- FORK:strategy END -->
AskUserQuestion([
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    question: "Which core workflow settings do you want to change?",
<!-- FORK:strategy END -->
    header: "Core Select",
<!-- FORK:strategy END -->
    multiSelect: true,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "Mode", description: "Currently: [value]" },
<!-- FORK:strategy END -->
      { label: "Granularity", description: "Currently: [value]" },
<!-- FORK:strategy END -->
      { label: "Execution", description: "Currently: [Parallel|Sequential]" },
<!-- FORK:strategy END -->
      { label: "Git Tracking", description: "Currently: [Yes|No]" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  }
<!-- FORK:strategy END -->
])
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Then ask:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```text
<!-- FORK:strategy END -->
AskUserQuestion([
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    question: "Do you want to change any model/agent settings (AI Models, Research, Plan Check, Verifier)?",
<!-- FORK:strategy END -->
    header: "Agent Settings",
<!-- FORK:strategy END -->
    multiSelect: false,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "Yes", description: "Choose from model/agent settings" },
<!-- FORK:strategy END -->
      { label: "No", description: "Skip model/agent settings" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  }
<!-- FORK:strategy END -->
])
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
If "Yes", ask:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```text
<!-- FORK:strategy END -->
AskUserQuestion([
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    question: "Which model/agent settings do you want to change?",
<!-- FORK:strategy END -->
    header: "Agent Select",
<!-- FORK:strategy END -->
    multiSelect: true,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "AI Models", description: "Currently: [value]" },
<!-- FORK:strategy END -->
      { label: "Research", description: "Currently: [Yes|No]" },
<!-- FORK:strategy END -->
      { label: "Plan Check", description: "Currently: [Yes|No]" },
<!-- FORK:strategy END -->
      { label: "Verifier", description: "Currently: [Yes|No]" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  }
<!-- FORK:strategy END -->
])
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Then ask:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```text
<!-- FORK:strategy END -->
AskUserQuestion([
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    question: "Do you want to change the Drift Guard setting (plan-review source-grounding)?",
<!-- FORK:strategy END -->
    header: "Drift Guard",
<!-- FORK:strategy END -->
    multiSelect: false,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "Yes", description: "Toggle Drift Guard (currently: [Yes|No])" },
<!-- FORK:strategy END -->
      { label: "No", description: "Keep current Drift Guard setting" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  }
<!-- FORK:strategy END -->
])
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
For each selected setting across both blocks, ask only that question using the
<!-- FORK:strategy END -->
option set from Round 1 / Round 2 below. Merge user answers over the saved
<!-- FORK:strategy END -->
defaults — unchanged settings retain their saved values. Then skip to
<!-- FORK:strategy END -->
**Commit config.json**.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If "Configure fresh" or `~/.gsd/defaults.json` doesn't exist:** proceed with the questions below.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Round 1 — Core workflow settings (4 questions):**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
questions: [
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    header: "Mode",
<!-- FORK:strategy END -->
    question: "How do you want to work?",
<!-- FORK:strategy END -->
    multiSelect: false,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "YOLO (Recommended)", description: "Auto-approve, just execute" },
<!-- FORK:strategy END -->
      { label: "Interactive", description: "Confirm at each step" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  },
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    header: "Granularity",
<!-- FORK:strategy END -->
    question: "How finely should scope be sliced into phases?",
<!-- FORK:strategy END -->
    multiSelect: false,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "Coarse", description: "Fewer, broader phases (3-5 phases, 1-3 plans each)" },
<!-- FORK:strategy END -->
      { label: "Standard", description: "Balanced phase size (5-8 phases, 3-5 plans each)" },
<!-- FORK:strategy END -->
      { label: "Fine", description: "Many focused phases (8-12 phases, 5-10 plans each)" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  },
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    header: "Execution",
<!-- FORK:strategy END -->
    question: "Run plans in parallel?",
<!-- FORK:strategy END -->
    multiSelect: false,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "Parallel (Recommended)", description: "Independent plans run simultaneously" },
<!-- FORK:strategy END -->
      { label: "Sequential", description: "One plan at a time" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  },
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    header: "Git Tracking",
<!-- FORK:strategy END -->
    question: "Commit planning docs to git?",
<!-- FORK:strategy END -->
    multiSelect: false,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "Yes (Recommended)", description: "Planning docs tracked in version control" },
<!-- FORK:strategy END -->
      { label: "No", description: "Keep .planning/ local-only (add to .gitignore)" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  }
<!-- FORK:strategy END -->
]
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Round 2 — Workflow agents:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
These spawn additional agents during planning/execution. They add tokens and time but improve quality.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
| Agent | When it runs | What it does |
<!-- FORK:strategy END -->
|-------|--------------|--------------|
<!-- FORK:strategy END -->
| **Researcher** | Before planning each phase | Investigates domain, finds patterns, surfaces gotchas |
<!-- FORK:strategy END -->
| **Plan Checker** | After plan is created | Verifies plan actually achieves the phase goal |
<!-- FORK:strategy END -->
| **Verifier** | After phase execution | Confirms must-haves were delivered |
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
All recommended for important projects. Skip for quick experiments.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
questions: [
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    header: "Research",
<!-- FORK:strategy END -->
    question: "Research before planning each phase? (adds tokens/time)",
<!-- FORK:strategy END -->
    multiSelect: false,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "Yes (Recommended)", description: "Investigate domain, find patterns, surface gotchas" },
<!-- FORK:strategy END -->
      { label: "No", description: "Plan directly from requirements" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  },
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    header: "Plan Check",
<!-- FORK:strategy END -->
    question: "Verify plans will achieve their goals? (adds tokens/time)",
<!-- FORK:strategy END -->
    multiSelect: false,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "Yes (Recommended)", description: "Catch gaps before execution starts" },
<!-- FORK:strategy END -->
      { label: "No", description: "Execute plans without verification" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  },
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    header: "Verifier",
<!-- FORK:strategy END -->
    question: "Verify work satisfies requirements after each phase? (adds tokens/time)",
<!-- FORK:strategy END -->
    multiSelect: false,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "Yes (Recommended)", description: "Confirm deliverables match phase goals" },
<!-- FORK:strategy END -->
      { label: "No", description: "Trust execution, skip verification" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  }
<!-- FORK:strategy END -->
]
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
// Model profile uses a two-question split because AskUserQuestion enforces a hard
<!-- FORK:strategy END -->
// 4-option cap and there are 5 valid profiles (quality, balanced, budget, adaptive,
<!-- FORK:strategy END -->
// inherit). Q1 routes between adaptive/standard-tier/inherit; Q2 (shown only when
<!-- FORK:strategy END -->
// Q1 = "Standard tier…") picks among the three standard profiles. Mirrors the
<!-- FORK:strategy END -->
// /gsd:settings split (#3784, #1516).
<!-- FORK:strategy END -->
questions: [
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    header: "AI Models",
<!-- FORK:strategy END -->
    question: "Which AI models for planning agents?",
<!-- FORK:strategy END -->
    multiSelect: false,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "Adaptive (Recommended)", description: "Role-based cost optimization: heavy roles use the highest-tier model available on the active runtime, light roles use the cheapest. Best balance of quality and cost across all supported runtimes (Claude, Codex, Gemini, OpenRouter, local)." },
<!-- FORK:strategy END -->
      { label: "Standard tier…", description: "Choose Quality, Balanced, or Budget — flat tier applied to all agents" },
<!-- FORK:strategy END -->
      { label: "Inherit", description: "Use the current session model for all agents (required for non-Claude runtimes: Codex, Gemini CLI, OpenCode /model, OpenRouter, local models)" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  }
<!-- FORK:strategy END -->
]
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Conditional visibility — model_profile (Q2):**
<!-- FORK:strategy END -->
  Only ask this question when Q1's answer is "Standard tier…".
<!-- FORK:strategy END -->
  If Q1 = "Adaptive (Recommended)" → write model_profile=adaptive and SKIP Q2.
<!-- FORK:strategy END -->
  If Q1 = "Inherit"                → write model_profile=inherit and SKIP Q2.
<!-- FORK:strategy END -->
  If user cancels Q2 after picking "Standard tier…" → leave existing model_profile value unchanged.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
questions: [
<!-- FORK:strategy END -->
  {
<!-- FORK:strategy END -->
    question: "Which standard profile? (Quality / Balanced / Budget)",
<!-- FORK:strategy END -->
    header: "Model Tier",
<!-- FORK:strategy END -->
    multiSelect: false,
<!-- FORK:strategy END -->
    options: [
<!-- FORK:strategy END -->
      { label: "Quality", description: "Opus everywhere except verification (highest cost) — Claude only" },
<!-- FORK:strategy END -->
      { label: "Balanced", description: "Opus for planning, Sonnet for research/execution/verification — Claude only" },
<!-- FORK:strategy END -->
      { label: "Budget", description: "Sonnet for writing, Haiku for research/verification (lowest cost) — Claude only" }
<!-- FORK:strategy END -->
    ]
<!-- FORK:strategy END -->
  }
<!-- FORK:strategy END -->
]
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
// Map UI choices → config values:
<!-- FORK:strategy END -->
//   Q1 "Adaptive (Recommended)"         → model_profile = "adaptive"
<!-- FORK:strategy END -->
//   Q1 "Inherit"                        → model_profile = "inherit"
<!-- FORK:strategy END -->
//   Q1 "Standard tier…" + Q2 "Quality"  → model_profile = "quality"
<!-- FORK:strategy END -->
//   Q1 "Standard tier…" + Q2 "Balanced" → model_profile = "balanced"
<!-- FORK:strategy END -->
//   Q1 "Standard tier…" + Q2 "Budget"   → model_profile = "budget"
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**PR body onboarding:** Ask which optional PRD-style sections `/gsd:ship` should append to generated PR bodies. Use the same `ship.pr_body_sections` mapping as Step 2a: selected sections get `enabled: true`, seeded-but-unselected sections get `enabled: false`, and selecting none writes an empty list. Prefer lean/agile PRD sections that make user value, acceptance criteria, Definition of Done, and stakeholder traceability explicit.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Recommended options:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- `User Stories & Acceptance Criteria`
<!-- FORK:strategy END -->
- `Risks & Dependencies`
<!-- FORK:strategy END -->
- `Success Metrics & Release Criteria`
<!-- FORK:strategy END -->
- `Stakeholder Review & Approval`
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Create `.planning/config.json` with all settings (CLI fills in remaining defaults automatically):
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
mkdir -p .planning
<!-- FORK:strategy END -->
gsd_run query config-new-project '{"mode":"[yolo|interactive]","granularity":"[selected]","parallelization":true|false,"commit_docs":true|false,"model_profile":"quality|balanced|budget|adaptive|inherit","workflow":{"research":true|false,"plan_check":true|false,"verifier":true|false,"nyquist_validation":[false if granularity=coarse, true otherwise]},"plan_review":{"source_grounding":true|false},"ship":{"pr_body_sections":[{"heading":"User Stories & Acceptance Criteria","enabled":true|false,"source":"REQUIREMENTS.md ## User Stories || REQUIREMENTS.md ## Acceptance Criteria","fallback":"- Acceptance criteria are covered by the linked requirements and verification evidence."},{"heading":"Risks & Dependencies","enabled":true|false,"source":"PLAN.md ## Risks || PLAN.md ## Dependencies","fallback":"- No known high-risk rollout dependencies."},{"heading":"Success Metrics & Release Criteria","enabled":true|false,"source":"REQUIREMENTS.md ## Definition of Done || VERIFICATION.md ## Release Criteria","fallback":"- Release when automated verification and required manual checks pass."},{"heading":"Stakeholder Review & Approval","enabled":true|false,"template":"- Product owner approval pending for {phase_name}."}]}}'
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Note:** Run `/gsd:settings` anytime to update model profile, workflow agents, branching strategy, and other preferences.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If commit_docs = No:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- Set `commit_docs: false` in config.json
<!-- FORK:strategy END -->
- Add `.planning/` to `.gitignore` (create if needed)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If commit_docs = Yes:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- No additional gitignore entries needed
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Commit config.json:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
gsd_run query commit "chore: add project config" --files .planning/config.json
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## 5.1. Sub-Repo Detection
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Detect multi-repo workspace:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Check for directories with their own `.git` folders (separate repos within the workspace):
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
find . -maxdepth 1 -type d -not -name ".*" -not -name "node_modules" -exec test -d "{}/.git" \; -print
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If sub-repos found:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Strip the `./` prefix to get directory names (e.g., `./backend` → `backend`).
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Use AskUserQuestion:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- header: "Multi-Repo Workspace"
<!-- FORK:strategy END -->
- question: "I detected separate git repos in this workspace. Which directories contain code that GSD should commit to?"
<!-- FORK:strategy END -->
- multiSelect: true
<!-- FORK:strategy END -->
- options: one option per detected directory
<!-- FORK:strategy END -->
  - "[directory name]" — Separate git repo
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If user selects one or more directories:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- Set `planning.sub_repos` in config.json to the selected directory names array (e.g., `["backend", "frontend"]`)
<!-- FORK:strategy END -->
- Auto-set `planning.commit_docs` to `false` (planning docs stay local in multi-repo workspaces)
<!-- FORK:strategy END -->
- Add `.planning/` to `.gitignore` if not already present
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Config changes are saved locally — no commit needed since `commit_docs` is `false` in multi-repo mode.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If no sub-repos found or user selects none:** Continue with no changes to config.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## 5.5. Resolve Model Profile
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Use models from init: `researcher_model`, `synthesizer_model`, `roadmapper_model`.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## 6. Research Decision
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If auto mode:** Default to "Research first" without asking.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Use AskUserQuestion:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- header: "Research"
<!-- FORK:strategy END -->
- question: "Research the domain ecosystem before defining requirements?"
<!-- FORK:strategy END -->
- options:
<!-- FORK:strategy END -->
  - "Research first (Recommended)" — Discover standard stacks, expected features, architecture patterns
<!-- FORK:strategy END -->
  - "Skip research" — I know this domain well, go straight to requirements
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If "Research first":**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Display stage banner:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
### GSD ► RESEARCHING
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Researching [domain] ecosystem...
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Create research directory:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
mkdir -p .planning/research
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Determine milestone context:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Check if this is greenfield or subsequent milestone:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- If no "Validated" requirements in PROJECT.md → Greenfield (building from scratch)
<!-- FORK:strategy END -->
- If "Validated" requirements exist → Subsequent milestone (adding to existing app)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Display spawning indicator:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
◆ Spawning 4 researchers in parallel... (each runs in a subagent — no output until they return, ~1–5 min; expected, not a freeze)
<!-- FORK:strategy END -->
  → Stack research
<!-- FORK:strategy END -->
  → Features research
<!-- FORK:strategy END -->
  → Architecture research
<!-- FORK:strategy END -->
  → Pitfalls research
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Spawn 4 parallel gsd-project-researcher agents with path references:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<!-- #2517 model-omit-on-inherit -->
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
> **Model omission (#2517).** Omit the `model` parameter entirely when the value it would carry (`researcher_model`, `synthesizer_model`, `roadmapper_model`) is `"inherit"` or empty. An empty value 404s on runtimes without native tier aliases — the default on non-Claude runtimes. Omitting it inherits the orchestrator's model. See @gsd-core/references/model-profile-resolution.md.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```text
<!-- FORK:strategy END -->
Agent(prompt="<research_type>
<!-- FORK:strategy END -->
Project Research — Stack dimension for [domain].
<!-- FORK:strategy END -->
</research_type>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<milestone_context>
<!-- FORK:strategy END -->
[greenfield OR subsequent]
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Greenfield: Research the standard stack for building [domain] from scratch.
<!-- FORK:strategy END -->
Subsequent: Research what's needed to add [target features] to an existing [domain] app. Don't re-research the existing system.
<!-- FORK:strategy END -->
</milestone_context>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<question>
<!-- FORK:strategy END -->
What's the standard 2025 stack for [domain]?
<!-- FORK:strategy END -->
</question>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<required_reading>
<!-- FORK:strategy END -->
- {project_path} (Project context and goals)
<!-- FORK:strategy END -->
</required_reading>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
${AGENT_SKILLS_RESEARCHER}
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<downstream_consumer>
<!-- FORK:strategy END -->
Your STACK.md feeds into roadmap creation. Be prescriptive:
<!-- FORK:strategy END -->
- Specific libraries with versions
<!-- FORK:strategy END -->
- Clear rationale for each choice
<!-- FORK:strategy END -->
- What NOT to use and why
<!-- FORK:strategy END -->
</downstream_consumer>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<quality_gate>
<!-- FORK:strategy END -->
- [ ] Versions are current (verify with Context7/official docs, not training data)
<!-- FORK:strategy END -->
- [ ] Rationale explains WHY, not just WHAT
<!-- FORK:strategy END -->
- [ ] Confidence levels assigned to each recommendation
<!-- FORK:strategy END -->
</quality_gate>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<!-- #2508 runtime-aware-dispatch -->
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
> **Runtime-aware dispatch (#2508 Phase 4).** GSD workflows dispatch specialized subagents by role. Before dispatching on a built-in-only runtime (kimi-code — three built-ins only), resolve the role to a built-in via `gsd_run query resolve-dispatch-type --requested <role> --raw`. On named-dispatch runtimes (Claude/OpenCode/…) the role is returned unchanged; on kimi-code it maps to `coder`/`explore`/`plan` by role-suffix. The persona rides `${AGENT_SKILLS_<ROLE>}` (Phase 3) regardless. See @gsd-core/references/runtime-aware-dispatch.md.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<output>
<!-- FORK:strategy END -->
Write to: {research_dir}/STACK.md
<!-- FORK:strategy END -->
Use template: ~/.claude/gsd-core/templates/research-project/STACK.md
<!-- FORK:strategy END -->
</output>
<!-- FORK:strategy END -->
", subagent_type="gsd-project-researcher", model="{researcher_model}", description="Stack research")
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Agent(prompt="<research_type>
<!-- FORK:strategy END -->
Project Research — Features dimension for [domain].
<!-- FORK:strategy END -->
</research_type>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<milestone_context>
<!-- FORK:strategy END -->
[greenfield OR subsequent]
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Greenfield: What features do [domain] products have? What's table stakes vs differentiating?
<!-- FORK:strategy END -->
Subsequent: How do [target features] typically work? What's expected behavior?
<!-- FORK:strategy END -->
</milestone_context>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<question>
<!-- FORK:strategy END -->
What features do [domain] products have? What's table stakes vs differentiating?
<!-- FORK:strategy END -->
</question>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<required_reading>
<!-- FORK:strategy END -->
- {project_path} (Project context)
<!-- FORK:strategy END -->
</required_reading>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
${AGENT_SKILLS_RESEARCHER}
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<downstream_consumer>
<!-- FORK:strategy END -->
Your FEATURES.md feeds into requirements definition. Categorize clearly:
<!-- FORK:strategy END -->
- Table stakes (must have or users leave)
<!-- FORK:strategy END -->
- Differentiators (competitive advantage)
<!-- FORK:strategy END -->
- Anti-features (things to deliberately NOT build)
<!-- FORK:strategy END -->
</downstream_consumer>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<quality_gate>
<!-- FORK:strategy END -->
- [ ] Categories are clear (table stakes vs differentiators vs anti-features)
<!-- FORK:strategy END -->
- [ ] Complexity noted for each feature
<!-- FORK:strategy END -->
- [ ] Dependencies between features identified
<!-- FORK:strategy END -->
</quality_gate>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<output>
<!-- FORK:strategy END -->
Write to: {research_dir}/FEATURES.md
<!-- FORK:strategy END -->
Use template: ~/.claude/gsd-core/templates/research-project/FEATURES.md
<!-- FORK:strategy END -->
</output>
<!-- FORK:strategy END -->
", subagent_type="gsd-project-researcher", model="{researcher_model}", description="Features research")
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Agent(prompt="<research_type>
<!-- FORK:strategy END -->
Project Research — Architecture dimension for [domain].
<!-- FORK:strategy END -->
</research_type>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<milestone_context>
<!-- FORK:strategy END -->
[greenfield OR subsequent]
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Greenfield: How are [domain] systems typically structured? What are major components?
<!-- FORK:strategy END -->
Subsequent: How do [target features] integrate with existing [domain] architecture?
<!-- FORK:strategy END -->
</milestone_context>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<question>
<!-- FORK:strategy END -->
How are [domain] systems typically structured? What are major components?
<!-- FORK:strategy END -->
</question>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<required_reading>
<!-- FORK:strategy END -->
- {project_path} (Project context)
<!-- FORK:strategy END -->
</required_reading>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
${AGENT_SKILLS_RESEARCHER}
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<downstream_consumer>
<!-- FORK:strategy END -->
Your ARCHITECTURE.md informs phase structure in roadmap. Include:
<!-- FORK:strategy END -->
- Component boundaries (what talks to what)
<!-- FORK:strategy END -->
- Data flow (how information moves)
<!-- FORK:strategy END -->
- Suggested build order (dependencies between components)
<!-- FORK:strategy END -->
</downstream_consumer>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<quality_gate>
<!-- FORK:strategy END -->
- [ ] Components clearly defined with boundaries
<!-- FORK:strategy END -->
- [ ] Data flow direction explicit
<!-- FORK:strategy END -->
- [ ] Build order implications noted
<!-- FORK:strategy END -->
</quality_gate>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<output>
<!-- FORK:strategy END -->
Write to: {research_dir}/ARCHITECTURE.md
<!-- FORK:strategy END -->
Use template: ~/.claude/gsd-core/templates/research-project/ARCHITECTURE.md
<!-- FORK:strategy END -->
</output>
<!-- FORK:strategy END -->
", subagent_type="gsd-project-researcher", model="{researcher_model}", description="Architecture research")
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Agent(prompt="<research_type>
<!-- FORK:strategy END -->
Project Research — Pitfalls dimension for [domain].
<!-- FORK:strategy END -->
</research_type>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<milestone_context>
<!-- FORK:strategy END -->
[greenfield OR subsequent]
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Greenfield: What do [domain] projects commonly get wrong? Critical mistakes?
<!-- FORK:strategy END -->
Subsequent: What are common mistakes when adding [target features] to [domain]?
<!-- FORK:strategy END -->
</milestone_context>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<question>
<!-- FORK:strategy END -->
What do [domain] projects commonly get wrong? Critical mistakes?
<!-- FORK:strategy END -->
</question>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<required_reading>
<!-- FORK:strategy END -->
- {project_path} (Project context)
<!-- FORK:strategy END -->
</required_reading>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
${AGENT_SKILLS_RESEARCHER}
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<downstream_consumer>
<!-- FORK:strategy END -->
Your PITFALLS.md prevents mistakes in roadmap/planning. For each pitfall:
<!-- FORK:strategy END -->
- Warning signs (how to detect early)
<!-- FORK:strategy END -->
- Prevention strategy (how to avoid)
<!-- FORK:strategy END -->
- Which phase should address it
<!-- FORK:strategy END -->
</downstream_consumer>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<quality_gate>
<!-- FORK:strategy END -->
- [ ] Pitfalls are specific to this domain (not generic advice)
<!-- FORK:strategy END -->
- [ ] Prevention strategies are actionable
<!-- FORK:strategy END -->
- [ ] Phase mapping included where relevant
<!-- FORK:strategy END -->
</quality_gate>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<output>
<!-- FORK:strategy END -->
Write to: {research_dir}/PITFALLS.md
<!-- FORK:strategy END -->
Use template: ~/.claude/gsd-core/templates/research-project/PITFALLS.md
<!-- FORK:strategy END -->
</output>
<!-- FORK:strategy END -->
", subagent_type="gsd-project-researcher", model="{researcher_model}", description="Pitfalls research")
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
> **ORCHESTRATOR RULE — CODEX RUNTIME**: After calling all 4 researcher Agent() calls above, do NOT read research files or synthesize content independently while the subagents are active. Wait for all 4 researchers to complete before spawning the synthesizer. This prevents duplicate work and wasted context.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
After all 4 agents complete, spawn synthesizer to create SUMMARY.md:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```text
<!-- FORK:strategy END -->
Agent(prompt="
<!-- FORK:strategy END -->
<task>
<!-- FORK:strategy END -->
Synthesize research outputs into SUMMARY.md.
<!-- FORK:strategy END -->
</task>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<required_reading>
<!-- FORK:strategy END -->
- {research_dir}/STACK.md
<!-- FORK:strategy END -->
- {research_dir}/FEATURES.md
<!-- FORK:strategy END -->
- {research_dir}/ARCHITECTURE.md
<!-- FORK:strategy END -->
- {research_dir}/PITFALLS.md
<!-- FORK:strategy END -->
</required_reading>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
${AGENT_SKILLS_SYNTHESIZER}
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<output>
<!-- FORK:strategy END -->
Write to: {research_dir}/SUMMARY.md
<!-- FORK:strategy END -->
Use template: ~/.claude/gsd-core/templates/research-project/SUMMARY.md
<!-- FORK:strategy END -->
Commit after writing.
<!-- FORK:strategy END -->
</output>
<!-- FORK:strategy END -->
", subagent_type="gsd-research-synthesizer", model="{synthesizer_model}", description="Synthesize research")
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
> **ORCHESTRATOR RULE — CODEX RUNTIME**: After calling Agent() above, stop working on this task immediately. Do not read more files, edit code, or run tests related to this task while the subagent is active. Wait for the subagent to return its result. This prevents duplicate work, conflicting edits, and wasted context. Only resume when the subagent result is available.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Synthesizer output self-heal (#222) — verify SUMMARY.md materialized:** The synthesizer's canonical output is `.planning/research/SUMMARY.md` on disk; its brief structured return (`## SYNTHESIS COMPLETE` plus a few `###` confirmation lines) is NOT the file content. A known LLM false-refusal (issue #222) sometimes makes the agent return the full SUMMARY.md document inline — fabricating a write restriction (e.g. "the runtime is blocking file writes") — instead of writing the file. Prompt hardening alone does not fully eliminate it, so the orchestrator MUST absorb the failure deterministically before spawning `gsd-roadmapper`:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
1. Verify `.planning/research/SUMMARY.md` exists AND is substantive — non-empty, and free of any leftover `<!-- gsd:write-continue -->` continuation sentinel (which marks a truncated/incomplete write). You may validate with `gsd_run verify-summary .planning/research/SUMMARY.md` — it exits 0 regardless, so check its JSON `passed` field (`"passed": false` means missing or invalid), not the process exit code. If it passes, continue normally.
<!-- FORK:strategy END -->
2. If it is MISSING or invalid AND the synthesizer's return message contains the FULL SUMMARY.md document — recognizable by the template's top-level markers `# Project Research Summary`, `## Key Findings`, `## Implications for Roadmap`, and `## Sources`, not merely the brief `## SYNTHESIS COMPLETE` confirmation — the false-refusal fired: write that returned document to `.planning/research/SUMMARY.md` with the Write tool, then commit ALL research artifacts the synthesizer owns (it commits on behalf of the four researchers) with `gsd_run query commit "docs: complete project research" --files .planning/research/` unless they are already committed. Log `⚠ #222 self-heal: synthesizer returned SUMMARY.md inline without writing it; orchestrator persisted the file.`
<!-- FORK:strategy END -->
3. If it is MISSING or invalid AND the return is only a brief confirmation (no full SUMMARY document to recover), the synthesizer genuinely failed — surface the error and stop; do NOT spawn `gsd-roadmapper` against a missing or incomplete SUMMARY.md.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
This guarantees `gsd-roadmapper` (which lists SUMMARY.md as required reading) never runs against a missing or truncated SUMMARY.md.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Display research complete banner and key findings:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
### GSD ► RESEARCH COMPLETE ✓
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## Key Findings
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Stack:** [from SUMMARY.md]
<!-- FORK:strategy END -->
**Table Stakes:** [from SUMMARY.md]
<!-- FORK:strategy END -->
**Watch Out For:** [from SUMMARY.md]
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Files: `.planning/research/`
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If "Skip research":** Continue to Step 7.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## 7. Define Requirements
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Display stage banner:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
### GSD ► DEFINING REQUIREMENTS
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Load context:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Read PROJECT.md and extract:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- Core value (the ONE thing that must work)
<!-- FORK:strategy END -->
- Stated constraints (budget, timeline, tech limitations)
<!-- FORK:strategy END -->
- Any explicit scope boundaries
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If research exists:** Read research/FEATURES.md and extract feature categories.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If auto mode:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- Auto-include all table stakes features (users expect these)
<!-- FORK:strategy END -->
- Include features explicitly mentioned in provided document
<!-- FORK:strategy END -->
- Auto-defer differentiators not mentioned in document
<!-- FORK:strategy END -->
- Skip per-category AskUserQuestion loops
<!-- FORK:strategy END -->
- Skip "Any additions?" question
<!-- FORK:strategy END -->
- Skip requirements approval gate
<!-- FORK:strategy END -->
- Generate REQUIREMENTS.md and commit directly
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Present features by category (interactive mode only):**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
Here are the features for [domain]:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## Authentication
<!-- FORK:strategy END -->
**Table stakes:**
<!-- FORK:strategy END -->
- Sign up with email/password
<!-- FORK:strategy END -->
- Email verification
<!-- FORK:strategy END -->
- Password reset
<!-- FORK:strategy END -->
- Session management
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Differentiators:**
<!-- FORK:strategy END -->
- Magic link login
<!-- FORK:strategy END -->
- OAuth (Google, GitHub)
<!-- FORK:strategy END -->
- 2FA
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Research notes:** [any relevant notes]
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
---
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## [Next Category]
<!-- FORK:strategy END -->
...
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If no research:** Gather requirements through conversation instead.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Ask: "What are the main things users need to be able to do?"
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
For each capability mentioned:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- Ask clarifying questions to make it specific
<!-- FORK:strategy END -->
- Probe for related capabilities
<!-- FORK:strategy END -->
- Group into categories
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Scope each category:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
For each category, use AskUserQuestion:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- header: "[Category]" (max 12 chars)
<!-- FORK:strategy END -->
- question: "Which [category] features are in v1?"
<!-- FORK:strategy END -->
- multiSelect: true
<!-- FORK:strategy END -->
- options:
<!-- FORK:strategy END -->
  - "[Feature 1]" — [brief description]
<!-- FORK:strategy END -->
  - "[Feature 2]" — [brief description]
<!-- FORK:strategy END -->
  - "[Feature 3]" — [brief description]
<!-- FORK:strategy END -->
  - "None for v1" — Defer entire category
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Track responses:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- Selected features → v1 requirements
<!-- FORK:strategy END -->
- Unselected table stakes → v2 (users expect these)
<!-- FORK:strategy END -->
- Unselected differentiators → out of scope
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Identify gaps:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Use AskUserQuestion:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- header: "Additions"
<!-- FORK:strategy END -->
- question: "Any requirements research missed? (Features specific to your vision)"
<!-- FORK:strategy END -->
- options:
<!-- FORK:strategy END -->
  - "No, research covered it" — Proceed
<!-- FORK:strategy END -->
  - "Yes, let me add some" — Capture additions
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Validate core value:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Cross-check requirements against Core Value from PROJECT.md. If gaps detected, surface them.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Generate REQUIREMENTS.md:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Create `.planning/REQUIREMENTS.md` with:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- v1 Requirements grouped by category (checkboxes, REQ-IDs)
<!-- FORK:strategy END -->
- v2 Requirements (deferred)
<!-- FORK:strategy END -->
- Out of Scope (explicit exclusions with reasoning)
<!-- FORK:strategy END -->
- Traceability section (empty, filled by roadmap)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**REQ-ID format:** `[CATEGORY]-[NUMBER]` (AUTH-01, CONTENT-02)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Requirement quality criteria:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Good requirements are:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- **Specific and testable:** "User can reset password via email link" (not "Handle password reset")
<!-- FORK:strategy END -->
- **User-centric:** "User can X" (not "System does Y")
<!-- FORK:strategy END -->
- **Atomic:** One capability per requirement (not "User can login and manage profile")
<!-- FORK:strategy END -->
- **Independent:** Minimal dependencies on other requirements
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Reject vague requirements. Push for specificity:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- "Handle authentication" → "User can log in with email/password and stay logged in across sessions"
<!-- FORK:strategy END -->
- "Support sharing" → "User can share post via link that opens in recipient's browser"
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Present full requirements list (interactive mode only):**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Show every requirement (not counts) for user confirmation:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
## v1 Requirements
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
### Authentication
<!-- FORK:strategy END -->
- [ ] **AUTH-01**: User can create account with email/password
<!-- FORK:strategy END -->
- [ ] **AUTH-02**: User can log in and stay logged in across sessions
<!-- FORK:strategy END -->
- [ ] **AUTH-03**: User can log out from any page
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
### Content
<!-- FORK:strategy END -->
- [ ] **CONT-01**: User can create posts with text
<!-- FORK:strategy END -->
- [ ] **CONT-02**: User can edit their own posts
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
[... full list ...]
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
---
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Does this capture what you're building? (yes / adjust)
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
If "adjust": Return to scoping.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Commit requirements:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
gsd_run query commit "docs: define v1 requirements" --files .planning/REQUIREMENTS.md
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## 7.5. Project Structure Mode
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If auto mode:** Set `PROJECT_MODE=mvp` and skip this prompt.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Mode prompt: Vertical MVP vs Horizontal Layers.**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Ask the user how they want to structure the project. Use `AskUserQuestion` with two options:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- **Vertical MVP** — get a working app fast, add features slice by slice. Each phase delivers an end-to-end user capability. *(Recommended for new products and rapid-iteration MVPs.)*
<!-- FORK:strategy END -->
- **Horizontal Layers** — build complete technical layers (DB → API → UI → wiring) and assemble at the end. *(Better for infrastructure-heavy projects with multiple developers.)*
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Set `PROJECT_MODE=mvp` if the user picks Vertical MVP, otherwise `PROJECT_MODE=standard`.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Persist the choice for the deferred roadmap.** The roadmap is no longer created here — it is generated after the strategy chain by `/gsd:roadmap` (`gsd-roadmap`), which runs in a later session and cannot see this shell variable. Record the choice as a marker in PROJECT.md so the deferred roadmap applies the correct per-phase template:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
grep -qi 'roadmap-mode:' .planning/PROJECT.md 2>/dev/null || printf '\n<!-- roadmap-mode: %s -->\n' "$PROJECT_MODE" >> .planning/PROJECT.md
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
When `TEXT_MODE=true` (per the workflow's existing TEXT_MODE handling for non-Claude runtimes), present the same two options as a plain-text numbered list and ask the user to type their choice number.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<!-- FORK:strategy BEGIN -->
<!-- FORK:strategy END -->
## 7.6. Strategy Plan (the on-ramp into the strategy chain)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Context is now ready (PROJECT.md + `## Mode` + REQUIREMENTS + any PRODUCT-BRIEF), so recommend the **archetype-tailored strategy path** before building — this is the on-ramp the build loop depends on. **Read `@~/.claude/gsd-core/references/strategy-flow.md` now.**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
1. **Derive the archetype** from `## Mode` (Origin × Design-input × Code-quality) + the surface axes (Surface · Domain richness · Security exposure · Deployment · Criticality). Read these from the brief/requirements/project; **ask only the axes nothing has answered** (one `AskUserQuestion`/`--text` screen, recommended defaults — e.g. "Will this deploy as a service, ship as a package, or run locally?"; "Does it handle payments/PII/regulated data?"). `--auto`: infer all axes from the docs, no prompt.
<!-- FORK:strategy END -->
2. **Select the recommended path** from the matrix + overlays (brownfield/refactor/harden via `## Mode`; design-provided; the vibe-coded hardening playlist). It is always a subset/reorder of the canonical spine in `strategy-chain.md` — skipping `frontend-architecture` for backend/CLI, scaling `security-strategy` depth, etc.
<!-- FORK:strategy END -->
3. **Write `## Strategy Plan`** into PROJECT.md (the archetype line, the ordered recommended steps with status `recommended`, and the skip-ledger scaffold) per the template.
<!-- FORK:strategy END -->
4. **Present it** and let the user accept / customize / skip-to-build. A declined recommended step → a skip-ledger line (`- <skill> — skipped (<reason>, <date>)`); enforcers note it once, don't re-nag. The build loop honors whatever artifacts exist, so a partial path is safe.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
The Step-9 handoff then leads with the **first recommended step** of this plan. (The coarse roadmap below stays coarse; `plan-phase`'s elaboration gate refines it against whatever strategy artifacts get produced.)
<!-- FORK:strategy END -->
<!-- FORK:strategy END -->
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## 8. Finalize project context
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
The roadmap is **no longer created here.** It is generated once, after the strategy chain, by `/gsd:roadmap` (`gsd-roadmap`) — so it is born fully-informed against the locked strategy artifacts instead of coarse-then-patched. This step just finalizes the project instruction file and commits the context artifacts; the Step-9 handoff routes into the strategy chain (or straight to `/gsd:roadmap` when no strategy steps are recommended).
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Generate or refresh project instruction file before final commit:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
gsd_run query generate-claude-md --output "$INSTRUCTION_FILE"
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
This ensures new projects get the default GSD workflow-enforcement guidance and current project context in `$INSTRUCTION_FILE`.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Commit project context (ROADMAP.md / STATE.md do not exist yet — they are written later by `/gsd:roadmap`):**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
gsd_run query commit "docs: finalize project context" --files .planning/PROJECT.md .planning/REQUIREMENTS.md "$INSTRUCTION_FILE"
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## 9. Done
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
Present completion summary:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
### GSD ► PROJECT INITIALIZED ✓
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**[Project Name]**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
| Artifact       | Location                    |
<!-- FORK:strategy END -->
|----------------|-----------------------------|
<!-- FORK:strategy END -->
| Project        | `.planning/PROJECT.md`      |
<!-- FORK:strategy END -->
| Config         | `.planning/config.json`     |
<!-- FORK:strategy END -->
| Research       | `.planning/research/`       |
<!-- FORK:strategy END -->
| Requirements   | `.planning/REQUIREMENTS.md` |
<!-- FORK:strategy END -->
| Roadmap        | created after your strategy chain |
<!-- FORK:strategy END -->
| Project guide  | `$INSTRUCTION_FILE`         |
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**[N] phases** | **[X] requirements** | Ready to build ✓
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Determine the on-ramp from `## Strategy Plan`** (written in Step 7.6):
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```bash
<!-- FORK:strategy END -->
NEXT_STRATEGY=$(gsd_run query project strategy-plan --raw 2>/dev/null)   # the first `recommended` step, or empty
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
`NEXT_STRATEGY` is the first step whose status is `recommended` (e.g. `model-domain`, `recommend-architecture`). If the plan has **no** recommended steps (prototype archetype, or the user skipped to build), it is empty → hand off to the build loop (the panels below).
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If auto mode:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<!-- FORK:strategy BEGIN -->
<!-- FORK:strategy END -->
- **If `NEXT_STRATEGY` is set:** auto-advance **into the strategy chain** — exit and dispatch `Skill(skill="gsd-${NEXT_STRATEGY}", args="--auto")` (the Skill tool, never a `SlashCommand` — an interpolated `/gsd:${…}` name is invisible to the install-time slash-form converter and resolves to nothing on skill-only installs). That step, on completion, runs the **strategy auto-advance driver** (`@~/.claude/gsd-core/workflows/strategy-chain/modes/advance.md`) which dispatches the next `## Strategy Plan` step (honoring skips) and ultimately the build loop — so the chain runs hands-off, no longer dead-ending after the first step.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
  ```
<!-- FORK:strategy END -->
  ### AUTO-ADVANCING → STRATEGY: ${NEXT_STRATEGY}
<!-- FORK:strategy END -->
  ```
<!-- FORK:strategy END -->
- **Else** (no strategy steps recommended — prototype archetype, or the user skipped to build): there is no strategy chain to carry the transition, so create the roadmap now — exit and invoke `SlashCommand("/gsd:roadmap --auto")`. `gsd-roadmap` creates the roadmap (coarse, since no strategy artifacts exist) and then chains onward to `/gsd:discuss-phase 1 --auto`.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If interactive mode AND `NEXT_STRATEGY` is set:**
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
---
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## ▶ Next Up — [${PROJECT_CODE}] ${PROJECT_TITLE}
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Your strategy plan:** [the ordered `## Strategy Plan` steps]
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
/clear then:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
/gsd:${NEXT_STRATEGY} — [one-line purpose] (first step of your strategy plan; it chains onward to the build loop)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
---
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Also available:**
<!-- FORK:strategy END -->
- /gsd:roadmap — skip strategy and start building directly (creates the roadmap now, then points to discuss-phase)
<!-- FORK:strategy END -->
  (declining a recommended step records a skip-ledger entry; the build loop honors whatever artifacts exist)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
---
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**If interactive mode AND `NEXT_STRATEGY` is empty** (straight to build):
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
No strategy chain carries this transition and no ROADMAP.md exists yet, so the next step is to create the roadmap. Point the user at `/gsd:roadmap` — it creates the roadmap (coarse, since no strategy artifacts exist) and then points onward to `/gsd:discuss-phase 1`:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->
---
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
## ▶ Next Up — [${PROJECT_CODE}] ${PROJECT_TITLE}
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**[${PROJECT_CODE}] ${PROJECT_TITLE}** — requirements scoped; roadmap pending
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
/clear then:
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
/gsd:roadmap — generate the roadmap, then start building
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
---
<!-- FORK:strategy END -->
```
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
</process>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<output>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- `.planning/PROJECT.md`
<!-- FORK:strategy END -->
- `.planning/config.json`
<!-- FORK:strategy END -->
- `.planning/research/` (if research selected)
<!-- FORK:strategy END -->
  - `STACK.md`
<!-- FORK:strategy END -->
  - `FEATURES.md`
<!-- FORK:strategy END -->
  - `ARCHITECTURE.md`
<!-- FORK:strategy END -->
  - `PITFALLS.md`
<!-- FORK:strategy END -->
  - `SUMMARY.md`
<!-- FORK:strategy END -->
- `.planning/REQUIREMENTS.md`
<!-- FORK:strategy END -->
- `.planning/ROADMAP.md` — **not written here**; created after the strategy chain by `/gsd:roadmap`
<!-- FORK:strategy END -->
- `.planning/STATE.md` — **not written here**; seeded by the roadmapper via `/gsd:roadmap`
<!-- FORK:strategy END -->
- `$INSTRUCTION_FILE` (runtime-derived via the shared `getProjectInstructionFile` policy: `AGENTS.md` for codex/opencode/kilo/kimi, `.github/copilot-instructions.md` for copilot, `GEMINI.md` for gemini/antigravity, `.claude/CLAUDE.md` for claude)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
</output>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
<success_criteria>
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
- [ ] .planning/ directory created
<!-- FORK:strategy END -->
- [ ] Git repo initialized
<!-- FORK:strategy END -->
- [ ] Brownfield detection completed
<!-- FORK:strategy END -->
- [ ] Deep questioning completed (threads followed, not rushed)
<!-- FORK:strategy END -->
- [ ] PROJECT.md captures full context → **committed**
<!-- FORK:strategy END -->
- [ ] config.json has workflow mode, granularity, parallelization → **committed**
<!-- FORK:strategy END -->
- [ ] Research completed (if selected) — 4 parallel agents spawned → **committed**
<!-- FORK:strategy END -->
- [ ] Requirements gathered (from research or conversation)
<!-- FORK:strategy END -->
- [ ] User scoped each category (v1/v2/out of scope)
<!-- FORK:strategy END -->
- [ ] REQUIREMENTS.md created with REQ-IDs → **committed**
<!-- FORK:strategy END -->
- [ ] Roadmap **deferred** to `/gsd:roadmap` (created once after the strategy chain, born fully-informed) — not spawned here
<!-- FORK:strategy END -->
- [ ] `<!-- roadmap-mode: ... -->` marker persisted in PROJECT.md (Step 7.5) so the deferred roadmap applies the correct MVP/standard template
<!-- FORK:strategy END -->
- [ ] `$INSTRUCTION_FILE` generated with GSD workflow guidance (runtime-derived via the shared `getProjectInstructionFile` policy — `AGENTS.md` for codex/opencode/kilo/kimi, `.github/copilot-instructions.md` for copilot, `GEMINI.md` for gemini/antigravity, `.claude/CLAUDE.md` for claude; an existing hand-crafted file without GSD markers is left untouched unless `--force`)
<!-- FORK:strategy END -->
- [ ] `## Strategy Plan` written from the archetype (Step 7.6); user directed to its first recommended step (or to `/gsd:roadmap` when no strategy steps are recommended)
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
**Atomic commits:** Each phase commits its artifacts immediately. If context is lost, artifacts persist.
<!-- FORK:strategy END -->

<!-- FORK:strategy END -->
</success_criteria>
<!-- FORK:strategy END -->
