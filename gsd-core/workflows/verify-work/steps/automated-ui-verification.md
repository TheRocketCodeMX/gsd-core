<step name="automated_ui_verification">
**Automated UI Verification (when Playwright-MCP is available)**

Before UAT, check whether Playwright/Puppeteer MCP tools are available. UI-phase
activation itself (`ui_phase_active`) is already resolved at init time — this
section is only reached when that fact is `true` (see the `state:ui-phase-active`
gate above), so re-deriving it here would be redundant.

`PHASE_DIR` is resolved in a DIFFERENT fenced block (`verify-work.md`'s init block),
which is a different process (#381). Unset, `ls "${PHASE_DIR}"/*-UI-SPEC.md` degrades to
`ls /*-UI-SPEC.md` → empty → this step concludes "no UI spec" **on a phase that has
one** (e2e-4 F8). Absence of a variable is not evidence about the phase, so the step
stops instead of answering:

```bash
if [ -z "${PHASE_DIR:-}" ]; then
  echo "✗ automated-ui-verification: PHASE_DIR is unset in this shell (fenced blocks are separate processes). This step did NOT run — it is NOT a 'no UI spec' result. Re-read phase_dir from the init bundle (gsd_run query init.verify-work {phase}) and re-run this step." >&2
  exit 1
fi
UI_SPEC_FILE=$(ls "${PHASE_DIR}"/*-UI-SPEC.md 2>/dev/null | head -1)
```

**If Playwright-MCP tools are available in this session (`mcp__playwright__*` tools
respond to tool calls):**

For each UI checkpoint listed in the phase's UI-SPEC.md (or inferred from SUMMARY.md):

1. Use `mcp__playwright__navigate` (or equivalent) to open the component's URL.
2. Use `mcp__playwright__screenshot` to capture a screenshot.
3. Compare the screenshot visually against the spec's stated requirements
   (dimensions, color, layout, spacing).
4. Automatically mark checkpoints as **passed** or **needs review** based on the
   visual comparison — no manual question required for items that clearly match.
5. Flag items that require human judgment (subjective aesthetics, content accuracy)
   and present only those as manual UAT questions.

If automated verification is not available, fall back to the standard manual
checkpoint questions defined in this workflow unchanged. This step is entirely
conditional: if Playwright-MCP is not configured, behavior is unchanged from today.

**Display summary line before proceeding:**
```
UI checkpoints: {N} auto-verified, {M} queued for manual review
```

</step>
