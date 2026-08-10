# Testing Strategy — Shape Follows Architecture

Reference for `/gsd:testing-strategy`. Decides WHAT to test, at WHICH level, and HOW MUCH — matched to the architecture (from the ADR / SKELETON). Where `TESTING-STANDARDS.md` exists, **extends — never replaces —** its rigor; where it's absent (greenfield), the strategy **defines** the baseline rules itself (real-code-only, no vacuous assertions, typed surface, `fast-check` property tests, Stryker mutation ≥80% on critical modules) and creates the file from them. Recommends; the user decides.

## Core principles (the consensus)

1. **Behavior over implementation — the strongest consensus.** Test through public APIs / observable behavior so tests survive refactoring; a test changes only when *behavior* changes. Default to **sociable** tests (real collaborators); **mock ONLY at architectural boundaries** (ports / external systems). Mockist/solitary tests are exactly the brittle, implementation-coupled tests everyone warns against.
2. **Test each behavior ONCE, at the cheapest level that gives confidence.** Push tests down; drop a higher-level test once lower levels cover the condition. Avoid the **ice-cream cone** (mostly e2e) and **hourglass** (no integration) anti-patterns.
3. **Coverage is a FLOOR, not a target.** High line coverage is a vanity metric ("a line ran" ≠ "a line is asserted"). Use **mutation testing** (Stryker — already in the project) on critical modules to prove the assertions actually check something; use coverage as the allow-list of what to mutate.
4. **Shape FOLLOWS architecture — framed correctly.** Don't "pick the diamond/pyramid/trophy." The architecture determines where the testable behavior *lives* → the shape **emerges**. Reason in test **size** (Google): *small* (in-process, no I/O) / *medium* (localhost, real DB) / *large* (multi-machine, e2e).

## Shape follows architecture (consume the ADR)

Read the architecture decision (`.planning/adr/*.md` or SKELETON). Per subdomain / Axis-A rung:

| Architecture (per subdomain) | Primary test level | Why |
|---|---|---|
| **Domain Model / rich core** | more **small (unit)** tests of the domain logic, through its public API | lots of pure logic, few dependencies — cheap and high-value to unit-test |
| **Transaction Script / CRUD-over-DB** | more **medium (integration)** tests against a real DB | thin logic, DB-bound — little pure logic to isolate; confidence lives at the DB boundary |
| **Hexagonal core** | pure domain functions need no doubles; the application core is tested with **in-memory fakes at its ports** (contract-verified against the real adapters — see `test-doubles.md`); the **adapters** are integration-tested against real systems | the architecture literally separates the two |
| **Many integrations / external APIs** | medium integration tests at the ports; **contract tests** where a 3rd-party can't be seeded | confidence is in the integration, not mock existence |
| **Bought / off-the-shelf (Generic)** | thin integration smoke at your adapter seam only | don't test the vendor's internals — test your seam |

The resulting distribution is an **output** (pyramid-ish for logic-heavy, diamond/trophy-ish for integration-heavy) — never an input you pick.

## When unit tests pay off (the gnarly bits)

Pure, dependency-light, logic-dense code: **money/currency (integer minor units or exact decimal — NEVER binary float)**, complex conditionals / **state machines**, **parsers**, **algorithms**, pure functions. High branching, cheap to unit-test. Do **not** unit-test trivial glue, getters/setters, or framework code.

## What NOT to test / avoiding duplicate coverage

- Don't test the same behavior at unit AND integration AND e2e — each behavior once, at the cheapest level.
- Don't test framework/library code, trivial accessors, or **mock behavior** (testing a mock means you violated behavior-testing).
- Don't chase a coverage % as a goal; chase behavior coverage + mutation score on critical modules.

## TDD — honestly

