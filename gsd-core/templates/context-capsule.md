---
phase: [N]
context_provenance:
  author: orchestrator
  date: [date]
  quality: artifact-distilled
  note: "[how this capsule was produced — e.g. distilled from research/ + roadmap; append-only, later layers supersede]"
---

# Phase [N]: [Name] — Context Capsule

<!--
  Written by the orchestrator ITSELF while its session context is richest — never
  delegated to a fresh agent. Stamp `quality` honestly: `rich` (this session
  actually verified these facts), `artifact-distilled` (synthesised from existing
  artifacts), or `thin` (sparse; downstream treats it as a starting point, not
  answers). A hollow-but-plausible capsule is worse than none — the stamp is the
  defense. Write only what this session genuinely knows.
-->

## Verified Facts

<!--
  Every claim must be ANCHORED and falsifiable — a fact a later agent can re-check,
  not a summary. Grammar: [anchor: path[:line] "exact substring from the file"].
  Line is advisory; the substring is what `context verify` greps for (case-insensitive).
  Use ext:<repo>/path for other repos (verified manually, skipped by verify).
  No anchor → not a verified fact; move it to Locked Decisions or delete it.
-->

- [Claim in one sentence] [anchor: src/example.js:42 "exact substring from the file"]

## Locked Decisions

<!--
  Decisions that are settled for THIS phase, each with its WHY. The why is what
  survives — a decision without rationale gets re-litigated. Format: decision — why.
-->

- [Decision] — [why it was made / what it rules out]

## Cross-Repo Touchpoints

<!--
  What this phase touches outside its own tree: other repos, shared services,
  deployed environments, read-only trees, branch rules. Use ext: anchors here.
  If single-repo and self-contained: "None — self-contained in this repo."
-->

- [Repo/service/seam] — [how this phase interacts with it]

## Phase-Scoped Pitfalls

<!--
  Traps specific to THIS phase, not generic engineering advice. "Don't forget tests"
  is noise; "the auth middleware runs before body-parse, so req.body is undefined in
  the guard" is a pitfall. Each should be something a fresh agent would plausibly hit.
-->

- [Specific trap and how to avoid it]

## What Done Looks Like

<!--
  OBSERVABLE acceptance signals — what a verifier can check, not aspirations.
  "Users are happy" is not observable; "POST /login returns 401 with a rotated
  refresh cookie on bad password" is. Shapes the verifier's acceptance gate.
-->

- [Observable signal that proves this phase is complete]

## References

<!--
  Which deep docs matter for THIS phase and WHY each one — research/, ADRs, design
  specs, investigation notes. A bare path is useless; say what the reader gets from it.
-->

- `path/to/doc.md` — [what this doc decides/defines that this phase depends on]

<!--
  APPEND-ONLY LAYERS — this capsule is an auditable knowledge ledger. Never edit or
  delete an earlier layer; append a new dated layer below and let it override. Later
  layers supersede earlier claims; `[STALE — <date>]` inline markers annotate (never
  remove) claims that `context verify` could not re-anchor. Canonical layer headings,
  appended in order as the phase progresses:
    ## Seed refresh (<date>)          — re-seed touched only the seed layer
    ## Scout corrections (<date>)     — /gsd:context scout confirm-or-refute pass
    ## Discussion additions (<date>)  — discuss-phase decisions/deferrals
    ## Orchestrator curation (<date>) — post-research/post-plan curation notes
-->
