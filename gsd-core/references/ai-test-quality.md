# AI-Written Tests — The Quality Contract

How-to reference and enforcement contract for tests authored by a model (`add-tests`, TDD inside `execute-phase`). LLM test-writers have *known, named* failure modes: vacuous assertions, happy-path-only suites, mock-everything-then-assert-the-mock, change-detector tests (the implementation's current output copied back as the oracle), and weakening a failing assertion to go green. This contract converts test quality from judgment into mechanical checks — inventory-first, greppable forbidden patterns, a falsifiability gate, a mutation gate. Read before generating any test. Pairs with `test-strategy.md` and `test-doubles.md`.

## A. Behavior inventory BEFORE any test is written

For each public behavior in scope, enumerate — before writing a line of test code:

- happy path(s);
- boundary values: empty, zero, one, max, negative, off-by-one, rollover;
- **every** error/rejection path the surface can produce;
- illegal states / illegal transitions (state machines especially);
- clock/concurrency cases wherever the strategy flags them.

Tests map **1:1 to inventory rows** — every row gets a test; every test cites its row. A suite whose inventory is ≥80% happy-path rows is rejected at the plan-approval step, before generation. The inventory is the plan; "write some tests for this file" is not.

## B. Forbidden patterns (greppable — check before running the suite)

Reject any generated test matching these; the list is deliberately machine-checkable:

- **Vacuous sole assertions:** `toBeDefined()`, `toBeTruthy()`, `not.toThrow()`, `expect(true).toBe(true)`, or `expect(result).toEqual(result)`-shaped self-comparison as a test's *only* assertion.
- **Mocking the wrong seam:** `jest.mock` / `vi.mock` of an in-process collaborator. Doubles are legal only at the seams TEST-STRATEGY.md declares — its per-subdomain table is the **mockable-seam allow-list** (`test-doubles.md`).
- **Testing the mock / asserting query interactions:** `toHaveBeenCalled*` on a stubbed *query*; interaction-verify only outbound commands (`test-doubles.md`). Configuring a double and asserting its canned value back is testing nothing.
- **Mocking the SUT itself** (or its module) and asserting through the mock.
- **Change-detector oracle:** an expected literal that was obtained by *running the SUT*, with no comment deriving it from the spec/requirement. If the only way to know the expected value is to execute the code, the test enshrines today's bugs.
- **Snapshot-everything:** `toMatchSnapshot()` as the only assertion on logic output.
- **Happy-path-only suites:** zero error-path or boundary tests for a surface that has error paths (caught structurally by the inventory, A).
- **Copy-paste parametrization:** `it.each` / parametrized rows whose assertions don't actually differ per row.
- **Evasions:** conditional assertions (`if (x) expect(…)`), `try/catch` that swallows the failure, `.skip` without a linked issue, `sleep(`/fixed waits, raw Faker output inside assertions (`realistic-test-data.md`).

A quick pre-run sweep over the generated files:

```bash
grep -nE 'expect\(true\)|toEqual\(result\)|toMatchSnapshot\(\)|\.skip\(|sleep\(|toHaveBeenCalled' $TEST_FILES
grep -nE '(jest|vi)\.mock\(' $TEST_FILES   # every hit must point at an allow-listed seam
```

Hits are not auto-failures — they are review-blocking until justified against this list.

## C. Assertion-quality rules

- Every test contains **≥1 specific-value assertion** on observable output or state.
- Error-path tests assert the error **type** plus one discriminating property (code or message) — *and* that state did not change as a side effect of the rejection.
- State-machine tests assert both the rejection **and** state preservation ("transition refused AND status still `active`").
- One behavior per test; the test name states the behavior and expected outcome, not the method name.

## D. Falsifiability gate — the RED-equivalent for test-after

A generated test that passes on its first run is **unverified**, not done. The strategy's RED step exists so a test is *seen to fail*; for code that already exists, the equivalent is **prove it can fail**:

1. Temporarily mutate the SUT — flip a branch condition, drop the write, return a constant.
2. Re-run; observe the test go **red**.
3. Revert the mutation; re-run; observe green.

One extra run per test file; fully automatable. A test that cannot be made to fail by breaking the code under test is testing nothing — delete or rewrite it. **Never waive this step** because "the code already works"; that waiver is exactly where vacuous AI-written tests are born. (Where the mutation gate in E runs on the same files, a killed mutant covering the test's target behavior satisfies this gate.)

## E. Mutation gate on the diff

Run mutation testing (Stryker) **incrementally on changed files** as part of accepting a generated suite:

- mutation score ≥ the strategy's floor (default **80**) on the gnarly-bit/critical modules touched;
- every surviving mutant is either killed with a new/strengthened test or explicitly waived with a one-line reason.

This is the only gate that catches vacuous suites *systemically*. Full-codebase mutation runs are too slow for this loop — schedule those nightly (see the strategy's CI execution map); changed-files incremental is the per-change gate.

## F. Self-interrogation before declaring done

In the test-plan output, the writer answers — naming the specific test that catches each:

- Would this suite fail if the function returned a constant?
- …if the DB write were silently dropped?
- …if the boundary were off by one?
- …if the error path threw the wrong error (or none)?

Any unanswerable question is an inventory gap: go back to A and add the row. "Probably" is not an answer; a test name is.

## Anti-patterns (summary)

- Accepting a first-run-green suite without the falsifiability gate (D).
- Writing tests file-by-file with no behavior inventory — yields happy-path mush.
- Treating grep hits from B as style nits instead of review blockers.
- Letting the model "fix" a red test by weakening the assertion instead of investigating which side is wrong.
- Skipping the mutation gate because coverage looks high — coverage proves lines ran, not that assertions check anything.

*Sources: Khorikov "Unit Testing Principles, Practices, and Patterns"; Google Testing Blog ("Change-Detector Tests Considered Harmful", "Test Behavior, Not Implementation"); Stryker Mutator docs (incremental mode); "Software Engineering at Google" ch. 12.*
