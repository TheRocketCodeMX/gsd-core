# FORK-DELTA — what this fork owns on top of upstream

**Base:** upstream `TheRocketCodeMX/gsd-core` v1.4.0 = commit `7eb4d286`. Everything below is `git diff 7eb4d286..HEAD` on `next` (the fork's content source of truth), with pure branding excluded (see *Branding-only*).

**v2.0.0 realignment status (Epic #13):** the `realign/2.0.0` tree is upstream **v1.6.1** (`1c352d1e`) + this delta, re-ported. Entries below are reconciled to that ported reality — features upstream absorbed between v1.4.0 and v1.6.1 are noted as **upstream-absorbed** and no longer tracked as fork patches.

**Rocket capability pack (issue #25):** the fork's three hardcoded gsd-tools command families (`learn`, `project`, `grounding`) and the `workflow.grounding_gate` config key were converted from upstream-file patches into first-party capabilities built on upstream's own ADR-959 extension architecture (`capabilities/learn/`, `capabilities/strategy/`, `capabilities/grounding/` + `src/{learn,grounding,project}-command-router.cts`). `gsd-core/bin/gsd-tools.cjs` and both `gsd-core/bin/shared/config-*.manifest.json` manifests were left carrying **zero** fork patches by that conversion (gsd-tools has since re-acquired exactly one, the `windows-ledger` route arms, and `config-schema.manifest.json` one more, the `config-gates-safety` registration — see the table below; it is an **upstream-PR candidate**, not a fork feature, so the count returns to zero on absorption). Measured FORK-PATCHES entry count: **90 → 85** (−3 gsd-tools entries, −2 config-manifest entries; the new surface is additive files, not patches). A tripwire in `tests/strategy-config-and-marker-contracts.test.cjs` fails loudly if an upstream merge re-introduces a hardcoded `case 'learn'|'project'|'grounding'` that would shadow the capability routers.

This manifest is the safety net for the v2.0.0 Upstream Realignment (Epic #13):

- it tells the realignment **exactly what to restore or re-apply** after re-basing onto a newer upstream, and
- together with the inline `FORK:<feature>` markers and `docs/FORK-PATCHES.json`, it makes any upstream merge that clobbers a fork feature **fail CI loudly** (`tests/fork-delta-manifest.test.cjs`).

**Feature tags** (used by the inline markers and FORK-PATCHES.json):

| Tag | Feature |
|---|---|
| `fidelity` | Source-fidelity + senior-quality contract (engineering-standards, design/mode/rung gates, TEST-INTEGRITY, untrusted-input boundary, AI-test quality) |
| `strategy` | Strategy chain + Mode + Waves 0–5 (discover-product → model-domain → architecture → security/testing/infra/cicd, Strategy Plan, design detection, roadmap elaboration); the `project` command family is capability-owned (`capabilities/strategy/`, issue #25) |
| `grounding` | Source-grounding enforcement (`## Grounding` block, `check.grounding-plan` gate, grounding resolver + index-refresh hook, Sources of Truth); the `grounding` command family + `workflow.grounding_gate` config slice are capability-owned (`capabilities/grounding/`, issue #25) |
| `exploration` | Mandatory parallel phase exploration (scout-codebase doctrine) |
| `dod` | Cross-cutting Definition-of-Done requirements (`[CROSS-CUTTING]`) |
| `learn` | `/gsd-learn` teaching system (catalog, progress, visual server); the `learn` command family is capability-owned (`capabilities/learn/`, issue #25) |
| `seeds` | `--list-seeds` read-only seed browser — **upstream-absorbed** (#722): upstream v1.6.1 ships `list-seeds` natively (gsd-tools case, workflow, capture routing, help rows); only the fork's extra test coverage remains fork-owned |
| `context-monitor` | The `gsd-context-monitor.js` hook — revived as the **calm knowledge-flush nudge** (same mechanism as upstream, opposite tone; part of the `context` capability), plus the removed upstream context-monitor tests |
| `no-context-fork` | Removal of `context: fork` from heavy skills (it breaks subagent spawning) |
| `identity` | Fork identity: npm coordinate, repo slug, legacy-cleanup extension, rider config lines |
| `windows-ledger` | Mechanical closure for upstream's own broken-windows ledger (#1950): a `reason` column on `fixed`, the `amend` verb, the `reconcile` repair verb, and the hardening that followed review (waived-reason guard, duplicate-id rejection, surplus-positional usage errors, disjoint `repaired`/`normalized`, and a `command-exit-zero` ship-gate predicate reading the cross-checked `windows status` in place of the hand-editable-frontmatter comparison). **upstream-PR candidate** — this fixes upstream's feature rather than diverging from it; the delta should DISSOLVE the moment upstream adopts it, so keep the four entries below reviewable as a single portable patch and delete them on absorption |
| `release` | Fork release plumbing: NPM token auth, update-changelog-preview tooling, sync-upstream script. The changeset-payload shipping + dual-layout requires are **upstream-absorbed** (#935/#938: upstream installs `scripts/changeset/` as a sibling of `gsd-core/`, so the repo-relative requires resolve installed) |

A file may carry blocks from more than one feature; it then has one FORK-PATCHES entry **per feature**.

---

## Additive files

Fork-owned wholesale — upstream has no version of these. During realignment, **restore them verbatim** from the fork (`git checkout <fork-ref> -- <path>`). Grouped by feature.

### strategy — discovery/strategy chain (commands, workflows, templates, references, SDK)

- `commands/gsd/cicd-strategy.md`
- `commands/gsd/discover-product.md`
- `commands/gsd/frontend-architecture.md`
- `commands/gsd/infrastructure-strategy.md`
- `commands/gsd/legacy-inventory.md`
- `commands/gsd/model-domain.md`
- `commands/gsd/recommend-architecture.md`
- `commands/gsd/roadmap.md`
- `commands/gsd/security-strategy.md`
- `commands/gsd/testing-strategy.md`
- `gsd-core/references/application-telemetry.md`
- `gsd-core/references/architecture-decision.md`
- `gsd-core/references/auth-in-tests.md`
- `gsd-core/references/brownfield-adaptation.md`
- `gsd-core/references/certification.md`
- `gsd-core/references/cicd-strategy.md`
- `gsd-core/references/contract-testing.md`
- `gsd-core/references/data-environments.md`
- `gsd-core/references/db-test-isolation.md`
- `gsd-core/references/design-ingestion.md`
- `gsd-core/references/domain-modeling.md`
- `gsd-core/references/e2e-tiering.md`
- `gsd-core/references/fe-be-seam.md`
- `gsd-core/references/flaky-test-checklist.md`
- `gsd-core/references/frontend-architecture.md`
- `gsd-core/references/infrastructure-strategy.md`
- `gsd-core/references/product-discovery.md`
- `gsd-core/references/realistic-test-data.md`
- `gsd-core/references/security-posture.md`
- `gsd-core/references/strategy-chain.md`
- `gsd-core/references/strategy-flow.md`
- `gsd-core/references/test-containers.md`
- `gsd-core/references/test-doubles.md`
- `gsd-core/references/test-strategy.md`
- `gsd-core/templates/adr.md`
- `gsd-core/templates/cicd-strategy.md`
- `gsd-core/templates/design-inventory.md`
- `gsd-core/templates/domain-model.md`
- `gsd-core/templates/frontend-architecture.md`
- `gsd-core/templates/infra-strategy.md`
- `gsd-core/templates/legacy-inventory.md`
- `gsd-core/templates/product-brief.md`
- `gsd-core/templates/security-strategy.md`
- `gsd-core/templates/test-strategy.md`
- `gsd-core/workflows/cicd-strategy.md`
- `gsd-core/workflows/discover-product.md`
- `gsd-core/workflows/frontend-architecture.md`
- `gsd-core/workflows/infrastructure-strategy.md`
- `gsd-core/workflows/legacy-inventory.md`
- `gsd-core/workflows/model-domain.md`
- `gsd-core/workflows/plan-phase/modes/strategy-elaboration.md`
- `gsd-core/workflows/recommend-architecture.md`
- `gsd-core/workflows/roadmap.md`
- `gsd-core/workflows/security-strategy.md`
- `gsd-core/workflows/strategy-chain/modes/advance.md`
- `gsd-core/workflows/testing-strategy.md`
- `gsd-core/workflows/verify-work/steps/agentic-certification.md`
- `gsd-core/workflows/testing-strategy/steps/suite-tune-up.md`
- `capabilities/strategy/capability.json`
- `src/project-command-router.cts`
- `src/project.cts`
- `tests/feat-project-strategy-done.test.cjs`
- `tests/project-query-verbs.test.cjs`
- `tests/roadmap-after-strategy.test.cjs`
- `tests/strategy-config-and-marker-contracts.test.cjs`
- `tests/testing-certification.test.cjs`
- `tests/testing-certification-wiring.test.cjs`
- `tests/fix-regate6-uat-superseded-and-certifier-token.test.cjs`

### fidelity — quality contract + execute-phase guards

- `gsd-core/references/ai-test-quality.md`
- `gsd-core/references/engineering-standards.md`
- `tests/source-fidelity-contracts.test.cjs`

Upstream-absorbed (shipped natively by upstream v1.6.1 — no longer fork-owned; do not restore over upstream's copies): `gsd-core/references/execute-phase-between-wave-reset.md`, `gsd-core/references/execute-phase-wave-guard.md`, `gsd-core/references/untrusted-input-boundary.md`.

### grounding — source-grounding resolver, gate, hook

- `capabilities/grounding/capability.json`
- `gsd-core/references/grounding-citations.md`
- `gsd-core/references/plan-phase-coverage-gate.md`
- `hooks/gsd-grounding-index-refresh.js`
- `src/grounding.cts`
- `src/grounding-command-router.cts`
- `tests/feat-grounding-gate.test.cjs`
- `tests/feat-grounding-index-refresh-hook.test.cjs`
- `tests/feat-grounding-resolver.test.cjs`
- `tests/feat-grounding-sources.test.cjs`
- `tests/grounding-shipped-template-fixtures.test.cjs`
- `tests/grounding-fixture-ablation.test.cjs`

### exploration

- `gsd-core/references/exploration-and-adaptability.md`

### context — context-lifecycle capability (knowledge lifecycle: capsules, MASTER-CONTEXT, verify, calm flush hook)

- `capabilities/context/capability.json`
- `commands/gsd/context.md`
- `gsd-core/references/context-lifecycle.md`
- `gsd-core/templates/context-capsule.md`
- `gsd-core/templates/master-context.md`
- `gsd-core/templates/milestone-capsule.md`
- `gsd-core/workflows/context.md`
- `src/context.cts`
- `src/context-command-router.cts`
- `tests/feat-context-append.test.cjs`
- `tests/feat-context-core.test.cjs`
- `tests/feat-context-enforcement.test.cjs`
- `tests/feat-context-hook.test.cjs`
- `tests/feat-context-router.test.cjs`
- `tests/feat-context-skill.test.cjs`

The `context` command family is capability-owned (`capabilities/context/capability.json` + `src/context-command-router.cts`, backed by `src/context.cts`) and contributes a `plan:pre` fragment into the planner (freshness gate + `## Orchestrator curation` layer). The revived `hooks/gsd-context-monitor.js` calm flush nudge and the fork's context markers in `execute-phase.md`, `discuss-phase.md`, `resume-project.md`, `transition.md`, `new-project.md`, `new-milestone.md`, `complete-milestone.md` and the executor/verifier/researcher agents are tracked as modified-file patches below (feature `context`). `skills/gsd-context/SKILL.md` is a generated projection of `commands/gsd/context.md` (see *Generated / regenerable*).

### learn — /gsd-learn teaching system

- `capabilities/learn/capability.json`
- `commands/gsd/learn.md`
- `gsd-core/references/learn-catalog.md`
- `gsd-core/references/teaching-pattern.md`
- `gsd-core/visual/frame-template.html`
- `gsd-core/visual/helper.js`
- `gsd-core/visual/server.cjs`
- `gsd-core/visual/start-server.sh`
- `gsd-core/visual/stop-server.sh`
- `gsd-core/workflows/learn.md`
- `src/learn.cts`
- `src/learn-command-router.cts`
- `tests/feat-learn.test.cjs`
- `tests/learn-catalog.test.cjs`
- `tests/learn-visual.test.cjs`

### seeds — --list-seeds browser (upstream-absorbed #722)

- `tests/feat-list-seeds.test.cjs`

The feature itself is upstream-native as of v1.6.1 (`gsd-core/workflows/list-seeds.md`, the `list-seeds` gsd-tools case, `commands/gsd/capture.md` routing, and the help rows all ship upstream). Only the fork's extra test coverage remains fork-owned.

### release — fork release plumbing

- `scripts/sync-upstream.sh`
- `tests/update-changelog-preview-tooling.test.cjs`

### fork docs (identity)

- `docs/MAINTAINING-FORK.md`
- `docs/RELEASING.md`
- `docs/plans/2026-06-08-ws0-fork-setup.md`
- `docs/specs/2026-06-08-fork-methodology.md`
- `docs/superpowers/plans/2026-06-25-gsd-learn.md`
- `docs/superpowers/plans/2026-06-26-source-grounding-slice1.md`
- `docs/superpowers/plans/2026-07-14-roadmap-after-strategy-chain.md`
- `docs/superpowers/specs/2026-06-25-gsd-learn-design.md`
- `docs/superpowers/specs/2026-06-26-source-grounding-design.md`
- `docs/superpowers/specs/2026-07-13-upstream-adoption-analysis.md`
- `docs/superpowers/specs/2026-07-13-upstream-realignment-proposal.md`
- `docs/FORK-DELTA.md`
- `docs/FORK-PATCHES.json`
- `tests/fork-delta-manifest.test.cjs`

### realignment-extracted (Epic #13) — new files created DURING the v2.0.0 port

Size-budgeted upstream workflows/agents could not absorb the fork blocks inline, so the port extracted these steps/references. Fork-owned; upstream has no version of them:

- `gsd-core/references/plan-checker-strategy-compliance.md`
- `gsd-core/references/verifier-fidelity-gates.md`
- `gsd-core/workflows/autonomous/blocker-handling.md`
- `gsd-core/workflows/discuss-phase/resume.md`
- `gsd-core/workflows/execute-phase/steps/failure-classification.md`
- `gsd-core/workflows/plan-phase/modes/prd-express.md` — **upstream-absorbed as of the v1.9.0 realignment** (upstream extracted its own `plan-phase/steps/prd-express-path.md`; plan-phase.md now references theirs — this fork file is unreferenced and may be pruned)

### Do NOT restore (accidental / transient additions)

These are also new since the fork base but must **not** be carried through a realignment:

- `hooks/gsd-context-monitor.js.tmp.27634.318d8b7b56ab` — an accidentally committed atomic-write temp artifact; delete it. (Done — not carried into the 2.0.0 tree.)
- `.changeset/daring-ravens-snooze.md` — a transient changeset consumed by the release pipeline; carry it only if it has not been released yet. (Released — not carried into the 2.0.0 tree.)
- `.changeset/*.md` generally — RELEASE-TRANSIENT: changesets are promoted into CHANGELOG.md and deleted at finalize. NEVER list them in the guarded additive set (the guard would fail on every post-release tree; this bit PR #23).

---

## Modified files carrying fork content

Upstream files the fork edited beyond branding. `mode` says how the fork content is protected and how to re-apply it during realignment:

- **markers** — the fork block(s) are wrapped in `<!-- FORK:<feature> BEGIN/END -->` (markdown) or `// FORK:<feature> BEGIN/END` (code). Re-apply by copying each marked block into the new upstream file at the equivalent location.
- **anchors-only** — no inline markers (byte/line-budgeted file, JSON/YAML, frontmatter edit, inside a code fence, or in-sentence tweak). Re-apply by hand from `git diff 7eb4d286..<fork-ref> -- <path>`; the FORK-PATCHES anchors are the tripwires proving the content survived.

Marker/anchor details live in [`FORK-PATCHES.json`](FORK-PATCHES.json) (one entry per path × feature).

| File | Feature(s) | Mode | Notes |
|---|---|---|---|
| `README.md` | identity | markers | Fork banner + "What this fork adds" + Installing & updating |
| `agents/gsd-advisor-researcher.md` | fidelity | anchors-only | one-line `untrusted-input-boundary.md` import |
| `agents/gsd-ai-researcher.md` | fidelity | anchors-only | one-line import |
| `agents/gsd-assumptions-analyzer.md` | fidelity | anchors-only | one-line import |
| `agents/gsd-code-reviewer.md` | fidelity | markers | Contract-conformance dimension 4 (+1 rewritten sentence, anchors) |
| `agents/gsd-codebase-mapper.md` | grounding | markers | `<source_grounding>` block |
| `agents/gsd-doc-classifier.md` | fidelity | anchors-only | one-line import |
| `agents/gsd-doc-synthesizer.md` | fidelity | anchors-only | one-line import |
| `agents/gsd-domain-researcher.md` | fidelity | anchors-only | one-line import |
| `agents/gsd-executor.md` | fidelity, context | markers | senior-quality contract, Mode awareness, TEST-INTEGRITY RULE; mirror-deviations-to-frontmatter instruction (1 context marker pair) |
| `agents/gsd-integration-checker.md` | fidelity | markers | seam/telemetry + design-source stance |
| `agents/gsd-intel-updater.md` | grounding | markers | `<source_grounding>` block |
| `agents/gsd-pattern-mapper.md` | fidelity | markers | senior-quality + code-quality/source awareness |
| `agents/gsd-phase-researcher.md` | fidelity, context | markers | rung-fit + source-grounding paras; one-line import (anchor); ADR/DOMAIN-MODEL grounding para |
| `agents/gsd-plan-checker.md` | fidelity | anchors-only | 983/1000-line LARGE budget; Canonical-References row + 3 gate bullets |
| `agents/gsd-planner.md` | fidelity | anchors-only | size-gated (XL); senior-quality + Mode paras + Ship-Fast caveat |
| `agents/gsd-project-researcher.md` | fidelity | markers | source-grounding para; one-line import (anchor) |
| `agents/gsd-research-synthesizer.md` | fidelity | anchors-only | one-line import |
| `agents/gsd-roadmapper.md` | strategy | markers | cross-cutting/elaborate-mode, design-aware UI hints, discovery artifacts |
| `agents/gsd-security-auditor.md` | strategy | markers | SECURITY-STRATEGY parent bullet |
| `agents/gsd-ui-checker.md` | fidelity | markers | FE-architecture/Mode tables + design-override principle |
| `agents/gsd-ui-researcher.md` | fidelity | markers | Mode/FE-architecture tables; one-line import (anchor) |
| `agents/gsd-verifier.md` | fidelity, context | markers | reward-hacking + architecture/strategy/design/mode-fit gates; DOMAIN-MODEL/TEST-STRATEGY strategy-fit extension |
| `bin/lib/ui-safety-gate.cjs` | fidelity | markers | legacy root copy (retained per the canonical header + probed as runtime fallback) kept in sync with `src/ui-safety-gate.cts`: negation guard. The UI-hint authority (`strategy`) blocks are **upstream-absorbed** (#2150, v1.9.0 realignment: upstream's line-anchored `**UI hint**: yes|no` parse is stricter and its tests pin those semantics; the root copy mirrors it unmarked) |
| `commands/gsd/ns-manage.md` | learn | anchors-only | `learn` in requires + gsd-learn routing row |
| `commands/gsd/ns-project.md` | strategy | anchors-only | 9 strategy skills in requires + routing rows |
| `docs/ARCHITECTURE.md` | context-monitor | anchors-only | hook-table row + thresholds section: the calm knowledge-flush nudge (revived hook) |
| `CONTEXT.md` | strategy | anchors-only | `agentic_certification` added to the `RULESET.WORKFLOW.COVERAGE-METADATA` kind enum — the surface an agent consults as ground truth before authoring a `coverage:` block, so a partial landing makes it file `other` for a certification run (Wave 2 review M3). `docs/CONTEXT-INDEX.json` is the generated projection of this line (`scripts/gen-context-index.cjs`) and carries no fork content of its own |
| `docs/COMMANDS.md` | strategy | anchors-only | `agentic_certification` added to the `verification[].kind` enum row of the SUMMARY coverage-block table (same all-surfaces landing as CONTEXT.md) |
| `eslint.config.mjs` | identity | anchors-only | `_reference/**` ignore + generated-lib rider lines |
| `.gitignore` | identity | anchors-only | generated project/grounding/learn .cjs + `_reference/` riders |
| `.github/workflows/release.yml` | release | anchors-only | `NODE_AUTH_TOKEN` env on publish/dry-run steps |
| `gsd-core/bin/lib/legacy-cleanup.cjs` | identity | markers | upstream-signal consts, legacy caches, empty-legacy-runtime-dir scan + apply guard |
| `gsd-core/references/planner-source-audit.md` | fidelity, grounding | markers | DESIGN source + address-failure guard; `## Grounding` fill instructions (fenced DESIGN table row: anchors) |
| `gsd-core/templates/claude-md.md` | grounding | anchors-only | 7-section / sources-of-truth prose (template body) |
| `gsd-core/templates/phase-prompt.md` | grounding | anchors-only | `## Grounding` block (inside fenced template body) |
| `gsd-core/templates/project.md` | strategy, grounding | anchors-only | `## Mode`, `## Sources`, `## Strategy Plan` + Skip-ledger (inside fenced template body) |
| `gsd-core/templates/requirements.md` | dod | anchors-only | `[CROSS-CUTTING]` traceability row |
| `gsd-core/templates/summary.md` | context | anchors-only | `deviations:` frontmatter field + guidance (structured mirror of `## Deviations from Plan`, inside fenced template body) |
| `gsd-core/templates/user-setup.md` | strategy | anchors-only | certification-substrate example (seed accounts, mail catcher, one-time auth session — inside fenced template body) |
| `gsd-core/templates/verification-report.md` | fidelity | anchors-only | Mode & Source Fidelity verdict table (inside fenced template body) |
| `gsd-core/workflows/add-tests.md` | fidelity | markers (3) | ai-test-quality contract + TEST-STRATEGY-driven classification; in-step rewrites (anchors); + round-4 (r4-b): reads the `
| `gsd-core/workflows/autonomous.md` | grounding | anchors-only | `<canonical_refs>` block sits inside the fenced CONTEXT.md template |
| `gsd-core/workflows/code-review.md` | fidelity | anchors-only | source-fidelity inputs added inside a bash fence |
| `gsd-core/workflows/complete-milestone.md` | context | markers | acknowledge step routes each deferral into `.planning/milestones/next/<label>-CAPSULE.md` (create from template if absent), in addition to the STATE.md Deferred Items entry (1 marker pair) |
| `gsd-core/workflows/discuss-phase.md` | exploration, context | anchors-only + markers | mandatory-exploration scout step + engineering-standards/canonical-refs lines (anchors); capsule-aware `write_context` append-never-replace + config-gated per-round discussion log + capsule-provenance routing of check_existing "Update it" into `discuss-phase/resume.md`'s Extend branch (3 marker pairs; third pair added in the v1.9.0 realignment — upstream's inline check_existing text is kept, the old size-trim consolidation was dropped as moot under the 40960 DEFAULT cap) |
| `gsd-core/workflows/discuss-phase/resume.md` | context | markers | capsule-aware existing-CONTEXT branch: provenance non-null → "Extend it" (append a Discussion-additions layer); provenance-null path byte-identical (1 marker pair) |
| `gsd-core/workflows/execute-phase.md` | fidelity, context | anchors-only + markers | SIZE-GATED (93921/<93985 bytes — ceiling force-raised 93600→93985 in the v1.10.0 realignment: upstream's own body is 93400 LF bytes, zero headroom for the fork's +521 B of condensed context lines; ratchet down at next upstream shrink); ADR/DoD files_to_read, design oracle (anchors; wave guards are upstream-native); the step-7 failure-classification extraction to `execute-phase/steps/failure-classification.md` is re-applied (fragment's 7.1 now defers to upstream's `execute-phase-quota-recovery.md`); executor reads capsule Locked Decisions + Phase-Scoped Pitfalls, verifier reads capsule What Done Looks Like (2 marker pairs) |
| `gsd-core/workflows/help/modes/full.md` | strategy, learn | markers | registration blocks for strategy commands + `/gsd-learn`; the `--list-seeds` row is upstream-native (#722). The testing-strategy row advertises `--tune-up` — `tests/docs-parity-live-registry.test.cjs` requires every `--flag` in a command's `argument-hint` to appear here |
| `gsd-core/workflows/help/modes/topic.md` | learn | anchors-only | one routing-table row |
| `gsd-core/workflows/new-milestone.md` | strategy, validation, context | markers | Mode refresh, Step 4.5 warm-start, strategy on-ramp (+1-line bullets, anchors); skip-ledger re-adoption lifecycle (anchors); Step-1 detects `milestones/next/<label>-CAPSULE.md` files, Step 3.1 matches on the resolved label, folds carried-forward items, then moves the capsule to `milestones/consumed/` (2 context marker pairs) |
| `gsd-core/workflows/new-project.md` | strategy, validation, context | markers | design detection, brief/legacy/design grounding, `## Mode` fill + `## Sources` registry, Step 7.6; Step-9 on-ramp rewrite (anchors); init-JSON key-list truth-up (anchors); after the deep-questioning loop, append each elicitation round to `.planning/PROJECT-DISCUSSION-LOG.md` (1 context marker pair). The auto-mode brownfield bullet and the LEGACY-INVENTORY router short-circuit moved into upstream's v1.10.0 section-manifest fragments (rows below) |
| `gsd-core/workflows/new-project/steps/auto-mode-detection.md` | strategy | markers | auto mode does NOT blindly assume greenfield: `## Mode` Origin set from init signals, auto-detected brownfield notes `/gsd-legacy-inventory` (1 marker pair; fragment extracted by upstream v1.10.0 from new-project.md) |
| `gsd-core/workflows/new-project/steps/codebase-map-offer.md` | strategy | markers | the fork's 3-intent exploration router (Extend/Rewrite/Harden → map-codebase vs legacy-inventory, `## Mode` Origin/Code-quality recording) + LEGACY-INVENTORY.md short-circuit ("exploration is DONE") replace upstream's 2-option map offer (2 marker pairs; fragment extracted by upstream v1.10.0 from new-project.md) |
| `gsd-core/workflows/plan-phase.md` | grounding, context | anchors-only + markers | SIZE-GATED (91007/<91071 bytes — ceiling ratcheted DOWN 96875→91071 in the v1.10.0 realignment after upstream's section-manifest extraction shrank the host, honoring the v1.9.0 ratchet-down promise); §1.6 elaboration gate, §13a grounding gate (+ upstream's #2770 fix kept), UI-hint sentence (now documenting upstream #2150), oracle files (anchors); §5.6 context freshness-gate directive + §10 `## Orchestrator curation` pre-checker directive (2 context marker pairs). The fork's §13a compression to `plan-phase-coverage-gate.md` is re-applied; the PRD-express trim is **upstream-absorbed** (their `steps/prd-express-path.md`) — the fork's `plan-phase/modes/prd-express.md` is no longer referenced |
| `gsd-core/workflows/progress.md` | strategy | markers | Strategy-Plan awareness + Mode-staleness hint |
| `gsd-core/workflows/resume-project.md` | context | markers | load_state re-anchor: read MASTER-CONTEXT.md + active capsule (via `context provenance`) + last SUMMARY, then `context verify --phase`; skips silently when MASTER-CONTEXT.md is absent (1 marker pair) |
| `gsd-core/workflows/secure-phase.md` | grounding | markers | SECURITY-STRATEGY posture read |
| `gsd-core/workflows/transition.md` | strategy, context | markers | `## Mode` drift check; the `suite_health_compare` step (design spec §8.3): the newest SUMMARY's `suite-metrics:` block vs the TEST-STRATEGY `## Suite health` baseline row, evaluated against the T1–T4 table in `references/test-strategy.md` — T1 writes an immediate pending todo, T2–T4 write a milestone-close todo, both attaching `/gsd-testing-strategy --tune-up`; skips silently when either side is missing and never writes a Suite-health row itself (2 strategy marker pairs); phase-end promotion of master-worthy discoveries into MASTER-CONTEXT.md (Load-bearing verified facts / Standing rules) + `## Orchestrator curation` layer on later-phase capsules (1 context marker pair) |
| `gsd-core/workflows/add-todo.md` | strategy | markers | shared-clock note: `date` from init.todos is the local calendar date — the same clock `transition`'s suite-health todo filenames use, so every writer of `.planning/todos/pending/` dates files identically (e2e-3 F-4; 1 strategy marker pair) |
| `gsd-core/workflows/ui-phase.md` | fidelity | anchors-only | two in-list files_to_read lines |
| `gsd-core/workflows/ui-review.md` | grounding | anchors-only | one in-list design-oracle line |
| `gsd-core/workflows/ultraplan-phase.md` | grounding | markers | grounding carried into the cloud prompt (in-fence part: anchors) |
| `hooks/hooks.json` | grounding | anchors-only | JSON; grounding-index-refresh matcher entry |
| `hooks/managed-hooks-registry.cjs` | grounding | anchors-only | one array line |
| `package.json` | identity | anchors-only | JSON; fork name/author/repo + **zero runtime dependencies** (upstream's `dependencies` block deliberately removed). v1.9.0: `@anthropic-ai/claude-agent-sdk` added as a **devDependency** only — the #2590 backend gate resolves the installed SDK version by walking node_modules, and upstream's test needs it resolvable in-repo; nothing ships (no `dependencies` block) |
| `scripts/build-hooks.js` | grounding | anchors-only | one `HOOKS_TO_COPY` line — `gsd-grounding-index-refresh.js` must ship to `hooks/dist/` so the installer copies it AND records it in `gsd-file-manifest.json` (without it, bug #941's detect-custom-files false-positive fires on the fork hook). Lost to `--theirs` in the v1.10.0 realignment; pinned here so the next pull catches it |
| `scripts/prompt-injection-scan.sh` | fidelity | anchors-only | allowlist entry for untrusted-input-boundary.md |
| `src/check-command-router.cts` | grounding | markers | grounding import, gate toggle + `cmdGroundingPlan`, route arm (+field lines, anchors) |
| `src/clusters.cts` | strategy, learn | markers | strategy skill cluster rows (marked); `'learn'` row (anchors) |
| `src/command-aliases.cts` | strategy | markers | `PROJECT_COMMAND_ALIASES` + `PROJECT_SUBCOMMANDS` |
| `src/init-command-router.cts` | strategy | markers | `--design/--no-design` route (+interface line, anchor) |
| `src/init.cts` | strategy | markers | provided-design detection + result fields (+signature, anchor); plus `detectCertificationMode` and the `certification_mode` field on the `init.verify-work` bundle (2 further marker pairs, 4 total): resolved once here through the federated `resolveConfigKey` precedence so `verify-work/steps/agentic-certification.md` needs no runtime-launcher preamble and no process spawn to answer one enum — that step is read on EVERY verify-work run (Wave 2 review T4). Bounded and non-throwing: any failure degrades to the schema default `required` |
| `src/installer-migration-report.cts` | grounding | anchors-only | one whitelist line |
| `src/profile-output.cts` | grounding | markers | Sources-of-Truth section generator + managed-section wiring (anchors); the fork's GEMINI.md ambient-file branch is upstream-absorbed (`getProjectInstructionFile` runtime policy) |
| `src/ui-safety-gate.cts` | fidelity | markers | negation guard const + skip logic. The former UI-hint authority (`strategy`) blocks are **upstream-absorbed** (#2150) — never re-add the loose `UI_HINT_ANY_RE` variant; upstream's tests pin the strict semantics |
| `tests/emitted-attribution.test.cjs` | release | anchors-only | promotion-PR (base=main) skip for the differential gate — next-keyed mechanism; release content is gated entering next (PR #39 flap) |
| `tests/windows-robustness.test.cjs` | context-monitor | anchors-only | ported #685 block (upstream folded the file, consolidation #1969): fork hook must stay spawn-free; any reintroduced spawn MUST set windowsHide |
| `tests/ci-test-scope.test.cjs` | context-monitor | anchors-only | A1 fixture swapped off the deleted bug-1974 context-monitor test |
| `tests/claude-md.test.cjs` | grounding | anchors-only | 7-section + sources assertions |
| `tests/skill-frontmatter-contract.test.cjs` | strategy | anchors-only | ported fork KNOWN_SKILLS entries (12 fork skills) after upstream deleted enh-2790 in consolidation #1970; v1.9.0: `FULL_BUDGET` 844→880 (upstream full.md = 829 lines, 15 headroom — the fork's 39 help-entry lines cannot fit); ratchet back on upstream shrink |
| `tests/workflow-size-budget.test.cjs` | strategy | anchors-only | v1.9.0 realignment: `DISCUSS_PHASE_TARGET` 32000→34400 (upstream discuss-phase.md = 31,975 bytes, 25 headroom — the fork's ~2.3K marked blocks cannot fit); ratchet back on upstream shrink |
| `tests/helpers/emitted-provenance.cjs` | learn | markers | `visual` registered in the `gsd-core-verbatim` provenance rule's enumerated-subdir pattern — the fork's vendored gsd-learn visual companion (`gsd-core/visual/*`) is emitted verbatim; without the registration the v1.9.0 install-tree totality guard fails on all 19 manifests |
| `tests/helpers/emitted-runtime.cjs` | identity | markers | `resolveChangedPaths` unions uncommitted (staged + worktree) changes into the differential gate's explanation set — the CURRENT manifests are built from the working tree, so a dirty checkout (e.g. a staged upstream merge) must diff the same tree; no-op in CI where the tree is clean |
| `tests/mcp-server-catalog.test.cjs` | strategy | anchors-only | v1.10.0 realignment: row-31's hard-coded `71` prompt count derived from `commands/gsd/*.md` on disk (the same directory `buildCatalog()` walks) — the fork ships 83 commands; the invariant is unchanged, only upstream's literal total |
| `tests/planner-decomposition.test.cjs` | fidelity | anchors-only | v1.9.0 realignment: planner cap 48K→56K, mirroring the XL tier recorded in `tests/agent-size-budget.test.cjs` (upstream's own planner body = 49,116 LF chars, 36 under 48K — no fork block fits); ratchet back on upstream shrink |
| `tests/reversibility-tagging.test.cjs` | fidelity | anchors-only | v1.9.0 realignment: planner cap 49152→57344 (same XL mirror as above); ratchet back on upstream shrink |
| `tests/precondition-element.test.cjs` | fidelity | anchors-only | v1.9.0 realignment: planner + executor caps 49152→57344 (XL mirror; upstream headroom 36 / 494 chars); ratchet back on upstream shrink |
| `tests/reachability-check.test.cjs` | fidelity | anchors-only | v1.9.0 realignment: planner limit 50000→57344 (XL mirror); ratchet back on upstream shrink |
| `tests/security.test.cjs` | fidelity | anchors-only | v1.9.0 realignment: planner cap 49152→57344 in the #1627 fold (XL mirror); ratchet back on upstream shrink |
| `tests/fix-2289-context-monitor-event-allowlist.test.cjs` | context-monitor | anchors-only | v1.9.0 realignment: the #2289 allowlist contract (envelope only on injection events) is adopted verbatim; the "injection events still warn" + "side effects on silent events" blocks are ADAPTED to the fork's calm knowledge-flush hook (used_pct 90/95 thresholds, GSD-active gate, missing-name → PostToolUse fallback, Stop silent AND side-effect-free, debounce-counter persistence as the silent side effect) |
| `bin/install.js` | grounding | anchors-only | `groundingRefreshCommand` computation + pass-through into `applySettingsJsonHooks` (fork #11 FileChanged grounding-index refresh; registration body lives in `src/runtime-hooks-surface.cts`) — was an UNMARKED delta and got dropped in the v1.9.0 merge; now manifest-pinned |
| `bin/install.js` | uninstall-scoped-settings | anchors-only | uninstall step 6 loops over `settingsFilesToClean` (shared `settings.json` **plus** the scope-specific file from `hostBehaviors.settingsFileByScope`, i.e. `settings.local.json` on local Claude installs, #338). Without it, local uninstall leaves every managed hook registered against already-deleted scripts (realign 2.0.0 update-matrix B6) — was an UNMARKED delta and got dropped in the v1.9.0 merge; now manifest-pinned |
| `bin/install.js` | statusline-reemit | anchors-only | `handleStatusline`'s "already configured" skip is gated on `isManagedHookCommand` so it protects only THIRD-PARTY statuslines (#2248) — GSD's own entry is re-emitted every install like the managed hooks, which is what repairs a bare-`node`/stale-runner statusline that exits 127 under Claude Code's PATH-less spawn (fork #41). `handleStatusline` is exported for direct testing |
| `bin/install.js` | skill-argument-hint | anchors-only | `convertClaudeCommandToCodexSkill` and `convertClaudeCommandToCursorSkill` now carry the source command's `argument-hint` into the emitted SKILL frontmatter (parity with the copilot/qwen builders, which already preserved it). Without it, `[--auto] [--text] [--tune-up]` was undiscoverable from the codex/cursor skill signature though the body still handled the flags (e2e-12 F3). Guarded by `tests/emitted-skill-argument-hint.test.cjs`. **UPSTREAM-ISSUE CANDIDATE** — restores parity with upstream's own copilot/qwen behavior |
| `bin/install.js` | fidelity | markers (3) | Emitted vendor-fact fidelity (e2e-12 F1/F2). `isVerbatimVendorReference` exempts the fork-owned vendor-fact reference `gsd-core/references/certification.md` from BOTH brand transforms (`neutralizeAgentReferences`, `applyClaudeCodeBrandSwap`) so it emits byte-identical on every runtime — the swap otherwise fabricated a `<Brand> --chrome` driver, promoted it to the CERT-1 exemplar, and re-attributed onorca's dated security receipt to the target runtime's settings.json. Same feature closes the `neutralizeAgentReferences` lookahead gap: adds ` Desktop` to the proper-noun allow-list and a `(?<!-)` lookbehind so "Claude Desktop"/"non-Claude" survive (were "the agent Desktop"/"non-the agent runtimes"). Guarded by `tests/emitted-certification-fidelity.test.cjs`. **UPSTREAM-ISSUE CANDIDATE** — the brand transform is upstream's; certification.md is fork-owned, but the lookahead gap corrupts any file carrying those tokens |
| `src/runtime-hooks-surface.cts` | statusline-reemit | anchors-only | `rewriteLegacyManagedNodeHookCommands` also repairs `settings.statusLine.command` (per-command logic extracted to `projectLegacyManagedNodeCommand`, managed-only guard unchanged), and `normalizeNodePath` gained an nvm branch (`resolveNvmDefaultVersionDir`: `default`-alias resolution with bounded alias-chain + partial-version matching) mirroring the fnm/mise/volta transient-path normalization (fork #41) |
| `tests/install.test.cjs` | statusline-reemit | anchors-only | the fork #41 regression block: nvm normalization cases, statusLine repair-pass cases, managed-vs-third-party `handleStatusline` discrimination across every historical GSD statusline shape, and an end-to-end reinstall whose emitted statusline is executed under a PATH-less `sh -c` spawn |
| `tests/init.test.cjs` | strategy | markers | provided-design detection tests (+4 baseline asserts, anchors) |
| `tests/issue-607-legacy-cleanup.test.cjs` | identity | markers | upstream-signal, legacy-cache, empty-dir plan/apply tests |
| `tests/ui-safety-gate.test.cjs` | fidelity | markers | negation-guard tests |
| `tests/agent-size-budget.test.cjs` | fidelity | anchors-only | v1.9.0 realignment: `gsd-executor` + `gsd-plan-checker` re-tiered LARGE→XL (upstream's own bodies left 280 / 2,789 bytes of LARGE headroom — no room for the fork's marked blocks); commented, ratchet back on upstream shrink |
| `capabilities/broken-windows/capability.json` | windows-ledger | anchors-only | ship:pre gate predicate is `command-exit-zero` reading the cross-checked `windows status --raw` instead of upstream's hand-editable `artifact-frontmatter-equals` frontmatter comparison (re-pinned during the v1.10.0 realignment after the mechanical capability-manifest resolution briefly dropped it). **upstream-PR candidate** |
| `src/broken-windows.cts` | windows-ledger | anchors-only | `reason` column on `markFixed`, `amendWindow`, `reconcileLedger` (the single lenient read path) + review hardening: waived reasons cannot be emptied, duplicate ids rejected in the shared parse path (`WINDOWS_DUPLICATE_ID`), surplus positionals are a typed usage error, `repaired`/`normalized` computed independently, `stripHeaderProse` keeps a tool-version header change from rewriting true ledgers. **upstream-PR candidate** |
| `tests/broken-windows.test.cjs` | windows-ledger | anchors-only | the behavioral + property coverage for all of the above (amend/reconcile/reason suites, dupe-id fixtures, the frozen-`REASON` lock, the ship-gate cross-check). **upstream-PR candidate** |
| `gsd-core/workflows/ship.md` | windows-ledger | anchors-only | ship-gate block gains the reason-carrying `fixed`/`amend` forms and points a count-drift diagnostic at `gsd_run windows reconcile` instead of leaving the operator to hand-edit `WINDOWS.md`. **upstream-PR candidate** |
| `gsd-core/workflows/ship.md` | strategy | markers | the advisory **milestone certification sweep** at the `ship:pre` preflight surface (testing-certification design spec §5 secondary slot): maps every phase in the milestone to the certification outcome `verify-work` recorded in its UAT, and flags any phase with no recorded outcome as `not-run`. Advisory by construction — it never blocks and has no `--force` — but never silent: the table prints on the all-green run too. Not a capability gate: there is no `certify` capability, and a `check.predicate` cannot read four prose outcomes across N phases (1 strategy marker pair) |
| `gsd-core/bin/gsd-tools.cjs` | windows-ledger | anchors-only | `windows amend` + `windows reconcile` route arms (`cmdWindowsAmend` / `cmdWindowsReconcile`) and the subcommand list. NOTE: this re-opens a fork delta on a file the issue-#25 capability pack had emptied — accepted deliberately, because a route arm for an upstream module belongs upstream, not in a fork capability. **upstream-PR candidate** |
| `src/shell-command-projection.cts` | managed-hook-coverage | anchors-only | `gsd-agent-isolation-guard.js` (#3069) and `gsd-write-guard.js` (#2301) added to BOTH managed-basename sets (`MANAGED_HOOK_BASENAMES_BY_SURFACE['settings-json']` and `MANAGED_HOOK_COMMAND_BASENAMES_BY_SURFACE['settings-json']`). The installer registers both into settings.json `PreToolUse`, but upstream never added them to the sets, so uninstall left them registered against already-deleted files (broken hook on every `Write` and every `Agent`/`Task` dispatch) and the #41 legacy bare-`node` repair skipped them. Found by realistic testing of the v1.10.0 realignment (`.superpowers/sdd/flows-110-report.md` §Flow 4). **UPSTREAM-ISSUE CANDIDATE** — upstream ships both hooks in `hooks/` + `hooks/managed-hooks-registry.cjs` and has the identical omission |
| `tests/shell-command-projection-dispatch.test.cjs` | managed-hook-coverage | anchors-only | the regression block pinning both guards in both sets (basename form, command form, and the `"$CLAUDE_PROJECT_DIR"`-anchored local-install form) |
| `src/config.cts` | bracket-guard | anchors-only | `cmdConfigSet` emits a stderr `gsd: warning —` when `phase_id_convention` is set to `bracket`: ADR-612 is still "Proposed (PR-0)" and no CLI/roadmap surface consumes the grammar, so bracket-form ROADMAP headings parse to **zero phases, exit 0, silently**. The 1.10.0 #2997/#3098 fix made the key survive resolution, which also made `"bracket"` settable — upstream's PR sequencing is intentional, letting users set it against a silent failure mode is the fork-visible footgun. Warning, not rejection: staging the value ahead of the consumers stays legal and the config contract does not diverge from upstream. stdout is untouched so `--raw` stays byte-identical. Drop this block when the bracket consumers land upstream. **UPSTREAM-ISSUE CANDIDATE** |
| `gsd-core/workflows/verify-work.md` | strategy | anchors-only | certification in the loop (testing-certification design spec §5, §7): the unconditional `agentic-certification` dispatch before UAT (placed between `extract_tests` and `create_uat_file` so `present[]` exists and no checkpoint has been shown; reads the fork-owned `verify-work/steps/agentic-certification.md` in `execute-phase`'s post-merge-gate form — deliberately NOT a `gsd:section`, because a wrapper would put a written-down silent-skip branch on disk in the one step whose contract is "recorded, never silent"; the `workflow.certification: off` opt-out lives inside the step and is recorded there), the `source: agentic` / outcome-line write block inside `create_uat_file`, and the `coverage_gap_capture` step between `diagnose_issues` and `plan_gap_closure` — the "which fast test was missing" question that gives `TEST-STRATEGY.md` its second (append-only) writer |
| `gsd-core/workflows/execute-plan.md` | strategy | anchors-only | the `agentic_certification` clause appended to the first `coverage:` authoring bullet — the one `kind` an executor never authors; its ref is the run's evidence bundle, never a test path. Appended to an existing line rather than added as a new bullet so the line-pinned `PROSE_ALLOWLIST` entry in `tests/no-bare-gsd-tools-command-position.test.cjs` (execute-plan.md:387) does not shift; plus the `suite-metrics:` authoring paragraph in `create_summary` (added AFTER line 387 for the same reason) — record only when this plan ran the whole suite, otherwise omit |
| `gsd-core/workflows/execute-phase/steps/post-merge-gate.md` | strategy | anchors-only | suite-metrics capture (design spec §8.3): a **millisecond** bracket (node `Date.now()`, portable) around the test run the gate already performs, plus **Step C**, which records `{test_count, wall_clock_ms, containers_started}` into the wave's SUMMARY frontmatter (the compare derives ms/test from the ms value; legacy seconds rows read ×1000). This gate is the only place in the loop that runs the whole suite, so it is where the measurement is taken; a timed-out or absent runner records nothing rather than a zero |
| `gsd-core/templates/summary.md` | strategy | anchors-only | `agentic_certification` in both `verification[].kind` enum locations (inline comment + field-semantics table) — admission only, the deterministic auto-pass contract is untouched; plus the `suite-metrics:` frontmatter block (`test_count`/`wall_clock`/`containers_started`) and its `<suite_metrics_guidance>` — the measured half of suite health, with `ms/test` deliberately derived downstream and the omit-never-zero rule |
| `gsd-core/references/planning-config.md` | strategy | anchors-only | the `workflow.certification` row in the Workflow Fields table (`required` \| `offer` \| `off`, default `required`) |
| `src/coverage.cts` | strategy | anchors-only | `'agentic_certification'` in the frozen `VALID_KINDS` enum the UAT coverage classifier validates against |
| `src/artifacts.cts` | strategy, context | anchors-only | the strategy-chain and context root artifacts in `CANONICAL_EXACT` (`PRODUCT-BRIEF.md`, `DOMAIN-MODEL.md`, `SECURITY-STRATEGY.md`, `FRONTEND-ARCHITECTURE.md`, `TEST-STRATEGY.md`, `INFRA-STRATEGY.md`, `CICD-STRATEGY.md`, `LEGACY-INVENTORY.md`, `DESIGN-INVENTORY.md`, `PROJECT-DISCUSSION-LOG.md`, `MASTER-CONTEXT.md`). Without them `validate health` W019 tells the user to *delete* the fork's own strategy documents (e2e-5 F1). The six upstream root artifacts added in the same commit (`WINDOWS.md`, `INGEST-CONFLICTS.md`, `INBOX-TRIAGE.md`, `METHODOLOGY.md`, `MEMORY.md`, `DECISIONS-INDEX.md`) are **UPSTREAM-ISSUE CANDIDATE** — upstream's own workflows write them and its roster omits them too |
| `src/commands.cts` | commit-pathspec | anchors-only | `cmdCommit`'s `--files` staging loop expands glob pathspecs (`expandFilePattern` / `isGlobPattern`) before the `fs.existsSync` gate. A pattern string can never satisfy `existsSync`, so `verify-work.md`'s `…/{phase_num}-CERTIFICATION-SCRIPT.*` entry was skipped **silently on every run** and the canonical certification artifact was never committed — while `git add` on the same pathspec stages it (e2e-4 F3). Basename-only, `*`/`?`/`[…]`; a glob matching nothing stays a silent skip, exactly like a missing literal. **UPSTREAM-ISSUE CANDIDATE** |
| `tests/commands.test.cjs` | commit-pathspec | anchors-only | the three-case regression block: a glob that matches stages and commits, a glob that matches nothing does not fail the commit, and a literal path is byte-identically unaffected |
| `src/uat.cts` | strategy | anchors-only | superseded-UAT archives (`-UAT-superseded-`) excluded from the `audit-uat` scan, and `parseUatItems`' result token widened to `[\w-]+` so `[pending-certifier]` is its own state, never plain `pending` — the archive restart creates to be inert was resurrected as phantom outstanding work, and the human was chased for the certifier's checkpoints (re-gate 6 N2). **UPSTREAM-ISSUE CANDIDATE** (the scan filter; the certifier token is fork doctrine) |
| `src/uat-predicate.cts` | strategy | anchors-only | the same `-UAT-superseded-` exclusion in the `uat-passed` file scan — an archived session must never drag a completed phase back to not-passed (re-gate 6 N2) |
| `src/phase.cts` | strategy | anchors-only | the same `-UAT-superseded-` exclusion in the phase-completion UAT scan (`uat_blockers`) (re-gate 6 N2) |
| `src/config.cts` | config-gates-safety | anchors-only | `gates.confirm_milestone_scope: true` in `SCHEMA_DEFAULTS` — the documented default (docs/CONFIGURATION.md) `complete-milestone.md` branches on; `config-get` answered "Key not found" when the key was absent (re-gate 5 N3). **UPSTREAM-ISSUE CANDIDATE** |
| `src/milestone.cts` | milestone-render | anchors-only | `cmdMilestoneComplete` computes a `nameSuffix` that is empty unless a distinct `--name` was supplied, so the human-read headers render `## v1.0 (Shipped: …)` / `# Requirements Archive: v1.0` instead of the doubled `v1.0 v1.0` the `milestoneName = options.name \|\| version` default produced on the documented no-`--name` invocation (e2e-10 F7). Guarded by `tests/milestone-name-duplication.test.cjs`. **UPSTREAM-ISSUE CANDIDATE** |
| `src/audit.cts` | todo-render | anchors-only | `scanTodos` carries `title` and `severity` (the fields `add-todo.md` and `transition.md` actually write) and `formatAuditReport` renders them; `priority` is kept as a legacy read only. Before this, milestone-close rendered `• <filename> [area]` plus the literal first body line `## Problem`, dropping the one field written to make the item readable (e2e-4 F9). **UPSTREAM-ISSUE CANDIDATE** |
| `tests/audit-command-cutover.test.cjs` | todo-render | anchors-only | the regression block over a real `add-todo`-shaped todo: `--json` carries `title`/`severity`, and the text report names both |
| `src/init.cts` | verify-work-bundle | anchors-only | `cmdInitVerifyWork` emits `uat_path` and `text_mode` (and `response_language` via `withProjectRoot`) — the fields `verify-work.md:51` tells the orchestrator to parse and `:314`/`:329` then consume. Unlike the sibling builders this one falls back to the workflow's **canonical** `{padded_phase}-UAT.md` target when the file does not exist yet, because `create_uat_file` writes it during the same run that already parsed the bundle (e2e-4 F4 / e2e-6 F10). **UPSTREAM-ISSUE CANDIDATE** |
| `tests/init.test.cjs` | verify-work-bundle | anchors-only | three pins: existing-file `uat_path`, canonical `uat_path` before the file exists, and `text_mode`/`response_language` from config |
| `gsd-core/bin/shared/config-schema.manifest.json` | config-gates-safety | anchors-only | the 9 `gates.*` and 2 `safety.*` keys registered in `validKeys`. Upstream ships them in `templates/config.json` and documents them in `docs/CONFIGURATION.md`, and four workflow branches read them, but the schema recognized neither section — so every `gsd-tools` call on a fresh project printed `unknown config key(s) … gates, safety — these will be ignored`, which is noise AND false (e2e-5 F5). **UPSTREAM-ISSUE CANDIDATE** |
| `tests/config-loader.test.cjs` | config-gates-safety | anchors-only | the shipped template must validate against the shipped schema with no warning, every workflow-read `gates.*`/`safety.*` key is `isValidConfigKey`, and `config-get` returns the configured values |
| `gsd-core/workflows/execute-phase/steps/post-merge-gate.md` | gate-handoff | anchors-only | Step B carries its OWN launcher preamble plus a loud `command -v gsd_run` guard, and records the gate result to `.planning/.gsd-post-merge-gate.json`. Fenced blocks run in separate processes (#381), so Step A's `gsd_run` does not exist here and neither documented mitigation applies to a `--claude --local` install with `CLAUDE_ENV_FILE` unset: run verbatim, a green 12/12 suite reported `✗ Post-merge test gate failed (exit code 127)` and three of the four calls hid the same failure behind `2>/dev/null` (e2e-4 F1). It also ensures `.planning/.gitignore` covers `.gsd-*` before writing the gate file, so a crash between write and the consume-and-delete cannot orphan an untracked scratch file that trips ship's clean-tree preflight (greenfield F9). **UPSTREAM-ISSUE CANDIDATE** |
| `gsd-core/workflows/execute-phase.md` | gate-handoff | anchors-only | step 5.7 now reads the extracted `execute-phase/steps/post-wave-tracking-update.md` fragment. execute-phase.md sat **7 bytes** under the frozen ADR-857 Phase-6 ceiling (93 985 / margin 93 928), so any addition to the host body had to be an extraction — which is the ADR's own rule. Host body 93 921 → 92 945 |
| `gsd-core/workflows/execute-phase/steps/post-wave-tracking-update.md` | gate-handoff | anchors-only | the extracted step-5.7 guard: `${TEST_EXIT}` is re-derived from the recorded gate result and the record is consumed, with a distinct branch when neither the variable nor the record exists. Unset, the old inline block printed `[: : integer expression expected` twice and then "post-merge tests failed (exit )", leaving a green wave's plans in-progress (e2e-4 F2). **UPSTREAM-ISSUE CANDIDATE** |
| `scripts/sync-runtime-launcher.cjs` | gate-handoff | anchors-only | `carriedPreamble` — the transform preserves a preamble an author deliberately placed in a later block instead of stripping it back out. Blanket per-block insertion is rejected on purpose (2.9 KB × 83 multi-block files would blow the workflow size budgets), so per-block resolution is opt-in and this is what makes it stick |
| `tests/runtime-launcher-parity.test.cjs` | gate-handoff | anchors-only | subtest (B) rewritten from "exactly ONE preamble per file" to the per-BLOCK invariant (≥1 per file, always in the first gsd_run block, ≤1 per block, always before that block's first call) + the (B3) pin on the post-merge test gate |
| `tests/execute-phase-wave.test.cjs` | gate-handoff | anchors-only | the behavioral block that runs execute-phase.md's real 5.7 guard in a fresh shell: recorded pass → tracking updated, recorded failure → named as a test failure, no record → "unavailable", in-shell value still wins, record consumed |
| `gsd-core/workflows/verify-work.md` | unproven-stamp | anchors-only | the `human_needed → passed` stamp is conditional on `BEHAVIOR_UNVERIFIED == 0` and `CERT_UNPROVEN == 0` (it produced `status: passed` beside `behavior_unverified: 1`, on the exact item the certifier reported as not certified — e2e-4 F5), and `coverage_gap_capture` gained a **record-only** entry so a verifier- or certifier-named gap writes its `## Coverage debt` row without a UAT issue (e2e-4 F7). **UPSTREAM-ISSUE CANDIDATE** |
| `gsd-core/workflows/verify-work/steps/automated-ui-verification.md` | unproven-stamp | anchors-only | an unset `PHASE_DIR` (set in a different block, therefore a different process) stops the step loudly instead of globbing `/*-UI-SPEC.md` and concluding "no UI spec" on a phase that has one (e2e-4 F8). **UPSTREAM-ISSUE CANDIDATE** |
| `gsd-core/workflows/transition.md` | unproven-stamp | anchors-only | the `XX-current` placeholder guard: unsubstituted, `suite_health_compare` no-opped at exit 0, indistinguishable from its own documented silent-skip branch. The sentinel is assembled from two literals so a blind substitution cannot rewrite the guard (e2e-4 F8) |
| `gsd-core/workflows/complete-milestone.md` | unproven-stamp | anchors-only | `verify_readiness` reads `all_complete` / `completed_count` / `phase_count` instead of `progress_percent`, which `init.manager` has never emitted, and states the counted-vs-gated asymmetry (e2e-4 F10). **UPSTREAM-ISSUE CANDIDATE** |
| `gsd-core/templates/UAT.md` | strategy | anchors-only | the `certification:` outcome line as the first line of `## Tests` (column 0, where `ship.md`'s milestone sweep greps for it), its closed six-form set, and the `[pending-certifier]` result value. The template and `verify-work.md:288` previously disagreed about the file's shape, leaving a hand-written or legacy UAT with no guidance for the slot (e2e-5 F7) |
| `tests/config.test.cjs` | bracket-guard | anchors-only | the warning's contract: value still written, `gsd: warning —` idiom naming key + value + "no consumers" + "legacy", clean `--raw` stdout, and no warning for `milestone-prefixed` / `null` |
| `tests/coverage-metadata-parser.test.cjs` | strategy | anchors-only | a fork-appended `describe('coverage classify — agentic_certification evidence')` block: six real behavioral round-trips through `gsd-tools uat classify-coverage` proving the new evidence kind is accepted, that it buys admission and nothing more (a `fail`, an `unknown` sibling and `human_judgment: true` all still route to the human), and that a plausible-but-wrong `kind: certification` is still rejected. Registered so a realignment cannot silently drop the round-trips — the manifest guard is entry→file directed and has no orphan detection (Wave 2 review M2) |

### Deletion-only deltas (nothing to anchor — guarded by tests instead)

- `commands/gsd/autonomous.md`, `commands/gsd/execute-phase.md`, `commands/gsd/plan-phase.md` — the fork **removed** `context: fork` from the frontmatter (it forks heavy skills into a context that cannot spawn subagents). Re-apply by deleting the line again after an upstream merge. CI tripwire: upstream adopted this policy natively in v1.9.0 (#921/#1970) — `tests/install-runtime-artifacts.test.cjs` asserts spawning orchestrators carry no `context: fork`; the fork's dedicated test was subsumed.
- Deleted tests: `tests/bug-1974-context-exhaustion-record.test.cjs`, `tests/bug-2451-context-monitor-over-report.test.cjs`, `tests/perf-317-context-monitor-fs.test.cjs`, `tests/bug-925-context-monitor-hook-event-name.test.cjs` (deleted during the 2.0.0 realignment — same class: it pinned the active hook's event-name behavior, which the inert no-op does not have) — they tested the upstream context-monitor behavior this fork removed. Delete them again if an upstream merge resurrects them. `tests/ci-test-scope.test.cjs` A1 rides on a swapped fixture for the same reason (see the modified table).

### No-op / cosmetic (no restore needed)

- `gsd-core/workflows/execute-phase/steps/codebase-drift-gate.md` — the shim-launcher line was moved to the top of its bash fence (pure reorder + branding).
- `.secretscanignore` — only the allowlist `owner=` handle changed (`@TheRocketCodeMX/maintainers` → `@TheRocketCodeMX/maintainers`). Note: this form is NOT covered by `scripts/sync-upstream.sh`'s patterns — re-apply by hand or extend the script.
- `.claude-plugin/plugin.json` — version field + branding only (version is fork-managed). (`gemini-extension.json` was removed with the Gemini CLI sunset in the v1.9.0 realignment.)

---

## Whole-file replacements

The fork version replaces upstream wholesale; during realignment keep the fork file and reconcile upstream changes into it by hand (not vice versa):

- `hooks/gsd-context-monitor.js` — the fork's **calm knowledge-flush nudge** (part of the `context` capability). Same PostToolUse/PreCompact mechanism as upstream, opposite tone: at high `used_pct` (90/95) it suggests `/gsd-context flush`; on PreCompact it emits a final flush + re-anchor reminder. Main-session-only, gated on `.planning/STATE.md` + `context_lifecycle.hook_enabled`, calm-by-contract (CI-linted tone). Kept wired/managed so updates overwrite any previously-active version. Never take the upstream implementation.
- `docs/context-monitor.md` — rewritten to document the revived calm knowledge-flush nudge (thresholds, tone contract, config keys).
- `gsd-core/references/scout-codebase.md` — upstream's lazy map-selection table was rewritten into the fork's mandatory-exploration doctrine (parallel explorer agents, rationalization-killers, confirm-or-refute gate); the map-selection table survives inside it.
- `CHANGELOG.md` — fork-owned release history (fork versions 1.5.0+). Keep ours; upstream's changelog is not merged.

---

## Branding-only (handled by `scripts/sync-upstream.sh`)

~223 files differ from the base **only** by the six branding forms (`@therocketcode/gsd-core` → `@therocketcode/gsd-core`, `TheRocketCodeMX/gsd-core` → `TheRocketCodeMX/gsd-core`, `therocketcode-gsd-core` → `therocketcode-gsd-core`, the escaped/encoded variants). Do not track them here — after any upstream merge, run `./scripts/sync-upstream.sh` (whole tree) and the identity-drift lint. This includes all runtime-launcher `npx @…/gsd-core` one-liners across workflows/agents, README translations, docs/, `gsd-core/bin/lib/package-identity.cjs`, `gsd-core/bin/check-latest-version.cjs`, `gsd-core/workflows/update.md`, `src/phase-lifecycle.cts`, `src/validate.cts`, and similar.

---

## Generated / regenerable (no restore; regenerate post-port)

- `docs/INVENTORY.md`, `docs/INVENTORY-MANIFEST.json` — regenerate with the inventory tooling after the port.
- `package-lock.json` — regenerate with `npm install` (the fork is zero-runtime-deps; the lock reflects devDependencies only).
- `skills/**/SKILL.md` — regenerate with `npm run gen:plugin-skills` (the 11 fork skills — including `skills/gsd-context/SKILL.md` — + the ns-router skill bodies are projections of `commands/gsd/*.md`).
- `tests/agent-size-baseline.json`, `tests/workflow-size-baseline.json` — regenerate with `npm run size:baseline` after ports change agent/workflow sizes.
- `gsd-core/bin/lib/capability-registry.cjs`, `docs/reference/capability-matrix.md` — committed generated artifacts that now include the rocket capability pack **and the `context` capability**; regenerate with `node scripts/gen-capability-registry.cjs --write && node scripts/gen-capability-matrix.cjs --write` (their own staleness tests fail loudly if an upstream merge clobbers the entries).

---

## How to use during realignment

1. **Restore additive verbatim** — `git checkout <fork-ref> -- <every path in Additive files>` (skip the *Do NOT restore* pair).
2. **Re-apply marked/anchored patches by hand** — for each FORK-PATCHES entry: `mode=markers` → copy each `FORK:<feature>` block into the new upstream file at the equivalent spot; `mode=anchors-only` → re-apply from `git diff 7eb4d286..<fork-ref> -- <path>`; `mode=whole-file` → keep the fork file, fold upstream changes into it manually. Re-do the deletion-only deltas.
3. **Rebrand** — `./scripts/sync-upstream.sh` (plus the `.secretscanignore` owner handle, which it misses).
4. **Regenerate the generated** — inventory docs and `package-lock.json`; then `npm run generate:identity && npm run build:lib`.
5. **Prove it** — full `npm run test:unit` (zero `not ok`), `npm run lint`, `npm run check:identity-drift`. `tests/fork-delta-manifest.test.cjs` fails loudly if any marker pair or anchor was lost in the merge.
