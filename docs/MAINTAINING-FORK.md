# Maintaining the @therocketcode/gsd-core fork

This is a fork of `open-gsd/gsd-core` (MIT), pinned at `v1.4.0`, published as **`@therocketcode/gsd-core`** from **`github.com/TheRocketCodeMX/gsd-core`**. We track upstream and cherry-pick.

## Remotes
- `upstream` → `https://github.com/open-gsd/gsd-core.git` — read-only source of fixes (the real community project). **Never push here.**
- `origin`   → `https://github.com/TheRocketCodeMX/gsd-core.git` — our fork. Set once: `git remote add origin https://github.com/TheRocketCodeMX/gsd-core.git`

## Our branding delta (what makes this a fork)
The rename replaced three coordinate forms across the tree (code, tests, docs):

| Upstream | Ours |
|---|---|
| `@opengsd/gsd-core` (npm name) | `@therocketcode/gsd-core` |
| `open-gsd/gsd-core` (repo slug) | `TheRocketCodeMX/gsd-core` |
| `opengsd-gsd-core` (cache slug) | `therocketcode-gsd-core` |

Plus: `package.json` identity (`name`, `author`, `repository`/`homepage`/`bugs`, `publishConfig.access: public`), `.claude-plugin/plugin.json` author block, `.secretscanignore` owners, and `eslint.config.mjs` ignores `_reference/`.

> **Preserved on purpose:** the legacy package references `@opengsd/get-shit-done-redux`, `@opengsd/get-shit-done-classic`, and `@opengsd/gsd-sdk` are left untouched — they're install-migration paths, not our coordinate.

## Pulling upstream fixes
```bash
git fetch upstream --tags
git log --oneline main..upstream/main          # review what's new
git cherry-pick <sha>                           # pick specific fixes / security patches
# Most conflicts will be the branding strings above. Re-apply the rename on conflicted files:
#   sed -i 's#@opengsd/gsd-core#@therocketcode/gsd-core#g; s#@opengsd\/gsd-core#@therocketcode\/gsd-core#g' <file>
#   sed -i 's#open-gsd/gsd-core#TheRocketCodeMX/gsd-core#g; s#open-gsd\/gsd-core#TheRocketCodeMX\/gsd-core#g' <file>
#   sed -i 's#opengsd-gsd-core#therocketcode-gsd-core#g' <file>
npm run generate:identity                       # re-bake the seam if package.json changed
npm run build:lib && npm run test:unit && npm run check:identity-drift && npm run lint
```

> A `scripts/rebrand.sh` helper that runs all six sed passes over changed files would make cherry-picks one command. Add it when the first upstream pull lands.

## Publishing (first time)
1. `npm login` (or put an Automation token in `~/.npmrc` — **never** commit it).
2. Ensure the `@therocketcode` org exists on npmjs and you're a member.
3. `npm run build:lib && npm test` (must be green).
4. `npm publish` — scoped packages publish public for free thanks to `publishConfig.access: public`.

## Adopting a newer base version
Cherry-pick onto a branch or rebase our fork commits onto the new tag, then re-run all gates. **Never** fast-forward `main` to `upstream/main` blindly — it would drop our branding.

## Deferred cleanup (tracked, not blocking)
- Bare-org references in multilingual docs (`README.*`, `docs/**`, `docs/security/baseline.md`, archived changesets) still say `open-gsd` / `@opengsd` org. Cosmetic; sweep before a public launch when polishing the README.
- One comment in `scripts/check-env.cjs` points at the separate upstream tool repo `open-gsd/gsd-test-runner` — intentionally left (it's a real external reference, not our coordinate).
- Prune upstream community/release CI workflows under `.github/workflows/` that don't apply to us (`discord-changelog.yml`, `auto-label-issues.yml`, `release.yml`, etc.). Keep `test.yml`, `security-scan.yml`, `mutation.yml`.