The defensible mandate is **always strong, INDEPENDENT tests** — not "always TDD, even for simple." The evidence is clear that what drives the quality benefit is **granularity + test existence + independence**, not test-first *ordering* (controlled studies found test-first vs test-after didn't differ; granularity did; the design-improvement claim for ordering is contested, not established). So **mandate: behavior-level tests + small increments + a regression floor.** Keep the **RED step** (watch a test fail) so tests actually test something.

**Default to test-first for AI-WRITTEN code — but on anti-gaming/independence grounds, not "test-first improves design."** When an agent authors the implementation, writing the spec/test first stops it from shaping tests to its own output: agents reward-hack tests, and a large share of "passing" agent patches diverge from ground truth (green ≠ correct). The lever is an *independent*, human-anchored check the agent did not write to its own convenience (see `ai-test-quality.md`) — not the ordering ritual. Test-first vs test-after stays a **knob** (`workflow.tdd_mode`); the independence requirement does not.

**Skip TDD for** UI/visual components, prototypes/spikes, glue/wiring, and trivial CRUD — correctness there is visual, throwaway, or too thin to assert cheaply (both pro- and anti-TDD camps agree). Still cover them with the cheapest check that fits (visual/snapshot, integration smoke).

**Green ≠ correct — verify beyond green.** A passing suite is a *lower bound* on correctness, not proof. For critical paths pair it with mutation/property/differential testing + human UAT.

## Persistent vs transient E2E

- **Persistent:** a small **smoke / critical-user-journey** suite (auth, payment, core nav) of **3–7 journeys** in CI on every PR (<5 min). ≈50–200 well-chosen e2e tests is the cap on the **total** e2e portfolio across all tiers (PR smoke + staging regression + release/scheduled) — never the size of the PR gate, which stays at 3–7 journeys. E2e is slow/flaky; push coverage down to integration.
- **Transient:** throwaway e2e to validate a freshly-built flow during the dev loop; **not** kept in CI. Once the behavior is covered more cheaply (integration), delete or demote it.

**What the smoke suite is NOT:** validation of the app in the world. A hermetic ephemeral-environment run is a **regression check, not a validation** in real conditions — real accounts, real vendors, real network are exactly what it excludes by design. That job belongs to certification (see `certification.md`): the top of the pyramid is two different jobs — scripts gate, certification validates — and the strategy records both without conflating them.

## Suite health — born fast, re-evaluated by trigger

A suite is **born fast by configuration**, not rescued later — and then re-measured on a schedule of observable triggers, because suites don't announce their own decay.

### Born-fast defaults (class-based, explicitly non-exhaustive)

The checklist names *classes* of lever; the concrete flags below are the **current** APIs at time of writing — check the framework's current docs before emitting one, because a perf recipe with no version attached is a bug with a delay fuse:

- **Container-backed integration (Testcontainers-class):** one container per suite run (singleton/`globalSetup`), never per test file. **Reuse is LOCAL-ONLY** — Testcontainers' own docs: reusable containers are **"not suited for CI usage"** (still experimental, disables the reaper so containers leak, and the API isn't portable: four languages, four call shapes; Node defaults reuse to *enabled* while ignoring the property the others document; Python documents no reuse at all). CI levers are different: image/layer caching, pre-pulled images, file-level parallelism.
- **Vitest 4 (JS/TS):** top-level `maxWorkers` and `isolate` — `poolOptions` was removed in Vitest 4, so the most-copied snippet on the internet targets a dead API; the default pool is `forks`. `isolate: false` is a *measured* trade, never a default: Vitest documents the preconditions (no side effects, proper cleanup) but no failure mode — the warning that shared module state can turn a real failure into a false pass is GSD's own, and a false pass is strictly worse than a slow suite.
- **Rust:** `cargo nextest` — per-test processes, structured timings, `--partition` sharding, retries that mark flakes distinctly. Its own benchmarks span **1.37×–3.38×** vs `cargo test` (methodology excludes build time) — ship the range, never a headline multiple.
- **Python:** `pytest-xdist` (`-n auto`, `--dist` modes) for distribution; order-independence is **pytest-randomly**'s job, not xdist's. Measure the tail with `--durations=N`.
- **Go:** `-parallel` (within a binary, needs `t.Parallel()`) and `-p` (across packages) are orthogonal knobs; the result cache is the sleeper lever (`-count=1` disables it deliberately).

**No per-test budgets.** No primary source publishes a per-test time budget — the only sourced number is the ten-minute whole-build guideline, shared with `cicd-strategy.md`'s C1-a trigger rather than reinvented. The trigger thresholds below (~90 s dev-loop, ~25 % ms/test drift, ~40 % growth backstop) are **GSD's own heuristics**, labelled as such.

### The four triggers (trend + absolutes)

Measured per milestone against the `## Suite health` baseline table in TEST-STRATEGY.md (`test_count`, `wall_clock`, `ms/test`, `containers_started`, fix-class of last tune-up):

