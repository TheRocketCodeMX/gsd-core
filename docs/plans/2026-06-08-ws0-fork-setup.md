# WS0 — Fork Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up our private fork of `TheRocketCodeMX/gsd-core@v1.4.0` in the project root — clean base, rebranded package identity (`@rocket/gsd-core`, unpublishable), upstream tracking for cherry-picks, and the inherited test/security suites proven green.

**Architecture:** The project root (`/home/bricemacias/Rocket/Projects/gsd-in-house`) becomes the fork. We initialize git, add `TheRocketCodeMX/gsd-core` as the `upstream` remote, and base our `main` branch on the `v1.4.0` tag so we inherit full history (required for cherry-picking upstream fixes). We change only `package.json` identity fields and regenerate the baked identity seam; the `gsd:` command namespace, directory names, and runtime paths are untouched (minimal churn). The 557 cosmetic `@opengsd` doc references are explicitly deferred.

**Tech Stack:** Node ≥22 + npm ≥10, git, the gsd-core build (`tsc` via `npm run build:lib`), and gsd-core's own test runner (`scripts/run-tests.cjs`) with suites `unit` / `security` and lints `check:identity-drift` / `lint:skill-deps`.

**Key references (read before executing):**
- `docs/specs/2026-06-08-fork-methodology.md` §1 (fork strategy) and §7 (open decisions)
- `_reference/gsd-core/package.json` (the identity fields we edit)
- `_reference/gsd-core/scripts/generate-package-identity.cjs` (how identity is baked from package.json)
- `_reference/gsd-core/scripts/lint-package-identity-drift.cjs` (what the drift lint does/does not check)

**Assumptions / risks to verify during execution:**
- The release tag is `v1.4.0`. Task 2 verifies the exact tag name before checkout and adapts if it differs (e.g. `1.4.0`).
- A full clone/fetch of gsd-core may be large; allow a few minutes.
- The full `npm test` suite may require environment setup we don't have on a fresh WSL box; the **hard gates** for WS0 are `build:lib`, `test:security`, `test:unit`, and `check:identity-drift`. The full suite is run best-effort only.

---

### Task 1: Preflight checks

**Files:**
- None (read-only environment verification)

- [ ] **Step 1: Verify Node and npm versions**

