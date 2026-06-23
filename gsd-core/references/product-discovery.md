# Product Discovery — Define WHAT to Build and WHY

Reference for `/gsd:discover-product`. An **optional** front-of-funnel step that defines the product before building: real demand (not interest), the narrowest valuable wedge, outcome-framed success, and the four product risks. Produces `PRODUCT-BRIEF.md`, which feeds `PROJECT.md` and `model-domain`. Skip when requirements are already clear and evidenced.

## When to run / when to skip

- **Run** when value is **uncertain**: a new market/segment, no past-behavior evidence, a stakeholder asserting demand from a hypothetical, or a large/irreversible bet.
- **Skip** (or jump straight to lightweight RICE prioritization) when a client/customer has explicit, evidenced requirements — money moved or real usage, *covering the candidate list*; LOIs alone don't qualify — then the open question is *sequence and cost*, not *whether*.

## Core principles

- **Outcomes over outputs** (Perri): define the customer behavior/metric to change, not the feature to ship.
- **Demand over interest** (YC): **strong** = money moved / real usage / panic-when-it-breaks; **medium** = signed non-binding commitments (LOIs, unpaid pilots) — real but not yet demand, convert to strong or treat as open; **weak** = interest (waitlists, "that's interesting") — doesn't count. Ask about the **past**, never hypotheticals.
- **Find the narrowest wedge:** the smallest version someone would pay for this week — the hair-on-fire segment.
- **Frame the vision as an opportunity/outcome** (it must admit >1 solution) so it informs but doesn't over-constrain architecture.
- **Cover the four risks** (Cagan): value, usability, feasibility, viability.
- **Make outcomes measurable** (Ulwick ODI): state desired outcomes as *direction + metric + object* — "minimize the time to reconcile an invoice" — not vague goals, so "is it working?" is answerable. When real users exist, rank candidate outcomes by importance × (dis)satisfaction to find the under-served one.
- **Discovery is a loop, not a gate** (Torres): the brief is a *hypothesis to keep testing*, not a verdict. Its open assumptions feed an ongoing cadence (revisit after a handful of customer conversations), organized as an opportunity → solution → assumption tree.

## The forcing posture

The first answer is polished — push 2–3 times with concrete specifics, not soft exploration. "Name the *actual* human, the *actual* consequence." Reflect the answer back; confirm before moving on. One *contested* thread at a time — but batch the rest: group already-evidenced reflect-backs and pair a confirmation with the next probe in the same turn. Batching cuts turns (~10–15 for a context-rich session), not rigor.

## Challenge mode — when specs/research already exist

Discovery recurs at every artifact maturity: nothing yet (greenfield) → meeting/levantamiento notes → research corpus → full design spec. One mechanism serves all of it — the **gap map**: classify each block of the question set against its named outputs as ANSWERED / WEAK / SILENT from the docs, confirm the ANSWERED, challenge the WEAK, interview the SILENT. Greenfield is simply the all-SILENT case.

## Locked-scope mode — when scope is fixed upstream

