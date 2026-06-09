# Testing Strategy — Shape Follows Architecture

Reference for `/gsd:testing-strategy`. Decides WHAT to test, at WHICH level, and HOW MUCH — matched to the architecture (from the ADR / SKELETON). **Extends, not replaces,** the project's existing rigor in `TESTING-STANDARDS.md` (real-code-only, no-vacuous-assertions, typed surface, `fast-check` property tests, Stryker mutation ≥80%). Recommends; the user decides.

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
| **Hexagonal core** | unit-test the domain in isolation (no mocks — it's pure); integration-test the **adapters** against real systems | the architecture literally separates the two |
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

The quality benefit is real, but the evidence favors **small, uniform increments** over *test-first specifically* (controlled studies found test-first vs test-after didn't differ; granularity did). So **mandate: behavior-level tests + small increments + a regression floor.** Keep the **RED step** (watch a test fail) so tests actually test something. Test-first vs test-after is a **knob** (`workflow.tdd_mode`), not dogma.

## Persistent vs transient E2E

- **Persistent:** a small **smoke / critical-user-journey** suite (auth, payment, core nav) in CI on every PR (<5 min). Keep it lean (≈50–200 well-chosen e2e tests) — e2e is slow/flaky; push coverage down to integration.
- **Transient:** throwaway e2e to validate a freshly-built flow during the dev loop; **not** kept in CI. Once the behavior is covered more cheaply (integration), delete or demote it.

## Output (`TEST-STRATEGY.md`)

- Per subdomain/component: the recommended level emphasis (small/medium/large) + the architecture rung that justifies it.
- The critical-path e2e **smoke list** (persistent).
- What to unit-test (the gnarly bits) and what **not** to test.
- Coverage stance (floor) + where mutation testing applies.
- TDD stance (behavior + small increments; test-first knob).

Feeds `add-tests`, `execute-phase`, and `plan-phase`.

## Extends existing rigor (keep it all)

`TESTING-STANDARDS.md` already enforces real-code-only, no-vacuous-assertions, the typed-surface mandate, `fast-check` property tests for bijective/invariant logic, and Stryker mutation ≥80% on critical modules. This skill adds the **strategic layer** on top — the shape, the what/what-not, the level-per-subdomain. Do not weaken any existing standard.

## Test-infrastructure how-to references (read when writing the tests)

When the strategy calls for real-dependency integration tests, auth, or e2e, load the focused how-to reference:
- `@~/.claude/gsd-core/references/test-containers.md` — real DBs/services via Testcontainers (singleton pattern, pinned tags, CI/Ryuk).
- `@~/.claude/gsd-core/references/db-test-isolation.md` — parallel-safe DB isolation (template DB, db/schema-per-worker, txn rollback).
- `@~/.claude/gsd-core/references/auth-in-tests.md` — authenticate-once/storageState, token minting, multi-role, JWT vs cookie, one-account-per-worker.
- `@~/.claude/gsd-core/references/realistic-test-data.md` — synthetic factories by default; anonymized/subset dumps only.
- `@~/.claude/gsd-core/references/e2e-tiering.md` — persistent smoke vs transient e2e; keep e2e lean.
- `@~/.claude/gsd-core/references/flaky-test-checklist.md` — fixed clock, seeded RNG, poll-don't-sleep, per-worker isolation.

## Anti-patterns

- Picking a shape (pyramid/diamond/trophy) as an input instead of letting architecture determine it.
- Mockist/solitary tests coupled to implementation → brittle, break on refactor.
- Coverage % as a goal; duplicate coverage across levels.
- A fat, slow e2e suite as the primary safety net (ice-cream cone).
- `float` for money.
