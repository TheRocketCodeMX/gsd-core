---
type: Fixed
pr: 42
---
**`/gsd-update` no longer leaves the Claude Code status bar blank.** The installer skipped *any* pre-existing `settings.statusLine` — including one GSD itself wrote — so a managed statusline kept whatever node runner it was born with forever, while the same run repaired all 16 hook commands beside it. A bare `node` (or a pruned nvm version) exits 127 under Claude Code's PATH-less `sh -c` spawn, and zero stdout renders as an empty bar. Three fixes: the "already configured" skip now applies only to *third-party* statuslines (the #2248 protection it was written for) so ours is re-emitted every install; the legacy node-path repair pass now also repairs `settings.statusLine.command`; and `normalizeNodePath` gained an nvm branch, so a `nvm use`-transient `~/.nvm/versions/node/vX.Y.Z/bin/node` normalizes to the long-lived `default`-alias version the way fnm, mise and volta already normalize away from their transient paths. (#41)
