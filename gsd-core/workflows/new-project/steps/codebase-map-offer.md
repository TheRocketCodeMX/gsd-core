<!-- FORK:strategy BEGIN -->
**If `needs_codebase_map` is true** (from init — existing code detected but no codebase map): **but first, if `.planning/LEGACY-INVENTORY.md` already exists, exploration is DONE** — a prior `/gsd:legacy-inventory` run produced it; do NOT re-route to the exploration router. Set Origin/Code-quality for Step 4 from its `**Mode:**` header (rewrite-* → Origin: rewrite/refactor; vibe-coded-harden → Code-quality: vibe-coded-to-harden) and continue to Step 3. Otherwise:

This routes BOTH the right exploration AND the `## Mode` Origin/Code-quality recorded in Step 4 — the three intents are not the same (see `@~/.claude/gsd-core/references/strategy-flow.md`).
<!-- FORK:strategy END -->

**Text mode (`workflow.text_mode: true` in config or `--text` flag):** Set `TEXT_MODE=true` if `--text` is present in `$ARGUMENTS` OR `text_mode` from init JSON is `true`. When TEXT_MODE is active, replace every `AskUserQuestion` call with a plain-text numbered list and ask the user to type their choice number. This is required for non-Claude runtimes (OpenAI Codex, Gemini CLI, etc.) where `AskUserQuestion` is not available.
Use AskUserQuestion:

<!-- FORK:strategy BEGIN -->
- header: "Existing code"
- question: "I detected existing code here. What's the intent for it?"
- options:
  - "Extend it" — add to a healthy existing system → Origin: brownfield-extend; explore with `/gsd:map-codebase`
  - "Refactor / rewrite it" — restructure or rebuild existing behavior → Origin: rewrite/refactor; explore with `/gsd:legacy-inventory`
  - "Harden it" — a working prototype to make production-ready → Code-quality: vibe-coded-to-harden; explore with `/gsd:legacy-inventory`
  - "Skip exploration" — proceed with init (you can map/inventory later)

Record the chosen intent so Step 4 fills `## Mode` (Origin + Code-quality) accordingly.

**If "Extend it":** `Run /gsd:map-codebase first, then return to /gsd:new-project` — exit command.
**If "Refactor / rewrite it" OR "Harden it":** `Run /gsd:legacy-inventory first (it produces LEGACY-INVENTORY.md; new-project then derives requirements from design ∪ old-behavior), then return to /gsd:new-project` — exit command.
**If "Skip exploration" OR `needs_codebase_map` is false:** Continue to Step 3.
<!-- FORK:strategy END -->
