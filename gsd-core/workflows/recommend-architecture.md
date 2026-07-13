<purpose>
Recommend an application architecture matched to the project's actual complexity — avoiding both over- and under-engineering — and capture it as an ADR. Runs after model-domain, before planning. Decides two INDEPENDENT axes: domain-logic organization (driven by domain complexity, per subdomain) and deployment topology (driven by team structure + NFRs + ops maturity). Recommends; the user decides. Produces `.planning/adr/NNNN-architecture.md`, which feeds test strategy and planning.
</purpose>

<required_reading>
@~/.claude/gsd-core/references/architecture-decision.md
@~/.claude/gsd-core/references/brownfield-adaptation.md
@~/.claude/gsd-core/templates/adr.md
</required_reading>

<process>

## Step 1: Initialize

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.codex/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${HERMES_HOME:-$HOME/.hermes}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CURSOR_CONFIG_DIR:-$HOME/.cursor}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CODEX_HOME:-$HOME/.codex}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${GEMINI_CONFIG_DIR:-$HOME/.gemini}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${COPILOT_CONFIG_DIR:-$HOME/.copilot}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${WINDSURF_CONFIG_DIR:-$HOME/.codeium/windsurf}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${AUGMENT_CONFIG_DIR:-$HOME/.augment}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${TRAE_CONFIG_DIR:-$HOME/.trae}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${QWEN_CONFIG_DIR:-$HOME/.qwen}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CODEBUDDY_CONFIG_DIR:-$HOME/.codebuddy}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${CLINE_CONFIG_DIR:-$HOME/.cline}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${GROK_AGENTS_HOME:-$HOME/.agents}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${ANTIGRAVITY_CONFIG_DIR:-$HOME/.gemini/antigravity}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/opencode}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${KILO_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/kilo}/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi; if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -n "${GSD_TOOLS:-}" ]; then printf "export PATH='%s':\"\$PATH\"\n" "${GSD_TOOLS%/*}" >> "$CLAUDE_ENV_FILE" 2>/dev/null || true; fi
COMMIT_DOCS=$(gsd_run query config-get commit_docs 2>/dev/null || echo "true")
RESPONSE_LANG=$(gsd_run query config-get response_language 2>/dev/null || true)
ls .planning/PROJECT.md >/dev/null 2>&1 && echo "PROJECT_FOUND" || echo "NO_PROJECT"
ls .planning/DOMAIN-MODEL.md >/dev/null 2>&1 && echo "HAS_DOMAIN_MODEL" || echo "NO_DOMAIN_MODEL"
ls .planning/adr/ 2>/dev/null | grep -cE '^[0-9]{4}-' || true
```

**If `NO_PROJECT`:** Stop — "No project found. Run /gsd:new-project first." Exit.

**If `RESPONSE_LANG` non-empty:** all user-facing text in that language; keep technical terms, code, rung names, and `Axis A/B` labels in English.

**Text mode** (`--text` OR `workflow.text_mode: true`): replace every `AskUserQuestion` with a plain-text numbered list.

**Next ADR number:** the last command prints how many `NNNN-` ADRs exist; the new one is that count + 1, zero-padded to 4 (e.g. first ADR → `0001`). Create `.planning/adr/` if missing.

## Step 2: Load context

```bash
cat .planning/PROJECT.md 2>/dev/null || true
cat .planning/REQUIREMENTS.md 2>/dev/null || true
cat .planning/DOMAIN-MODEL.md 2>/dev/null || true
```

**Read `@~/.claude/gsd-core/references/architecture-decision.md` now** — it defines the two axes, the rung-signals, the "tall enough" gates, the Hard-Parts disintegrators/integrators, and the over-/under-engineering meta-tell.

**Grounding maturity governs elicitation depth.** When upstream artifacts (DOMAIN-MODEL, a design spec, research) already answer a question below, draft-from-docs and present for confirmation — cite the source, don't re-interview. Reserve `AskUserQuestion` for genuine decision points: contested rungs, gate answers the docs don't record, and contradictions (the reconcile rule still ALWAYS runs). Honor a posture stated in `$ARGUMENTS` without re-asking.

**Brownfield mode (existing architecture).** Greenfield (recommend the target from scratch) is the default. Trigger brownfield when the `## Mode` block (cat'd in Step 2) records Origin = brownfield-extend / rewrite-refactor (authoritative), or — when `## Mode` is absent — existing code / `map-codebase` maps are present: **assess the current topology first and recommend an evolution path** — never impose a from-scratch ideal on the running system (see `@~/.claude/gsd-core/references/brownfield-adaptation.md`). When `## Mode` Code-quality = vibe-coded-to-harden, treat the existing topology as *under-engineered by default* — the meta-tell (Step 5) should expect missing seams/tests and recommend raising rungs, not honoring the prototype's shortcuts as intentional.

