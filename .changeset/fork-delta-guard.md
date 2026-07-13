---
type: Added
pr: 17
---
Add the fork-delta safety net for the v2.0.0 upstream realignment: `docs/FORK-DELTA.md` + `docs/FORK-PATCHES.json` manifests enumerating every fork-owned file and marked core patch, inline `<!-- FORK:<feature> -->` markers on patch sites, and a CI guard (`tests/fork-delta-manifest.test.cjs`) that fails loudly if an upstream sync ever clobbers a fork feature.
