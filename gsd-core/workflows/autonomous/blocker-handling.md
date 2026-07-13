# Autonomous — Blocker Option Handling

Extracted from `autonomous.md` §6 Handle Blocker (lazy-loaded) — how each AskUserQuestion option is handled.

**On "Fix and retry":** Loop back to the failed step within execute_phase. If the same step fails again after retry, re-present these options.

**On "Skip this phase":** Log `Phase {N} ⏭ {Name} — Skipped by user` and proceed to iterate.

**On "Stop autonomous mode":** Display progress summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTONOMOUS ▸ STOPPED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 Completed: {list of completed phases}
 Skipped: {list of skipped phases}
 Remaining: {list of remaining phases}

 Resume with: /gsd:autonomous ${ONLY_PHASE ? "--only " + ONLY_PHASE : "--from " + next_phase}${TO_PHASE ? " --to " + TO_PHASE : ""}
```
