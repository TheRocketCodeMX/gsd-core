## Auto Mode Detection

Check if `--auto` flag is present in $ARGUMENTS.

**If auto mode:**

<!-- FORK:strategy BEGIN -->
- Skip the *interactive* brownfield router, but do NOT blindly assume greenfield: set `## Mode` Origin from the init signals (`is_brownfield` / `has_existing_code`). Existing code present → **Origin: brownfield-extend** (the safe auto default; note "auto-detected brownfield — run `/gsd:legacy-inventory` if this is a rewrite/harden"); no existing code → greenfield.
<!-- FORK:strategy END -->
- Skip deep questioning (extract context from provided document)
- Config: YOLO mode is implicit (skip that question), but ask granularity/git/agents FIRST (Step 2a)
- After config: run Steps 6-9 automatically with smart defaults:
  - Research: Always yes
  - Requirements: Include all table stakes + features from provided document
  - Requirements approval: Auto-approve
  - Roadmap approval: Auto-approve

**Document requirement:**
Auto mode requires an idea document — either:

- File reference: `/gsd:new-project --auto @prd.md`
- Pasted/written text in the prompt

If no document content provided, error:

```
Error: --auto requires an idea document.

Usage:
  /gsd:new-project --auto @your-idea.md
  /gsd:new-project --auto [paste or write your idea here]

The document should describe what you want to build.
```
