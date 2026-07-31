---
milestone: [label]
context_provenance:
  author: orchestrator
  date: [date]
  quality: artifact-distilled
  note: "[why this capsule was created — deferrals/decisions routed forward to this milestone]"
---

# Milestone [label] — Forward Capsule

<!--
  Lands in .planning/milestones/next/<label>-CAPSULE.md. Records what a later
  milestone must pick up: deferred items and forward-routed decisions ("recorded
  here so v49 picks it up"). new-milestone folds a matching capsule in at opening;
  complete-milestone routes acknowledged deferrals here. Append-only; keep it slim.
-->

## Why this milestone

<!-- One or two sentences: the reason this future milestone exists / what it must resolve. -->

[What this milestone is expected to deliver, from today's vantage point.]

## Carried-forward decisions & deferrals

<!-- Each entry: WHAT was deferred/decided, FROM which phase, and WHY it was routed here. -->

- **[What]** — from [phase] — routed here because [why it belongs to this milestone, not now].

## Verified Facts

<!--
  Facts established now that this milestone will rely on, ANCHORED so they can be
  re-verified when the milestone opens. Grammar: [anchor: path[:line] "exact substring"].
-->

- [Claim this milestone depends on] [anchor: src/example.js:42 "exact substring from the file"]

## Open questions

<!-- Unresolved questions to answer when this milestone is planned. -->

- [Question left open for this milestone to decide]
