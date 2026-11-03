---
type: Changed
pr: 108
---

**The fork is realigned onto upstream open-gsd v1.20.0.** That is 41 upstream commits, merged with 85 conflicts resolved. It is the seventh merge-anchored realignment. Upstream's 1.20.0 notes also list items that already shipped in fork 2.8.0; only what is new since 2.8.0 is listed here.

What v1.20.0 brings, and what the fork does about each:

- **Completed phases are recorded complete in ROADMAP.md, and `/gsd-ship` refuses a phase that is not (#5221).** `roadmap update-plan-progress` now edits only the active milestone and the updated phase's own section (#5553, #5483), so a shipped `<details>` milestone or a sibling phase no longer gets the tick. The executor flows stop when that write declines with `missing_phase_details`. The fork moved execute-phase's wave tracking write into its own step file, so the same stop is in that step. The fork's UAT rule is unchanged: a `[pending-certifier]` or `could-not-prove` result still keeps `/gsd-verify-work` from completing the UAT session.
- **The ROADMAP Progress table and phase-list entries each have one owner (#5761–#5764).** Every reader and writer now locates the Progress table the same way, and reads and writes phase entries (`-` or `*` bullets, `[x]` or `[X]`, `**` or `__` bold) with one grammar. `lint:ci` fails on a hand-written Progress-table or phase-entry pattern in `src/` or `hooks/` (#5765). No fork module carries such a pattern, and the fork adds no exemption to the guard.
- **Custom phase IDs resolve consistently (#5186), and bracket projects write bracket phase ids (#5528).** On `phase_id_convention: "bracket"`, `phase add` and `phase add-batch` no longer reuse a phase number, and a replan rewrites an existing wave annotation. The fork's `context verify` resolves phases through upstream's phase locator, so it follows the custom-ID change.
- **GSD's git calls act on the repository the working directory names, not one an inherited `GIT_DIR` points at (#5548).** Run from a git hook or a wrapper that exports `GIT_DIR`, `GIT_WORK_TREE` or `GIT_INDEX_FILE`, `execGit` and the git spawns in `src/` and `hooks/` now drop those variables. A setup that exports them on purpose for GSD (a bare-repo dotfiles checkout, say) now gets cwd-based discovery. The fork's own modules and hooks spawn no git directly; the grounding hook only spawns `gsd-tools`.
- **`/gsd-code-review` gains two rubric dimensions.** At standard and deep depth it reports **necessity** findings: guards against problems your stack cannot have, cargo-culted patterns, single-use abstractions (#4100). They are Warning or Info, never Critical; `--fix` leaves them alone and `--fix --all` removes them. It also reviews **CI/CD pipeline files** (workflows, Dockerfiles, compose files, deploy scripts) for reliability defects (#4101). Necessity is dimension 4. The fork's contract-conformance check (engineering standards enforced both ways, design fidelity, the frontend seam) is now dimension 5, with the same content.
- **Reviewer lanes cap their prompt by default and refuse an oversized prompt instead of trimming it (#4559).** Lanes with a known default model (claude, codex, qwen, kimi-code) cap at 65% of the declared context window. Override it with `review.context_window_tokens.<slug>` or a `review.max_prompt_tokens*` key; `0` disables the cap. A lane over its cap does not run and is listed under `refused_reviewers` in REVIEWS.md.
- **`/gsd-update --reapply --interactive[=exceptions|all]` (#4435)** shows each of your local edits beside the stock text with a recommendation, and you keep, retire or rewrite it. Without `--interactive`, `--reapply` behaves as before. Update hints keep naming `@therocketcode/gsd-core`.
- **`/gsd-config --advanced` sets the planner stall threshold and check interval (#3923).** The defaults stay 10 and 5 minutes.
- **Smaller fixes.** `state begin-phase --plans 0` records a plan total of 0 (#5787). A quoted `STATE.md` milestone no longer gains an escape layer on each write, and session fields are written whole (#4998). Family-only commands such as `config-path` work through MCP (#5394).
- **Lockfile advisories are patched (#5840, #5795).** re2js, @hono/node-server and qs are at their fixed versions. All three are development dependencies; the fork still ships zero runtime `dependencies`.

Fork-side changes in this realignment:

- **`gsd-code-reviewer` moves from the DEFAULT agent-size tier to LARGE.** Upstream's own body is now 37 bytes under the DEFAULT cap, which leaves no room for the fork's contract-conformance pointer.
- **`engines.node` stays `>=22.0.0`.** Upstream still requires Node 24.
- **`context verify` finds custom-id and bracket-id phase capsules.** It picks the capsule the same way `init.phase-op` does, so `--phase AUTH` finds `AUTH-CONTEXT.md`, and `--milestone` no longer skips it. A capsule belonging to another phase in the same directory is no longer accepted.
- **`/gsd-roadmap` picks the MVP template under `mode: yolo` with `workflow.auto_advance`.** The template step re-reads the typed flags and config itself instead of relying on a variable set in an earlier shell.
- **Fork workflow git calls ignore an inherited `GIT_DIR` (#5548 idiom).** The roadmap commit, `/gsd-legacy-inventory`, `/gsd-cicd-strategy`, the complete-milestone capsule stage and the verifier fidelity gates now clear `GIT_DIR`, `GIT_WORK_TREE` and `GIT_INDEX_FILE` before calling git, the same way upstream workflows do.
- **`.github/MAINTAINERS` names the fork maintainer**, so the advisory "Reviewed or maintainer" check passes on maintainer PRs.

Known issues (upstream, unchanged in the fork — waiting for upstream):

- **On a milestone started with `--reset-phase-numbers` and a shared Progress table, `phase complete` and `roadmap update-plan-progress` write the shipped milestone's Progress row instead of the live one.** Before 1.20.0 this was cosmetic; with the new ship gate, `/gsd-ship` then refuses the phase with `PHASE_NOT_COMPLETE`, and re-running `/gsd-verify-work` repeats the same write. Until upstream fixes it, mark the live row `Complete` by hand.
- **On a `phase_id_convention: "bracket"` project, `phase complete` does not tick the phase's checklist entry**, so `/gsd-ship` refuses it the same way. Bracket ids remain the opt-in convention the 2.7.0 notes said not to migrate production projects to yet.
- **Uninstall still removes every `skills/gsd-*` directory**, including one of your own that update reported as preserved. Back such a directory up before you uninstall.
