# Step: suite tune-up (strategy-governed, four ordered passes)

The repair half of suite health. `/gsd:testing-strategy` decides how fast a suite is
**born**; `transition`'s `suite_health_compare` decides **when** it has decayed; this
flow is what actually fixes it — and it is the only place allowed to write a new
`## Suite health` row.

**Order is doctrine: config before tests, and every test change justified by the
strategy — never merely because it made the suite faster.** A suite that got faster by
deleting the tests that would have caught the next bug did not get healthier.

<entry_points>

Three, and only three, ways to arrive here:

| Entry | Who fires it | Timing |
|---|---|---|
| **T1 — tier budget breach** | `transition`'s `suite_health_compare` writes `.planning/todos/pending/{date}-suite-health-t1.md` | **immediately** — a TDD-ergonomics emergency |
| **T2 / T3 / T4** | the same step writes a `Suite tune-up (milestone close):` todo; `complete-milestone`'s `audit-open` scan surfaces it | at **milestone close** |
| **Manual** | `/gsd:testing-strategy --tune-up` | whenever a human suspects decay |

Whichever route brought you here, the passes below are identical. If a todo triggered
this run, mark it complete when Pass 4 lands its row.

</entry_points>

<required_reading>
@~/.claude/gsd-core/references/test-strategy.md
`.planning/TEST-STRATEGY.md` — the project's own strategy. Without it there is nothing
to audit the suite *against*, and this flow degenerates into a stopwatch. Stop and say so.
</required_reading>

<process>

## Pass 1: Profile — evidence first

**No change without a measurement.** Produce three artifacts before touching anything:

1. **The slowest files.** Use the runner's own tail reporter, not intuition — `--durations=N`
   (pytest), `--reporter=verbose` / the slow-test threshold (vitest), `cargo nextest run`'s
   structured timings, `go test -v` package timings. Record the top ~10 with their times.
2. **The setup-vs-test split.** How much of the wall clock is `beforeAll` / fixtures /
   migrations / image pulls, and how much is assertions? A suite that is 80 % setup has a
   config problem; a suite that is 80 % assertions has a volume problem. They have
   different remedies, and picking the wrong one wastes the tune-up.
3. **The container lifecycle map.** How many containers start, when, and per what — per
   run, per suite, per file, or (the pathology) per test. Compare against
   `containers_started` in the latest SUMMARY's `suite-metrics:` block.

Re-measure the whole suite once, timed, as this run's "before" number. Write all three
down; Pass 3 and Pass 4 both read them.

## Pass 2: Config / cache — the predictable half

Work the per-stack born-fast checklist in `@~/.claude/gsd-core/references/test-strategy.md`
(`## Suite health` → born-fast defaults). It is class-based and explicitly non-exhaustive,
and it names **current APIs** — check the framework's current docs before emitting a flag,
because a perf recipe with no version attached is a bug with a delay fuse.

The classes it covers: container lifecycle (one per suite run, never per file; **reuse is
local-only**), the JS/TS pool model, Rust's per-test process runner, Python distribution
vs. order-independence, Go's parallelism knobs and result cache, and CI-side image/layer
caching.

Two rules that survive every stack:

- **Measure each change on its own.** A batch of five config edits that nets 30 % faster
  teaches nothing about which one to keep.
- **`isolate: false`-class trades are measured trades, never defaults.** Shared module
  state can turn a real failure into a false pass, and a false pass is strictly worse
  than a slow suite.

Re-measure. If Pass 2 alone cleared the trigger, the fix-class is **config-drift** —
record it in Pass 4 and stop; do not go looking for tests to delete.

## Pass 3: Suite audit against the strategy

Only now do tests change, and every change is **justified by the strategy, never merely
"made faster"**: each one cites `.planning/TEST-STRATEGY.md` — the level emphasis per
subdomain, what-not-to-test, and the no-duplicate-coverage rule. Five classes, each a
**strategy violation first and a performance cost second**:

| Class | What it looks like | Strategy basis |
|---|---|---|
| **Implementation-detail tests** | assertions on internals/mocks rather than behavior; they break on refactor | behavior-over-implementation; mock only at ports |
| **Duplicated coverage across tiers** | the same behavior proven at e2e *and* integration *and* unit | test each behavior **once**, at the cheapest level that gives confidence — push it down the pyramid where the strategy permits |
| **Obsolete tests** | cover a removed feature, a migrated adapter, or a decision the project reversed | nothing in the strategy asks for them |
| **Over-broad shared fixtures** | one fixture seeding the world so twelve tests can use three rows of it | the setup share Pass 1 measured |
| **Accidental serialization** | a shared port/file/DB/global that forces workers into a queue | parallel-safe isolation is a standard, not an optimization |

**Never delete a test to hit a number.** A test that is slow *and* load-bearing gets
moved, not removed. If a deletion or demotion cannot cite a line of the strategy, it does
not happen in this flow — raise it as a strategy question instead (`/gsd:testing-strategy`
`--update`), because changing what the project tests is a strategy decision, not a
tune-up decision.

## Pass 4: Re-baseline — append the row, record the fix-class

Re-measure the whole suite once, timed, exactly as Pass 1 did, and **append a new dated
row** to `.planning/TEST-STRATEGY.md`'s `## Suite health` table:

```markdown
| YYYY-MM-DD | {test_count} | {m:ss} | {ms/test} | {containers_started \| —} | {config-drift \| test-debt} |
```

**Append. Never rewrite, overwrite, or replace the previous row.** The history *is* the
trend the T2/T4 triggers compare against — a table with one row can only ever answer
"how fast is it now", never "is it decaying". The same append-only rule the
`## Coverage debt` section follows.

**Record the fix-class** — one of exactly two values, chosen from where the win actually
came from:

- **`config-drift`** — Pass 2 cleared it. The suite's *configuration* fell behind (stale
  framework API, lost cache, container lifecycle regression). Expect recurrence at the
  next framework major; the remedy is watching release notes.
- **`test-debt`** — Pass 3 was needed. The suite accumulated tests the strategy does not
  ask for. Expect recurrence as the team grows; the remedy is review discipline.

Recording it is the point: over several milestones the column tells the project which
failure mode it actually has, which is the only way the *next* tune-up starts in the
right pass.

Then report, in this shape:

```
Suite tune-up complete — {trigger} cleared.

  Before: {test_count} tests · {m:ss} · {ms/test} ms/test · {containers_started} containers
  After:  {test_count} tests · {m:ss} · {ms/test} ms/test · {containers_started} containers
  Fix-class: {config-drift | test-debt}
  Changes: {config edits} · {tests moved/demoted/deleted, each with its strategy citation}

  New Suite-health row appended to .planning/TEST-STRATEGY.md (history preserved).
```

If the trigger did **not** clear, say so plainly and append the row anyway with the real
numbers — an honest unmoved baseline is data; a row that flatters the run is not. Then
name what is left (commonly: it was volume all along → the remedy is tiering/sharding via
`/gsd:cicd-strategy`'s C1, not tuning).

</process>
