---
type: Changed
pr: TBD
---

**Realigned the fork onto upstream open-gsd v1.16.0** (v1.14.0 + v1.15.0 + v1.16.0, 459 commits, 247 merge conflicts resolved; fifth execution of the merge-anchored realignment model).

What v1.14.0 – v1.16.0 bring (headline items):

- **`workflow.compact_content` (#4139 epic)** — six workflows (`plan-phase`, `execute-phase`, `new-project`, `verify-work`, `complete-milestone`, `docs-update`) are split into a spine plus a `detail/elaboration.md` that is read only when the key is off (the default); `help --full`, the SUMMARY/USER-SETUP templates and 29 agent personas gained `.compact.md` variants for non-Claude runtimes; a CI guard enforces the partition. The fork's blocks in those workflows sit where their upstream context now lives (spine or detail), and the compact agent personas, `help/modes/full.compact.md` and `summary.compact.md` carry the fork's blocks too, so the fork's contract does not disappear when compact mode is on.
- **Command arguments arrive in a labeled `<arguments>$ARGUMENTS</arguments>` block (#4780)** — the fork's twelve argument-taking commands (strategy chain, `roadmap`, `context`, `learn`, `legacy-inventory`, …) adopt the same block.
- **Bracket phase-ID migration (`roadmap upgrade --convention bracket`) and the `PlanningDoc` parse → mutate → serialize seam** (v1.15.0); the phase-membership seam threads the convention (v1.14.0). The fork's UAT/audit/init readers call the same helpers as upstream's own sibling call sites.
- **The `check` router became a pure dispatcher over `src/gate-*.cts` modules (#5139, ADR-5057)**, gate verbs that fail or cannot read their evidence no longer exit 0 (#5170), and every gate module needs a positive control (#5204). The fork's `check grounding-plan` gate was moved onto that seam as `src/gate-grounding-plan.cts` with its own positive control.
- **`/gsd-verify-work` completes a session through the new `uat.complete-session` verb (#5105)** and the zero-issue `human_needed → passed` flip now runs `phase uat-passed --uat-only` (#4663). The fork keeps its rules on top: a `result: [pending-certifier]` row keeps the session `partial` (now enforced inside the verb), the certification artifacts are committed, and the flip additionally requires zero `behavior_unverified` and zero unproven certification checkpoints. The fork's `coverage_gap_capture` step moved to `verify-work/steps/coverage-gap-capture.md` (the spine is size-capped) and is still reached on every tier.
- **Settings-json hook registration is one table (#5207)**; the fork's FileChanged grounding-index refresh hook is a row in it. Broken-windows ledger writes serialize on a cross-process lock (#3780) and entries record their milestone; the fork's `fixed "<reason>"`, `amend` and `reconcile` verbs take the same lock.
- Other: `Grep` declared alongside `Bash` in command frontmatter (#4394 — the fork's `context` and `roadmap` commands too), node compile cache for gsd-tools and hooks, install verifies every managed runtime entrypoint before reporting success (#4249), platform-split test invariant (#5074), verification reports with an out-of-set `status` are a hard error (#5118).

Upstream behavior changes and what the fork does about them:

1. **Gemini CLI reviewer lane retired (#4709/#4716)** — `/gsd-review --gemini` and the `review.*.gemini` config keys are gone. Adopted as-is; no fork surface referenced the lane.
2. **`checkpoint:decision` auto-selection is opt-in (#4095)** — in auto mode a decision checkpoint without `auto_select="<option-id>"` now escalates to a human instead of picking the first option. Adopted as-is.
3. **Unread `gates.*` / `safety.*` keys removed (#4974/#5076)** — only `gates.execute_next_plan`, `gates.confirm_transition` and `gates.confirm_milestone_scope` are registered (with `true` defaults); the shipped config template no longer carries the other six `gates.*` keys or the two `safety.*` keys, and they are rejected by `config-set`. This supersedes the fork's wider registration of all eleven keys, which was dropped.
4. **Eight unreferenced templates deleted (#4540)**, including the project-instruction-file template the fork had edited; the deletion is accepted.
5. **Context-monitor fire-points configurable (`hooks.context_warning_threshold` / `hooks.context_critical_threshold`, #4285) and Codex no longer installs the context-monitor hook.** The fork's context monitor is its own calm knowledge-flush nudge (thresholds under `context_lifecycle`), so the two new `hooks.*` keys are accepted by `config-set` but not read by it.

Notable supersessions (recorded in docs/FORK-PATCHES.json and docs/FORK-DELTA.md): the fork's `gates`/`safety` config registration and the `gates.confirm_milestone_scope` CONFIGURATION row (upstream #4974/#5076); the edited project-instruction template (upstream #4540 deleted it); the size-only execute-phase step-7 extraction (upstream's #4405 split shrank the file and rewrote Step 7).
