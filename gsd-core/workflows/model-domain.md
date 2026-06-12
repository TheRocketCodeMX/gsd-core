<purpose>
Establish strategic Domain-Driven Design foundations for a greenfield project: a shared ubiquitous language and a subdomain distillation (core/supporting/generic), with optional bounded contexts via lightweight event storming. Runs after new-project, before architecture. Produces `.planning/DOMAIN-MODEL.md` — the single complexity assessment that later parameterizes architecture and test strategy. This workflow captures the PROBLEM (domain); it must never prescribe a solution (architecture).
</purpose>

<required_reading>
@~/.claude/gsd-core/references/domain-modeling.md
@~/.claude/gsd-core/templates/domain-model.md
</required_reading>

<process>

## Step 1: Initialize

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi
COMMIT_DOCS=$(gsd_run query config-get commit_docs 2>/dev/null || echo "true")
RESPONSE_LANG=$(gsd_run query config-get response_language 2>/dev/null || true)
ls .planning/PROJECT.md >/dev/null 2>&1 && echo "PROJECT_FOUND" || echo "NO_PROJECT"
```

**If `NO_PROJECT`:** Stop and display:
```
No project found (.planning/PROJECT.md is missing).
Run /gsd:new-project first, then /gsd:model-domain.
```
Exit.

**If `RESPONSE_LANG` is non-empty:** all user-facing text MUST be in that language. Technical terms, code, file paths, and the `core/supporting/generic` labels stay in English.

**Text mode** (`--text` flag OR `workflow.text_mode: true`): replace every `AskUserQuestion` call below with a plain-text numbered list and read the user's number/freeform reply. (See the inline text-mode example in Step 3.)

## Step 2: Load context (internal grounding — do not show the user yet)

```bash
cat .planning/PRODUCT-BRIEF.md 2>/dev/null || true
cat .planning/PROJECT.md 2>/dev/null || true
cat .planning/REQUIREMENTS.md 2>/dev/null || true
cat .planning/ROADMAP.md 2>/dev/null || true
```

**Read `@~/.claude/gsd-core/references/domain-modeling.md` now** — it defines the strategic-vs-tactical split, the core/supporting/generic criteria, and the misclassification check you will apply.

From the project docs, build an internal draft:
- What problem domain is this? What are the candidate capabilities/areas (from REQUIREMENTS.md)?
- Which nouns/verbs recur (candidate ubiquitous-language terms)?
- Are there distinct business areas or user roles (candidate subdomains)?

**Grounding maturity governs elicitation depth.** When the upstream docs are mature (a design spec, research corpus, or detailed brief already forged the vocabulary and areas), default every step to **draft-from-docs + confirm**: present complete drafts for correction, state which docs grounded them, and reserve actual questions for *genuine decision points* — contested classifications, the one-core call, complexity contradictions. The 2–3 probing rounds below are for thin grounding (a bare PROJECT.md), not a re-interview of what the docs already answer. Honor a posture stated in `$ARGUMENTS` without re-asking.

**Check for an existing model:**
```bash
ls .planning/DOMAIN-MODEL.md >/dev/null 2>&1 && echo "EXISTS" || echo "NEW"
```
If `EXISTS` and not `--auto`: ask (AskUserQuestion, header "Domain") whether to **Update** (refresh), **View** (show then Update/Skip), or **Skip** (keep existing — exit with: "Existing DOMAIN-MODEL.md preserved. Next: /gsd:plan-phase"). If `--auto`: update in place.

## Step 3: Ubiquitous language

Goal: capture the team's actual words (not textbook terms), ~8–15 core terms, conflicts surfaced.

**`--auto` mode:** synthesize the glossary from PROJECT.md/REQUIREMENTS.md recurring terms; skip to Step 4.

**Interactive:** open with your internal draft, then refine. Use `AskUserQuestion`:
- header: "Language"
- question: "I drafted these core terms from your project: [list 5–8 with one-line definitions]. Which need fixing, and what's missing?"
- options: "They're right — add more", "Some are wrong (I'll correct)", "Let me describe the vocabulary from scratch"

Then probe, one thread at a time:
- "When you say *[term]*, what exactly do you mean — and who uses that word (team, users, both)?"
- "Is *[A]* the same as *[B]*, or different?" (a word that means two things → flag as a context-boundary signal)
- "What do you call *[recurring action]*?"

Continue 2–3 rounds until ~8–15 terms each have a definition + usage context. Record conflicts/polysemes explicitly.

**Text-mode form of an AskUserQuestion (use this shape whenever `--text`):**
```
Language — I drafted these terms: [list]. What needs fixing?
  1. They're right — add more
  2. Some are wrong (I'll correct)
  3. Let me describe the vocabulary from scratch
Reply with a number, or just tell me the corrections.
```
**Text-mode batching:** when several questions are pending, present them as numbered *sections* in ONE message (each with its own option list) and accept combined replies ("1, 2" = first option of Q1, second of Q2) or free text per section — don't serialize one message per question.

## Step 4: Subdomain distillation (the pivotal step)

For each candidate area, classify it and **capture the rationale**. Apply the misclassification check from the reference.

**Confirm the area list first** (AskUserQuestion, header "Areas"): "These are the areas I see: [list]. What's missing, and is anything really two areas?"

**Then propose all classifications at once** (draft-then-refine, like Step 3): one table — area · proposed type ("Core — we differentiate here" / "Supporting — needed, not our edge" / "Generic — commodity") · one-line rationale — asking (header "Subdomains"): "Which of these are wrong?" Run the checks and complexity signals below on every contested area and the claimed core — batching cuts question count, not rigor.

**Apply these checks before finalizing each classification (state them to the user when they apply):**
1. **Differentiation — not difficulty — decides Core.** If the user justifies Core by *difficulty, criticality, security, risk, or regulatory burden* rather than by competitive differentiation, test it: "Is this actually your competitive advantage, or a hard/critical-but-standard problem (e.g., tax, auth, encryption, compliance) you could buy?" If standard → **Generic (buy)**, not core. Critical ≠ differentiating; regulated ≠ differentiating.
2. **CRUD that will grow.** Whenever an area is *described* as CRUD/simple/"just forms and dates" — regardless of the type being claimed — ask: "Will this accumulate real business rules and invariants over time, or stay simple data-in/data-out?" If it will grow → mark it **emerging Supporting** (the default for growing areas), not generic. It is Core only if it is itself the competitive differentiator — and there is normally exactly one of those. Claiming Core *while* describing it as trivial is a contradiction — Core means differentiating AND complex; probe which half is wrong.
3. **Generic ≠ low quality.** Note to the user that "generic" means *not differentiating*, not *low effort*.
4. **Strategic instrument.** A venture-critical area that is NOT product-differentiating (a benchmark/eval suite, an open standard, a public SDK ecosystem — value is positional, endgame may be neutrality/giveaway) doesn't fit the triad: record it as its **own candidate context** annotated *instrument — venture-critical*, rigor allocated by its derived complexity. **Core-grade rigor ≠ core** — you don't give away your core.

**Complexity is derived, never asked.** For each non-generic area, elicit 2–3 of the reference rubric's five signals (invariants; lifecycle depth; derivation/optimization; temporal logic; policy variance) — usually one question: "What rules can never be broken here, and what's the hardest decision this area makes?" — then rate per the rubric, recording fired signals in the rationale cell. **Tripwire: Core+low is a contradiction** — probe: "If it's your differentiator but has no complex rules, what makes it hard to copy?" — it's either not core, or not low. Generic+high is a buy-harder signal.

Record each subdomain's name, type, one-line description, rationale, and the derived complexity (low/medium/high). You should end with exactly **one** clearly-named core domain in most cases — if the user names many "core" areas, push back (anti-sprawl): "Which ONE is the real competitive core?"

For the single core domain only, capture in one line **what "winning" means** — the decision dimensions the core optimizes (e.g., "best match = price × reliability × lane-fit") — NOT the algorithm or any implementation. This sharpens the core for the architecture and planning phases.

## Step 5: Bounded contexts (optional — only if `--event-storming`)

If `--event-storming` is NOT set: write in DOMAIN-MODEL.md "Bounded Contexts: deferred — single context assumed; planning will refine if boundaries emerge" (unless Step 6's candidate-boundary rule fires — then record the candidates instead). Skip to Step 6.

If set, run a **Big-Picture** pass (timeline of events, not aggregates):
1. Ask (AskUserQuestion or text list) for the major domain events: "What significant things *happen* in this system? (e.g., 'Order Placed', 'Payment Captured', 'Shipment Dispatched')". Collect 5–10.
2. For each event ask: "Who triggers it? Who reacts? What decision follows?"
3. Group events by actor/responsibility. Each cluster = a candidate bounded context. Boundaries fall where the **language changes** or the **rate of change** differs.
4. If boundaries are unclear, say so and **defer** them. Do NOT drill into aggregates (that's tactical, out of scope here).

**Context mapping (only if you end with ≥2 contexts):** for each boundary, name the *relationship* using the reference's vocabulary (Shared Kernel / Customer-Supplier / Conformist / **ACL** / Open Host Service / Published Language / Separate Ways) and record it as `Context A —[relationship]→ Context B`. Default to an **ACL** at any seam against a messy, legacy, or third-party upstream. Name the relationship only — do not design the translator (that's tactical/architecture).

**Process-level pass (optional, only for one genuinely contested boundary):** walk a single flow's commands → policies ("whenever X, then Y") → read-models to sharpen that one boundary and its hand-offs. Don't drop to aggregates. Skip entirely if Big-Picture already settled the boundaries.

## Step 6: Write DOMAIN-MODEL.md

Render `@~/.claude/gsd-core/templates/domain-model.md` (fill `[DATE]` with today's date and `[PROJECT_TITLE]` from PROJECT.md), filling:
- **Ubiquitous Language** table (term, definition, used-by, aliases/confusions)
- **Subdomains** table + the Core/Supporting/Generic groupings, each with rationale; note the misclassification check was applied
- **Bounded Contexts** (filled, candidate-recorded, or explicitly deferred). **Candidate-boundary rule (even without `--event-storming`):** a flagged polyseme OR third-party/legacy upstream vocabulary in the glossary is a *proven* boundary — don't merely defer it. Name the candidate contexts (one line each) and the seam relationship (default **ACL** against a third-party upstream), marked "candidate — refine in planning", noting `--event-storming` would formalize them. Recording only — never "single context assumed" next to a flagged boundary.
- **Notes for downstream phases** — one line for architecture (e.g., "Core 'X' is high-complexity → expect a richer domain model; rest is CRUD") plus deferred boundaries. **Any polyseme / language conflict flagged in Step 3 MUST appear here**, even when bounded contexts are deferred.

Write to `.planning/DOMAIN-MODEL.md`. **Do not include any architecture recommendation** — only the domain.

## Step 7: Commit

```bash
if [ "$COMMIT_DOCS" = "true" ]; then
  gsd_run query commit "docs: add domain model (ubiquitous language + subdomain distillation)" --files .planning/DOMAIN-MODEL.md
else
  echo "DOMAIN-MODEL.md written but not committed (commit_docs is false)."
fi
```

## Step 8: Wrap up

Display (counts filled in):
```
DOMAIN-MODEL.md written — strategic domain foundation set.

  Ubiquitous language: [N] terms ([C] conflicts flagged)
  Subdomains: [N]  ([core] core · [supporting] supporting · [generic] generic)
  Bounded contexts: [N]  (or "deferred")

Next: /gsd:recommend-architecture   (uses the subdomain complexity) → testing → planning
```

**Roadmap reconciliation:** ROADMAP.md was created before this model existed. Scan it — if a finding invalidates or reshapes a phase (a phase straddling two candidate contexts, a buy-decision making a build-phase moot, a core needing an earlier walking-skeleton), SAY SO explicitly and offer `/gsd:phase --edit` (or a roadmap refresh — the roadmapper re-reads discovery artifacts). Never leave a known contradiction between the model and the roadmap unspoken.

</process>

<critical_rules>
- **Strategic only.** Capture language + subdomains (+ optional contexts). Never prescribe architecture, never design aggregates — that is a later phase.
- **Buy-vs-build is allowed; stacks are not.** Classifying a subdomain as buy / off-the-shelf / library is strategic and encouraged. Choosing architecture patterns, frameworks, or deployment topology is forbidden here — that is `recommend-architecture`.
- Every subdomain classification MUST carry an explicit rationale, and the misclassification check (complex≠core, CRUD-that-grows, generic≠low-quality) MUST be applied.
- Complexity is derived from elicited signals (reference rubric), never a free label; Core+low is a contradiction — challenge it.
- Capture the team's language, not textbook definitions.
- Anti-sprawl: aim for one clearly-named core domain; defer unclear context boundaries rather than inventing them — but record glossary-proven boundaries as candidates.
- Respect `commit_docs` and `response_language`.
</critical_rules>

<success_criteria>
- Project context loaded (PROJECT.md/REQUIREMENTS.md) before questioning
- Ubiquitous language captured (~8–15 terms) with definitions, usage, and conflicts
- Every subdomain classified with rationale + misclassification check applied
- Bounded contexts surfaced (with `--event-storming`), candidate-recorded, or explicitly deferred
- No architecture prescribed
- DOMAIN-MODEL.md written from the template and committed (when commit_docs is true)
- Roadmap reconciliation: contradictions with ROADMAP.md surfaced explicitly (revision offered, never silent)
- User directed to /gsd:recommend-architecture
</success_criteria>
