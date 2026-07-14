# FORK-DELTA — what this fork owns on top of upstream

**Base:** upstream `TheRocketCodeMX/gsd-core` v1.4.0 = commit `7eb4d286`. Everything below is `git diff 7eb4d286..HEAD` on `next` (the fork's content source of truth), with pure branding excluded (see *Branding-only*).

**v2.0.0 realignment status (Epic #13):** the `realign/2.0.0` tree is upstream **v1.6.1** (`1c352d1e`) + this delta, re-ported. Entries below are reconciled to that ported reality — features upstream absorbed between v1.4.0 and v1.6.1 are noted as **upstream-absorbed** and no longer tracked as fork patches.

This manifest is the safety net for the v2.0.0 Upstream Realignment (Epic #13):

- it tells the realignment **exactly what to restore or re-apply** after re-basing onto a newer upstream, and
- together with the inline `FORK:<feature>` markers and `docs/FORK-PATCHES.json`, it makes any upstream merge that clobbers a fork feature **fail CI loudly** (`tests/fork-delta-manifest.test.cjs`).

**Feature tags** (used by the inline markers and FORK-PATCHES.json):

| Tag | Feature |
|---|---|
| `fidelity` | Source-fidelity + senior-quality contract (engineering-standards, design/mode/rung gates, TEST-INTEGRITY, untrusted-input boundary, AI-test quality) |
| `strategy` | Strategy chain + Mode + Waves 0–5 (discover-product → model-domain → architecture → security/testing/infra/cicd, Strategy Plan, design detection, roadmap elaboration) |
| `grounding` | Source-grounding enforcement (`## Grounding` block, `check.grounding-plan` gate, grounding resolver + index-refresh hook, Sources of Truth) |
| `exploration` | Mandatory parallel phase exploration (scout-codebase doctrine) |
| `dod` | Cross-cutting Definition-of-Done requirements (`[CROSS-CUTTING]`) |
| `learn` | `/gsd:learn` teaching system (catalog, progress, visual server) |
| `seeds` | `--list-seeds` read-only seed browser — **upstream-absorbed** (#722): upstream v1.6.1 ships `list-seeds` natively (gsd-tools case, workflow, capture routing, help rows); only the fork's extra test coverage remains fork-owned |
| `context-monitor` | Deliberate no-op'ing of the upstream context-monitor hook |
| `no-context-fork` | Removal of `context: fork` from heavy skills (it breaks subagent spawning) |
| `identity` | Fork identity: npm coordinate, repo slug, legacy-cleanup extension, rider config lines |
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
- `commands/gsd/security-strategy.md`
- `commands/gsd/testing-strategy.md`
- `gsd-core/references/application-telemetry.md`
- `gsd-core/references/architecture-decision.md`
- `gsd-core/references/auth-in-tests.md`
- `gsd-core/references/brownfield-adaptation.md`
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
- `gsd-core/workflows/security-strategy.md`
- `gsd-core/workflows/strategy-chain/modes/advance.md`
- `gsd-core/workflows/testing-strategy.md`
- `src/project-command-router.cts`
- `src/project.cts`
- `tests/feat-project-strategy-done.test.cjs`
- `tests/project-query-verbs.test.cjs`
- `tests/strategy-config-and-marker-contracts.test.cjs`

### fidelity — quality contract + execute-phase guards

- `gsd-core/references/ai-test-quality.md`
- `gsd-core/references/engineering-standards.md`
- `tests/source-fidelity-contracts.test.cjs`

Upstream-absorbed (shipped natively by upstream v1.6.1 — no longer fork-owned; do not restore over upstream's copies): `gsd-core/references/execute-phase-between-wave-reset.md`, `gsd-core/references/execute-phase-wave-guard.md`, `gsd-core/references/untrusted-input-boundary.md`.

### grounding — source-grounding resolver, gate, hook

- `gsd-core/references/grounding-citations.md`
- `gsd-core/references/plan-phase-coverage-gate.md`
- `hooks/gsd-grounding-index-refresh.js`
- `src/grounding.cts`
- `tests/feat-grounding-gate.test.cjs`
- `tests/feat-grounding-index-refresh-hook.test.cjs`
- `tests/feat-grounding-resolver.test.cjs`
- `tests/feat-grounding-sources.test.cjs`
- `tests/grounding-shipped-template-fixtures.test.cjs`
- `tests/grounding-fixture-ablation.test.cjs`

### exploration

- `gsd-core/references/exploration-and-adaptability.md`

### learn — /gsd:learn teaching system

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
- `gsd-core/workflows/plan-phase/modes/prd-express.md`

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
| `agents/gsd-executor.md` | fidelity | markers | senior-quality contract, Mode awareness, TEST-INTEGRITY RULE |
| `agents/gsd-integration-checker.md` | fidelity | markers | seam/telemetry + design-source stance |
| `agents/gsd-intel-updater.md` | grounding | markers | `<source_grounding>` block |
| `agents/gsd-pattern-mapper.md` | fidelity | markers | senior-quality + code-quality/source awareness |
| `agents/gsd-phase-researcher.md` | fidelity | markers | rung-fit + source-grounding paras; one-line import (anchor) |
| `agents/gsd-plan-checker.md` | fidelity | anchors-only | 983/1000-line LARGE budget; Canonical-References row + 3 gate bullets |
| `agents/gsd-planner.md` | fidelity | anchors-only | size-gated (XL); senior-quality + Mode paras + Ship-Fast caveat |
| `agents/gsd-project-researcher.md` | fidelity | markers | source-grounding para; one-line import (anchor) |
| `agents/gsd-research-synthesizer.md` | fidelity | anchors-only | one-line import |
| `agents/gsd-roadmapper.md` | strategy | markers | cross-cutting/elaborate-mode, design-aware UI hints, discovery artifacts |
| `agents/gsd-security-auditor.md` | strategy | markers | SECURITY-STRATEGY parent bullet |
| `agents/gsd-ui-checker.md` | fidelity | markers | FE-architecture/Mode tables + design-override principle |
| `agents/gsd-ui-researcher.md` | fidelity | markers | Mode/FE-architecture tables; one-line import (anchor) |
| `agents/gsd-verifier.md` | fidelity | markers | reward-hacking + architecture/strategy/design/mode-fit gates |
| `bin/lib/ui-safety-gate.cjs` | fidelity, strategy | markers | legacy root copy (retained per the canonical header + probed as runtime fallback) kept in sync with `src/ui-safety-gate.cts`: negation guard + UI-hint authority |
| `commands/gsd/ns-manage.md` | learn | anchors-only | `learn` in requires + gsd-learn routing row |
| `commands/gsd/ns-project.md` | strategy | anchors-only | 9 strategy skills in requires + routing rows |
| `docs/ARCHITECTURE.md` | context-monitor | anchors-only | hook-table row: "Inert no-op in this fork" |
| `eslint.config.mjs` | identity | anchors-only | `_reference/**` ignore + generated-lib rider lines |
| `.gitignore` | identity | anchors-only | generated project/grounding/learn .cjs + `_reference/` riders |
| `.github/workflows/release.yml` | release | anchors-only | `NODE_AUTH_TOKEN` env on publish/dry-run steps |
| `gsd-core/bin/lib/legacy-cleanup.cjs` | identity | markers | upstream-signal consts, legacy caches, empty-legacy-runtime-dir scan + apply guard |
| `gsd-core/references/planner-source-audit.md` | fidelity, grounding | markers | DESIGN source + address-failure guard; `## Grounding` fill instructions (fenced DESIGN table row: anchors) |
| `gsd-core/templates/claude-md.md` | grounding | anchors-only | 7-section / sources-of-truth prose (template body) |
| `gsd-core/templates/phase-prompt.md` | grounding | anchors-only | `## Grounding` block (inside fenced template body) |
| `gsd-core/templates/project.md` | strategy, grounding | anchors-only | `## Mode`, `## Sources`, `## Strategy Plan` + Skip-ledger (inside fenced template body) |
| `gsd-core/templates/requirements.md` | dod | anchors-only | `[CROSS-CUTTING]` traceability row |
| `gsd-core/templates/verification-report.md` | fidelity | anchors-only | Mode & Source Fidelity verdict table (inside fenced template body) |
| `gsd-core/workflows/add-tests.md` | fidelity | markers | ai-test-quality contract + TEST-STRATEGY-driven classification; in-step rewrites (anchors) |
| `gsd-core/workflows/autonomous.md` | grounding | anchors-only | `<canonical_refs>` block sits inside the fenced CONTEXT.md template |
| `gsd-core/workflows/code-review.md` | fidelity | anchors-only | source-fidelity inputs added inside a bash fence |
| `gsd-core/workflows/discuss-phase.md` | exploration | anchors-only | SIZE-GATED (29995/30000 bytes!); mandatory-exploration scout step + engineering-standards/canonical-refs lines |
| `gsd-core/workflows/execute-phase.md` | fidelity | anchors-only | SIZE-GATED (89972/90000 bytes!); wave guards, ADR/DoD files_to_read, #1292 fail-safe, design oracle |
| `gsd-core/workflows/help/modes/full.md` | strategy, learn | markers | registration blocks for strategy commands + `/gsd:learn`; the `--list-seeds` row is upstream-native (#722) |
| `gsd-core/workflows/help/modes/topic.md` | learn | anchors-only | one routing-table row |
| `gsd-core/workflows/new-milestone.md` | strategy, validation | markers | Mode refresh, Step 4.5 warm-start, strategy on-ramp (+1-line bullets, anchors); skip-ledger re-adoption lifecycle (anchors) |
| `gsd-core/workflows/new-project.md` | strategy, validation | markers | design detection, brief/legacy/design grounding, `## Mode` fill + `## Sources` registry, Step 7.6; Step-9 on-ramp rewrite (anchors); init-JSON key-list truth-up + LEGACY-INVENTORY router short-circuit (anchors) |
| `gsd-core/workflows/plan-phase.md` | grounding | anchors-only | SIZE-GATED (89119/90000 bytes!); elaboration gate, grounding gate, UI-hint authority, oracle files |
| `gsd-core/workflows/progress.md` | strategy | markers | Strategy-Plan awareness + Mode-staleness hint |
| `gsd-core/workflows/secure-phase.md` | grounding | markers | SECURITY-STRATEGY posture read |
| `gsd-core/workflows/transition.md` | strategy | markers | `## Mode` drift check |
| `gsd-core/workflows/ui-phase.md` | fidelity | anchors-only | two in-list files_to_read lines |
| `gsd-core/workflows/ui-review.md` | grounding | anchors-only | one in-list design-oracle line |
| `gsd-core/workflows/ultraplan-phase.md` | grounding | markers | grounding carried into the cloud prompt (in-fence part: anchors) |
| `hooks/hooks.json` | grounding | anchors-only | JSON; grounding-index-refresh matcher entry |
| `hooks/managed-hooks-registry.cjs` | grounding | anchors-only | one array line |
| `package.json` | identity | anchors-only | JSON; fork name/author/repo + **zero runtime dependencies** (upstream's `dependencies` block deliberately removed) |
| `scripts/prompt-injection-scan.sh` | fidelity | anchors-only | allowlist entry for untrusted-input-boundary.md |
| `src/check-command-router.cts` | grounding | markers | grounding import, gate toggle + `cmdGroundingPlan`, route arm (+field lines, anchors) |
| `src/clusters.cts` | strategy, learn | markers | strategy skill cluster rows (marked); `'learn'` row (anchors) |
| `src/command-aliases.cts` | strategy | markers | `PROJECT_COMMAND_ALIASES` + `PROJECT_SUBCOMMANDS` |
| `src/init-command-router.cts` | strategy | markers | `--design/--no-design` route (+interface line, anchor) |
| `src/init.cts` | strategy | markers | provided-design detection + result fields (+signature, anchor) |
| `src/installer-migration-report.cts` | grounding | anchors-only | one whitelist line |
| `src/profile-output.cts` | grounding | markers | Sources-of-Truth section generator + managed-section wiring (anchors); the fork's GEMINI.md ambient-file branch is upstream-absorbed (`getProjectInstructionFile` runtime policy) |
| `src/ui-safety-gate.cts` | fidelity | markers | negation guard const + skip logic |
| `tests/bug-685-windowshide-spawn.test.cjs` | context-monitor | anchors-only | removed record-session assertion + explanatory note |
| `tests/ci-test-scope.test.cjs` | context-monitor | anchors-only | A1 fixture swapped off the deleted bug-1974 context-monitor test |
| `tests/claude-md.test.cjs` | grounding | anchors-only | 7-section + sources assertions |
| `tests/enh-2790-skill-consolidation.test.cjs` | strategy | anchors-only | new skills in KNOWN_SKILLS set |
| `tests/enh-769-context-fork-effort.install.test.cjs` | no-context-fork | anchors-only | inverted assertions: heavy skills must NOT carry `context: fork` |
| `tests/init.test.cjs` | strategy | markers | provided-design detection tests (+4 baseline asserts, anchors) |
| `tests/issue-607-legacy-cleanup.test.cjs` | identity | markers | upstream-signal, legacy-cache, empty-dir plan/apply tests |
| `tests/ui-safety-gate.test.cjs` | fidelity | markers | negation-guard tests |

### Deletion-only deltas (nothing to anchor — guarded by tests instead)

- `commands/gsd/autonomous.md`, `commands/gsd/execute-phase.md`, `commands/gsd/plan-phase.md` — the fork **removed** `context: fork` from the frontmatter (it forks heavy skills into a context that cannot spawn subagents). Re-apply by deleting the line again after an upstream merge. CI tripwire: `tests/enh-769-context-fork-effort.install.test.cjs` asserts the line is absent — an upstream merge restoring it fails the suite.
- Deleted tests: `tests/bug-1974-context-exhaustion-record.test.cjs`, `tests/bug-2451-context-monitor-over-report.test.cjs`, `tests/perf-317-context-monitor-fs.test.cjs`, `tests/bug-925-context-monitor-hook-event-name.test.cjs` (deleted during the 2.0.0 realignment — same class: it pinned the active hook's event-name behavior, which the inert no-op does not have) — they tested the upstream context-monitor behavior this fork removed. Delete them again if an upstream merge resurrects them. `tests/ci-test-scope.test.cjs` A1 rides on a swapped fixture for the same reason (see the modified table).

### No-op / cosmetic (no restore needed)

- `gsd-core/workflows/execute-phase/steps/codebase-drift-gate.md` — the shim-launcher line was moved to the top of its bash fence (pure reorder + branding).
- `.secretscanignore` — only the allowlist `owner=` handle changed (`@open-gsd/maintainers` → `@TheRocketCodeMX/maintainers`). Note: this form is NOT covered by `scripts/sync-upstream.sh`'s patterns — re-apply by hand or extend the script.
- `.claude-plugin/plugin.json`, `gemini-extension.json` — version field + branding only (version is fork-managed).

---

## Whole-file replacements

The fork version replaces upstream wholesale; during realignment keep the fork file and reconcile upstream changes into it by hand (not vice versa):

- `hooks/gsd-context-monitor.js` — deliberately an **inert no-op** (reads and discards stdin, exits 0). Kept wired/managed so updates overwrite any previously-active version. Never take the upstream implementation.
- `docs/context-monitor.md` — rewritten to document the disablement.
- `gsd-core/references/scout-codebase.md` — upstream's lazy map-selection table was rewritten into the fork's mandatory-exploration doctrine (parallel explorer agents, rationalization-killers, confirm-or-refute gate); the map-selection table survives inside it.
- `CHANGELOG.md` — fork-owned release history (fork versions 1.5.0+). Keep ours; upstream's changelog is not merged.

---

## Branding-only (handled by `scripts/sync-upstream.sh`)

~223 files differ from the base **only** by the six branding forms (`@therocketcode/gsd-core` → `@therocketcode/gsd-core`, `TheRocketCodeMX/gsd-core` → `TheRocketCodeMX/gsd-core`, `therocketcode-gsd-core` → `therocketcode-gsd-core`, the escaped/encoded variants). Do not track them here — after any upstream merge, run `./scripts/sync-upstream.sh` (whole tree) and the identity-drift lint. This includes all runtime-launcher `npx @…/gsd-core` one-liners across workflows/agents, README translations, docs/, `gsd-core/bin/lib/package-identity.cjs`, `gsd-core/bin/check-latest-version.cjs`, `gsd-core/workflows/update.md`, `src/phase-lifecycle.cts`, `src/validate.cts`, and similar.

---

## Generated / regenerable (no restore; regenerate post-port)

- `docs/INVENTORY.md`, `docs/INVENTORY-MANIFEST.json` — regenerate with the inventory tooling after the port.
- `package-lock.json` — regenerate with `npm install` (the fork is zero-runtime-deps; the lock reflects devDependencies only).
- `skills/**/SKILL.md` — regenerate with `npm run gen:plugin-skills` (the 10 fork skills + the ns-router skill bodies are projections of `commands/gsd/*.md`).
- `tests/agent-size-baseline.json`, `tests/workflow-size-baseline.json` — regenerate with `npm run size:baseline` after ports change agent/workflow sizes.

---

## How to use during realignment

1. **Restore additive verbatim** — `git checkout <fork-ref> -- <every path in Additive files>` (skip the *Do NOT restore* pair).
2. **Re-apply marked/anchored patches by hand** — for each FORK-PATCHES entry: `mode=markers` → copy each `FORK:<feature>` block into the new upstream file at the equivalent spot; `mode=anchors-only` → re-apply from `git diff 7eb4d286..<fork-ref> -- <path>`; `mode=whole-file` → keep the fork file, fold upstream changes into it manually. Re-do the deletion-only deltas.
3. **Rebrand** — `./scripts/sync-upstream.sh` (plus the `.secretscanignore` owner handle, which it misses).
4. **Regenerate the generated** — inventory docs and `package-lock.json`; then `npm run generate:identity && npm run build:lib`.
5. **Prove it** — full `npm run test:unit` (zero `not ok`), `npm run lint`, `npm run check:identity-drift`. `tests/fork-delta-manifest.test.cjs` fails loudly if any marker pair or anchor was lost in the merge.
