---
type: Changed
pr: 78
---

**Realigned the fork onto upstream open-gsd v1.11.0** (339 commits, 122 merge conflicts resolved; third execution of the merge-anchored realignment model).

What v1.11.0 brings:

- **Descriptor-driven install pipeline (#2875)** — `bin/install.js` modularized into `runtime-hooks-surface.cjs`, `install-engine.cjs`, and `command-roster.cjs`; per-platform emitters rebuilt. The fork's hook-lib additions (cursor-workspace, isolation-sentinel, injection-patterns) ride the new surface.
- **`scopeToPhase` plumbing (#3511)** across phase/UAT/audit readers, with the fork's `-UAT-superseded-` filter and audit severity/title fields re-applied on top.
- **Autonomous retry ceiling (#3210)** and **disk-strict completion predicate (#3186)** folded into blocker handling and convergence flows.
- **New lint classes promoted to error** — no-crlf-fragile-split, no-unbounded-quantifier, no-source-grep, plan-count-drift, phase-enumeration-drift, unreachable-guard-drift, and lint-command-contract reachability. Fork surfaces brought into compliance (splitLines() adoption, bounded quantifiers, single-owner plan scanning, function-scoped exemptions, guard-site baseline).
- **Tag standardization (#3423)** — retired `<files_to_read>` replaced with `<required_reading>` everywhere, including fork blocks.

Notable supersessions (recorded in FORK-PATCHES/FORK-DELTA):

- Upstream **absorbed the fork's windows-gate typed-status hardening** into ship.md's new generic gate-runner; the fork keeps only its reconcile/amend hint text.
- `discovery-phase.md`, `plan-milestone-gaps.md`, `verify-phase.md` deleted upstream as unreachable (#3560/#3421); no fork pins lost.
- The fork's stale `plan-phase/modes/prd-express.md` orphan pruned — upstream's `steps/prd-express-path.md` is the live successor.
- Four upstream-folded test clusters (#3334/#3336/#3337) removed with their manifest entries; the fork's `execute-phase.md` now fits upstream's ratcheted-down size ceiling with no fork raise.

**Upgrade note (upstream #3186, disk-strict completion):** phase completion now requires a passing, non-stale `*-VERIFICATION.md` on disk. Phases completed under ≤2.4.6 without one — for example while the verifier was disabled — will report as incomplete after upgrading until they are re-verified (`/gsd-verify-work` per phase, or `/gsd-execute-phase`, which resumes at the verification gates without re-running summarized plans). Completion is also mtime-sensitive: a plain `cp -R` or fresh checkout can shift verification staleness and change the completed count; committed, clean files keep their commit-time anchoring.
