# Plan-phase Coverage Gate — Handling the Result

Extracted from `plan-phase.md` (lazy-loaded) — how the orchestrator handles the `check.decision-coverage-plan` result at step 13a.

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
