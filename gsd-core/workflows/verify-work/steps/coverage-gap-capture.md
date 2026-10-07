Apply response_language to all user-facing prose — narration between tool calls, status updates, progress notes, and findings included; preserve code, paths, and identifiers.

<step name="coverage_gap_capture">
<!-- Lazy-loaded by verify-work.md's `coverage_gap_capture` step (fork; extracted in the align-1.16.0 realignment to keep the spine under its LARGE cap). -->
**Ask what the pyramid missed, and make the answer durable:**

**Two entries, one question (e2e-4 F7).** This step used to be reachable only through
`diagnose_issues`, i.e. only when `issues > 0`. That gated the *only* writer of
`## Coverage debt` behind the one event that most often does not happen: a gap the
**verifier** recorded (`behavior_unverified_items`) or the **certifier** escalated
(`could-not-prove`, `[pending-certifier]`, an escalated checkpoint in the outcome line)
produced no row at all, because the human reported no issue. The doctrine is
"certification catches it once; the pyramid catches it forever" — so the trigger is a
**named gap**, whatever named it.

| Entry | Gap set | Routing |
|---|---|---|
| **diagnosed** — from `diagnose_issues` (`issues > 0`) | the `## Gaps` entries, with root causes in hand | append rows → `plan_gap_closure` |
| **record-only** — from `complete_session` with `issues == 0` but `BEHAVIOR_UNVERIFIED` or `CERT_UNPROVEN` non-zero | one gap per `behavior_unverified_items[].truth` in VERIFICATION.md, plus each UAT checkpoint whose `result` is `[pending-certifier]` or `could-not-prove` | append rows, then **return to `complete_session`** — no diagnosis, no `plan_gap_closure`, and **never** invent a `## Gaps` id for something the human did not report |

Record-only has no root-cause diagnosis to lean on; answer the question from the
artifact that named the gap (the verifier's truth statement, the certifier's evidence
note). `{gap_id}` for a record-only row is the naming artifact plus its item — e.g.
`VERIFICATION/truth-3` or `CERT/C1` — so a later diagnosed row for the same behaviour
is visibly the same behaviour and not a duplicate id.

Certification catches it once; the pyramid catches it forever. Every diagnosed gap
above is a behavior that reached UAT/certification unproven — so before planning the
fix, answer one question per gap, using the root cause diagnosis already in hand:

> **Which fast test was missing — the one that would have caught this before a human
> or a certifier ever saw it?**

Answer it as a test that could exist, at the cheapest level that would give
confidence (`TEST-STRATEGY.md`'s own rule — each behavior tested once, as low as it
can be proven). "No fast test could have caught this" is a legitimate answer for a
genuinely judgment- or environment-bound truth; record it as such rather than
inventing a test.

**Route it (both, not either):**

- The test itself → `/gsd:add-tests` for this phase, which classifies it to a level
  and writes it. Gaps whose fix is a code change still go through `plan_gap_closure`
  below; this is additive, not a replacement.
- A missing behavior no plan covers → it is already a `## Gaps` entry and reaches
  `plan-phase --gaps` through the existing route. Do not create a second gap id.

**Persist it — TEST-STRATEGY.md's second writer:**

Append one row per answered gap to `.planning/TEST-STRATEGY.md` under its
`## Coverage debt` section. Create the section (heading + table header) if the file
predates it — inserted after the last existing `## ` content section and **before
any trailing footer** (a closing `---` or end-of-file), never appended past it.

```
| {date} | {phase}/{gap_id} | {the behavior that escaped} | {the fast test that was missing, and at which level} | open |
```

This is an **append-only** write: add rows, never rewrite, reorder, regenerate, or
re-render any other section of the file. `/gsd:testing-strategy` remains the only
author of the strategy itself; this step only records what the strategy failed to
predict, so the next strategy Update pass can see the project's real failure modes.

If `.planning/TEST-STRATEGY.md` does not exist, skip the append silently — never
create a strategy document from a gap.

**Diagnosed entry:** proceed to `plan_gap_closure`.
**Record-only entry:** return to `complete_session` and present the withheld-stamp
message there — the rows are recorded; nothing is planned from a gap the human never
reported.
</step>
