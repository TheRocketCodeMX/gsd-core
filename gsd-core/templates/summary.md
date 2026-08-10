# Summary Template

Template for `.planning/phases/XX-name/{phase}-{plan}-SUMMARY.md` - phase completion documentation.

---

## File Template

```markdown
---
phase: XX-name
plan: YY
subsystem: [primary category: auth, payments, ui, api, database, infra, testing, etc.]
tags: [searchable tech: jwt, stripe, react, postgres, prisma]

# Dependency graph
requires:
  - phase: [prior phase this depends on]
    provides: [what that phase built that this uses]
provides:
  - [bullet list of what this phase built/delivered]
affects: [list of phase names or keywords that will need this context]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: [chars/4 over files actually changed]
  tasks: [tasks completed]
  commits: [commits made]

# Suite metrics — recorded ONLY by the run that actually executed the project's whole
# test suite. OMIT the whole block otherwise; see <suite_metrics_guidance> below.
suite-metrics:
  test_count: [tests the runner itself reported]
  wall_clock: [m:ss — measured, never estimated]
  containers_started: [N from Testcontainers/docker output where visible, else —]

# Tech tracking
tech-stack:
  added: [libraries/tools added in this phase]
  patterns: [architectural/code patterns established]

key-files:
  created: [important files created]
  modified: [important files modified]

key-decisions:
  - "Decision 1"
  - "Decision 2"

patterns-established:
  - "Pattern 1: description"
  - "Pattern 2: description"

requirements-completed: []  # REQUIRED — Copy ALL requirement IDs from this plan's `requirements` frontmatter field.

deviations:  # structured mirror of ## Deviations from Plan — REQUIRED whenever that section is non-empty
  - rule: "2"          # deviation rule number
    what: "added missing config validation"
    why: "plan assumed it existed"

# Coverage metadata (#1602) — one entry per shipped deliverable. Drives DETERMINISTIC UAT routing in verify-work.
# OMIT this whole block for legacy/prose-only SUMMARYs — verify-work then falls back to the ## Accomplishments bullets
# (byte-identical behavior for un-migrated phases). See <coverage_guidance> below for the contract.
coverage:
  - id: D1
    description: "[deliverable in human-readable form — what would have been a prose ## Accomplishments bullet]"
    requirement: "[REQ-ID from this plan's `requirements`, or omit if none]"
    verification:
      - kind: unit            # unit | integration | e2e | automated_ui | agentic_certification | manual_procedural | other
        ref: "[tests/path.test.ts#test name | playwright:shot.png | command invocation]"
        status: pass          # pass | fail | unknown — from the latest run
    human_judgment: false     # REQUIRED boolean. false => may auto-pass IF every verification status is `pass`.
  - id: D2
    description: "[a deliverable that needs a human to sign off]"
    verification: []
    human_judgment: true
    rationale: "[REQUIRED when human_judgment: true — why automation is insufficient]"

# Metrics
duration: Xmin
completed: YYYY-MM-DD
status: complete
---

# Phase [X]: [Name] Summary

**[Substantive one-liner describing outcome - NOT "phase complete" or "implementation finished"]**

## Performance

- **Duration:** [time] (e.g., 23 min, 1h 15m)
- **Started:** [ISO timestamp]
- **Completed:** [ISO timestamp]
- **Tasks:** [count completed]
- **Files modified:** [count]

## Accomplishments
- [Most important outcome]
- [Second key accomplishment]
- [Third if applicable]

## Task Commits

Each task was committed atomically:

1. **Task 1: [task name]** - `abc123f` (feat/fix/test/refactor)
2. **Task 2: [task name]** - `def456g` (feat/fix/test/refactor)
3. **Task 3: [task name]** - `hij789k` (feat/fix/test/refactor)

**Plan metadata:** `lmn012o` (docs: complete plan)

_Note: TDD tasks may have multiple commits (test → feat → refactor)_

## Files Created/Modified
- `path/to/file.ts` - What it does
- `path/to/another.ts` - What it does

## Decisions Made
[Key decisions with brief rationale, or "None - followed plan as specified"]

## Deviations from Plan

[If no deviations: "None - plan executed exactly as written"]

[If deviations occurred:]

### Auto-fixed Issues

**1. [Rule X - Category] Brief description**
- **Found during:** Task [N] ([task name])
- **Issue:** [What was wrong]
- **Fix:** [What was done]
- **Files modified:** [file paths]
- **Verification:** [How it was verified]
- **Committed in:** [hash] (part of task commit)

[... repeat for each auto-fix ...]

---

**Total deviations:** [N] auto-fixed ([breakdown by rule])
**Impact on plan:** [Brief assessment - e.g., "All auto-fixes necessary for correctness/security. No scope creep."]

## Issues Encountered
[Problems and how they were resolved, or "None"]

[Note: "Deviations from Plan" documents unplanned work that was handled automatically via deviation rules. "Issues Encountered" documents problems during planned work that required problem-solving.]

## User Setup Required

[If USER-SETUP.md was generated:]
**External services require manual configuration.** See [{phase}-USER-SETUP.md](./{phase}-USER-SETUP.md) for:
- Environment variables to add
- Dashboard configuration steps
- Verification commands

[If no USER-SETUP.md:]
None - no external service configuration required.

## Next Phase Readiness
[What's ready for next phase]
[Any blockers or concerns]

---
*Phase: XX-name*
*Completed: [date]*
```