When the scope is **already locked** by an upstream design, a stakeholder mandate, or a contract (the user says "implement everything in this design" / "the scope is set"), the wedge-finding/narrowing instinct *fights* the build. Detect it and **flip the posture** from *narrow-the-scope* to: (1) **validate demand** for the locked scope (is there evidence it's wanted?), (2) **sequence** the locked scope (what ships first — the walking skeleton), and (3) **surface the risks/assumptions** behind it (the four risks still apply — name the leaps of faith). Do not push to cut scope the user has declared fixed; challenge the *evidence and sequencing*, not the *existence* of the scope.

Two blocks are **never doc-answerable** (cap at WEAK however mature the docs):
- **Demand evidence** — documents hold intentions and theses, not past behavior; the money-moved/usage record lives in people's heads and inboxes. A deep design process can run for weeks without ever surfacing the one paid consultation that validates the thesis — only the past-tense interview finds it.
- **User definition** — specs smuggle the everyone-trap in writing (multi-stakeholder framings, personas-as-demographics). Re-test the documented user with the same pushback as a spoken claim.

Challenge mode's brief **complements, never replaces** the upstream docs — and contradictions found must flow back as *proposed spec amendments* with explicit precedence, or the spec stays silently wrong while downstream agents read both.

## Distilled question set (ordered; skip a block only when its named outputs already exist at strong evidence — reflect the skipped conclusion back)

0. **Frame:** what customer behavior/metric do we want to change (not a feature)? (The betting-the-build assumption is enumerated in block 4 — don't ask it twice.)
1. **Job & user:** who *specifically* — and for whom is the problem most acute, frequent, expensive, unavoidable? State the job solution-free. Job story: *"When [situation], I want to [motivation], so I can [outcome]."* Capture 2–3 **measurable desired-outcome statements** for the job (direction + metric + object, e.g. "reduce the time to find an open class slot") — these are what "better" is measured against. Note if the job-population is heterogeneous (different segments → different outcomes; don't average them away).
2. **Demand vs interest:** "Tell me about the *last time* you hit this." "What are you doing about it *today*?" "What does that workaround cost (time/money)?" "What do they use today instead — incl. spreadsheets or nothing — and why hasn't it won?" "What *real* evidence exists — pre-pay, pilot in use, converted signups, signed LOIs?" Mark strength: strong (money/usage) / medium (LOIs, unpaid pilots) / weak (interest). (Never "would you use X?")
3. **Wedge & under-served outcome:** which single opportunity, solved, most moves the outcome? The narrowest version that fully solves it for one user? Can we imagine >1 solution? (If no — we smuggled in a solution; re-frame.)
4. **Four risks** (only the unvalidated ones): **value** (evidence they'll choose this over the status quo), **usability** (where they'll get stuck), **feasibility** (riskiest technical unknown), **viability** (pricing/legal/sales/brand). First **enumerate the leap-of-faith assumptions** behind the chosen wedge (what must be true for it to work); then **specify** the cheapest test for the *riskiest* one — pass/fail threshold, kill criterion, owner, by-when; tests execute *after* the session, before building — not just a single test on the least-validated risk. Value is never "validated" on founder testimony alone — it needs customer-sourced evidence (a named customer's behavior, quote, or money).
5. **Scope & prioritization:** end-to-end journey → the thin first slice (walking skeleton). RICE on the candidate list — Reach × Impact × Confidence ÷ Effort; table-stakes/dependencies legitimately override the score.
6. **Success:** how will we know it worked (the outcome metric, by when)? Pre-register the Sean Ellis PMF criterion — the ≥40%-"very disappointed" survey to run once ≥N pilots have used the core (necessary, not sufficient; survey only users who used the core) — a planned measurement, never a founder prediction.

## Feature prioritization: rigor vs lightweight

- **Value uncertain** → run value-questioning (four risks, assumption tests, PMF).
- **Value established / clear** → Impact-Effort or RICE, then build. (A low RICE *confidence* is itself a flag to return to discovery.)
- **Overrides:** dependencies, table-stakes, and strategic bets legitimately beat the score — scoring just makes the trade-off explicit.
- **RICE fits feature-list products.** When sequencing is strategy-driven (a milestone ladder, credibility-before-product), the ladder IS the prioritization — record the named override; don't force fake arithmetic onto a systems roadmap.

## Handoff

- Produces `PRODUCT-BRIEF.md`: outcome statement, target user + wedge, demand evidence, job story, four-risks status, prioritized scope, explicit "not in scope."
- Feeds `PROJECT.md` (vision / JTBD / persona / metrics) and `model-domain` (the job + journey → domain events and subdomains). Discovery is collaborative, *continuous* work (Torres) — not a serial handoff or a one-time gate; keep the vision at the outcome level so the domain and architecture stay open. (Slicing the journey into releases downstream is **story mapping** — Patton.)

## Anti-patterns

- Asking hypotheticals ("would you use X?") instead of past behavior.
- Personas as demographics instead of motivations/jobs.
- Output-thinking (counting features shipped, signups, downloads, or waitlist size) instead of outcomes (the build trap).
- Locking the solution into the vision (over-constrains the domain and architecture).
- Skipping the wedge — building the whole platform before validating the smallest paid slice.
