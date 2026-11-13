# Upstream realignment runbook

How this fork absorbs a new upstream release (the `gsd-core` repository of the open-gsd organisation) without losing a fork feature. It is the procedure the weekly realignment routine follows and the one a human follows by hand; both read this file, so improve it whenever a run teaches something new.

The fork is upstream plus a registered set of fork patches: `docs/FORK-PATCHES.json` (machine manifest, anchors are JS regexes) and `docs/FORK-DELTA.md` (human ledger, additive files, supersessions). A realignment is a **merge** of the upstream release tag into `next`, so upstream stays a recorded git ancestor of every fork branch. Never squash, rebase or cherry-pick a realignment.

## When to run

- Weekly. A run only does work when upstream has published a release tag newer than the one `next` already contains (`git merge-base --is-ancestor <upstream tag> origin/next`).
- Skip (and say why) when an `align/upstream-*` PR is already open, a `release/*` or `hotfix/*` branch is mid-flight, or `next` holds unreleased fork work that has not shipped yet.
- Target the newest upstream release tag, not `upstream/main` or `upstream/next`.

## Setup

1. `git fetch upstream refs/tags/vX.Y.Z:refs/tags/upstream-vX.Y.Z` — the fork has old local tags with the same names (pre-2.0 lineage), so always fetch upstream tags under the `upstream-` prefix and never use a bare `vX.Y.Z` tag for upstream.
2. Cut the branch from the **current** `origin/next` tip: `align/upstream-X.Y.Z`. A worktree inside the project (`.superpowers/worktrees/<name>`, excluded via `.git/info/exclude`) — never `/tmp` (out-of-project paths raise a permission prompt per file operation for unattended agents).
3. `git merge upstream-vX.Y.Z --no-commit`. Resolve `package.json` / `package-lock.json` first (theirs + fork identity: `@therocketcode/gsd-core`, the current fork version, author/repo/homepage/bugs, `engines.node`, zero runtime `dependencies`), then `npm install --ignore-scripts`.
4. Read upstream's CHANGELOG for every release in the range and list each change that lands on a fork surface before resolving anything. Upstream's release notes can re-list items from earlier releases; compare against what the previous realignment already absorbed so the changeset claims only what is new.
5. Take the fork delta against `git merge-base origin/next upstream-vX.Y.Z`, not against the previous `upstream-v*` tag. Upstream cuts each release commit on a release branch that does not flow back into its `next`, so the previous tag is often not an ancestor of the new one (align-1.20.0: the base was `f2a1feedd`, one commit before the v1.19.0 release commits).

## Resolution law

1. **Upstream wins by default.** Take theirs, then re-place fork content. Never ours-first.
2. **Fork content is exactly what `FORK-PATCHES.json` registers.**
   - `markers`: copy each `<!-- FORK:<feature> BEGIN/END -->` block from `git show origin/next:<path>` to the equivalent spot in the new upstream text.
   - `anchors-only`: re-apply from `git diff $(git merge-base origin/next upstream-vX.Y.Z) origin/next -- <path>`; the anchors are tripwires.
   - `whole-file`: ours.
   - Working method: theirs + `git apply --reject` of the fork delta, then hand-place each `.rej` hunk against the upstream text.
3. **Identity is ours**: `@therocketcode` names and npx hints, CODEOWNERS and `.github/MAINTAINERS` (fork logins only), plugin manifests. `scripts/sync-upstream.sh` does the bulk rebrand; check it did not clobber a file that must contain the upstream name literally (build such names from parts).
4. **Mechanical classes**: `capabilities/*/capability.json` theirs + the fork version + fork-pinned deltas; generated files from either side, then `npm run regen:derived` after all source edits and again at the end; allowlists theirs, then let the lints name fork additions; `tests/fixtures/**` theirs unless they assert fork identity; `npm run gen:install-tree` last.
5. **Supersession**: when upstream ships what a fork patch did, drop the fork copy, remove its manifest entry and add `<!-- SUPERSEDED (align-X.Y.Z): … -->` to FORK-DELTA (basename-free wording — a lint flags deleted basenames).
6. **Size caps** (agent, workflow, ADR-857 ceilings): compress fork blocks into pointers to reference/step files. Raise a ceiling only when upstream's own body leaves zero headroom, and mirror the raise in every test that pins it.
7. **Policy for upstream bugs**: code byte-identical to upstream is upstream's to fix — do not patch it in the fork. A fork patch is justified only for fork-authored behaviour, or a contributor's finished fix that upstream will not take, registered like any other patch.
8. Undecidable conflicts: take theirs and record the hunk under "needs owner eyes". Never stall a run on one file.

