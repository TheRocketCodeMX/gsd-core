# discuss-phase: existing-context / checkpoint-resume / plans-exist branches

Lazy-loaded by the parent `check_existing` step (#717 thin-dispatcher budget). Follow the branch that matches the detected state, then return to the parent flow.

## CONTEXT.md already exists

<!-- FORK:context BEGIN -->
**Capsule check first (context lifecycle):** run `gsd_run context provenance --file "${phase_dir}/${padded_phase}-CONTEXT.md"`.

**If non-null** (the file carries `context_provenance` frontmatter — a pre-seeded capsule): the choice is **"Extend it"**, not "Update it". Load the capsule and present it to the user as *pre-seeded context* — summarize its Verified Facts + Locked Decisions and note its `quality` stamp: `thin`/`artifact-distilled` capsules are starting points (ask more), a `rich` capsule is pre-answered ground (ask only what it does not cover). Ask ONLY questions the capsule leaves open, then instruct `write_context` to **append** a `## Discussion additions` layer (never rewrite). `--auto` auto-selects **Extend it**.

**If null/absent:** the plain-file behavior below is unchanged.
<!-- FORK:context END -->

**If `--auto`:** Auto-select "Update it" — load existing context and continue to `analyze_phase`. Log: `[auto] Context exists — updating with auto-selected decisions.`

**Otherwise:** AskUserQuestion (header: "Context"; question: "Phase [X] already has context. What do you want to do?"; options: "Update it" / "View it" / "Skip"). Branch accordingly.

## Interrupted discussion checkpoint exists (`*-DISCUSS-CHECKPOINT.json`)

**If `--auto`:** Auto-select "Resume" — load checkpoint and continue from last completed area.

**Otherwise:** AskUserQuestion (header: "Resume"; question: "Found interrupted discussion checkpoint ({N} areas completed out of {M}). Resume from where you left off?"; options: "Resume" / "Start fresh"). On "Resume", parse the checkpoint JSON, load `decisions` into the internal accumulator, set `areas_completed` to skip those areas, continue to `present_gray_areas` with only the remaining areas. On "Start fresh", delete the checkpoint and continue.

## Plans already exist (`has_plans` is true)

**If `--auto`:** Auto-select "Continue and replan after". Log: `[auto] Plans exist — continuing with context capture, will replan after.`

**Otherwise:** AskUserQuestion (header: "Plans exist"; question: "Phase [X] already has {plan_count} plan(s) created without user context. Your decisions here won't affect existing plans unless you replan."; options: "Continue and replan after" / "View existing plans" / "Cancel"). Branch accordingly.
