<purpose>
Recommend a test strategy matched to the architecture: WHAT to test, at WHICH level, HOW MUCH. The test shape is an OUTPUT of the architecture decision (rich core → unit; CRUD-over-DB → integration), never a pyramid/diamond picked up front. Runs after recommend-architecture, before planning. Extends the project's existing TESTING-STANDARDS.md rigor — never weakens it. Produces `.planning/TEST-STRATEGY.md`, consumed by add-tests, execute-phase, and plan-phase.
</purpose>

<required_reading>
@~/.claude/gsd-core/references/test-strategy.md
@~/.claude/gsd-core/templates/test-strategy.md
</required_reading>

<process>

## Step 1: Initialize

```bash
_GSD_SHIM_NAME="gsd-tools.cjs"; _GSD_RUNTIME_ROOT="${RUNTIME_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"; GSD_TOOLS="${_GSD_RUNTIME_ROOT}/gsd-core/bin/${_GSD_SHIM_NAME}"; if [ -f "$GSD_TOOLS" ]; then gsd_run() { node "$GSD_TOOLS" "$@"; }; elif [ -f "${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="${_GSD_RUNTIME_ROOT}/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; elif command -v gsd-tools >/dev/null 2>&1; then GSD_TOOLS="$(command -v gsd-tools)"; gsd_run() { "$GSD_TOOLS" "$@"; }; elif [ -f "$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}" ]; then GSD_TOOLS="$HOME/.claude/gsd-core/bin/${_GSD_SHIM_NAME}"; gsd_run() { node "$GSD_TOOLS" "$@"; }; else echo "ERROR: gsd-tools.cjs not found at $GSD_TOOLS and gsd-tools is not on PATH. Run: npx -y @therocketcode/gsd-core@latest --claude --local" >&2; exit 1; fi
COMMIT_DOCS=$(gsd_run query config-get commit_docs 2>/dev/null || echo "true")
RESPONSE_LANG=$(gsd_run query config-get response_language 2>/dev/null || true)
TDD_MODE=$(gsd_run query config-get workflow.tdd_mode 2>/dev/null || echo "false")
ls .planning/PROJECT.md >/dev/null 2>&1 && echo "PROJECT_FOUND" || echo "NO_PROJECT"
ls .planning/adr/*.md >/dev/null 2>&1 && echo "HAS_ADR" || echo "NO_ADR"
ls .planning/TEST-STRATEGY.md >/dev/null 2>&1 && echo "EXISTS" || echo "NEW"
```

**If `NO_PROJECT`:** Stop — "No project found. Run /gsd:new-project first." Exit.

**If `RESPONSE_LANG` non-empty:** all user-facing text in that language; keep technical terms, code, and level names (small/medium/large, unit/integration/e2e) in English.

**Text mode** (`--text` OR `workflow.text_mode: true`): replace every `AskUserQuestion` with a plain-text numbered list.

**If `EXISTS` and not `--auto`:** ask Update / View / Skip (header "Strategy"). On Skip: exit ("Existing TEST-STRATEGY.md preserved."). On View: show then Update/Skip.

## Step 2: Load context

```bash
cat .planning/PROJECT.md 2>/dev/null || true
cat .planning/REQUIREMENTS.md 2>/dev/null || true
cat .planning/DOMAIN-MODEL.md 2>/dev/null || true
cat .planning/adr/*.md 2>/dev/null || true
cat TESTING-STANDARDS.md 2>/dev/null || true
```

**Read `@~/.claude/gsd-core/references/test-strategy.md` now** — it defines behavior-over-implementation, sociable-by-default, test-once-at-cheapest-level, shape-follows-architecture (size axis), the gnarly-bits list, persistent-vs-transient e2e, and coverage-as-floor + mutation.

**If `NO_ADR`:** tell the user "No architecture decision found — I'll ask briefly. (Consider `/gsd:recommend-architecture` first.)" Then, per major subdomain, get its rung (Transaction Script / Domain Model / Hexagonal / CQRS / Event Sourcing) and whether it's DB/integration-bound. Otherwise extract each subdomain's rung from the ADR.

## Step 3: Derive the shape FROM the architecture (per subdomain)

