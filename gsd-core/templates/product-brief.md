# Product Brief — [PROJECT_TITLE]

**Created:** [DATE] via `/gsd:discover-product`
**Scope:** Product definition (what/why) — feeds `PROJECT.md` and `/gsd:model-domain`. Outcome-framed so the domain and architecture stay open. **This brief is a hypothesis, not a verdict** — its open assumptions feed an ongoing discovery cadence (Torres), not a one-time gate.
[Challenge mode: **This brief complements — does not replace — [upstream spec/docs paths]**. Where this brief is silent, the spec governs; on the amended points below, this brief governs until the spec is updated.]

## Outcome (not output)

[The customer behavior or business metric we want to change — not a feature. e.g., "Shippers get a priced, matched carrier in seconds instead of days."]

## Desired outcomes (measurable — Ulwick ODI)

State 2–3 as *direction + metric + object* so "is it working?" is answerable. If the population is heterogeneous, list per-segment — don't average them away.

| Desired outcome (direction + metric + object) | For which segment | Under-served? (importance × dissatisfaction) |
|---|---|---|
| [e.g., "minimize the time to reconcile an invoice"] | [segment] | [high / unknown] |

## Target user & job

- **Specific user:** [the actual human/role for whom this is most acute/frequent/expensive]
- **Job (solution-free):** [verb + object, e.g., "book freight capacity for a load"]
- **Job story:** When [situation], I want to [motivation], so I can [outcome].

## Demand evidence (not interest)

| Signal | Evidence | Strength |
|--------|----------|----------|
| Workaround / alternatives | [what they use today instead — incl. spreadsheets/nothing — its cost, why it hasn't won] | strong / medium / weak |
| Money / usage | [pre-pay, paying client, real usage, "calls when it breaks"] | strong |
| Signed commitments | [non-binding LOIs, unpaid pilots] | medium — not yet demand |
| Interest | [waitlists, likes, "sounds useful"] | weak |

[All-interest = demand unproven. Medium at best → convert to strong or treat demand as open.]

## The wedge

[The narrowest version that fully solves one opportunity for one user this week. Which opportunity moves the outcome most, and why. Confirm: more than one solution is imaginable (else re-frame).]

## Four risks (status)

| Risk | Status | Evidence / cheapest test before building |
|------|--------|------------------------------------------|
| Value (will they choose it over the status quo?) | validated / open | [validated needs customer-sourced evidence (named behavior/quote/money) — never founder testimony alone] |
| Usability (can they figure it out?) | validated / open | |
| Feasibility (can we build it — riskiest unknown?) | validated / open | |
| Viability (pricing/legal/sales/brand?) | validated / open | |

## Scope

- **Thin first slice (walking skeleton):** [the smallest end-to-end path]
- **Prioritized candidates (RICE):** [feature — R×I×C/E; or "deferred to discovery, value unproven"]
- **NOT in scope (deferred, one-line rationale each):** [...]

## Success

- **Outcome metric + by when:** [the behavior/metric change and the date]
- **PMF check (pre-registered):** [Sean Ellis criterion (≥40% "very disappointed") to survey once ≥N pilots used the core — planned measurement, not founder prediction]

## Proposed spec amendments (challenge mode only — omit otherwise)

Findings that contradict or materially extend the upstream docs. Apply them to the spec, or this brief governs on these points.

| # | The spec says / omits | Discovery found | Recommended edit |
|---|---|---|---|
| 1 | [claim or silence] | [evidence-backed finding] | [the concrete spec change] |

## Handoff notes

- **For `model-domain`:** [the job + journey steps and the key domain nouns/events to model]

## Assumptions to re-test (leap-of-faith)

The brief is a hypothesis. List the assumptions that must hold for the wedge to work, riskiest first, each with the cheapest next test — revisit after a handful of customer conversations (continuous discovery, not a gate).

| Leap-of-faith assumption | Riskiest? | Cheapest next test (threshold · owner · by-when) | Kill criterion |
|---|---|---|---|
| [what must be true] | [yes / no] | [test + threshold, owner, by-when — runs before building] | [what result kills the wedge] |

---
*Product brief. Next: `/gsd:new-project` (if not done) → `/gsd:model-domain` → `/gsd:recommend-architecture`.*
