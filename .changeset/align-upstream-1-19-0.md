---
type: Changed
# PLACEHOLDER: `pr: 0` below is not a real PR number. The orchestrator stamps it when the PR is opened.
pr: 104
---

**The fork is realigned onto upstream open-gsd v1.19.0.** This brings in v1.17.0, v1.18.0 and v1.19.0: 292 upstream commits, merged with 132 conflicts resolved. It is the sixth merge-anchored realignment.

What v1.17.0 – v1.19.0 bring (headline items), and what the fork does about each:

- **Typed command arguments are captured once through a quoted heredoc (#5143, hardened by #5513/#5714 and the per-install terminator nonce #5637).** Typed text containing a quote, `$(...)`, a backtick, a newline or a `GSD_ARGS_END` line can no longer run as shell. The fork's own workflows that read arguments in shell (`context`, `roadmap` and the strategy-chain `advance` mode) use the same capture block. `roadmap`'s `--ws`, `--auto`, `--milestone` and `--reset-phase-numbers` parsing behaves as before.
- **Pi support grows up (v1.19.0).** Pi can run GSD agent roles through a `gsd_dispatch` tool, bridges GSD's guard hooks, installs every GSD command as a Pi skill, can be installed as a Pi package (`pi install npm:@therocketcode/gsd-core`), and ships a parity matrix. The fork's strategy, roadmap, context and learn commands are included as Pi skills. The fork's grounding index-refresh hook is listed as unsupported on Pi, because Pi has no file-change event. Workflows still read the grounding sources on demand through `gsd-tools query grounding required`.
- **Install and update now delete only the `skills/gsd-*` directories GSD owns (#5161).** A first install also keeps a user skill that shares a shipped name (#5522). Every fork skill ships as a `commands/gsd/<name>.md` command, so GSD owns it: update replaces it and uninstall removes it. The fork's update matrix now checks that every fork skill is replaced on update.
- **The Claude Code plugin registers each workflow once, as a `gsd-<name>` skill.** It no longer also lists each one as `gsd:<name>`. The fork's plugin manifest takes the same `"commands": []`.
- **The context meter and the context monitor (#4985, #4840).** The statusline meter now reads 100% where Claude Code auto-compacts. The context-monitor tool-event hook is registered only on hosts that install the statusline metrics writer, which today means Claude Code. The fork's calm knowledge-flush nudge reads the same metrics, so its 90% / 95% thresholds now mean "close to compaction". On the hosts upstream lists as unsupported (Antigravity, Augment, CodeBuddy, Codex, Hermes, Kimi, Kimi Code, Qwen), the metrics-driven nudge is no longer registered. The pre-compaction reminder keeps whatever wiring the host already had. The fork hook still does not read upstream's `hooks.context_warning_threshold` / `hooks.context_critical_threshold`. Tune it with `context_lifecycle.hook_warn_pct` / `hook_urge_pct`, as `docs/context-monitor.md` now says.
- **`gsd_run` stays resolvable for the rest of a Claude Code session.** A new SessionStart hook persists its directory.
- **The post-merge and regression build/test gates use the project's own package manager** when no command is configured. The fork's suite-metrics timing still brackets the test run, whichever runner was resolved.
- **STATE.md and ROADMAP.md writes are more robust.** STATE.md writes go through a verifying executor (ADR-4629). `state begin-phase`, `state planned-phase` and `phase complete` are fixed, and milestone-grouped roadmaps no longer inflate progress. The fork's own steps are unchanged by this. The context flush records the session position through `state.record-session`. The strategy plan writes only PROJECT.md, at the shared root path. The roadmap step spawns the same `gsd-roadmapper` agent upstream's `new-project` uses, and resolves its paths through `init.new-milestone`.
- **`/gsd-complete-milestone --ws` no longer rewrites or commits the shared PROJECT.md (#5195), and milestone completion can tag each sub-repository separately (`git.repo_tagging: per_repo`).** The fork's step that carries deferrals forward writes only the next milestone's capsule.
- **OpenCode 2.x support, with OpenCode 1.x deprecated (v1.17.0).**
- **Security fixes.** The secret-read guard now catches commands wrapped in flags, short-flag bundles, command-valued `git -c` config and heredocs inside command substitutions.

Fork-side changes in this realignment:

- **Release workflow:** the fork's own release patches are retired, because upstream now covers them. Upstream raised the rc/finalize shard timeouts to 30 minutes (#5421) and already publishes with npm trusted publishing (OIDC), with no stored npm token and no runtime npm self-upgrade. Only the fork's package coordinate remains in the workflow.
- **`engines.node` stays `>=22.0.0`.** Upstream now requires Node 24. The fork still has zero runtime `dependencies`.
