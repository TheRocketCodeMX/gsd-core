# Testing Strategy: Certification & Suite Health — Design Spec

**Date:** 2026-08-10
**Status:** Approved design, pending implementation plan
**Grounding:** `.superpowers/sdd/testing-smoke-audit.md` (file-level audit), `.superpowers/sdd/agentic-qa-research.md` (primary-source research, excluded-claims appendix), `.superpowers/sdd/orca-wsl-dogfood.md` (live WSL2 dogfood incl. the codex-instrumentation security finding), CTO field practice (build with GSD/Claude Code, certify every feature end-to-end with Codex driving a real browser).

---

## 1. Problem

The testing strategy is production-validated EXCEPT its top layer. Today the smoke/final-validation job centers on scripted Playwright-class e2e, which is slow, flaky, and — the deeper defect — **never tests the app in real conditions**. The corpus acknowledges flakiness only as a reason to make e2e *smaller*; the claim that a hermetic ephemeral-env run is not real-conditions validation appears nowhere (audit §3). Meanwhile agentic browser/computer-use tools exist and are field-proven for exactly this job. Additionally: the strategy never measures the one number that governs pipeline shape (suite wall clock), has no test-execution-speed doctrine, no re-evaluation mechanism as suites grow, and no path from a validation failure back into coverage ("what test did we miss" — TEST-STRATEGY.md has ~15 readers and one writer).

## 2. Doctrine

> **The top of the pyramid is two different jobs.**
> **Gate** — deterministic, every commit, CI. Scripts gate.
> **Certify** — realistic, per-change, agentic, human-adjacent. **Never CI.**
> A hermetic ephemeral-environment run is a regression check, not a validation of the app in the world.

