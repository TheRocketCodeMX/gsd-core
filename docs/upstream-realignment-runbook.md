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
4. Read upstream's CHANGELOG for every release in the range and list each change that lands on a fork surface before resolving anything.

## Resolution law

1. **Upstream wins by default.** Take theirs, then re-place fork content. Never ours-first.
2. **Fork content is exactly what `FORK-PATCHES.json` registers.**
   - `markers`: copy each `<!-- FORK:<feature> BEGIN/END -->` block from `git show origin/next:<path>` to the equivalent spot in the new upstream text.
   - `anchors-only`: re-apply from `git diff $(git merge-base origin/next upstream-vX.Y.Z) origin/next -- <path>`; the anchors are tripwires.
   - `whole-file`: ours.
   - Working method: theirs + `git apply --reject` of the fork delta, then hand-place each `.rej` hunk against the upstream text.
3. **Identity is ours**: `@therocketcode` names and npx hints, CODEOWNERS, plugin manifests. `scripts/sync-upstream.sh` does the bulk rebrand; check it did not clobber a file that must contain the upstream name literally (build such names from parts).
4. **Mechanical classes**: `capabilities/*/capability.json` theirs + the fork version + fork-pinned deltas; generated files from either side, then `npm run regen:derived` after all source edits and again at the end; allowlists theirs, then let the lints name fork additions; `tests/fixtures/**` theirs unless they assert fork identity; `npm run gen:install-tree` last.
5. **Supersession**: when upstream ships what a fork patch did, drop the fork copy, remove its manifest entry and add `<!-- SUPERSEDED (align-X.Y.Z): … -->` to FORK-DELTA (basename-free wording — a lint flags deleted basenames).
6. **Size caps** (agent, workflow, ADR-857 ceilings): compress fork blocks into pointers to reference/step files. Raise a ceiling only when upstream's own body leaves zero headroom, and mirror the raise in every test that pins it.
7. **Policy for upstream bugs**: code byte-identical to upstream is upstream's to fix — do not patch it in the fork. A fork patch is justified only for fork-authored behaviour, or a contributor's finished fix that upstream will not take, registered like any other patch.
8. Undecidable conflicts: take theirs and record the hunk under "needs owner eyes". Never stall a run on one file.

The merge commit subject is load-bearing (the emitted-attribution trailer read and the compact-content partition guard recognise it): `Merge upstream vX.Y.Z into align/upstream-X.Y.Z — waves 1-3 (N conflicts resolved)`.

## Recurring traps

- **Hook-lib roster**: `GSD_HOOK_LIB_FILES` in `bin/install.js` must be the union of upstream's roster and every file in `hooks/lib/`; upstream ships helpers without rostering them and uninstall then leaves `hooks/lib` behind.
- **Command names**: docs use the hyphen form (for example `/gsd-progress`). No interpolated or placeholder colon token anywhere (`/gsd:${X}`, `/gsd:{X}`) — the install-time converter cannot rewrite them; write `/gsd-{X}`. Only live command names.
- **Typed arguments**: workflows read `$ARGUMENTS` once through upstream's quoted-heredoc capture (`IFS= read -rd '' GSD_ARGS <<'GSD_ARGS_END'`) and parse `GSD_ARGS`; a fork workflow must never splice `$ARGUMENTS` into shell.
- **Workflow contract lints** that recur on fork files: `config-get … --raw`, the response-language directive line, responsive separators, a resolved model for every `gsd-*` spawn, an INVENTORY row for every manifest entry, `<arguments>` on argument-taking skills.
- **Emitted-drift acknowledgements are commit trailers**: `Emitted-Drift-Ack-Growth: <bare filename> — <reason>` (and `Emitted-Drift-Ack-Hash:`) in the final paragraph of a commit, together with `Co-Authored-By`. One key once over `origin/next..HEAD`; acknowledgements the gate did not ask for are reported as stale. Locally set `GITHUB_BASE_REF=next`.
- **Changesets**: the branch carries only `archived/` and the new `align-upstream-X-Y-Z.md`; `pr:` must be the real numeric PR number before the changeset lint runs.
- **Compact content**: upstream splits workflows into a spine + `<name>/detail/*.md` and ships `.compact.md` variants; fork blocks follow their text into the detail file and are carried into compact variants, each with its own manifest entry.
- **Shell edits**: never `sed -i "${L}a …"` with a possibly empty variable (it appends after every line). Use `node -e` edits that throw when the anchor is missing.
- **Fork fixes that must survive every pull**: `uat.complete-session` treats `[pending-certifier]` and `could-not-prove` as blocking; `strategy-plan` honours ledgered skips; strategy verbs resolve the shared root PROJECT.md under workstreams; `context verify` resolves phases through upstream's convention-aware locator; `roadmap.md` honours `--ws`; the smart-entry mid-chain route; the `FORK:fast-scope` gate in `fast.md`.

## Gates (all must be green before merging)

Run tests smartly: the full suite costs well over an hour and 96% of it is upstream's.

1. **During resolution**: only the test files whose sources changed, plus the fork contract suites (`fork-delta-manifest`, `emitted-attribution`, `emitted-sizes`, `planner-language-regression`, `workflow-size-budget`, `golden-install-tree`, `realign-2-0-0-update-matrix.install`, `auto-advance-endings`, `roadmap-after-strategy`, `mid-strategy-chain-route`, `project-query-verbs`, `feat-context-router`, `uat-complete-session`), and `npm run lint:ci` (exit 0) in the foreground.
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
5. Set the GitHub release notes from the promoted CHANGELOG section; open and merge `release/A.B.0 → main` and `main → next` (merge commits; issue-link / changeset-lint failures on these two PRs are expected and non-blocking).
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
