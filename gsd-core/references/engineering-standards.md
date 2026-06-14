# Engineering Standards — The Senior Quality Contract

Shared reference injected into the producing agents (`gsd-planner`, `gsd-phase-researcher`, `gsd-pattern-mapper`, `gsd-executor`, `discuss-phase`) and enforced by the reviewing agents (`gsd-plan-checker`, `gsd-verifier`, `gsd-code-reviewer`). It encodes the behaviors a senior engineer actually performs — **not adjectives**. The evidence is explicit: telling a model to write "clean, elegant, senior" code is low-impact (and `CRITICAL: YOU MUST` caps now *backfire*); what moves quality is *specific behaviors* plus *external gates the producer cannot fake*.

## The calibration spine (read first — both directions are failures)

**Fit the solution to the problem's real complexity. Over- and under-engineering both produce mess.** Over-engineering: hexagonal for a script, speculative abstraction, config for imagined futures. **Under-engineering: patching, hacking, thin CRUD over a rich domain, skipping the structure the architecture requires — this is the failure mode that produces most "mess", because there is no proper structure to hang a clean solution on.** Hold two things separate:

- **The quality bar is INVARIANT.** Correctness, completeness, edge-case handling, clear names, matching existing patterns, and no-hacks apply to an MVP exactly as to a complex system. High internal quality is cheaper at every horizon (Fowler) — never trade it for speed.
- **The structural ceremony is SET BY `recommend-architecture`'s ADR, per subdomain — not chosen by the planner's or executor's taste.**
  - Where the ADR mandates a **Domain Model / hexagonal ports / CQRS / event-driven** flow (a genuinely complex core — e.g. a rich matching/scheduling/memory engine), implement it **fully and cleanly**. Building those abstractions properly *is* the quality bar here. A shortcut that violates the chosen rung — CRUD where a Domain Model is mandated, a direct call where a port is mandated — is **under-engineering, i.e. a hack**, and `gsd-plan-checker` flags it HIGH.
  - Where the ADR says **Transaction Script** (a simple/CRUD subdomain), adding ports, aggregates, or layers is **over-engineering** — equally a defect.

**Simplicity operates *within* the chosen architecture, never *against* it.** If the architecture genuinely no longer fits the need, raise it as a promotion trigger (`recommend-architecture` / `new-milestone`) — never quietly under-build around it. Proportionality both ways: don't impose ceremony on a one-sentence diff; don't skip the bar on a complex one. Complexity = essential (the job, irreducible — Brooks) + accidental (mess, optional). Remove only the mess.

## The contract (behaviors — most load-bearing last)