**Design-provided mode.** When `query project mode` reports a provided design, the design's structural facts (entity/field shapes, screens→module mapping) are already lifted into `DOMAIN-MODEL.md` / `DESIGN-INVENTORY.md` by `model-domain`; consume them for the module map (Step 4.5) and the seam (Step 5.5) — the design is the authority on the **observable** structure. If `DOMAIN-MODEL.md` is thin and a provided design exists, read it per `@~/.claude/gsd-core/references/design-ingestion.md` before deciding the module map rather than inventing one. DDD still owns the *internal* rung per subdomain (§ Source precedence) — don't let the design's screen count dictate the persistence schema or the Axis-A rung.

```bash
ls .planning/codebase/ARCHITECTURE.md >/dev/null 2>&1 && echo "HAS_MAPS" || echo "NO_MAPS"
```

If maps exist, `cat .planning/codebase/ARCHITECTURE.md` (consume STRUCTURE.md/CONCERNS.md as needed); if real source exists but no maps, suggest `/gsd:map-codebase` first. Then run Steps 3–5 in **assess-then-evolve** form:
- **Score the current topology against the meta-tell** (Step 5) — where is the existing system already over- or under-engineered relative to the floor and the per-subdomain rungs?
- **The target is unchanged — the floor (functional-core/imperative-shell + tests) and the rung ladder still apply.** Brownfield changes only *how you get there*: incrementally, not in one cut.
- **Recommend via the decision card**, not a verdict: per affected area record `current state · target · gap cost (blast radius · churn/centrality · reversibility) · Follow | Improve | Refactor`. **Default-select Improve**; **gate Refactor behind characterization tests**; Follow is a deliberate, time-boxed choice for cold/uncovered code. Record the card in the ADR's Consequences/promotion-triggers, surfacing cost — the user owns the appetite.
- **The evolution path uses Strangler Fig + ACL + bubble context** — exactly the *Evolving the topology* mechanics this skill already documents in Step 4. In brownfield, that section is the recommended path (new behavior to the clean core, old paths strangled), not just a future-split footnote. Don't duplicate it here — reference it.

Greenfield behavior remains the default when no existing code is present.