Supporting doctrine, all primary-sourced (research Part 2):
- Agentic QA cannot be a CI gate: vendors disclaim precision, the safety model is human confirmation, the capable tools are desktop-session-bound, and a gate must fail only when the app is broken — an agent adds a second failure source.
- **Agents author and heal; scripts gate**: Microsoft (Playwright-MCP) and OpenAI (Codex frontend guidance) independently steer coding agents to Playwright skills; Playwright ships first-party planner/generator/**healer** agents (`--loop=claude|codex`). The scripted gate becomes an agent-maintained artifact.
- **Builder ≠ certifier**: the certifying agent should not be the implementing agent (fresh eyes, different model family, no shared blind spots). Certification capability is a *project* fact, not a *machine* fact — it may live on a different machine/tool than the builder.

## 3. The Gate (scripted, agent-maintained)

The 3–7 persistent smoke flows stay in CI, unchanged in count and budget (≤10-min PR gate; the CI/CD ladder's C-rungs are unchanged). What changes: they are **agent-authored and agent-healed** per the vendor-converged workflow — the strategy names the planner→generator→healer loop as the maintenance mechanism and records the healer's own guardrail (it must refuse to "fix" a test when the app is genuinely broken). Hand-maintained smoke scripts are the fallback where no authoring agent exists.

## 4. The Certification Ladder (probe-detected, recorded in TEST-STRATEGY)

New TEST-STRATEGY section `## Certification` records the capability tier, the probe results, and the chosen mechanism:

| Tier | What | Examples |
|---|---|---|
| **CERT-2** | Dedicated certifier application; certification brief handed over; builder ≠ certifier enforced naturally | Codex desktop, Claude Desktop (native computer/browser use), onorca |
| **CERT-1** | The building runtime drives a browser itself; weaker separation, still real-conditions | Claude+Chrome, MCP-Playwright-class tools, orca CLI |
| **CERT-1 (limited)** | Probe shows partial capability — inspection-grade only (navigate/snapshot/fill/wait/console yes; click-through/screenshot no) | orca headless under Xvfb/WSL2 (dogfood-verified) |
| **CERT-0** | None. Human UAT as today + the scripted smoke set, stated as the fallback, not the strategy | headless CI boxes, locked-down machines |

**Detection probes; it never merely finds binaries** (dogfood-mandated): observable checks first (`command -v codex/orca`, MCP browser tools in the runtime config, `claude` Chrome availability, WSL/headless detection, `playwright.config.*`), then — for any driver found — a **4-command live probe** (goto / snapshot / click-roundtrip against a throwaway page / screenshot) whose per-operation results are recorded. **One question** covers only what is undetectable (desktop apps on other machines: "do you have Codex desktop / Claude Desktop / onorca available for certification?").

**Third-party certifier trust doctrine (mandatory, evidence-backed):** first launch of any third-party certifier tool happens in an **isolated HOME**, followed by an instrumentation audit (what did it write? which agent CLIs did it touch?) before it is granted the real environment. Justification recorded in the reference: the onorca dogfood found first-launch silent instrumentation of the installed codex CLI (8 hooks + self-granted trust hashes, zero consent). Tool stance: **point, don't prescribe** — onorca is named as the lowest-friction capability acquisition with the trust caveat; no install prescriptions until a tool earns default status.

## 5. Certification in the loop (required, not offered)

- Config: `workflow.certification: required | offer | off`, **default `required`**.
- Scope honesty: phases with no user-facing surface auto-skip with a **recorded** `certification: N/A — no user-facing change` (never silent). On CERT-0, the requirement is satisfied by human UAT — the invariant is "certification happens," not "an agent does it."
- **Where:** a new capability-gated section in `verify-work` **before UAT** (audit-selected slot: assembled from the existing `automated-ui-verification` pattern — detect → auto-resolve what the agent can prove → escalate judgment/auth to the human). The verifier's "always needs human" list (user-flow completion, real-time behavior, external-service integration, error-message clarity) is the work being upgraded.
- **The brief is the canonical artifact**: generated from UAT items + the capsule's `## What Done Looks Like`; certifier-agnostic, human-readable. When a *scriptable* driver was probed capable, an executable starter script is ALSO emitted from the brief (accelerant, never canonical).
- **Evidence schema**: new `kind: agentic_certification` added to the SUMMARY evidence enum and the UAT coverage classifier (audit finding: without it, agentic evidence can never auto-pass). Evidence refs: transcript, screenshots (where capable), console/network captures.
- Optional `ship:pre` milestone-level certification gate (secondary slot).
- OAuth/auth moments and CAPTCHAs always escalate to the human (one-time auth, persisted session — §6.4).

## 6. The Operational Substrate (four named policies)

TEST-STRATEGY gains a `## Certification substrate` section; `templates/user-setup.md` is the operational artifact (audit: it already carries env-var/account/verification structure with a PLAN-frontmatter trigger).

1. **Seed test accounts** — first-class artifacts: an idempotent seed script, role-tagged accounts documented in TEST-STRATEGY, credentials in the env/secret store (agent-usable, never in the repo).
2. **Email safety** — sandbox catcher by default (Mailpit-class) or a **verified** provider test mode; the reference ships the vendor honesty table from the research (modes differ in kind: Resend has none — magic recipients only; Mailgun/Postmark still bill/count; SendGrid validates free). Real recipients only when deliverability IS the feature, recorded as such.
3. **LLM integrations** — smoke/certification uses **real calls** (the integration is the thing under test): dedicated test key with a spend cap, configurable pinned model (cheap-but-representative tier), transcript captured as evidence, and — per Anthropic's own determinism disclaimer — **assertions on shape, never content**. Stubs remain correct for rate-limited vendors and for deterministic unit/integration tiers.
4. **OAuth/Clerk-class auth** — provider test modes where verified (the reference records the verified story per provider); otherwise the formalized field pattern: **one-time human auth, persisted session** (storage-state; gitignored; hygiene notes), agent certifies the authed flows and inspects the implementation. "Ask the user to auth once" is documented as an honest, first-class answer.

## 7. The Feedback Loop (made mechanical)

Certification/UAT failure triggers a **coverage-gap step**: "which fast test was missing?" → routes to `add-tests` / `plan-phase --gaps` AND appends the answer to TEST-STRATEGY (which gains its missing update path — today it has exactly one writer). The principle recorded in doctrine: certification catches it once; the pyramid catches it forever.

## 8. Suite Health (born fast + re-evaluated by trigger)

### 8.1 Born-fast defaults
A new strategy step + reference section: testcontainers **reuse is local-only** (its own docs disqualify CI usage — verbatim-cited); CI levers are container-per-suite, image/layer caching, current framework APIs (the reference maintains a per-stack checklist with **current** APIs — vitest 4 pool model, cargo nextest, pytest-xdist — explicitly non-exhaustive, class-based); no invented per-test budgets (none exist in primary sources).

### 8.2 The four triggers (trend + absolutes)
Recorded per milestone in a TEST-STRATEGY `## Suite health` table (test_count, wall_clock, ms/test, containers_started, fix-class of last tune-up):

| Trigger | Signal | Fires |
|---|---|---|
| **T1 — tier budget breach** | dev-loop tier >~90s local; PR gate >10 min (=CI ladder C1-a) | **immediately** (TDD ergonomics emergency) |
| **T2 — ms/test trend** | cost-per-test >~25% above milestone baseline (structural regression: config/setup/cache/serialization) | tune-up scheduled at milestone close |
| **T3 — container churn** | containers-started growing faster than suite count | tune-up scheduled at milestone close |
| **T4 — backstop** | suite grew >~40% since last tune-up and none happened | tune-up scheduled at milestone close |

Flat ms/test + rising total = volume, not regression → remedy is tiering/sharding (C1), not tuning. The distinction is stated in the reference.

### 8.3 Capture → compare → schedule (existing machinery only)
- **Capture at execution:** the executor records `{test_count, wall_clock, containers_started}` into SUMMARY frontmatter (same pattern as upstream's effort-estimate calibration: executor records actuals, downstream computes).
- **Compare at phase end:** the transition step runs the one-line threshold check against the baseline table.
- **Schedule:** T1 fires an immediate todo/capture with the tune-up flow attached; T2/T3/T4 schedule at milestone close. No new daemons, no CI plumbing.

### 8.4 The tune-up flow (strategy-governed, four ordered passes)
A phase-shaped flow (mode of the testing machinery). Order is doctrine: config before tests; tests audited against the strategy, never merely "made faster."
1. **Profile** — slowest files, setup-vs-test split, container lifecycle map. Evidence first.
2. **Config/cache pass** — the per-stack current-API checklist (predictable half).
3. **Suite audit against the strategy** — implementation-detail tests (strategy violation first, perf second), duplicated coverage across tiers (push down the pyramid where the strategy permits), obsolete tests, over-broad shared fixtures, accidental serialization. Every change justified by the strategy doc.
4. **Re-baseline** — re-measure, write the new Suite-health row, **record the fix-class** (config-drift vs test-debt) so the strategy learns the project's failure mode over time.

## 9. Untouched (production-validated core)

TDD, behavior-not-implementation, the coverage philosophy, e2e-tiering, the ≤10-min PR budget, the flaky canon (quarantine-not-retry), the CI/CD C/D rungs. The CI execution map's smoke row keeps its meaning; only its maintenance mechanism (agent-healed) and its relationship to certification change.

## 10. Validation

- Contract tests: ladder/probe/brief/evidence-kind structures pinned (per the cicd-rung-ladder precedent); schema round-trips for `agentic_certification`; suite-health capture/compare logic unit-tested; probe recorder tested against recorded capability maps (incl. the limited-CERT-1 shape from the dogfood).
- Realistic validation: a live certification run through the new verify-work section on a fixture app using an available driver (orca CLI inspection-grade on this machine; the brief/scripting path exercised); the tune-up flow driven once against a deliberately-degraded fixture suite; a CERT-0 walk proving graceful degradation to today's UAT.
- Full suites: `test:unit` AND `test:install` (the PR-49 lesson) with all-section evidence.

## 11. Implementation shape

- **Fork-owned edits:** `gsd-core/workflows/testing-strategy.md` (+ new steps), `gsd-core/references/testing-strategy*.md` (+ new certification/substrate/suite-health references), `gsd-core/templates/test-strategy.md` (Certification + Substrate + Suite-health sections), `templates/user-setup.md` extension, the tune-up flow file, learn-catalog touchpoint.
- **Marked patches (upstream-shared):** `verify-work.md` (certification section before UAT), `templates/summary.md` (evidence kind + suite-metrics frontmatter), the UAT coverage classifier, `transition.md` (compare step), executor capture instruction, config schema (`workflow.certification`). Every patch manifested (FORK-PATCHES/FORK-DELTA) in-task.
- **Wave-2/3 obligation (tracked, from Wave 1 review N3):** refresh `commands/gsd/testing-strategy.md` + the emitted `skills/gsd-testing-strategy/SKILL.md` mirrors ("How it works" list, Output sentence, success-criteria bullets) to the certification-era scope in the wave that touches emitted skills — expect an emitted-drift ack.
- Changeset type Changed (minor). Branch off post-alignment `next`.
- Follow-ups queued, not in scope: courtesy reports to stablyai (4 findings), fork issue #47 (layer verification) untouched by this work.