Run: `node --version && npm --version`
Expected: Node `v22.x` or higher, npm `10.x` or higher. If Node < 22, stop and install Node 22 (an `.nvmrc` will exist in the fork after Task 2; you can `nvm use` once it's present). Do not proceed on Node < 22 — `engines` requires it and `tsc` build may fail.

- [ ] **Step 2: Verify git is available and the project root is NOT yet a git repo**

Run: `cd /home/bricemacias/Rocket/Projects/gsd-in-house && git --version && (git rev-parse --is-inside-work-tree 2>/dev/null && echo "ALREADY A REPO — STOP" || echo "not a repo — ok to init")`
Expected: prints git version, then `not a repo — ok to init`. If it prints `ALREADY A REPO — STOP`, halt and reassess — this plan assumes a fresh root.

- [ ] **Step 3: Confirm expected pre-existing contents**

Run: `ls -A /home/bricemacias/Rocket/Projects/gsd-in-house`
Expected: contains `_reference` and `docs` (our methodology spec lives at `docs/specs/`). These must survive the fork import.

---

### Task 2: Initialize the fork from upstream at the v1.4.0 tag

**Files:**
- Create: `.git/` (repo), working tree populated from `TheRocketCodeMX/gsd-core@v1.4.0`

- [ ] **Step 1: Initialize git and add the upstream remote**

```bash
cd /home/bricemacias/Rocket/Projects/gsd-in-house
git init
git remote add upstream https://github.com/TheRocketCodeMX/gsd-core.git
```

- [ ] **Step 2: Fetch upstream with tags**

Run: `git fetch upstream --tags`
Expected: downloads objects and refs; completes without error.

- [ ] **Step 3: Verify the exact release tag name**

Run: `git tag -l '*1.4.0*'`
Expected: prints `v1.4.0`. If instead it prints `1.4.0` (no `v`), use that exact string in Step 4. If nothing prints, run `git tag -l | sort -V | tail -10`, pick the highest `1.4.x` release tag, and use it in Step 4.

- [ ] **Step 4: Create the `main` branch from the tag (brings full history + working tree)**

```bash
git checkout -b main v1.4.0
```
Expected: switches to a new branch `main`; the working tree now contains the gsd-core files (`commands/`, `gsd-core/`, `scripts/`, `package.json`, `TESTING-STANDARDS.md`, etc.) alongside our pre-existing `_reference/` and `docs/specs/`.

- [ ] **Step 5: Verify the import and that our spec survived**

```bash
test -f package.json && grep -q '"@therocketcode/gsd-core"' package.json && echo "fork files present"
test -f docs/specs/2026-06-08-fork-methodology.md && echo "our spec survived"
git log --oneline -1 upstream/main >/dev/null 2>&1 || true
git describe --tags
```
Expected: `fork files present`, `our spec survived`, and `git describe --tags` prints `v1.4.0`.

---

### Task 3: Prove the inherited base is green BEFORE any changes

> Rationale: establishing a green baseline on the untouched upstream tree means any failure after our rebrand is unambiguously ours.

**Files:**
- Create (generated, gitignored): `gsd-core/bin/lib/*.cjs` (built by `npm install` → `prepare`)

- [ ] **Step 1: Install dependencies (also runs `prepare` → `build:lib`)**

Run: `npm install`
Expected: installs deps and runs the `prepare` build (`tsc -p tsconfig.build.json`) without error; generated `gsd-core/bin/lib/*.cjs` files appear.

- [ ] **Step 2: Verify the build emitted the runtime lib**

Run: `test -f gsd-core/bin/lib/package-identity.cjs && echo "identity seam built"`
Expected: `identity seam built`.

- [ ] **Step 3: Run the security suite (a hard gate — we keep this)**

Run: `npm run test:security`
Expected: PASS (exit 0). This is gsd-core's anti-supply-chain suite (npm-integrity, secret-scan, prompt-injection-scan, base64-scan).

- [ ] **Step 4: Run the unit suite and the identity-drift lint (hard gates)**

```bash
npm run test:unit
npm run check:identity-drift
```
Expected: unit suite PASS; identity-drift prints `ok identity-drift: all GSD coordinate literals match the seam`.

- [ ] **Step 5: Best-effort full suite (informational, not a gate)**

Run: `npm test || echo "FULL SUITE had failures — record them, not a WS0 blocker"`
Expected: either PASS, or a recorded list of failures. Note any failures in the commit message of Task 8 so we know the inherited baseline state. Do not fix upstream test failures in WS0.

---

### Task 4: Rebrand the package identity to `@rocket/gsd-core` (unpublishable)

**Files:**
- Modify: `package.json` (fields: `name`, `author`, `repository.url`, `homepage`, `bugs.url`; add `private: true`; remove `publishConfig`)
- Regenerate: `gsd-core/bin/lib/package-identity.cjs` (via `npm run generate:identity`)

- [ ] **Step 1: Edit `package.json` identity fields**

Apply these exact changes to `/home/bricemacias/Rocket/Projects/gsd-in-house/package.json`:

Change line:
```json
  "name": "@therocketcode/gsd-core",
```
to:
```json
  "name": "@rocket/gsd-core",
  "private": true,
```

Change:
```json
  "author": "OpenGSD",
```
to:
```json
  "author": "Rocket",
```

Change the `repository`, `homepage`, and `bugs` block:
```json
  "repository": {
    "type": "git",
    "url": "git+https://github.com/TheRocketCodeMX/gsd-core.git"
  },
  "homepage": "https://github.com/TheRocketCodeMX/gsd-core",
  "bugs": {
    "url": "https://github.com/TheRocketCodeMX/gsd-core/issues"
  },
```
to (point at our private repo — adjust the slug if our actual remote differs; if there is no Rocket GitHub repo yet, keep the placeholder slug `rocket/gsd-core` consistently so the derived `repoSlug` is internal-only):
```json
  "repository": {
    "type": "git",
    "url": "git+https://github.com/rocket/gsd-core.git"
  },
  "homepage": "https://github.com/rocket/gsd-core",
  "bugs": {
    "url": "https://github.com/rocket/gsd-core/issues"
  },
```

Delete the `publishConfig` block (publishing is disabled by `private: true`):
```json
  "publishConfig": {
    "access": "public"
  },
```

- [ ] **Step 2: Regenerate the baked identity seam from the new package.json**

Run: `npm run generate:identity`
Expected: prints `wrote gsd-core/bin/lib/package-identity.cjs`.

- [ ] **Step 3: Verify the seam picked up the new name**

Run: `node -e "console.log(require('./gsd-core/bin/lib/package-identity.cjs').packageName)"`
Expected: prints `@rocket/gsd-core`.

- [ ] **Step 4: Verify `private: true` blocks publishing**

Run: `npm publish --dry-run 2>&1 | grep -i "private\|cannot publish" || echo "check output"`
Expected: npm refuses with a "This package has been marked as private" style message. (Dry-run only; never actually publish.)

- [ ] **Step 5: Re-run the identity-drift lint and confirm still clean**

Run: `npm run check:identity-drift`
Expected: `ok identity-drift: all GSD coordinate literals match the seam` (our change targets `@therocketcode/gsd-core`, which this lint does not scan for, so it stays green).

---

### Task 5: Gitignore reference material and local planning noise

**Files:**
- Modify: `.gitignore` (append a fork-local section)

- [ ] **Step 1: Append our ignore rules to `.gitignore`**

Append these lines to the end of `/home/bricemacias/Rocket/Projects/gsd-in-house/.gitignore`:
```gitignore

# ── Rocket fork: local reference clones (not part of the fork) ──
_reference/
```

- [ ] **Step 2: Verify `_reference/` is ignored and our docs are tracked**

```bash
git status --porcelain _reference/ | head -1   # expect: no output (ignored)
git status --porcelain docs/specs/ docs/plans/ | head   # expect: our spec + this plan listed as untracked/added
```
Expected: `_reference/` produces no `git status` output (ignored); `docs/specs/...` and `docs/plans/...` appear as additions.

---

### Task 6: Confirm all hard gates still green after the rebrand

**Files:**
- None (verification only)

- [ ] **Step 1: Rebuild and re-run the hard gates**

```bash
npm run build:lib
npm run test:security
npm run test:unit
npm run check:identity-drift
npm run lint:skill-deps
```
Expected: every command exits 0. If `test:unit` or `test:security` now fails where it passed in Task 3, the rebrand caused it — investigate before committing (the only changed inputs are `package.json` and the regenerated seam).

- [ ] **Step 2: Confirm the generated seam is not accidentally staged**

Run: `git check-ignore gsd-core/bin/lib/package-identity.cjs && echo "seam is gitignored (good)"`
Expected: `seam is gitignored (good)` — the seam is build-generated (per upstream `.gitignore`), so we never commit it; `generate:identity`/`build:lib` recreate it.

---

### Task 7: Document the upstream cherry-pick workflow

**Files:**
- Create: `docs/MAINTAINING-FORK.md`

- [ ] **Step 1: Write the fork-maintenance guide**

Create `/home/bricemacias/Rocket/Projects/gsd-in-house/docs/MAINTAINING-FORK.md` with this content:

```markdown
# Maintaining the Rocket fork of gsd-core

Base: `TheRocketCodeMX/gsd-core`, pinned at `v1.4.0`. We track upstream and cherry-pick.

## Remotes
- `upstream` → https://github.com/TheRocketCodeMX/gsd-core.git (read-only source of fixes)
- `origin`   → our private repo (set this once: `git remote add origin <url>`)

## Pulling upstream fixes
```bash
git fetch upstream --tags
git log --oneline main..upstream/main        # review what's new
git cherry-pick <sha>                         # pick specific fixes/security patches
# resolve conflicts (most will be in docs/branding we changed); keep our identity
npm run generate:identity                     # re-bake if package.json changed
npm run build:lib && npm run test:security && npm run test:unit && npm run check:identity-drift
```

## What we deliberately diverge on (expect conflicts here, keep OURS)
- `package.json` identity: `name` (@rocket/gsd-core), `private`, `author`, `repository`, `homepage`, `bugs`.
- Our additions under `commands/gsd/`, `gsd-core/workflows/`, `gsd-core/references/`, `gsd-core/templates/` for the new skills (WS1/WS2).

## Adopting a newer base version
To move from v1.4.0 to a later release, cherry-pick onto a branch or rebase our fork commits onto the new tag, then re-run all hard gates. Never fast-forward `main` to `upstream/main` blindly — it would drop our identity changes.

## Deferred cleanup (tracked, not yet done)
- ~557 cosmetic `@opengsd` references in docs/READMEs/tutorials (out of scope for the identity-drift lint). Sweep when convenient; not required for building skills.
- Pruning upstream community/release CI workflows (`.github/workflows/`: discord-changelog, auto-label-issues, release.yml, etc.) that don't apply to an internal fork. Keep `test.yml`, `security-scan.yml`, `mutation.yml`.
```

- [ ] **Step 2: Verify the file exists**

Run: `test -f docs/MAINTAINING-FORK.md && echo "fork guide written"`
Expected: `fork guide written`.

---

### Task 8: Baseline commits

**Files:**
- Commit the fork baseline, then our changes on top.

- [ ] **Step 1: Stage and commit the rebrand + fork additions**

```bash
cd /home/bricemacias/Rocket/Projects/gsd-in-house
git add package.json .gitignore docs/MAINTAINING-FORK.md docs/specs/ docs/plans/
git status   # confirm _reference/ is NOT staged and the generated seam is NOT staged
git commit -m "chore: fork gsd-core@v1.4.0 as @rocket/gsd-core (private), add fork docs

- Base: TheRocketCodeMX/gsd-core v1.4.0 (MIT), upstream remote retained for cherry-picks
- Rebrand package identity to @rocket/gsd-core; private:true (publishing disabled)
- Add methodology spec, WS0 plan, and fork-maintenance guide
- Hard gates green after rebrand: build:lib, test:security, test:unit, check:identity-drift
- Defer: cosmetic @opengsd doc references; community CI workflow pruning

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```
Expected: commit succeeds. (Note: record any Task 3 Step 5 full-suite failures in this message if relevant.)

- [ ] **Step 2: Verify the repository state**

```bash
git log --oneline -3
git ls-files | grep -c '^_reference/' || echo "0 reference files tracked (good)"
grep '"name"' package.json
```
Expected: our commit at HEAD on `main`; `0 reference files tracked (good)`; `"name": "@rocket/gsd-core"`.

---

## Self-Review

**Spec coverage (against `2026-06-08-fork-methodology.md` §1.3 WS0):**
- "clone gsd-core@v1.4.0" → Task 2 ✓
- "git init" → Task 2 ✓
- "rebrand scope" → Task 4 (`@rocket/gsd-core`, `private:true`) ✓
- "wire test:security into CI" → Task 3 + Task 6 run it as a gate; the workflow `.github/workflows/security-scan.yml` is inherited and runs in CI on push (no change needed). ✓ (CI workflow pruning explicitly deferred in Task 7.)
- "upstream-tracking strategy" → Task 2 (remote) + Task 7 (documented workflow) ✓

**Placeholder scan:** The `rocket/gsd-core` repo slug in Task 4 is a deliberate, consistent internal placeholder (no public Rocket repo exists yet); it is called out explicitly, not a vague TODO. All commands and file contents are concrete. No "add error handling"/"TBD"/"similar to" placeholders.

**Type/identity consistency:** `@rocket/gsd-core` is used identically in Task 4 (package.json), Task 4 Step 3 (seam check), and Task 8 (verification). The identity seam path `gsd-core/bin/lib/package-identity.cjs` is consistent across Tasks 3, 4, and 6. Tag `v1.4.0` is verified-then-used (Task 2) and re-verified (Task 2 Step 5).

**Deferred-by-design (not gaps):** cosmetic doc rebrand (557 refs), CI workflow pruning, `origin` remote URL (set when the private repo exists) — all recorded in `docs/MAINTAINING-FORK.md`.