The shape is an **output**, never a target you pick. For each subdomain, map its architecture rung → primary test level (use the reference's table):
- **Domain Model / rich core** → more **small (unit)** tests of the domain logic through its public API; **sociable** (real collaborators), mock only at ports.
- **Transaction Script / CRUD-over-DB** → more **medium (integration)** tests against a real DB (see `test-containers` / `db-test-isolation`); few unit tests.
- **Hexagonal core** → pure domain needs no doubles; test the application core with in-memory **fakes** at its ports (see `test-doubles.md`); integration-test the adapters real.
- **Many external integrations** → medium integration tests at the ports; contract tests where a 3rd-party can't be seeded.
- **Bought / off-the-shelf (Generic)** → do NOT test the vendor's internals; thin integration smoke at your own adapter seam only.

Record subdomain → primary level + the rung that justifies it. Do NOT announce a chosen "pyramid/diamond" — let the distribution emerge. If the user asks to pick a shape, redirect: the architecture already determines where the behavior lives. If the user asks to mock the database or all collaborators, reject it: integration tests run against a **real** DB (see `test-containers` / `db-test-isolation`); mock ONLY at external ports — never the DB or in-process collaborators. If the user proposes mocking a 3rd-party API in integration tests and calling it covered, reject that too: a mock proves nothing about the real provider — use a verified contract, or, for vendors who won't run verification, the schema + recorded-fixtures + sandbox-smoke fallback (see `contract-testing.md`).

## Step 4: Gnarly bits + what NOT to test

From DOMAIN-MODEL + REQUIREMENTS, identify the **pure, logic-dense** code that earns unit tests: money/currency (**integer minor units or exact decimal — never float**), complex conditionals/**state machines**, **parsers**, **algorithms**, pure functions. List them as unit-test targets.

State what NOT to test: framework/library code, trivial getters/setters, mock behavior; and the rule — **each behavior tested once, at the cheapest level** (no duplicate unit+integration+e2e coverage of the same behavior).

If existing code already violates a standard you are recording (e.g. money stored as floats), flag it in TEST-STRATEGY.md's Notes as a **pre-test remediation task** (refactor first) — never write tests that enshrine the violating representation.

## Step 5: Persistent critical-path e2e (the smoke list)

Ask (AskUserQuestion, header "E2E", or a text list): "Which flows are so essential they must be smoke-tested on every CI run? (e.g., auth, payment, the core journey)." Capture 3–7 → the **persistent** smoke suite (keep it lean, <5 min). Note that everything else is **transient** (throwaway dev-loop e2e, demoted to integration once covered cheaper). If the user asks to e2e every feature/edge case, redirect: that is the ice-cream cone — cap the persistent suite at 3–7 critical journeys (the <5 min budget wins over any test count) and push edge cases down to unit/integration.

## Step 6: Coverage / mutation / TDD stance

- **Coverage = floor, not a target.** Record that. If the user demands a coverage *target* (e.g. 100%), reframe it as a floor and warn that an excessively high floor forces low-value tests of trivial glue — the real quality signal is **mutation score** on the gnarly bits. **Mutation testing (Stryker)** applies to the critical modules (the gnarly bits from Step 4 + the core domain logic).
- **TDD stance:** mandate behavior-level tests + **small uniform increments** + a regression floor with a real RED step. Test-first vs test-after is the `workflow.tdd_mode` knob (currently **${TDD_MODE}**) — surface it; don't force test-first as dogma. **Exception:** where `TESTING-STANDARDS.md` mandates a red-first/test-first phase for a module, that project standard governs and overrides the knob there.
- **If `TESTING-STANDARDS.md` exists:** confirm its standards remain in force, and **carry any project-specific standards beyond the reference's defaults (e.g. clock-seam concurrency, no-elapsed-time assertions, delete-bad-tests, the `fast-check` property tier) into TEST-STRATEGY.md's Notes** so downstream skills see them. **If it's absent (greenfield):** adopt the reference's defaults (real-code-only, no vacuous assertions, typed surface, `fast-check` property tier, Stryker ≥80 on critical modules) as the project baseline, write them into TEST-STRATEGY.md's Notes as the initial standards, and offer to generate `TESTING-STANDARDS.md` from them.

## Step 7: Write TEST-STRATEGY.md

Render `@~/.claude/gsd-core/templates/test-strategy.md` (fill `[DATE]`, `[PROJECT_TITLE]`, `[ADR-NNNN]`). Fill the per-subdomain level table, the gnarly-bits list, what-not-to-test, the integration note, the persistent/transient e2e split, coverage/mutation, the **CI execution map** (which tiers run at the PR gate vs merge-to-main vs nightly — it feeds `/gsd:cicd-strategy`), and TDD stance (render `tdd_mode=false` as "off", `true` as "on").

Write to `.planning/TEST-STRATEGY.md`.

## Step 8: Commit

```bash
if [ "$COMMIT_DOCS" = "true" ]; then
  gsd_run query commit "docs: add test strategy (shape follows architecture)" --files .planning/TEST-STRATEGY.md
else
  echo "TEST-STRATEGY.md written but not committed (commit_docs is false)."
fi
```

## Step 9: Wrap up

Display:
```
TEST-STRATEGY.md written — test shape set to follow the architecture.

  Per-subdomain levels: [core → unit] · [crud → integration] ...
  Unit-test targets (gnarly bits): [N]
  Persistent e2e smoke: [N] flows
  Coverage = floor; mutation on [critical modules]; TDD = behavior + small increments (test-first: ${TDD_MODE})

Next: /gsd:plan-phase   (plans + /gsd:add-tests will follow this strategy)
```

</process>

<critical_rules>
- **Shape follows architecture.** Derive the level emphasis FROM the architecture rung per subdomain; never pick a pyramid/diamond/trophy as a target.
- **Behavior over implementation; sociable by default.** Test observable behavior through public APIs; mock ONLY at architectural boundaries (ports/external systems).
- **Test each behavior once, at the cheapest level.** No duplicate coverage across unit/integration/e2e.
- **Coverage is a floor, not a target.** Mutation testing proves assertion quality on critical modules.
- **TDD = behavior + small uniform increments + regression floor.** Test-first is a knob, not dogma; keep the RED step.
- **Extend, don't replace** TESTING-STANDARDS.md. Respect `commit_docs` / `response_language`.
</critical_rules>

<success_criteria>
- ADR/SKELETON + DOMAIN-MODEL loaded; shape derived FROM the architecture (not picked)
- Per-subdomain level emphasis recorded with the justifying rung
- Gnarly bits to unit-test identified; what-not-to-test stated; no duplicate coverage
- Persistent e2e smoke list set; transient e2e distinguished
- Coverage-as-floor + mutation targets + TDD stance recorded; TESTING-STANDARDS.md preserved
- TEST-STRATEGY.md written and committed (when commit_docs is true)
- User directed to /gsd:plan-phase
</success_criteria>