1. **Understand before you change.** Read the real code paths, the tests-as-spec, and — for this subdomain — the DOMAIN-MODEL classification and the ADR rung, before deciding or writing. Most defects are acting on an incomplete mental model, or building to the wrong structure.
2. **Build to the architecture, fully — on top of the universal floor.** A cheap baseline applies to *every* project, even simple ones: dependency inversion at **true external boundaries only** (DB, 3rd-party, clock/IO) + a Functional-Core/Imperative-Shell shape (pure logic separable from side-effecting glue) + strong independent tests. That floor is part of the invariant bar — skipping it (reaching into the DB/3rd-party from everywhere, untestable) is under-engineering even on a CRUD app. *On top of that*, implement the rung the ADR chose for this subdomain — ports/aggregates/boundaries — properly. Don't skip mandated structure "to keep it simple" (under-engineering); don't add un-mandated internal ceremony "to be robust" (over-engineering). "Don't add un-mandated structure" (rule 4) means the *ceremony above the floor*, never the floor itself.
3. **Match what exists; deep modules, clear names.** Make new code look like it belongs — reuse the established patterns, names, and conventions (`gsd-pattern-mapper` supplies the analogs); don't add a second way to do something that already has one. Prefer a simple interface over real substance to many shallow pass-throughs (Ousterhout — and "extract into tiny functions" is genuinely contested; don't cargo-cult classitis). Descriptive names are one of the few empirically-validated quality levers.
4. **Don't invent un-mandated structure (but build everything the ADR mandates).** Prefer duplication to a *speculative* abstraction — duplication is far cheaper than the wrong abstraction (Metz); wait until the right shape is obvious, inline it back when it stops fitting (AHA); DRY is about *knowledge*, not coincidentally-similar code. Skip speculative layers/options/config for imagined futures (YAGNI; Fowler's cost-of-carry). None of this overrides the architecture's *deliberate, required* abstractions — a mandated port/aggregate is not speculative; declining it is under-engineering, not YAGNI.
5. **Bounded boy-scout.** Improve what you touch when the change needs it and it's honestly better; keep structural changes in a *separate* commit from behavioral ones (Beck's two hats); flag larger refactors instead of silently sprawling — unbounded refactoring is scope creep.
6. **Correct AND complete — edge cases first.** Before coding, enumerate the edge cases and failure modes the behavior must handle; a change that serves only the happy path is unfinished. This completeness is what makes code simple — not doing less.
7. **Never hack a check to pass.** Don't hardcode an expected output, weaken/skip/delete a test, or make a gate trivially pass. A test exists so it *can* fail; one that cannot fail is worthless. (Caught mechanically by the reviewers below — not trusted to good intent.)

## Why this is enforced by gates, not vibes

Prose against shortcuts is *weak alone* — frontier agents still write "make verify return true" under pressure. The durable counter is an external signal the producer can't fake, plus a fresh-context reviewer that checks **both** directions:

- **`gsd-plan-checker`** rejects plans that bake in hacks, under-build the ADR rung (CRUD where a Domain Model is mandated), or over-build a simple subdomain.
- **`gsd-verifier`** assumes the goal was NOT met until codebase evidence proves it; "file exists" ≠ "behavior works"; a test-file edit during a non-test task is a flag, not a convenience.
- **`gsd-code-reviewer`** is the fresh-context adversary: it hunts hardcoded outputs, happy-path-only handling, weakened tests, duplication, the wrong abstraction — *and* under-engineering against the architecture.
- The **falsifiability gate** (`ai-test-quality.md`) proves each test can fail before it counts.

## Anti-patterns (both directions)

- **Under-engineering:** patching around a missing-but-needed abstraction instead of building it; thin CRUD / transaction-script over a domain the ADR marked rich; "keeping it simple" by violating the chosen architecture; happy-path-only; skipping edge cases.
- **Over-engineering:** hexagonal/ports/CQRS with no ADR mandate; abstracting on the first or second similarity; speculative generality and config-for-imagined-futures.
- **Both:** adjective-prompting your own output ("I'll write clean code") instead of doing the behaviors; mixing a refactor and a behavior change in one commit; re-implementing logic the codebase already has; "make it pass" hacks.

*Basis: Ousterhout (A Philosophy of Software Design — deep modules, complexity is incremental); Metz ("the wrong abstraction"); Dodds (AHA); Thomas (DRY = knowledge); Beck (Tidy First, two hats); Fowler (YAGNI, cost-of-carry, "internal quality is cheaper at every horizon"); Brooks (essential vs accidental complexity); Anthropic/OpenAI/DeepMind on agent prompting, reward-hacking, and verification. Full citations in the research corpus.*

## Consumes / produces

Read by `gsd-planner`, `gsd-phase-researcher`, `gsd-pattern-mapper`, `gsd-executor`, and `discuss-phase`; enforced by `gsd-plan-checker`, `gsd-verifier`, `gsd-code-reviewer`. The structural-ceremony decision is owned by `recommend-architecture` (the rung ladder); this contract governs how *well* the chosen rung is executed. Pairs with `universal-anti-patterns.md` (framework pitfalls), `test-doubles.md` + `ai-test-quality.md` (test quality).
