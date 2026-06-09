<purpose>
Recommend an application architecture matched to the project's actual complexity — avoiding both over- and under-engineering — and capture it as an ADR. Runs after model-domain, before planning. Decides two INDEPENDENT axes: domain-logic organization (driven by domain complexity, per subdomain) and deployment topology (driven by team structure + NFRs + ops maturity). Recommends; the user decides. Produces `.planning/adr/NNNN-architecture.md`, which feeds test strategy and planning.
</purpose>

<required_reading>
@~/.claude/gsd-core/references/architecture-decision.md
@~/.claude/gsd-core/templates/adr.md
</required_reading>

<process>

## Step 1: Initialize

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi
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

**If `NO_DOMAIN_MODEL`:** tell the user "No domain model found — I'll ask the complexity questions directly. (Consider `/gsd:model-domain` first for a sharper result.)" Then gather, per major area: is it core/supporting/generic, and how complex (rich rules vs CRUD)?

From DOMAIN-MODEL.md (or the answers): extract each subdomain's type + complexity. The **core** subdomain's complexity is the primary driver of Axis A.

## Step 3: Axis A — domain-logic organization (per subdomain)

Decide a rung **per subdomain** (not one rung for the whole app). Supporting/generic subdomains almost always stay at Transaction Script; the complex core may climb.

For the **core** subdomain, use `AskUserQuestion` (header "Core logic"):
- question: "For the core (*[core name]*): are operations mostly validate→persist→return, or are there rich invariants / state machines / tangled business rules?"
- options: "Mostly CRUD-ish" (→ Transaction Script), "Real business rules & invariants" (→ Domain Model), "Rich + many integrations / long-lived" (→ Domain Model + Hexagonal wrapper)

**Reconcile against DOMAIN-MODEL (do not skip).** If the user's answer contradicts the documented core complexity — e.g. they say "it's just CRUD" but DOMAIN-MODEL marks this a high-complexity *differentiating* core with rich invariants — the **documented complexity governs**. Present the discrepancy back ("the domain model flags rich pricing/scoring invariants here — that's a Domain Model, not CRUD") and default to the higher rung unless the user gives a concrete reason the model is wrong. Never let an understatement silently lower the core's rung — a scripted core over a documented rich domain is the exact under-engineering this skill exists to prevent.

Then probe the orthogonal signals (only when relevant):
- **Hexagonal wrapper?** "Will you swap or add adapters (DBs, queues, 3rd-party APIs), have multiple delivery mechanisms, or need high test isolation over a long lifespan?" Yes → wrap **the core only** in Hexagonal/Clean. No → skip (one-impl ports would be over-engineering). If the user asks for Clean/Hexagonal across the *whole app*, push back: scope it to the core; CRUD subdomains over one DB don't earn ports.
- **CQRS?** only if reads structurally diverge from writes / reads ≫ writes.
- **Event Sourcing?** First ask whether any financial/regulatory flow (payments, invoicing, tax) carries an audit / retention / temporal-reconstruction mandate. If there is an audit need, prefer a **scoped append-only audit log on that component** — reserve Event Sourcing for when full temporal reconstruction is the hard requirement. "Sounds robust" is never sufficient.

For a **supporting** subdomain whose rules are *growing* (a state machine + multiplying invariants, e.g. an "emerging" subdomain), keep it at the floor (Transaction Script) but record a **promotion trigger** — the concrete signal that would later move it to a Domain Model.

Record each subdomain → rung + the **concrete signal** that justifies anything above Transaction Script. If no concrete signal exists, stay at the floor.

## Step 4: Axis B — deployment topology

Default is **Modular Monolith**. Recommend microservices ONLY if all three gates pass — ask them (AskUserQuestion, header "Topology", or a text list):
1. "Are there multiple independent teams that need to deploy on their own cadence?"
2. "Is there CD / monitoring / DevOps maturity already in place?"
3. "Are the bounded contexts well-understood already (not still being discovered)?"

