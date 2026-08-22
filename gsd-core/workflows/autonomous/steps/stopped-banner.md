# Autonomous — stopped-summary banner (lazy)

Loaded by `autonomous.md`'s handle_blocker "Stop autonomous mode" option (and the #3210 needs_human halt, which reuses the same banner).

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
