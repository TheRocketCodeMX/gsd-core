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
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi
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

`/gsd:discover-product` is optional. Decide whether the full interview is warranted (`--auto` skips this gate and synthesizes from existing docs).

Use `AskUserQuestion` (header "Discovery"):
- question: "Is the product value already clear and **evidenced** (a client/customer asking for specific things, real usage data), or is value still uncertain?"
- options:
  - "Value is uncertain — run discovery" (→ proceed to Step 3)
  - "Requirements are clear & evidenced" (→ Step 2a)
  - "Clear, but help me prioritize" (→ Step 2a, prioritization only)

**Step 2a (clear/evidenced path):** First **audit the evidence** — confirm it is *behavioral* (a paying client, a signed LOI, real usage data), not *interest* (waitlists, likes, "people say it's great"). If the cited evidence is only interest, say so and route to the full interview (Step 3) instead — never honor "evidenced" on the strength of waitlists/likes. If the evidence is genuinely behavioral, do NOT run the full interview. Either:
- Offer lightweight **RICE** prioritization on their known candidate list (Reach × Impact × Confidence ÷ Effort; note table-stakes/dependencies override the score), capture it, then
- Point them onward: "Requirements are clear — run `/gsd:new-project` to capture them, then `/gsd:model-domain`."
Write a minimal PRODUCT-BRIEF.md (outcome + the prioritized list + "discovery skipped: requirements pre-evidenced") and skip to Step 10. Exit early if they don't even want prioritization.

## Step 3–9: The forcing interview

Run the ordered question set from the reference. **Posture: the first answer is polished — push 2–3 times for concrete specifics (the actual human, the actual consequence), reflect back, confirm. One thread at a time.** Ask about the PAST, never hypotheticals. Skip any block already evidenced.

- **Step 3 — Frame (outcome):** "What customer behavior or metric do we want to change — not a feature?" "If we skipped discovery, what assumption would we be betting the whole build on?"
- **Step 4 — Job & user:** "Who *specifically* — and for whom is this most acute, frequent, expensive, unavoidable?" Capture the solution-free job and a job story ("When … I want to … so I can …"). Then capture **2–3 measurable desired outcomes** for the job as *direction + metric + object* ("reduce the time to find an open class slot") — these are what "better" is measured against later. If the job-population is heterogeneous, capture outcomes **per segment** (different segments want different things — don't average them away). If after 2–3 pushes the user still can't name a specific acute role (answers "everyone"/"all X"), do NOT record a generic user — record the target user as **UNRESOLVED** and make "identify the acute user" the first open question. A non-specific user is a discovery red flag, not a finding.
- **Step 5 — Demand vs interest:** "Tell me about the *last time* you hit this." "What are you doing about it *today*, and what does it cost?" "What *real* evidence exists — pre-pay, LOI, pilot, converted signups?" Mark each signal strong (behavior/money) vs weak (interest). **Never** ask hypotheticals — neither "would you use X?" nor "would you pay $Y?"; redirect any "they'd pay $Y" answer to "tell me about the last time someone actually paid for a workaround."
- **Step 6 — Wedge:** "Which single opportunity, solved, most moves the outcome? What's the narrowest version that fully solves it for one user this week?" Check: can we imagine >1 solution? (If no, we smuggled in a solution — re-frame.)
- **Step 7 — Four risks** (only the unvalidated): value / usability / feasibility / viability. First **enumerate the leap-of-faith assumptions** behind the chosen wedge (what must be true for it to work), order them by risk, and run the *cheapest test on the riskiest* — not just one test on the least-validated risk. Do not rely on the user's self-rating — if a risk is dismissed without evidence ("it's fine," "AI can do it"), treat it as **open**. Independently name any obvious risk the user omitted (e.g., legal/consent, data privacy, platform dependency) and mark it open with a test. Record the surviving assumptions in the brief's "Assumptions to re-test" table — the brief is a hypothesis to keep testing, not a verdict.
- **Step 8 — Scope & prioritization:** the end-to-end journey → the thin first slice; RICE the candidate list; record explicit "not in scope."
- **Step 9 — Success:** the **outcome metric** (a change in customer behavior or business result) + by when; the PMF check (what would make ≥40% of core users "very disappointed"). **Reject vanity/output metrics — signups, waitlist size, downloads, page views, "launched" — and push to the behavior/result they proxy for (retained paying users, task completion, % of the target behavior achieved). A user-count is an output unless tied to retained value.**

## Step 10: Write PRODUCT-BRIEF.md

Render `@~/.claude/gsd-core/templates/product-brief.md` (fill `[DATE]` with today's date, `[PROJECT_TITLE]` from PROJECT.md or — if none exists — a short **outcome-level** working title that does NOT encode the solution, marked "(working title)"). Keep the outcome at the behavior/metric level — **do not encode a solution or architecture**. Fill the **measurable desired-outcomes** table (per segment if heterogeneous), the **Assumptions to re-test** table (riskiest first, each with its cheapest next test), and the Handoff notes for `model-domain` (the job + journey + key domain nouns).

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

Display:
```
PRODUCT-BRIEF.md written — product defined.

  Outcome: [one line]
  Wedge: [the narrowest paid slice]
  Demand: [strong | weak — based on past-behavior evidence]
  Four risks: [N validated · M open]

Next: /gsd:new-project (capture it) → /gsd:model-domain (the domain) → /gsd:recommend-architecture
```

</process>

<critical_rules>
- **Optional and lightweight when evidenced.** If requirements are already clear/evidenced, do NOT run the full interview — prioritize and move on.
- **Demand, not interest.** Ask about past behavior, money, and "panic when it breaks" — never hypotheticals ("would you use X?").
- **Outcome-framed.** The vision is a behavior/metric to change and must admit more than one solution — never encode a specific solution or architecture here (that's later phases).
- **Forcing posture.** Push past the first polished answer 2–3 times for concrete specifics; reflect back and confirm.
- Respect `commit_docs` / `response_language`.
</critical_rules>

<success_criteria>
- Optionality gate applied (skipped/lightweight path when requirements are evidenced)
- Outcome framed as a behavior/metric, not a feature
- Specific user + solution-free job + job story captured
- Demand separated from interest via past-behavior evidence
- Narrowest wedge identified; vision admits >1 solution
- Four risks assessed (unvalidated ones flagged with a cheapest test)
- Scope prioritized (thin slice + RICE; explicit "not in scope")
- PRODUCT-BRIEF.md written and committed (when commit_docs is true)
- User directed to /gsd:new-project or /gsd:model-domain
</success_criteria>