If **any** is "no" → **Modular Monolith. Say so and stop here on Axis B** (note: complexity alone never justifies microservices — the microservice premium). If the user argues for microservices from **scale** ("we'll have millions of X"), name it as axis confusion: scale is an Axis-B NFR met by horizontally replicating the monolith (and, if one component later scales divergently, a Hard-Parts extraction of *that component only*) — not by splitting into services. Say this explicitly.

If all three pass, OR a single component looks special, run the **Hard-Parts scan** on that component: score the 6 disintegrators (low cohesion · divergent volatility · divergent scaling · fault isolation · differential security · independent extensibility) vs the 4 integrators (ACID across data · tight workflow · shared code · tight data relationships). Net disintegrators ≫ integrators → extract it; otherwise keep it modular. Warn explicitly against a **distributed monolith** (services that can't deploy independently).

## Step 5: Over-/under-engineering check (the meta-tell)

Run this check in **both directions** — it is a first-class gate, not a formality:
- **Downward (over-engineering):** for every non-floor rung chosen in Steps 3–4, name the **current, concrete requirement** that justifies it (a real second adapter, a real divergent-scaling component, a real second team, a real audit mandate). No concrete requirement → **drop it to the floor**.
- **Upward (under-engineering):** for the core, re-check DOMAIN-MODEL. If the documented complexity (rich invariants, scoring, state machines, audit needs) is *not* captured by the chosen rung — including when a user understatement lowered it in Step 3 — **raise the rung**. A scripted core over a documented rich domain, or thin CRUD over a regulated/audited flow, must be raised.

State the surviving justifications; you'll record them in the ADR.

## Step 6: Present recommendation & write the ADR

**Recommend, don't dictate.** Present, via `AskUserQuestion` (header "Architecture"):
- Your recommended option in one paragraph (the Axis-A rungs per subdomain + the Axis-B topology), how it compares to the default baseline (modular monolith + Domain Model in the complex core + Transaction Script elsewhere + ADRs + fitness functions), and 1–2 alternatives with trade-offs.
- options: "Accept the recommendation", "Adjust (I'll tell you what)", "Show me the alternatives in detail"

Once approved, render `@~/.claude/gsd-core/templates/adr.md` (fill `[NNNN]` with the next number, `[DATE]` with today's date, `[PROJECT_TITLE]` from PROJECT.md, Status = Accepted). Fill: Context (complexity + NFRs + team/ops), Decision (Axis A per-subdomain table + Axis B with the three gate answers), Consequences (incl. **fitness functions** to enforce boundaries), Alternatives rejected, and the over-/under-engineering check (each non-floor rung ↔ its concrete requirement).

Write to `.planning/adr/NNNN-architecture.md`. Capture *why* and trade-offs, not implementation detail.

## Step 7: Commit

```bash
if [ "$COMMIT_DOCS" = "true" ]; then
  gsd_run query commit "docs: record architecture decision (ADR-NNNN)" --files .planning/adr/NNNN-architecture.md
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

Next: /gsd:plan-phase   (planning + test strategy will follow this shape)
```

</process>

<critical_rules>
- **Keep the two axes separate.** Domain-logic complexity drives Axis A; team structure + NFRs + ops maturity drive Axis B. Never let high scale imply a Domain Model, or rich logic imply microservices.
- **Modular monolith is the default.** Microservices require ALL three "tall enough" gates; if any fails, recommend the monolith and stop — regardless of complexity.
- **The meta-tell governs.** Every non-floor rung must map to a current, concrete requirement, or it drops to the floor.
- **Recommend, don't dictate.** Present trade-offs and alternatives; the user approves. They have context you lack.
- **Always emit an ADR** with explicit fitness functions, and respect `commit_docs` / `response_language`.
</critical_rules>

<success_criteria>
- Context loaded (PROJECT.md, REQUIREMENTS.md, DOMAIN-MODEL.md if present)
- Axis A decided per subdomain, each non-floor rung tied to a concrete signal
- Axis B decided via the three gates (+ Hard-Parts scan for any split); modular monolith unless all gates pass
- Over-/under-engineering meta-tell applied
- Recommendation presented with trade-offs/alternatives and user-approved
- ADR written to `.planning/adr/NNNN-architecture.md` with fitness functions; committed when commit_docs is true
- User directed to /gsd:plan-phase
</success_criteria>
