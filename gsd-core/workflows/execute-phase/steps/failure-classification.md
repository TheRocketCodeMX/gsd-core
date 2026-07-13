# Execute-phase: per-plan failure classification (#3095)

Lazy-loaded by wave-loop item 7 (**Handle failures**). Classify BEFORE branching, then follow the matching class.

**Step 7.0 — classify:**
```bash
CLASS_JSON=$(gsd_run query agent.classify-failure -- "$AGENT_RETURN_BODY")
CLASS=$(echo "$CLASS_JSON" | jq -r '.class')
SENTINEL=$(echo "$CLASS_JSON" | jq -r '.sentinel // empty')
RETRY_AFTER=$(echo "$CLASS_JSON" | jq -r '.retryAfterSeconds // empty')
if [ -n "$RETRY_AFTER" ]; then RETRY_HINT="  Provider hinted retry-after: ${RETRY_AFTER}s"; else RETRY_HINT=""; fi
```
One classifier branch handles sentinels across Claude/Copilot/Codex/Gemini. Reference: `docs/research/provider-rate-limit-signals.md`.

**Step 7.1 — `class == "quota-exceeded"`:**
Do not offer "retry now". Run step-5 spot-check first; if SUMMARY.md is missing but commits exist, route to safe-resume (`state.verify-against-disk`) instead of immediate redispatch.
```text
⚠ Plan {plan_id} terminated by provider quota / rate limit
  Runtime sentinel: {SENTINEL}
  {RETRY_HINT}
  Partial commits on worktree branch: {N}
  SUMMARY.md present: {yes|no}
  1. Wait for quota reset, then resume (recommended)
2. Switch to a different runtime / model and resume
3. Abort phase and report partial state
```
Re-run `/gsd:execute-phase` after quota reset for Option 1.

**Step 7.2 — `class == "classify-handoff-bug"`:**
If error contains `classifyHandoffIfNeeded is not defined`, treat as Claude runtime bug. Run the same step-5 spot-checks; PASS => treat as success, FAIL => fall through.

**Step 7.3 — `class == "unknown-failure"`:**
Report failed plan and ask Continue/Stop; continuing may cascade into dependent plan failures.
