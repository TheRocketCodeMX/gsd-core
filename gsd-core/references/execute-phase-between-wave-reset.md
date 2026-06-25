7c. **Between-wave manifest reset and worktree base refresh (waves 2+ only — #3384, #1369):**

   **REQUIRED before each wave transition when `USE_WORKTREES != "false"` and `RUNTIME = "claude"`.** (Step 7b — the pre-wave key-links dependency check — already runs inline before this in `execute-phase.md`; this step covers the manifest reset + base refresh.)

   Wave N's `WAVE_WORKTREE_MANIFEST` was consumed by `worktree.cleanup-wave` in step 5.5. It must be
   unset so wave N+1's step 3 creates a fresh manifest for the new wave's worktrees. Without this,
   the wave N+1 manifest guard (step 5.5, #3384) blocks on the stale/empty consumed file.

   After wave N merges and tracking commits, the orchestrator HEAD has advanced past the commit the
   Claude Code harness may have cached as the worktree fork base at session start. New worktrees
   spawned for wave N+1 could fork from the stale pre-wave-N HEAD, causing every executor to trip the
   `worktree_branch_check` FATAL guard immediately (symptom: `HEAD is <old-sha>, expected <new-sha>`).

   ```bash
   # Unset per-wave manifest so wave N+1 creates a fresh one (#3384, #1369).
   unset WAVE_WORKTREE_MANIFEST

   # Between-wave base refresh (#1369): after wave N merges and tracking commits, HEAD has
   # advanced. Re-assert worktree.baseRef:"head" (idempotent — no-op if already set) so the
   # Claude Code harness re-reads the live HEAD on the next Agent(isolation="worktree") call
   # rather than using a cached session-start commit as the fork base.
   if [ "$RUNTIME" = "claude" ] && [ "$USE_WORKTREES" != "false" ]; then
     gsd_run query worktree.set-baseref 2>/dev/null || true

     # Safety re-check: evaluate degradation AFTER the wave's commits. If HEAD has diverged
     # from origin/HEAD and baseRef is NOT "head", degrade remaining waves to sequential to
     # avoid the base-mismatch FATAL in executor agents.
     _BETWEEN_DEGRADE=$(gsd_run query worktree.base-check --pick shouldDegrade 2>/dev/null || echo "false")
     if [ "$_BETWEEN_DEGRADE" = "true" ]; then
       _DEGRADE_MSG=$(gsd_run query worktree.base-check --pick message 2>/dev/null || true)
       [ -n "$_DEGRADE_MSG" ] && printf '%s\n' "$_DEGRADE_MSG" >&2
       printf 'Degrading to sequential mode for remaining waves: HEAD advanced past the worktree fork base after the prior wave merge (#1369).\n' >&2
       USE_WORKTREES=false
     fi
   fi
   ```
