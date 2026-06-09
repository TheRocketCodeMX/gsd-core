# Product Discovery — Define WHAT to Build and WHY

Reference for `/gsd:discover-product`. An **optional** front-of-funnel step that defines the product before building: real demand (not interest), the narrowest valuable wedge, outcome-framed success, and the four product risks. Produces `PRODUCT-BRIEF.md`, which feeds `PROJECT.md` and `model-domain`. Skip when requirements are already clear and evidenced.

## When to run / when to skip

- **Run** when value is **uncertain**: a new market/segment, no past-behavior evidence, a stakeholder asserting demand from a hypothetical, or a large/irreversible bet.
- **Skip** (or jump straight to lightweight RICE prioritization) when a client/customer has explicit, evidenced requirements — then the open question is *sequence and cost*, not *whether*.

## Core principles

- **Outcomes over outputs** (Perri): define the customer behavior/metric to change, not the feature to ship.
- **Demand over interest** (YC): behavior, money, and "panic when it breaks" count; waitlists and "that's interesting" don't. Ask about the **past**, never hypotheticals.
- **Find the narrowest wedge:** the smallest version someone would pay for this week — the hair-on-fire segment.
- **Frame the vision as an opportunity/outcome** (it must admit >1 solution) so it informs but doesn't over-constrain architecture.
- **Cover the four risks** (Cagan): value, usability, feasibility, viability.

## The forcing posture

The first answer is polished — push 2–3 times with concrete specifics, not soft exploration. "Name the *actual* human, the *actual* consequence." Reflect the answer back; confirm before moving on. One thread at a time.

## Distilled question set (ordered; skip any block already evidenced)

0. **Frame:** what customer behavior/metric do we want to change (not a feature)? If we skipped discovery entirely, what assumption would we be betting the whole build on?
1. **Job & user:** who *specifically* — and for whom is the problem most acute, frequent, expensive, unavoidable? State the job solution-free. Job story: *"When [situation], I want to [motivation], so I can [outcome]."*
2. **Demand vs interest:** "Tell me about the *last time* you hit this." "What are you doing about it *today*?" "What does that workaround cost (time/money)?" "What *real* evidence exists — pre-pay, LOI, pilot, converted signups?" (Never "would you use X?")
3. **Wedge & under-served outcome:** which single opportunity, solved, most moves the outcome? The narrowest version that fully solves it for one user? Can we imagine >1 solution? (If no — we smuggled in a solution; re-frame.)
4. **Four risks** (only the unvalidated ones): **value** (evidence they'll choose this over the status quo), **usability** (where they'll get stuck), **feasibility** (riskiest technical unknown), **viability** (pricing/legal/sales/brand). For the least-validated risk, the *cheapest assumption test* before building.
5. **Scope & prioritization:** end-to-end journey → the thin first slice (walking skeleton). RICE on the candidate list — Reach × Impact × Confidence ÷ Effort; table-stakes/dependencies legitimately override the score.
6. **Success:** how will we know it worked (the outcome metric, by when)? What would make ≥40% of target users "very disappointed" to lose it? (Sean Ellis PMF proxy — necessary, not sufficient; survey only users who used the core.)

## Feature prioritization: rigor vs lightweight

- **Value uncertain** → run value-questioning (four risks, assumption tests, PMF).
- **Value established / clear** → Impact-Effort or RICE, then build. (A low RICE *confidence* is itself a flag to return to discovery.)
- **Overrides:** dependencies, table-stakes, and strategic bets legitimately beat the score — scoring just makes the trade-off explicit.

## Handoff

- Produces `PRODUCT-BRIEF.md`: outcome statement, target user + wedge, demand evidence, job story, four-risks status, prioritized scope, explicit "not in scope."
- Feeds `PROJECT.md` (vision / JTBD / persona / metrics) and `model-domain` (the job + journey → domain events and subdomains). Per Patton this is collaborative co-work, not a serial handoff — keep the vision at the outcome level so the domain and architecture stay open.

## Anti-patterns

- Asking hypotheticals ("would you use X?") instead of past behavior.
- Personas as demographics instead of motivations/jobs.
- Output-thinking (counting features shipped, signups, downloads, or waitlist size) instead of outcomes (the build trap).
- Locking the solution into the vision (over-constrains the domain and architecture).
- Skipping the wedge — building the whole platform before validating the smallest paid slice.