| Trigger | Signal | Fires |
|---|---|---|
| **T1 — tier budget breach** | dev-loop tier >~90 s locally; PR gate >10 min (= the CI ladder's C1-a) | **Immediately** — a TDD-ergonomics emergency, not a cleanup item |
| **T2 — ms/test trend** | cost-per-test >~25 % above the milestone baseline — a *structural* regression (config, setup, cache, accidental serialization) | Tune-up scheduled at milestone close |
| **T3 — container churn** | containers-started growing faster than suite count | Tune-up scheduled at milestone close |
| **T4 — backstop** | suite grew >~40 % since the last tune-up and none happened | Tune-up scheduled at milestone close |

**Volume vs regression — the distinction that picks the remedy:** flat ms/test with a rising total is **volume, not a regression** — the suite is healthy and simply bigger, and the remedy is tiering/sharding (the CI ladder's C1), not tuning. Rising ms/test is structural and is what the tune-up exists for.

### The tune-up flow (four ordered passes — order is doctrine)

**Config before tests; tests audited against the strategy, never merely "made faster."**

1. **Profile** — slowest files, setup-vs-test split, container lifecycle map. Evidence first; no change without a measurement.
2. **Config/cache pass** — the born-fast checklist above, at current APIs (the predictable half of most slowdowns).
3. **Suite audit against the strategy** — implementation-detail tests (a strategy violation first, a perf cost second), duplicated coverage across tiers (push down the pyramid where the strategy permits), obsolete tests, over-broad shared fixtures, accidental serialization. Every deletion or demotion justified by the strategy doc, never by the stopwatch alone.
4. **Re-baseline** — re-measure, append the new Suite-health row, and **record the fix-class** (config-drift vs test-debt) so the strategy learns which failure mode this project actually has.

## Output (`TEST-STRATEGY.md`)

- Per subdomain/component: the recommended level emphasis (small/medium/large) + the architecture rung that justifies it.
- The critical-path e2e **smoke list** (persistent) + its maintenance mechanism (agent-authored/healed where possible).
- The **certification** tier, probe results, and mechanism + the **certification substrate** (see `certification.md`).
- What to unit-test (the gnarly bits) and what **not** to test.
- Coverage stance (floor) + where mutation testing applies.
- The **suite-health baseline** (measured or `unmeasured`) the four triggers compare against.
- TDD stance (behavior + small increments; test-first knob).

Feeds `add-tests`, `execute-phase`, and `plan-phase`.

## Extends existing rigor — or instates it

Where `TESTING-STANDARDS.md` is present, it enforces baseline rigor — real-code-only, no-vacuous-assertions, the typed-surface mandate, `fast-check` property tests for bijective/invariant logic, Stryker mutation ≥80% on critical modules — keep all of it; do not weaken any existing standard. Where the file is **absent** (greenfield), those same rules are the defaults to instate: the strategy records them as the project's baseline standards (in TEST-STRATEGY.md's Notes) and offers to generate `TESTING-STANDARDS.md` from them. Either way, this skill adds the **strategic layer** on top — the shape, the what/what-not, the level-per-subdomain.

## Test-infrastructure how-to references (read when writing the tests)

When the strategy calls for real-dependency integration tests, auth, or e2e, load the focused how-to reference:
- `@~/.claude/gsd-core/references/test-doubles.md` — dummy/stub/spy/mock/fake taxonomy; fake-at-ports; never assert on stubs; the mockable-seam allow-list.
- `@~/.claude/gsd-core/references/test-containers.md` — real DBs/services via Testcontainers (singleton pattern, pinned tags, CI/Ryuk).
- `@~/.claude/gsd-core/references/db-test-isolation.md` — parallel-safe DB isolation (template DB, db/schema-per-worker, txn rollback).
- `@~/.claude/gsd-core/references/auth-in-tests.md` — authenticate-once/storageState, token minting, multi-role, JWT vs cookie, one-account-per-worker.
- `@~/.claude/gsd-core/references/realistic-test-data.md` — synthetic factories by default; anonymized/subset dumps only.
- `@~/.claude/gsd-core/references/e2e-tiering.md` — persistent smoke vs transient e2e; keep e2e lean.
- `@~/.claude/gsd-core/references/certification.md` — the certification ladder + probe, the trust doctrine, the brief, and the substrate honesty tables (auth test modes, email vendor modes, LLM shape-not-content).
- `@~/.claude/gsd-core/references/contract-testing.md` — for an external dependency you can't run/seed in CI: consumer-driven contracts + provider verification (a verified contract, not a mock).
- `@~/.claude/gsd-core/references/flaky-test-checklist.md` — fixed clock, seeded RNG, poll-don't-sleep, per-worker isolation.

## Anti-patterns

- Picking a shape (pyramid/diamond/trophy) as an input instead of letting architecture determine it.
- Mockist/solitary tests coupled to implementation → brittle, break on refactor.
- Coverage % as a goal; duplicate coverage across levels.
- A fat, slow e2e suite as the primary safety net (ice-cream cone).
- `float` for money.