**If `NO_DOMAIN_MODEL`:** unless model-domain is a ledgered skip (`gsd_run query project strategy-skipped model-domain --raw` = `true` → note once, don't re-offer), tell the user "No domain model found — I'll ask the complexity questions directly. (Consider `/gsd:model-domain` first for a sharper result.)" Then gather, per major area: is it core/supporting/generic, and how complex (rich rules vs CRUD)?

From DOMAIN-MODEL.md (or the answers): extract each subdomain's type + complexity, **plus** the bounded contexts (owns / talks-to), the context-map relationships, and any flagged polysemes — Step 4.5 consumes them. The **core** subdomain's complexity is the primary driver of Axis A.

## Step 3: Axis A — domain-logic organization (per subdomain)

**First, the floor applies to ALL subdomains, even simple ones (state it in the ADR):** dependency inversion at *true external boundaries only* (DB, 3rd-party, clock/IO) + a Functional-Core/Imperative-Shell shape + strong independent tests. This is NOT hexagonal — no internal port ceremony — it's the cheap testability baseline both camps' senior voices converge on, and the AI era makes it pay from the first agent session (see the reference's floor + AI-era sections). "Transaction Script" is the domain-logic organization *on top of* this floor, never an excuse to skip it (a CRUD app that reaches into the DB from everywhere is under-engineered).

Then decide a rung **per subdomain** (not one rung for the whole app). Supporting/generic subdomains almost always stay at Transaction Script *behind the floor seams*; the complex core may climb.

For the **core** subdomain, use `AskUserQuestion` (header "Core logic"):
- question: "For the core (*[core name]*): are operations mostly validate→persist→return, or are there rich invariants / state machines / tangled business rules?"
- options: "Mostly CRUD-ish" (→ Transaction Script), "Real business rules & invariants" (→ Domain Model), "Rich + many integrations / long-lived" (→ Domain Model + Hexagonal wrapper)

**Reconcile against DOMAIN-MODEL (do not skip).** If the user's answer contradicts the documented core complexity — e.g. they say "it's just CRUD" but DOMAIN-MODEL marks this a high-complexity *differentiating* core with rich invariants — the **documented complexity governs**. Present the discrepancy back ("the domain model flags rich pricing/scoring invariants here — that's a Domain Model, not CRUD") and default to the higher rung unless the user gives a concrete reason the model is wrong. Never let an understatement silently lower the core's rung — a scripted core over a documented rich domain is the exact under-engineering this skill exists to prevent.

Then probe the orthogonal signals (only when relevant):
- **Hexagonal wrapper?** "Is there a **current, concrete** second adapter or delivery mechanism (a real DB/queue/3rd-party swap, a second front-end), or a genuinely pure core worth isolating for test speed?" Yes → wrap **the core only** in Hexagonal/Clean. No → skip (one-impl ports would be over-engineering). Soft criteria — long lifespan, "testability" in the abstract — lean **no**: a framework-free domain layer enforced by fitness function gives the same isolation without one-impl ports. If the user asks for Clean/Hexagonal across the *whole app*, push back: scope it to the core; CRUD subdomains over one DB don't earn ports.
- **CQRS?** only if reads structurally diverge from writes / reads ≫ writes.
- **Event Sourcing?** First ask whether any financial/regulatory flow (payments, invoicing, tax) carries an audit / retention / temporal-reconstruction mandate. If there is an audit need, prefer a **scoped append-only audit log on that component** — reserve Event Sourcing for when full temporal reconstruction is the hard requirement. "Sounds robust" is never sufficient.

For a **supporting** subdomain whose rules are *growing* (a state machine + multiplying invariants, e.g. an "emerging" subdomain), keep it at the floor (Transaction Script) but record a **promotion trigger** — the concrete signal that would later move it to a Domain Model.

For an ingestion/pipeline-shaped subdomain, the rung describes its business logic only — also record the data shape (buffer/queue, backpressure, retention, hot/cold) as a module note, or the planner gets a rung but no shape for a firehose.

Record each subdomain → rung + the **concrete signal** that justifies anything above Transaction Script. If no concrete signal exists, stay at the floor.

## Step 4: Axis B — deployment topology

Default is **Modular Monolith**. Recommend microservices ONLY if all three gates pass — ask them (AskUserQuestion, header "Topology", or a text list):
1. "Are there multiple independent teams that need to deploy on their own cadence?"
2. "Is there CD / monitoring / DevOps maturity already in place?"
3. "Are the bounded contexts well-understood already (not still being discovered)?"

If **any** is "no" → **Modular Monolith. Say so and stop on the *microservices* question** (note: complexity alone never justifies microservices — the microservice premium). If the user argues for microservices from **scale** ("we'll have millions of X"), name it as axis confusion: scale is an Axis-B NFR met by horizontally replicating the monolith (and, if one component later scales divergently, a Hard-Parts extraction of *that component only*) — not by splitting into services. Say this explicitly.

Then — **whether or not the gates passed** — if any single component shows divergent pressure (scaling, volatility, fault isolation), run the **Hard-Parts scan** on that component: score the 6 disintegrators (low cohesion · divergent volatility · divergent scaling · fault isolation · differential security · independent extensibility) vs the 4 integrators (ACID across data · tight workflow · shared code · tight data relationships). Net disintegrators ≫ integrators → extraction **candidate**: extract **now** only if the disintegrating pressure is **current (not projected)** AND the CD/ops gate passes — otherwise record it as that component's promotion trigger. Integrators dominate → keep it modular. Warn explicitly against a **distributed monolith** (services that can't deploy independently).

**Tenancy probe (mandatory when the product serves multiple customer orgs):** ask "single-tenant or multi-tenant? If multi-tenant: does any customer segment carry a contractual/regulatory isolation requirement?" The ADR **must** decide the isolation rung: **shared schema + tenant-scoped RLS** (the default) → schema-per-tenant → DB-per-tenant. A *real* contractual/regulatory mandate climbs the rung; "enterprise customers will expect it" is the "sounds robust" of tenancy — name it as such, stay at the default, and record the mandate-lands condition as a promotion trigger.

When recommending the monolith (a gate failed), **record the promotion trigger** — the concrete future signal that would justify revisiting Axis B (a second team forms, a component's scaling diverges, a bounded context stabilizes). The monolith is **sacrificial/evolutionary**, not permanent: note that the eventual split, if it comes, uses **Strangler Fig + an Anti-Corruption Layer + data-decomposition-behind-module-boundaries-first (+ sagas/outbox for cross-service consistency)** — never a big-bang rewrite. Enforcing "no cross-module DB access" as a fitness function now is what makes that future split cheap. (See *Evolving the topology* in the reference.)

## Step 4.5: Module map (modular monolith)

A modular monolith needs named modules — without a module list, "no cross-module DB access" is unenforceable. Derive it from DOMAIN-MODEL, don't invent it:
- **Modules = bounded contexts** when the Bounded Contexts table is filled; **modules = subdomain groupings** when a single context was assumed.
- **Resolve every flagged polyseme:** assign each meaning to one owning module — one word meaning two things across modules is exactly the rot the fitness functions exist to prevent.
- Carry the **context-map relationships** into inter-module contracts — and apply an **ACL now** to any third-party/legacy integration whose model differs from yours, not only at a future split.
- Record each module → what it **owns** (incl. its schema) → who it **talks to** and **via what** (sync call vs event). If any interaction is async, decide the mechanism in one line (in-process events / job queue / outbox); if the domain implies recurring/scheduled computation, decide where it runs (cron / job queue / recompute-on-read).

## Step 5: Over-/under-engineering check (the meta-tell)

Run this check in **both directions** — it is a first-class gate, not a formality:
- **Downward (over-engineering):** for every non-floor rung chosen in Steps 3–4, name the **current, concrete requirement** that justifies it (a real second adapter or delivery mechanism, a real divergent-scaling component, a real second team, a real audit mandate, a real tenant-isolation mandate, a genuinely pure core isolated for test speed). No concrete requirement → **drop it to the floor**.
- **Upward (under-engineering):** for the core, re-check DOMAIN-MODEL. If the documented complexity (rich invariants, scoring, state machines, audit needs) is *not* captured by the chosen rung — including when a user understatement lowered it in Step 3 — **raise the rung**. A scripted core over a documented rich domain, or thin CRUD over a regulated/audited flow, must be raised.

State the surviving justifications; you'll record them in the ADR.

## Step 5.5: Service error contract + telemetry floor (the seam the backend owns)

Whenever the system exposes a service boundary — an HTTP/RPC API, a CLI with structured output, a queue consumer (i.e. nearly everything except a pure in-process library) — lock the transport-agnostic contract + observability floor **here**, so a **backend-only or polyglot** project gets it even though it never runs `frontend-architecture`. (For a frontend project this only fixes the *backend* side; `frontend-architecture` decides the FE side against the same contract.)

**Read `@~/.claude/gsd-core/references/fe-be-seam.md`** (the machine-readable error contract — an RFC 9457-style envelope with a stable machine `code` the caller branches on; the backend owns codes, callers own copy) **and `@~/.claude/gsd-core/references/application-telemetry.md`** (the telemetry floor — structured logs, a propagated `trace_id`, the count-once rule).

Decide and record in the ADR (one short "Service contract & telemetry floor" subsection — scale-to-zero: a pure local CLI/library with no boundary writes "n/a — no service boundary"):
- the **error envelope shape + machine `code` scheme** at the boundary (and that it's enforced by one machine-checked contract, not restated per caller);
- the **telemetry floor** — structured logging + `trace_id` propagation across the boundary — runtime-verify the current best-maintained option for the detected stack, recorded dated (do not freeze a library in this doc).

## Step 6: Present recommendation & write the ADR

**Recommend, don't dictate.** Present, via `AskUserQuestion` (header "Architecture"):
- Your recommended option in one paragraph (the Axis-A rungs per subdomain + the Axis-B topology), how it compares to the default baseline (modular monolith + Domain Model in the complex core + Transaction Script elsewhere + ADRs + fitness functions), and 1–2 alternatives with trade-offs.
- options: "Accept the recommendation", "Adjust (I'll tell you what)", "Show me the alternatives in detail"

Once approved, render `@~/.claude/gsd-core/templates/adr.md` (fill `[NNNN]` with the next number, `[DATE]` with today's date, `[PROJECT_TITLE]` from PROJECT.md, Status = Accepted). Fill: Context (complexity + NFRs + team/ops), Decision (Axis A per-subdomain table + Axis B with the three gate answers + tenancy when multi-tenant + the Module map + the **Service contract & telemetry floor** subsection from Step 5.5), Promotion triggers (component → observable condition → response), Consequences (incl. **fitness functions** to enforce boundaries), Alternatives rejected, and the over-/under-engineering check (each non-floor rung ↔ its concrete requirement).

Write to `.planning/adr/NNNN-architecture.md`. Capture *why* and trade-offs, not implementation detail.

## Step 7: Commit

```bash
gsd_run project strategy-done recommend-architecture 2>/dev/null || true  # flip the Strategy Plan row — the grounding gate keys on `done`
if [ "$COMMIT_DOCS" = "true" ]; then
  gsd_run query commit "docs: record architecture decision (ADR-NNNN)" --files .planning/adr/NNNN-architecture.md .planning/PROJECT.md
else
  echo "ADR written but not committed (commit_docs is false)."
fi
```
(Replace `NNNN` with the actual number.)

## Step 8: Wrap up

Display:
```
ADR-NNNN written — architecture decided.

  Axis A (domain logic): [core → rung]; [others → Transaction Script]
  Axis B (topology): [Modular Monolith | Microservices | component X extracted]
  Fitness functions: [N] to enforce boundaries
  Promotion triggers: [N] recorded — re-check at /gsd:new-milestone

Next: /gsd:security-strategy   (app-wide security posture — thin/scale-to-zero) → /gsd:frontend-architecture (if the project has a frontend) → /gsd:testing-strategy   (test shape follows this architecture) → plan-phase
```

**Auto-advance (chain):** after this skill, follow `@~/.claude/gsd-core/workflows/strategy-chain/modes/advance.md` with `CURRENT=recommend-architecture` — in `--auto` it dispatches the next `## Strategy Plan` step (honoring skips) onward to the build loop; interactive runs use the `Next:` pointer above.

**Roadmap reconciliation:** ROADMAP.md predates this ADR. Scan it against the module map and topology — if a phase straddles module seams, the walking skeleton is missing/misplaced, or a buy-decision moots a build-phase, SAY SO explicitly and offer `/gsd:phase --edit` (or a roadmap refresh — the roadmapper re-reads discovery artifacts). Never leave a known ADR↔roadmap contradiction unspoken.

</process>

<critical_rules>
- **Keep the two axes separate.** Domain-logic complexity drives Axis A; team structure + NFRs + ops maturity drive Axis B. Never let high scale imply a Domain Model, or rich logic imply microservices.
- **Modular monolith is the default.** Microservices require ALL three "tall enough" gates; if any fails, recommend the monolith — regardless of complexity. The stop applies to the *microservices* question only: the per-component Hard-Parts scan still runs whenever a single component shows divergent pressure.
- **The meta-tell governs.** Every non-floor rung must map to a current, concrete requirement, or it drops to the floor.
- **Recommend, don't dictate.** Present trade-offs and alternatives; the user approves. They have context you lack.
- **Always emit an ADR** with explicit fitness functions, and respect `commit_docs` / `response_language`.
</critical_rules>

<success_criteria>
- Context loaded (PROJECT.md, REQUIREMENTS.md, DOMAIN-MODEL.md if present)
- Axis A decided per subdomain, each non-floor rung tied to a concrete signal
- Axis B decided via the three gates (+ Hard-Parts scan for any divergent component); modular monolith unless all gates pass
- Module map derived from DOMAIN-MODEL (polysemes resolved); tenancy isolation decided when multi-tenant
- Over-/under-engineering meta-tell applied
- Recommendation presented with trade-offs/alternatives and user-approved
- ADR written to `.planning/adr/NNNN-architecture.md` with fitness functions; committed when commit_docs is true
- User directed to /gsd:plan-phase
</success_criteria>
