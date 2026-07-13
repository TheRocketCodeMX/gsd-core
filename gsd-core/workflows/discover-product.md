<purpose>
Define WHAT to build and WHY before building — separating real demand from interest, finding the narrowest valuable wedge, assessing the four product risks, and framing success as an outcome. Optional, front-of-funnel: runs standalone (no existing project required). Produces `.planning/PRODUCT-BRIEF.md`, which feeds PROJECT.md and model-domain. Frame the vision at the outcome level so the domain and architecture stay open.
</purpose>

<required_reading>
@~/.claude/gsd-core/references/product-discovery.md
@~/.claude/gsd-core/templates/product-brief.md
</required_reading>

<process>

## Step 1: Initialize

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${GSD_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${GSD_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
COMMIT_DOCS=$(gsd_run query config-get commit_docs 2>/dev/null || echo "true")
RESPONSE_LANG=$(gsd_run query config-get response_language 2>/dev/null || true)
mkdir -p .planning
cat .planning/PROJECT.md 2>/dev/null || true
cat .planning/REQUIREMENTS.md 2>/dev/null || true
ls .planning/PRODUCT-BRIEF.md >/dev/null 2>&1 && echo "EXISTS" || echo "NEW"
```

This skill is **front-of-funnel and standalone** — it does NOT require an existing project. If PROJECT.md/REQUIREMENTS.md exist, use them as grounding; if not, that's expected.

**If `RESPONSE_LANG` non-empty:** all user-facing text in that language; keep technical terms and code in English.

**Text mode** (`--text` OR `workflow.text_mode: true`): replace every `AskUserQuestion` with a plain-text numbered list.

**If `EXISTS` and not `--auto`:** ask (AskUserQuestion, header "Brief") Update / View / Skip. On Skip: exit with "Existing PRODUCT-BRIEF.md preserved." On View: show then Update/Skip.

**Read `@~/.claude/gsd-core/references/product-discovery.md` now** — it defines the forcing posture, the demand-vs-interest rule, and the ordered question set.

## Step 2: Optionality gate

`/gsd:discover-product` is optional. Decide whether the full interview is warranted (`--auto` skips this gate and synthesizes from existing docs; `--challenge` skips it too — straight to Step 2b).

**Honor an already-stated mode.** If `$ARGUMENTS` or the invocation itself already answers this gate (e.g. "--challenge", "challenge mode", "value is uncertain, run the full interview"), do NOT re-ask it — state the mode in one line ("Running in challenge mode against [docs] — gate answered by invocation") and route directly. Otherwise use `AskUserQuestion` (header "Discovery"):
- question: "Is the product value already clear and **evidenced** (a client/customer asking for specific things, real usage data), or is value still uncertain?"
- options:
  - "Value is uncertain — run discovery" (→ proceed to Step 3)
  - "Requirements are clear & evidenced" (→ Step 2a)
  - "Clear, but help me prioritize" (→ Step 2a, prioritization only)
  - "Specs/research already exist — challenge them" (→ Step 2b)

**Step 2a (clear/evidenced path):** First **audit the evidence** — two tests, BOTH must pass:
1. **Strength:** the evidence is behavioral with *money moved or real usage* (a paying client, a live pilot), not *interest* (waitlists, likes, "people say it's great"). Signed non-binding LOIs are **medium** — never skip-qualifying alone.
2. **Coverage:** the evidence covers the *specific candidate list* to be prioritized. If it covers only a slice, run the full interview (Step 3) scoped to the unevidenced remainder.

If either fails, say so and route to the full interview — never honor "evidenced" on waitlists/likes/LOIs alone. If both pass, do NOT run the full interview, but first ask three one-question checks: the **named specific user**, the **narrowest-slice statement**, and an **outcome (not output) metric** — each must get a real answer before the minimal brief. Then either:
- Offer lightweight **RICE** prioritization on their known candidate list (Reach × Impact × Confidence ÷ Effort; note table-stakes/dependencies override the score), capture it, then
- Point them onward: "Requirements are clear — run `/gsd:new-project` to capture them, then `/gsd:model-domain`."
Write a minimal PRODUCT-BRIEF.md (outcome + user + slice + the prioritized list + "discovery skipped: requirements pre-evidenced") and skip to Step 10. Exit early if they don't even want prioritization.

## Step 2b: Challenge mode — build the gap map (`--challenge [@doc ...]`)

For projects with existing definition artifacts (a design spec, research corpus, levantamiento notes, PRDs) at ANY maturity. The posture is **challenge and complement, never re-ask or restart**.

1. **Read the upstream docs now** — every `@`-path passed with `--challenge`, plus `.planning/*.md` and an `ls docs/` scan for obvious spec/research files (confirm ambiguous ones with the user; don't ingest wholesale — that's `/gsd:ingest-docs`).
2. **Build the gap map**: classify each discovery block against its named outputs (the same skip criteria as Step 3–9): **ANSWERED** (the named outputs exist in the docs, evidenced), **WEAK** (addressed but vague, unevidenced, or contradictory), or **SILENT** (not addressed). Blocks: frame/outcome · user+job · demand evidence · wedge · four risks/assumptions · scope · success metric.
3. **Two blocks are never doc-answerable — cap them at WEAK regardless of what the docs assert:**
   - **Demand evidence**: specs contain intentions and theses, not past behavior. Only *recorded past behavior with named actors* (who paid, who used, when) counts as ANSWERED — and that almost always lives in people's heads, not documents. Interview it.
   - **User definition**: re-test it, don't inherit it — specs routinely smuggle the everyone-trap in writing (multi-user framings, "platforms", personas-as-demographics). Apply Step 4's pushback to the *documented* user as if the user had just said it.
4. **Present the gap map** in one message ("the spec answers X and Y; W is weak — I'll challenge it; Z is silent — I'll interview it") and proceed: ANSWERED blocks → reflect the doc's conclusion back for confirmation (batched, no re-asking); WEAK → challenge with the block's forcing questions; SILENT → full interview for that block. Then continue at Step 3–9 covering only WEAK + SILENT.
5. **Track contradictions**: whenever the interview contradicts or materially extends the upstream docs, record it — these become the brief's **Proposed spec amendments** (Step 10). A challenge that wins the argument but loses the record is worthless: downstream agents read both documents.

Greenfield is the degenerate case (everything SILENT → the full interview); a mature spec is the other end (mostly ANSWERED → a confirmation pass + the two never-inherited blocks). The posture is derived from the gap map, never chosen by feel.

## Step 3–9: The forcing interview

Run the ordered question set from the reference. **Posture: the first answer is polished — push 2–3 times for concrete specifics (the actual human, the actual consequence), reflect back, confirm. One contested thread at a time — but batch the rest:** reflect already-evidenced conclusions back in groups and combine a reflection with the next probe in one turn (a context-rich session should take ~10–15 turns, not ~30; batching cuts turns, not rigor). Ask about the PAST, never hypotheticals. Skip a block ONLY when its named outputs are already captured at **strong** evidence — Step 4: specific user + job story + measurable outcomes; Step 5: signals marked strong/medium/weak; Step 6: wedge + >1-solution check; Step 9: dated outcome metric — and reflect the skipped block's conclusion back for confirmation before moving on.

- **Step 3 — Frame (outcome):** "What customer behavior or metric do we want to change — not a feature?" (The betting-the-build assumption is covered in Step 7 — don't ask it here.)
- **Step 4 — Job & user:** "Who *specifically* — and for whom is this most acute, frequent, expensive, unavoidable?" Capture the solution-free job and a job story ("When … I want to … so I can …"). Then capture **2–3 measurable desired outcomes** for the job as *direction + metric + object* ("reduce the time to find an open class slot") — these are what "better" is measured against later. If the job-population is heterogeneous, capture outcomes **per segment** (different segments want different things — don't average them away). If after 2–3 pushes the user still can't name a specific acute role (answers "everyone"/"all X"), do NOT record a generic user — record the target user as **UNRESOLVED** and make "identify the acute user" the first open question. A non-specific user is a discovery red flag, not a finding.
- **Step 5 — Demand vs interest:** "Tell me about the *last time* you hit this." "What are you doing about it *today*, and what does it cost?" "What do they use today instead — including spreadsheets or nothing — and why hasn't it won?" "What *real* evidence exists — pre-pay, pilot in use, converted signups, signed LOIs?" Mark each signal **strong** (money moved / real usage / panic-when-it-breaks), **medium** (signed LOIs/unpaid pilots — real but not yet demand; convert to strong or treat as open), or **weak** (interest — waitlists, likes, "great idea"). **Never** ask hypotheticals — neither "would you use X?" nor "would you pay $Y?"; redirect any "they'd pay $Y" answer to "tell me about the last time someone actually paid for a workaround."
- **Step 6 — Wedge:** "Which single opportunity, solved, most moves the outcome? What's the narrowest version that fully solves it for one user this week?" Check: can we imagine >1 solution? (If no, we smuggled in a solution — re-frame.)
- **Step 7 — Four risks** (only the unvalidated): value / usability / feasibility / viability. First **enumerate the leap-of-faith assumptions** behind the chosen wedge (what must be true for it to work), order them by risk, and **specify** the cheapest test for the *riskiest* — record it in the brief with pass/fail threshold, kill criterion, owner, and by-when (tests run *after* this session, before building) — not just one test on the least-validated risk. Do not rely on the user's self-rating — if a risk is dismissed without evidence ("it's fine," "AI can do it"), treat it as **open**. **Value is never "validated" on founder testimony alone** — it requires customer-sourced evidence (a named customer's behavior, quote, or money). Independently name any obvious risk the user omitted (e.g., legal/consent, data privacy, platform dependency) and mark it open with a test. Record the surviving assumptions in the brief's "Assumptions to re-test" table — the brief is a hypothesis to keep testing, not a verdict.
- **Step 8 — Scope & prioritization:** the end-to-end journey → the thin first slice; RICE the candidate list; record explicit "not in scope." **RICE fits feature-list products.** When sequencing is strategy-driven (a milestone ladder, credibility-before-product, infrastructure-before-features), the ladder IS the prioritization — record it as a named strategic override and skip the arithmetic rather than forcing fake scores.
- **Step 9 — Success:** the **outcome metric** (a change in customer behavior or business result) + by when; the PMF check, **pre-registered**: define now the Sean Ellis criterion (≥40% "very disappointed") to survey once ≥N pilots have used the core (only users who used it) — a *planned measurement*, never a founder prediction. **Reject vanity/output metrics — signups, waitlist size, downloads, page views, "launched" — and push to the behavior/result they proxy for (retained paying users, task completion, % of the target behavior achieved). A user-count is an output unless tied to retained value.**

## Step 10: Write PRODUCT-BRIEF.md

Render `@~/.claude/gsd-core/templates/product-brief.md` (fill `[DATE]` with today's date, `[PROJECT_TITLE]` from PROJECT.md or — if none exists — a short **outcome-level** working title that does NOT encode the solution, marked "(working title)"). Keep the outcome at the behavior/metric level — **do not encode a solution or architecture**. Fill the **measurable desired-outcomes** table (per segment if heterogeneous), the **Assumptions to re-test** table (riskiest first, each with its cheapest next test), and the Handoff notes for `model-domain` (the job + journey + key domain nouns).

**Challenge mode additions:** set the Scope line to the complement form ("complements — does not replace — [spec path]; where this brief is silent, the spec governs; on the amended points below, this brief governs until the spec is updated") and fill the **Proposed spec amendments** section from the contradictions tracked in Step 2b (each: what the spec said / what discovery found / the recommended edit). Offer to apply the amendments to the upstream doc now or leave them for the owner.

Write to `.planning/PRODUCT-BRIEF.md`.

## Step 11: Commit

```bash
if [ "$COMMIT_DOCS" = "true" ]; then
  gsd_run query commit "docs: add product brief (outcome, wedge, demand evidence)" --files .planning/PRODUCT-BRIEF.md
else
  echo "PRODUCT-BRIEF.md written but not committed (commit_docs is false)."
fi
```

## Step 12: Wrap up

**Preview the likely strategy path.** The brief already implies the surface, sensitivity, and scale — so sketch the probable archetype + the strategy steps it will need, per `@~/.claude/gsd-core/references/strategy-flow.md`. This is a **preview, not the authoritative plan** — `new-project` writes the real `## Strategy Plan` once requirements exist. Record the sensed surface/sensitivity/scale in the brief's handoff notes so `new-project` doesn't re-ask. **If discovery ingested or the user named a provided design / prototype / tokens package** (e.g. via `--challenge @design`), record a **design-source pointer** (path/link + form) in the handoff notes too — so `new-project` sets `## Mode` Design-input and routes it to grounding instead of starting design-blind (discovery stays outcome-level and does NOT itself write the field oracle).

Display (fill the preview line from the sensed archetype, e.g. "backend API handling PII → model-domain → recommend-architecture → security-strategy (L2) → testing-strategy → infra → cicd"):
```
PRODUCT-BRIEF.md written — product defined.

  Outcome: [one line]
  Wedge: [the narrowest paid slice]
  Demand: [strong | medium | weak — based on past-behavior evidence]
  Four risks: [N validated · M open]
  Spec amendments: [N proposed — apply to [spec] or it stays governing]   (challenge mode only)
  Likely strategy path: [archetype → the previewed ordered strategy steps]

Next: /gsd:new-project (capture it — it writes your `## Strategy Plan`) → then the strategy steps it recommends.
```

</process>

<critical_rules>
- **Optional and lightweight when evidenced.** If requirements are already clear/evidenced, do NOT run the full interview — prioritize and move on.
- **Challenge, never restart.** With existing specs/research (`--challenge`), the gap map decides what gets interviewed; ANSWERED blocks are confirmed, not re-asked. But demand evidence and the user definition are NEVER inherited from documents — they cap at WEAK and get the forcing treatment.
- **Contradictions flow back.** In challenge mode, every interview finding that contradicts the upstream docs lands in "Proposed spec amendments" with explicit precedence — never leave the spec silently wrong.
- **Demand, not interest.** Ask about past behavior, money, and "panic when it breaks" — never hypotheticals ("would you use X?").
- **Outcome-framed.** The vision is a behavior/metric to change and must admit more than one solution — never encode a specific solution or architecture here (that's later phases).
- **Forcing posture.** Push past the first polished answer 2–3 times for concrete specifics; reflect back and confirm.
- Respect `commit_docs` / `response_language`.
</critical_rules>

<success_criteria>
- Optionality gate applied (skipped/lightweight path when requirements are evidenced; honored without re-asking when the invocation states the mode)
- In challenge mode: gap map built and presented; demand evidence + user definition force-tested regardless of docs; contradictions recorded as proposed spec amendments with precedence
- Outcome framed as a behavior/metric, not a feature
- Specific user + solution-free job + job story captured
- Demand separated from interest via past-behavior evidence
- Narrowest wedge identified; vision admits >1 solution
- Four risks assessed (unvalidated ones get a specified cheapest test — threshold, owner, by-when)
- Scope prioritized (thin slice + RICE; explicit "not in scope")
- PRODUCT-BRIEF.md written and committed (when commit_docs is true)
- User directed to /gsd:new-project or /gsd:model-domain
</success_criteria>
