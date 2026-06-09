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
cat .planning/PROJECT.md 2>/dev/null || true
cat .planning/REQUIREMENTS.md 2>/dev/null || true
cat .planning/ROADMAP.md 2>/dev/null || true
```

**Read `@~/.claude/gsd-core/references/domain-modeling.md` now** — it defines the strategic-vs-tactical split, the core/supporting/generic criteria, and the misclassification check you will apply.

From the project docs, build an internal draft:
- What problem domain is this? What are the candidate capabilities/areas (from REQUIREMENTS.md)?
- Which nouns/verbs recur (candidate ubiquitous-language terms)?
- Are there distinct business areas or user roles (candidate subdomains)?

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

## Step 4: Subdomain distillation (the pivotal step)

For each candidate area, classify it and **capture the rationale**. Apply the misclassification check from the reference.

For each area, use `AskUserQuestion` (header = the area name):
- question: "Is *[area]* where you compete and win, something you need but isn't your edge, or a commodity every product has?"
- options:
  - "Core — we differentiate here" (→ build in-house, invest)
  - "Supporting — needed, not our edge" (→ build simply / buy-and-extend)
  - "Generic — commodity" (→ buy / off-the-shelf / library)

**Apply these checks before finalizing each classification (state them to the user when they apply):**
1. **Differentiation — not difficulty — decides Core.** If the user justifies Core by *difficulty, criticality, security, risk, or regulatory burden* rather than by competitive differentiation, test it: "Is this actually your competitive advantage, or a hard/critical-but-standard problem (e.g., tax, auth, encryption, compliance) you could buy?" If standard → **Generic (buy)**, not core. Critical ≠ differentiating; regulated ≠ differentiating.
2. **CRUD that will grow.** Before accepting Generic/CRUD, ask: "Will this accumulate real business rules and invariants over time, or stay simple data-in/data-out?" If it will grow → mark it **emerging Supporting** (the default for growing areas), not generic. It is Core only if it is itself the competitive differentiator — and there is normally exactly one of those.
3. **Generic ≠ low quality.** Note to the user that "generic" means *not differentiating*, not *low effort*.

Record each subdomain's name, type, one-line description, rationale, and a rough complexity (low/medium/high). You should end with exactly **one** clearly-named core domain in most cases — if the user names many "core" areas, push back (anti-sprawl): "Which ONE is the real competitive core?"

For the single core domain only, capture in one line **what "winning" means** — the decision dimensions the core optimizes (e.g., "best match = price × reliability × lane-fit") — NOT the algorithm or any implementation. This sharpens the core for the architecture and planning phases.

## Step 5: Bounded contexts (optional — only if `--event-storming`)

If `--event-storming` is NOT set: write in DOMAIN-MODEL.md "Bounded Contexts: deferred — single context assumed; planning will refine if boundaries emerge." Skip to Step 6.

If set, run a **Big-Picture** pass (timeline of events, not aggregates):
1. Ask (AskUserQuestion or text list) for the major domain events: "What significant things *happen* in this system? (e.g., 'Order Placed', 'Payment Captured', 'Shipment Dispatched')". Collect 5–10.
2. For each event ask: "Who triggers it? Who reacts? What decision follows?"
3. Group events by actor/responsibility. Each cluster = a candidate bounded context. Boundaries fall where the **language changes** or the **rate of change** differs.
4. If boundaries are unclear, say so and **defer** them. Do NOT drill into aggregates (that's tactical, out of scope here).

## Step 6: Write DOMAIN-MODEL.md

Render `@~/.claude/gsd-core/templates/domain-model.md` (fill `[DATE]` with today's date and `[PROJECT_TITLE]` from PROJECT.md), filling:
- **Ubiquitous Language** table (term, definition, used-by, aliases/confusions)
- **Subdomains** table + the Core/Supporting/Generic groupings, each with rationale; note the misclassification check was applied
- **Bounded Contexts** (filled or explicitly deferred)
- **Notes for downstream phases** — one line for architecture (e.g., "Core 'X' is high-complexity → expect a richer domain model; rest is CRUD") plus deferred boundaries. **Any polyseme / language conflict flagged in Step 3 MUST appear here**, even when bounded contexts are deferred — it is a candidate context boundary.

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

Next: /gsd:plan-phase   (planning will use the subdomain complexity to shape architecture and tests)
```

</process>

<critical_rules>
- **Strategic only.** Capture language + subdomains (+ optional contexts). Never prescribe architecture, never design aggregates — that is a later phase.
- **Buy-vs-build is allowed; stacks are not.** Classifying a subdomain as buy / off-the-shelf / library is strategic and encouraged. Choosing architecture patterns, frameworks, or deployment topology is forbidden here — that is `recommend-architecture`.
- Every subdomain classification MUST carry an explicit rationale, and the misclassification check (complex≠core, CRUD-that-grows, generic≠low-quality) MUST be applied.
- Capture the team's language, not textbook definitions.
- Anti-sprawl: aim for one clearly-named core domain; defer unclear context boundaries rather than inventing them.
- Respect `commit_docs` and `response_language`.
</critical_rules>

<success_criteria>
- Project context loaded (PROJECT.md/REQUIREMENTS.md) before questioning
- Ubiquitous language captured (~8–15 terms) with definitions, usage, and conflicts
- Every subdomain classified with rationale + misclassification check applied
- Bounded contexts surfaced (with `--event-storming`) or explicitly deferred
- No architecture prescribed
- DOMAIN-MODEL.md written from the template and committed (when commit_docs is true)
- User directed to /gsd:plan-phase
</success_criteria>