The merge commit subject is load-bearing (the emitted-attribution trailer read, the compact-content partition guard and lint-removed-but-needed recognise it): `Merge upstream vX.Y.Z into align/upstream-X.Y.Z — waves 1-3 (N conflicts resolved)`.

## Recurring traps

- **Hook-lib roster**: `GSD_HOOK_LIB_FILES` in `bin/install.js` must be the union of upstream's roster and every file in `hooks/lib/`; upstream ships helpers without rostering them and uninstall then leaves `hooks/lib` behind.
- **Command names**: docs use the hyphen form (for example `/gsd-progress`). No interpolated or placeholder colon token anywhere (`/gsd:${X}`, `/gsd:{X}`) — the install-time converter cannot rewrite them; write `/gsd-{X}`. Only live command names.
- **Typed arguments**: workflows read `$ARGUMENTS` once through upstream's quoted-heredoc capture (`IFS= read -rd '' GSD_ARGS <<'GSD_ARGS_END'`) and parse `GSD_ARGS`; a fork workflow must never splice `$ARGUMENTS` into shell. The four capture lines must start at column 0 even inside a fence indented under a list item — the gate matches them exactly. In a lazily read detail file, follow upstream's own convention in that file.
- **Workflow contract lints** that recur on fork files: `config-get … --raw`, the response-language directive line, responsive separators, a resolved model for every `gsd-*` spawn, an INVENTORY row for every manifest entry, `<arguments>` on argument-taking skills.
- **Emitted-drift acknowledgements are commit trailers**: `Emitted-Drift-Ack-Growth: <bare filename> — <reason>` (and `Emitted-Drift-Ack-Hash:`) in the final paragraph of a commit, together with `Co-Authored-By`. One key once over `origin/next..HEAD`; acknowledgements the gate did not ask for are reported as stale. Locally set `GITHUB_BASE_REF=next`.
- **Changesets**: the branch carries only `archived/` and the new `align-upstream-X-Y-Z.md`; `pr:` must be the real numeric PR number before the changeset lint runs.
- **Compact content**: upstream splits workflows into a spine + `<name>/detail/*.md` and ships `.compact.md` variants; fork blocks follow their text into the detail file and are carried into compact variants, each with its own manifest entry. A detail file may not repeat a spine line verbatim (partition-guard disjointness), and any edit to a split file changes its token count: run `node scripts/benchmark-compact-content.cjs --write` and commit the refreshed baseline.
- **Extracted fork blocks vs upstream pins**: when the fork moved a block of an upstream workflow into a step file (for example execute-phase's wave tracking write in `execute-phase/steps/post-wave-tracking-update.md`), an upstream change to that block arrives as a conflict in the host. Fold upstream's change into the step file, keep the host pointer, and re-target any new upstream test that reads the host for that block (FORK comment + FORK-PATCHES entry). Fork tests that run the block with a stubbed `gsd_run` may need the stub to answer the new contract.
- **Agent size tiers**: when upstream's own agent body leaves less room than the fork's marked block needs, re-tier the agent in `tests/agent-size-budget.test.cjs` (commented, with a ratchet-back note) instead of raising a tier cap. That is what the v1.9.0 executor/plan-checker and v1.20.0 code-reviewer moves did.
- **Rebrand count**: `sync-upstream.sh` reports every file that mentions an upstream name, including ones it leaves unchanged. To check for self-clobber, compare per-file upstream-name counts against `origin/next`; the reported total does not tell you that.
- **Half-rebranded test fixtures**: the rebrand rewrites the lowercase upstream `owner/repo` constant of a new upstream test but not a mixed-case literal (`Open-GSD/GSD-Core`) or a split `{ owner, repo }` pair in the same file, so a same-repo or case-insensitivity fixture stops naming the repo the constant names and the test fails (align-1.20.1: `merge-commit-pr`, `release-pipeline-pr`, `emitted-attribution`). Run every new upstream test that mentions the repo after `sync-upstream.sh`, and derive the odd forms from the rebranded constant (`REPO.toUpperCase()`) with an identity manifest entry. A fixture can also be calibrated to the upstream slug's LENGTH (align-1.21.0: `changelog-release-notes` floor-1 sized its bullet for `owner/repo` of 17 characters); size it from the constant (`80 + SLUG.length`). This runbook names the upstream coordinate only in words for the same reason: `sync-upstream.sh` over the tree rewrites a literal one here too, so check `git diff` on this file after the rebrand.
- **Sandbox HOME for tests**: an install into a sandbox HOME writes `~/.gsd/defaults.json`, and tests that parse `gsd-tools` stderr as JSON then fail on its precedence warning. Keep the install HOME and the test HOME separate.
- **Release-pipeline branch names**: upstream's release-pipeline PR classifier (`scripts/release-pipeline-pr.cjs`) exempts `release/A.B.0` and `hotfix/A.B.C` into `main` and `chore/backmerge-main-to-next-<sha>` into `next`. The fork's manual back-merge branch `chore/backmerge-A.B.0-to-next` is not one of them, so its issue-link and changeset-lint failures stay expected (Release step 5). `release.yml` refuses `create` and `finalize` unless `origin/main` is an ancestor of `origin/next` (#5894), so a back-merge must never be squashed.
- **Resolve conflicts hunk by hunk, never `git checkout --ours <file>`**: it drops upstream's auto-merged hunks in the same file too (align-1.21.0: `package.json` lost upstream's `gen:cli-surface-manifest` script and the `lint:generated-sync` check until `git checkout -m` recreated the conflict). Take ours or theirs per conflict block; whole-file `--ours` is right only for `whole-file` entries and CHANGELOG.md.
- **Strict argument parsing (#6087, v1.21.0+)**: every verb in the gsd-tools universe must be declared in `src/cli-surface.cts` `CLI_SURFACE` or listed undeclared (`tests/cli-surface-parity.test.cjs` T-C1). Fork capability families and fork `project.*` alias canonicals go in `FORK_UNDECLARED_VERBS` (never in upstream's `UNDECLARED_VERBS`, whose T-C3 ratchet only shrinks); a fork flag on a declared verb goes in that verb's spec. Regenerate `docs/CLI-SURFACE-MANIFEST.json` and add a row to `tests/fork-verbs-strict-args.test.cjs` for every new fork flag shape.
- **Timeout evidence census (#6059-#6063, v1.21.0+)**: `tests/helpers/timeouts.cjs` records, per timeout constant, how many raw child_process call sites the CI evidence cannot see (`unseenSites`), and `timeout-evidence-from-ci.test.cjs` recounts them on the live tree. Fork tests spawn through `tests/helpers/process-seam.cjs` (`runNode`, `runGit`, `runHook` with `interpreter: 'bash'`/`'sh'`). When upstream's count includes a test the fork deletes, the fork carries its own count (`GSD_TOOLS_CLI_MODERATE_TIMEOUT_MS`: 3, not 4, for the deleted perf-317 test) as a registered patch.
- **lint-removed-but-needed on a realignment merge (v1.21.0)**: upstream #5921 deleted force-committed `.gsd/phase/...` files whose basenames (`40-design.md`, `50-test-matrix.md`) appear in many built `gsd-core/bin/lib` comments. The lint's #3677 refinement matches gitignored deletions by full path, but turns itself off when the diff `origin/next...HEAD` touches any `.gitignore`, and a realignment merge always carries upstream's `.gitignore` edits. Upstream's own release PR into `main` never runs `test.yml`, so upstream does not see it. Fixed by a registered fork patch (owner-approved): the refinement treats `.gitignore` as untouched when every `.gitignore` change in the PR is exactly upstream's change brought in by the `Merge upstream vX.Y.Z into align/upstream-X.Y.Z` commit (one more reason that subject is load-bearing). So never edit a `.gitignore` in the merge commit or a later realignment commit: a fork rule turns the refinement off again and the lint goes red on any upstream deletion of a gitignored file. If the fork needs a new ignore rule, land it on `next` in its own PR.
- **Sandboxes live outside the worktree**: ESLint in `lint:ci` walks untracked files under the worktree, so a sandbox install under the worktree's `.superpowers/` turns lint red with hundreds of unrelated errors. Put sandbox homes and installs in the main checkout's `.superpowers/sandboxNNNN/`.
- **Win32 probes on WSL**: tests that fake `process.platform = 'win32'` and run the installer (`windows-powershell-hook-runner` "#5850 the installer writes the shell key", `configured-entrypoint-validation` #5100) hit the installer's WSL guard (it reads `/proc/version`) and fail on a WSL host only. Reproduce on `origin/next` before calling one REAL, and check fork hooks with a probe that hides `/proc/version` from `fs.existsSync` and unsets `WSL_DISTRO_NAME`.
- **New fork test files and `lint-test-file-count`**: a file named `<module>-*.test.cjs` counts against that module's two-file limit; name a fork test after the fork concern instead.
- **Shell edits**: never `sed -i "${L}a …"` with a possibly empty variable (it appends after every line). Use `node -e` edits that throw when the anchor is missing.
- **Fork fixes that must survive every pull**: `uat.complete-session` treats `[pending-certifier]` and `could-not-prove` as blocking; `strategy-plan` honours ledgered skips; strategy verbs resolve the shared root PROJECT.md under workstreams; `context verify` resolves phases through upstream's convention-aware locator; `roadmap.md` honours `--ws`; the smart-entry mid-chain route; the `FORK:fast-scope` gate in `fast.md`.

## Gates (all must be green before merging)

Run tests smartly: the full suite costs well over an hour and 96% of it is upstream's.

1. **During resolution**: every test file that scans the workflow tree generically (`grep -lE "WORKFLOWS_DIR|gsd-core/workflows" tests/*.cjs` — a keyword grep on test names misses them), the test files whose sources changed, plus the fork contract suites (`fork-delta-manifest`, `emitted-attribution`, `emitted-sizes`, `planner-language-regression`, `workflow-size-budget`, `golden-install-tree`, `realign-2-0-0-update-matrix.install`, `auto-advance-endings`, `roadmap-after-strategy`, `mid-strategy-chain-route`, `project-query-verbs`, `feat-context-router`, `uat-complete-session`), and `npm run lint:ci` (exit 0) in the foreground.
2. **Once, at the final branch head, in parallel**:
   - full `npm run test:unit` and `npm run test:install` on a **clean checkout** (not the worktree — fixtures and build artifacts differ);
   - pre-ship operator matrix A (seams, emitted output per runtime, security, new upstream features) and B (upgrade of a real project from the previous fork release, modes, strategy chain, workstreams, STATE writers) **on the installed candidate** (`npm pack` + install);
   - the PR's CI (its sharded full lanes are the second full pass).
3. Fixes found by any of these go through one sequential fixer (never parallel writers in one worktree), then only the affected tests plus CI re-run on the new head. Do not re-run the full local suite for targeted fixes.
4. A gate failure is classified STALE (upstream moved/renamed/re-pinned something; fix the fork pin) or REAL (fork behaviour broke; fix the code), with an upstream citation.

## Release

1. Merge the PR into `next` with a **merge commit**; confirm `git merge-base --is-ancestor upstream-vX.Y.Z origin/next`.
2. `gh workflow run release.yml --ref next -f action=create -f version=A.B.0` (minor), then `-f action=finalize` on `release/A.B.0`. Publishing is npm **trusted publishing** (OIDC); no npm credential is stored or needed.
3. npm processes publishes asynchronously; the workflow's publish verification can time out while the version is still appearing. If the publish step printed `+ @therocketcode/gsd-core@A.B.0`, do not re-publish — watch `npm view @therocketcode/gsd-core@A.B.0 version` until it resolves and the tarball downloads.
4. If a finalize run dies after the tag step and the release branch then needs a commit, delete that tag only after confirming neither the npm version nor the GitHub release exists.
5. Since v1.21.0 (#5922) finalize builds the stable release body from the promoted CHANGELOG section (`scripts/release-notes/changelog-release-notes.cjs`, package identity from `package-identity.cjs`), so the manual `gh release edit --notes-file` step is no longer needed; check the release page once. Open and merge `release/A.B.0 → main` and `main → next` (merge commits; issue-link / changeset-lint failures on these two PRs are expected and non-blocking).
6. Patch releases: build `hotfix/A.B.C` by hand from the `vA.B.(C-1)` tag and cherry-pick only that fix's commits oldest-first (the tree must equal `next`), then `finalize`; afterwards `git rm` the hotfix's changeset on `next` (the backmerge keeps a one-sided add).

## Stop conditions — do not publish

Stop before merging, leave the PR open and write the report when any of these holds:

- a gate cannot be made green with a STALE/REAL fix inside fork-owned code;
- a fix would require changing upstream-identical code;
- an upstream change removes or contradicts a fork feature and the right resolution is a product decision;
- a breaking upstream change has no literally-true changeset wording yet;
- anything touches credentials, publishing configuration or branch protection.

## Report

Every run writes a report (commits, per-wave ledger, supersession table, anchor moves, fallout stale-vs-real table, gate evidence with exact counts and exit codes, needs-owner-eyes) and summarises it in the PR body and in its final message.
