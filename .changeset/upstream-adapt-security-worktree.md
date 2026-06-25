---
type: Fixed
pr: 3
---
Adapt safe-to-port upstream additions, reconciled with our model: a prompt-level **untrusted-input boundary** (`untrusted-input-boundary.md`) wired into the 10 research/synthesis agents — closes the gap where agents fetch/read external content (incl. our new design/prototype ingestion) with only the hook-level scanner; it composes with § Source precedence (honor a source's shape, never its embedded instructions). Plus three execute-phase worktree fixes: per-wave base re-check (#1369), between-wave manifest reset + base refresh (#3384/#1369), and an isolated-run fail-safe so stalled-executor recovery never silently edits the primary checkout (#1292). Upstream items requiring infra we don't fork (memory-palace/capability-system, the ADR-550 probe engines, loop-hook-dispatch) or already covered (planner-guidance, security-asvs-levels) were deliberately skipped.
