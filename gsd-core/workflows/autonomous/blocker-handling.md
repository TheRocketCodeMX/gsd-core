# Autonomous — Blocker Option Handling

Extracted from `autonomous.md` §6 Handle Blocker (lazy-loaded) — how each AskUserQuestion option is handled.

**On "Fix and retry":** Loop back to the failed step within execute_phase. Track the retry count per phase + step (`RETRY_COUNT`, kept in memory for the run). If the same step fails again after retry, re-present these options. **Retry ceiling (#3210):** once the same phase step has failed 3 "Fix and retry" attempts, do NOT re-present the options — escalate to a terminal `needs_human` halt: display `Phase {N} ⛔ {Name} — needs_human`, list the unmet items (the blocker description from each attempt), append/update a `## Needs Human` section in STATE.md (`| ${PHASE_NUM} | needs_human | resolve blocker, then /gsd:autonomous --from ${PHASE_NUM} |`), and stop autonomous mode with the standard stopped-summary banner. A blocker that survives 3 fix attempts is an operator gate, not an executable gap — retrying it again just burns hours.

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
