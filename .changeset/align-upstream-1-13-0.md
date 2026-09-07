---
type: Changed
pr: TBD
---

**Realigned the fork onto upstream open-gsd v1.13.0** (v1.12.0 + v1.13.0, 311 commits, 238 merge conflicts resolved; fourth execution of the merge-anchored realignment model).

What v1.12.0 + v1.13.0 bring (headline items):

- **Bracket-style phase IDs (`[GSD.02] 05: Name`) recognized on the read path (#2761/#2867)** — `roadmap`, `validate`, `state` and `milestone complete` resolve bracket headings and directories when `phase_id_convention: "bracket"` is set. The fork's `config-set` "no consumers" warning (bracket-guard) is now partially outdated: the read path consumes the grammar; the migrator and write path are still pending upstream.
- **Emitted-drift acknowledgments moved to commit trailers (#3942)** — `Emitted-Drift-Ack-Hash:` / `Emitted-Drift-Ack-Growth:` on a commit in the PR range replace the `tests/emitted-drift-acks/*.json` fragments; the fragment directory, `scripts/lint-emitted-drift-ack.cjs`, the sweep workflow and the `guard-no-ack-on-next` job are gone. The fork's 45 fragments were retired with it.
- **Every enforcement hook declares its crash policy (#3911, ADR-3889)** — hooks terminate through `hooks/lib/hook-exit.js` (`allow`/`deny`/`crash`) with a declared `ON_CRASH`; raw `process.exit()` is lint-banned. The fork's calm context-monitor and grounding-index-refresh hooks were ported (policy: ALLOW — both are advisory-only, exit codes unchanged).
- **Workflows resolve `gsd_run` and prove which `gsd-tools` they run (#3831/#3848/#3809)** — foreign packages publishing a `gsd-tools` binary can no longer be reached from a shipped workflow; the launcher exports `GSD_IDENTITY_STATUS`.
- **`.planning/` frontmatter parsed by a real YAML parser (#3881)**, `state.json` machine-readable snapshot (#3824), `planning inspect` (#3708), exit-code registry + `docs/reference/exit-codes.md` (#3905/#3913), `docs/FEATURES.md` generated from fragments (#3840).
- **Plan checker / planner** — `<fails_when>` siblings for `<automated>` commands (#3825), verify-command path grounding (#3678), advisory-tier undeclared coupling (#3758), review-disposition ledger (#4345), context-drift pre-check (#4147), `quick-batch` (#4190/#4212), per-wave code review (#4159), reviewer lane effort/timeout/model config (#4275/#4083/#4160).
- **Blocking PreToolUse guards registered with a 120 s timeout (#4175)**; `gsd-secret-read-guard.js` replaces installer `permissions.deny` rules (#4236); Windows CI hang class fixed (#4245) with two new ESLint rules (#4246).
- **New lint classes at error** — `local/require-registered-exit`, `local/no-adhoc-markdown-parsing` widened to `tests/`+`scripts/`, `local/no-exact-case-env-access`, `lint:response-language`, `lint-seam-enforcement`, `lint-workflow-shellcheck`, `lint-source-test-name-collision`, `lint-slug-derivation-drift`, `lint-mutation-test-derivation-drift`.

Two upstream BREAKING items and what the fork does about them:

1. **#4236 secret-file read protection moved from installer `permissions.deny` rules to the managed `gsd-secret-read-guard.js` PreToolUse hook.** The Claude Code installer no longer writes `Read(.env)` / `Read(.env.*)` / `Read(.secrets)` and removes those three strings (byte-equal only) from existing installs. Adopted as-is — the hook is in both managed-basename sets, so the fork's uninstall/repair passes reach it. A hand-written deny rule identical to one of the three strings is removed too; re-add it if you want both layers.
2. **#3825 every runnable `<automated>` acceptance command needs a `<fails_when>` sibling.** `/gsd-plan-phase` blocks a plan that omits one. Adopted as-is. Phases planned before this release report one blocker per unstated command on re-check until the statements are added or the phase is re-planned.

Notable supersessions (recorded in FORK-PATCHES/FORK-DELTA):

- `bin/lib/ui-safety-gate.cjs` root copy deleted upstream as dead code (#3932); the fork's negation guard lives on in `src/ui-safety-gate.cts`.
- Upstream **absorbed the fork's managed-hook-coverage fix** (#3662): `gsd-agent-isolation-guard.js`, `gsd-write-guard.js`, `gsd-worktree-path-guard.js` are now in both managed sets upstream; only the fork grounding hook remains fork-owned there.
- Upstream's `#3613` plugin-manifest fixture copy (cpSync) and `#4060` in-process rule-refs scan replaced the fork's equivalents; the fork's CI `test` job timeout bump (30 min) is superseded by upstream's measured 32 min budget (#4070).
- Upstream `#3789` responsive banners shrank `autonomous.md` under the workflow cap; the fork's `stopped-banner.md` extraction was retired.
- The fork's `gsd-core/references/autonomous-smart-discuss.md` had been clobbered by its own v1.11.0 lazy-load stub (self-referential pointer); upstream's full reference is restored.

**Upgrade note:** `plan-phase.md`'s ADR-857 size ceiling is raised for the fork's marked context/grounding blocks (upstream's own body sits 10 bytes under its new 98,300 freeze — zero headroom); ratchet back at the next upstream shrink.