<frontmatter_guidance>
**Purpose:** Enable automatic context assembly via dependency graph. Frontmatter makes summary metadata machine-readable so plan-phase can scan all summaries quickly and select relevant ones based on dependencies.

**Fast scanning:** Frontmatter is first ~25 lines, cheap to scan across all summaries without reading full content.

**Dependency graph:** `requires`/`provides`/`affects` create explicit links between phases, enabling transitive closure for context selection.

**Subsystem:** Primary categorization (auth, payments, ui, api, database, infra, testing) for detecting related phases.

**Tags:** Searchable technical keywords (libraries, frameworks, tools) for tech stack awareness.

**Key-files:** Important files for @context references in PLAN.md.

**Patterns:** Established conventions future phases should maintain.

**Population:** Frontmatter is populated during summary creation in execute-plan.md. See `<step name="create_summary">` for field-by-field guidance.

**Status (#2830):** `status: complete` is the default — the plan finished. Use `status: halted` instead when the plan reached a designed stop (a gate failure, a spike concluding without expanding into the full build, or any other intentional non-completion) and intentionally left tasks unfinished. `halted` is machine-read: any plan whose `depends_on` (directly or transitively) names a halted plan is reported as blocked, not offered to the executor, until the halt is resolved and re-summarized as `complete`.

**Deviations:** `deviations:` is a structured mirror of the `## Deviations from Plan` prose section. Frontmatter-only readers (the default-budget planner) see ONLY this — the prose section is invisible to them; an empty prose section means this key is omitted.
</frontmatter_guidance>

<coverage_guidance>
**Purpose (#1602):** The `coverage:` block is a per-deliverable Requirements Traceability Matrix. It lets `verify-work`'s `extract_tests` step route deliverables DETERMINISTICALLY — auto-passing those proven by passing tests and reserving human UAT for genuine judgment — instead of re-deriving coverage from prose. Consumed via `gsd-tools uat classify-coverage --summary <SUMMARY>`.

**Field semantics:**

| Field | Purpose |
|---|---|
| `id` | Stable identifier (`D1`, `D2`…) for cross-referencing from UAT.md and audit reports. Must be unique within the SUMMARY. |
| `description` | The deliverable in human-readable form — what would have been a prose bullet. |
| `requirement` | Links back to a REQUIREMENTS.md REQ-ID (joins `requirements-completed`). Optional. |
| `verification[].kind` | Enum: `unit \| integration \| e2e \| automated_ui \| agentic_certification \| manual_procedural \| other`. `agentic_certification` is a certification run against a real environment (`certification.md`) — its `ref` is the run's evidence bundle (transcript, plus screenshots/console captures where the driver was probed capable), never a test path. It buys admission to this table and nothing else: the deterministic contract below is unchanged. |
| `verification[].ref` | Test path + descriptor (`file#test name`), Playwright screenshot ref, or command invocation. Required per entry. |
| `verification[].status` | `pass \| fail \| unknown` — populated from the latest test run. |
| `human_judgment` | Explicit boolean; REQUIRED. `true` always routes to a human. |
| `rationale` | REQUIRED when `human_judgment: true`. The audit trail for why automation is insufficient. |

**Deterministic contract (what the classifier does):**
- A deliverable auto-passes (no human prompt) **only** when `human_judgment: false` AND `verification` is non-empty AND every `verification[].status` is `pass`. This is the narrow, fully-proven case.
- **Everything else is presented to a human** — `human_judgment: true`, an empty `verification:`, any non-`pass`/`unknown` status, or any schema error. A false-negative is a redundant prompt (the status quo); a false-positive ships a bug UAT existed to catch.
- **Fail-safe default:** if you cannot determine coverage for a deliverable, you MUST set `human_judgment: true` with `rationale: "Coverage not determined at authoring time — verifier must classify"`. Never leave a deliverable's `human_judgment` empty, and never set it `false` just to skip the prompt — auto-pass additionally requires a passing `verification` entry, so the flag alone cannot skip the human.
- `coverage: []` means "no deliverables to classify" (the single-confirmation path). OMITTING the block entirely means "legacy" — `verify-work` falls back to prose `## Accomplishments` extraction unchanged.
</coverage_guidance>

<suite_metrics_guidance>
**Purpose (suite health):** `suite-metrics:` is the *measured* half of the suite-health loop. The run that executed the project's whole test suite records what it observed; `transition`'s `suite_health_compare` step reads the newest SUMMARY's block against the `## Suite health` baseline row in `.planning/TEST-STRATEGY.md` and evaluates the T1–T4 triggers from `references/test-strategy.md § Suite health`. Executor records actuals, downstream computes — the same division as `actuals:` above.

**Who writes it:** whoever ran the suite. In a phase run that is `execute-phase`'s post-merge test gate (`execute-phase/steps/post-merge-gate.md`, Step C), which measures the run it already performs. In a standalone plan whose own `<verification>` ran the whole suite, `execute-plan`'s `create_summary` writes it.

| Field | Contract |
|---|---|
| `test_count` | The count the runner itself reported. Never a grep, never a guess. |
| `wall_clock` | `m:ss`, measured around the run. Never estimated, never a budget. |
| `containers_started` | From Testcontainers/docker output where visible, else `—`. `—` is an honest answer; `0` is a claim. |

**ms/test is deliberately NOT a field here.** It is derived at compare time (`wall_clock ÷ test_count`) so one number can never disagree with itself. Recording a derived value invites drift, and the trigger table reads the derived one.

**Omit, never zero.** If this run did not execute the suite — no runner detected, the gate timed out, the plan only ran a subset — **omit the `suite-metrics:` block entirely**. An absent block means "not measured here" and the compare skips silently. A `0` (or an invented row) is a measurement claim, and it moves a trigger.
</suite_metrics_guidance>

<one_liner_rules>
The one-liner MUST be substantive:

**Good:**
- "JWT auth with refresh rotation using jose library"
- "Prisma schema with User, Session, and Product models"
- "Dashboard with real-time metrics via Server-Sent Events"

**Bad:**
- "Phase complete"
- "Authentication implemented"
- "Foundation finished"
- "All tasks done"

The one-liner should tell someone what actually shipped.
</one_liner_rules>

<example>
```markdown
# Phase 1: Foundation Summary

**JWT auth with refresh rotation using jose library, Prisma User model, and protected API middleware**

## Performance

- **Duration:** 28 min
- **Started:** 2025-01-15T14:22:10Z
- **Completed:** 2025-01-15T14:50:33Z
- **Tasks:** 5
- **Files modified:** 8

## Accomplishments
- User model with email/password auth
- Login/logout endpoints with httpOnly JWT cookies
- Protected route middleware checking token validity
- Refresh token rotation on each request

## Files Created/Modified
- `prisma/schema.prisma` - User and Session models
- `src/app/api/auth/login/route.ts` - Login endpoint
- `src/app/api/auth/logout/route.ts` - Logout endpoint
- `src/middleware.ts` - Protected route checks
- `src/lib/auth.ts` - JWT helpers using jose

## Decisions Made
- Used jose instead of jsonwebtoken (ESM-native, Edge-compatible)
- 15-min access tokens with 7-day refresh tokens
- Storing refresh tokens in database for revocation capability

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added password hashing with bcrypt**
- **Found during:** Task 2 (Login endpoint implementation)
- **Issue:** Plan didn't specify password hashing - storing plaintext would be critical security flaw
- **Fix:** Added bcrypt hashing on registration, comparison on login with salt rounds 10
- **Files modified:** src/app/api/auth/login/route.ts, src/lib/auth.ts
- **Verification:** Password hash test passes, plaintext never stored
- **Committed in:** abc123f (Task 2 commit)

**2. [Rule 3 - Blocking] Installed missing jose dependency**
- **Found during:** Task 4 (JWT token generation)
- **Issue:** jose package not in package.json, import failing
- **Fix:** Ran `npm install jose`
- **Files modified:** package.json, package-lock.json
- **Verification:** Import succeeds, build passes
- **Committed in:** def456g (Task 4 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both auto-fixes essential for security and functionality. No scope creep.

## Issues Encountered
- jsonwebtoken CommonJS import failed in Edge runtime - switched to jose (planned library change, worked as expected)

## Next Phase Readiness
- Auth foundation complete, ready for feature development
- User registration endpoint needed before public launch

---
*Phase: 01-foundation*
*Completed: 2025-01-15*
```
</example>

<guidelines>
**Frontmatter:** MANDATORY - complete all fields. Enables automatic context assembly for future planning.

**One-liner:** Must be substantive. "JWT auth with refresh rotation using jose library" not "Authentication implemented".

**Decisions section:**
- Key decisions made during execution with rationale
- Extracted to STATE.md accumulated context
- Use "None - followed plan as specified" if no deviations

**After creation:** STATE.md updated with position, decisions, issues.
</guidelines>
