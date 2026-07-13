# Plan-phase Coverage Gate — Handling the Result

Extracted from `plan-phase.md` (lazy-loaded) — how the orchestrator handles the `check.decision-coverage-plan` result at step 13a.

## What the gate is / when it's skipped

After the requirements coverage gate passes, verify that every trackable
decision captured by discuss-phase in CONTEXT.md `<decisions>` is referenced
by at least one plan. This is the **translation gate** from issue #2492 —
its job is to refuse to mark a phase planned when a discuss-phase decision
silently dropped on the way into the plans.

**Skip if** `workflow.context_coverage_gate` is explicitly set to `false`
(absent key = enabled). Also skip if no CONTEXT.md exists for this phase
(nothing to translate) or if its `<decisions>` block is empty.

**Why the shell snippet exits 1 (BLOCKING):** refuse to mark phase planned when a
trackable decision is uncovered. `passed: true` covers both real-pass and skipped
cases (gate disabled / no CONTEXT.md / no trackable decisions). Verify-phase
counterpart deliberately omits this exit-1 — that gate is non-blocking by design
(review finding F15).

**If `passed` is true (or `skipped` is true):** Display `✓ Decision coverage: {M}/{N} CONTEXT.md decisions covered by plans` (or `(skipped — gate disabled)` / `(skipped — no decisions)`) and proceed to step 13b.

**If `passed` is false:** Display the handler's `message` block. It already names each uncovered decision (`D-NN | category | text`) and tells the user what to do — cite the id in a relevant plan's `must_haves` / `truths`, or move the decision under `### Claude's Discretion` / tag it `[informational]` if it should not be tracked. Then offer:

```text
Options:
1. Re-plan to cover missing decisions (recommended)
2. Edit CONTEXT.md to mark dropped decisions as [informational] / Discretion
3. Proceed anyway — accept the coverage gap
```

If `TEXT_MODE` is true, present as a plain-text numbered list. Otherwise use AskUserQuestion. Selecting "Proceed anyway" continues to step 13b but records the override in STATE.md so verify-phase can re-surface it.

**Why this gate blocks:** failing here is cheap. The plans are the contract between discuss-phase and execute-phase; if a decision isn't visible in any plan, no executor will implement it. Catching that now beats discovering it after thousands of dollars of execution.
