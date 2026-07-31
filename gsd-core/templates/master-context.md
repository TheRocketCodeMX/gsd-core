<!--
  MASTER-CONTEXT — INDEX, not archive. Target ≤150 lines. It is the milestone's
  durable understanding tier and the pointer hub into deep docs. When a section
  grows past a few lines, push the depth into a deep doc (research/, investigation
  notes, an ADR) and point at it from Key references. Curated by /gsd:context master;
  re-bounded, not truncated (losing knowledge is worse than a long-ish file).
-->

# MASTER-CONTEXT

**Written by:** [orchestrator | orchestrator-fork] on [date]
**Re-verify guidance:** re-anchor facts older than ~[N] commits (run `context verify --milestone`); spot-check any `[STALE]` annotations before trusting them.

## Milestone thesis

<!-- One paragraph: what this milestone is actually trying to achieve and why now. -->

[The bet this milestone makes, in a paragraph.]

## Topology

<!--
  Cross-repo / what-lives-where. Which repo owns what, branch rules, deployed
  environments, read-only trees, and standing "no planning artifacts in repo X" rules.
  Single-repo projects: a couple of lines is fine.
-->

- [Repo/tree] — [what lives here, branch/deploy rules, read-only?]

## Standing rules

<!--
  User non-negotiables. Numbered, enforced-not-advisory — these are constraints a
  reviewer blocks on, not preferences. Keep each one testable.
-->

1. [Non-negotiable rule]

## Load-bearing verified facts

<!--
  The "don't rediscover these" list — facts that shape many phases, each ANCHORED so
  a fresh session can re-verify rather than re-derive. Grammar:
  [anchor: path[:line] "exact substring"]; ext:<repo>/... for other repos.
  This section is what `context verify` re-checks; keep it to load-bearing facts only.
-->

- [Fact that many phases depend on] [anchor: src/example.js:42 "exact substring from the file"]

## Protect list

<!--
  Verified competitive/functional leads whose regression is a review blocker. If a
  later phase would undo one of these, that is a stop-and-ask, not a silent tradeoff.
-->

- [Capability/behavior that must not regress] — [why it matters]

## Process

<!--
  Pre-filled standing procedure. Do not delete — this is how the milestone stays true.
-->

**Re-anchor (post-compaction / resume first act):** read MASTER-CONTEXT (this file) +
the active phase capsule + the last phase SUMMARY, then run `context verify` and
spot-check the flagged anchors before trusting the capsule.

**Curation (`/gsd:context master`):** re-bound this file to ~150 lines, supersede dead
facts (append/replace, never silently drop what's still true), push depth into deep
docs, and refresh Key references so nothing below the index goes unread.

## Key references

<!--
  The pointer hub. Artifacts die when no reading list points at them — this section
  resurrects research/, investigation/deep-design docs, and milestone history. One
  line each: path — what the reader gets from it and when to open it.
-->

- `research/SUMMARY.md` — [the milestone's grounding research; read before planning cross-cutting phases]
- `docs/…` — [deep design / investigation doc; what decision it backs]
