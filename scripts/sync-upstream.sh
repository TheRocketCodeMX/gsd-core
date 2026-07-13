#!/usr/bin/env bash
#
# Re-apply the @therocketcode fork rebrand over files touched by an upstream cherry-pick.
#
# Why: cherry-picking from `upstream` (open-gsd/gsd-core) reintroduces the upstream
# coordinate (@opengsd/gsd-core, open-gsd/gsd-core, the cache slug, the encoded npm badge).
# This script rewrites all six forms back to ours in one pass. The legacy migration package
# refs (the get-shit-done-* and gsd-sdk packages under the old scope) are NOT touched — the gsd-allow-legacy-name
# patterns only match the gsd-core coordinate, so install-migration code is preserved.
#
# Usage:
#   git fetch upstream --tags
#   git cherry-pick <sha>                 # resolve content conflicts, keep ours for branding
#   ./scripts/sync-upstream.sh [file ...] # rebrand specific files, or the whole tree if no args
#
# After running:
#   npm run generate:identity && npm run build:lib && \
#   npm run test:unit && npm run check:identity-drift && npm run lint
#
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

rebrand() {
  sed -i \
    -e 's#@opengsd/gsd-core#@therocketcode/gsd-core#g' \
    -e 's#@opengsd\\/gsd-core#@therocketcode\\/gsd-core#g' \
    -e 's#open-gsd/gsd-core#TheRocketCodeMX/gsd-core#g' \
    -e 's#open-gsd\\/gsd-core#TheRocketCodeMX\\/gsd-core#g' \
    -e 's#opengsd-gsd-core#therocketcode-gsd-core#g' \
    -e 's#%40opengsd%2Fgsd-core#%40therocketcode%2Fgsd-core#g' \
    -e 's#@open-gsd/maintainers#@TheRocketCodeMX/maintainers#g' \
    "$@"
} # FORK: added in Phase 2 — .secretscanignore owner form (@open-gsd/maintainers → @TheRocketCodeMX/maintainers)

if [ "$#" -gt 0 ]; then
  rebrand "$@"
  echo "Rebranded $# file(s)."
else
  # whole tree: text files only, excluding reference clones / deps / git.
  # FORK: added in Phase 2 — exclude this script itself: its own sed patterns contain the
  # upstream coordinate and a whole-tree pass would rewrite them into no-ops (self-clobber).
  mapfile -t files < <(grep -rIlE 'opengsd|open-gsd' \
    --exclude-dir=_reference --exclude-dir=node_modules --exclude-dir=.git \
    --exclude=sync-upstream.sh . || true)
  if [ "${#files[@]}" -gt 0 ]; then
    rebrand "${files[@]}"
    echo "Rebranded ${#files[@]} file(s) across the tree."
  else
    echo "Nothing to rebrand."
  fi
fi

# package.json identity (name/author/repo) is ours by convention — verify it didn't drift back:
name="$(node -p "require('./package.json').name" 2>/dev/null || echo '')"
if [ "$name" != "@therocketcode/gsd-core" ]; then
  echo "WARNING: package.json name is '$name' (expected @therocketcode/gsd-core) — fix it before publishing." >&2
fi

echo ""
echo "Next: npm run generate:identity && npm run build:lib && npm run test:unit && npm run check:identity-drift && npm run lint"
