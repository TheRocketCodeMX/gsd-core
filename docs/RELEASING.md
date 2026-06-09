# Releasing `@therocketcode/gsd-core`

Two independent update directions:

- **A — your users get your updates.** Already wired: `/gsd:update` runs `npm view @therocketcode/gsd-core@latest`, and the SessionStart hook shows a banner when a newer version exists. You just publish.
- **B — you pull upstream open-gsd improvements** into the fork (git cherry-pick), then publish via A.

We run **our own semver line** — `@therocketcode/gsd-core` is a separate npm package, so our version numbers are independent of upstream's. Record "based on upstream vX.Y.Z" in the CHANGELOG entry for traceability.

---

## Lightweight release (recommended to start)

No GitHub Actions / secrets needed. From a clean, green `main`:

```bash
# 1. Add a CHANGELOG entry under a new "## [X.Y.Z] - YYYY-MM-DD" heading
#    (place it directly below "## [Unreleased]"; Keep a Changelog format, ### Added/Changed/Fixed).
#    /gsd:update parses this to show users what changed — the heading format matters.

# 2. Bump the version (also syncs the inventory/plugin manifests via the `version` npm script):
npm version X.Y.Z --no-git-tag-version

# 3. Build, prove green, publish (publishConfig.access:public is set → free public scope):
npm run build:lib
npm run test:unit && npm run check:identity-drift && npm run lint
npm publish            # needs your npm auth in ~/.npmrc (Automation token) or `npm login`

# 4. Tag + push:
git add -A && git commit -m "release: X.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

Guards: `npm publish` (and the release workflow) reject republishing an existing version — always bump first.

## Heavier release (later, optional)

The inherited `.github/workflows/release.yml` automates RC channels, CHANGELOG promotion from `.changeset/*.md` fragments, npm provenance, git tags, and a back-merge PR. To use it you must add an **`NPM_TOKEN`** GitHub Actions secret (and rely on OIDC for `--provenance`). Dispatch it with `action=create → rc → finalize`. Adopt this once releases get frequent; the lightweight flow above is fine until then.

---

## Pulling upstream changes (direction B)

```bash
git fetch upstream --tags
git log --oneline main..upstream/main         # review what's new
git cherry-pick <sha>                          # resolve CONTENT conflicts; keep ours for branding
./scripts/sync-upstream.sh                      # re-apply the @therocketcode rebrand in one pass
npm run generate:identity && npm run build:lib
npm run test:unit && npm run check:identity-drift && npm run lint
# then release via the lightweight flow above (bump version, publish)
```

`scripts/sync-upstream.sh` rewrites all six coordinate forms (`@opengsd/gsd-core`, its regex-escaped variant, `open-gsd/gsd-core` + escaped, the `opengsd-gsd-core` cache slug, and the `%40opengsd%2Fgsd-core` npm badge). Legacy `@opengsd/get-shit-done-*` / `@opengsd/gsd-sdk` migration refs are deliberately left intact.

> Never fast-forward `main` to `upstream/main` — it would drop our branding and skills. Always cherry-pick or rebase our commits onto the new base. See `docs/MAINTAINING-FORK.md`.
