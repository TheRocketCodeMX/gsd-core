# Ship preflight — Milestone certification sweep (fork step)

Extracted from `ship.md` preflight check 7 to respect the workflow byte budget
(loaded lazily at the dispatch site, never via @-required_reading). Same step,
same numbering, same advisory contract.

7. **Milestone certification sweep (advisory — never blocks).**

   `verify-work`'s certification step records exactly one outcome line per phase, at the
   top of that phase's UAT `## Tests`. Each line answers "was *this* phase certified".
   Nothing answers the milestone-level question, which is the one worth asking before a
   PR opens: **did every phase in this milestone reach a certification outcome at all?**

   ```bash
   ls -d .planning/phases/*/ 2>/dev/null || true

   # Read the outcome line from the phase's UAT `## Tests` section ONLY, never
   # the whole file, and skip fenced blocks — so a `certification:` example
   # inside a ``` fence (templates/UAT.md ships two column-0 ones) can never win
   # over the phase's real outcome. The FIRST in-`## Tests` line is the record;
   # a second is emitted as `:DUPLICATE:` and flagged, never silently dropped
   # the way `grep -m1` dropped it.
   for uat in .planning/phases/*/*-UAT.md; do
     [ -e "$uat" ] || continue
     awk -v F="$uat" '
       /^[`][`][`]/ { fence = !fence; next }
       fence        { next }
       /^## /       { in_tests = ($0 ~ /^##[[:space:]]+Tests([[:space:]]|$)/); next }
       in_tests && /^certification:[[:space:]]/ {
         n++; print F (n == 1 ? "  :FIRST: " : "  :DUPLICATE: ") $0
       }
     ' "$uat"
   done
   ```

   A phase whose only `certification:` line sits **outside** `## Tests` (a fenced
   example, pasted guidance) produces no `:FIRST:` line and falls through to
   **not-run** below — fail-closed, exactly as an empty record should.

   This sweep **self-suppresses from the evidence** rather than reading
   `workflow.certification` here — the loop host resolves no capability-owned config key
   inline (ADR-857 Phase 6), and the recorded lines are the better signal anyway: they
   describe what actually happened, not what the posture happens to be today.

   **If no phase carries a `certification:` line at all**, certification is not in use on
   this project (posture `off`, or a milestone that predates it). Print one line —
   `[certification: not in use on this project]` — and continue. Never flag every phase in
   that case: an absent record everywhere is a project-level fact, not N gaps.

   **Otherwise** map every phase directory to its recorded line and present one table —
   built by iterating the `ls -d` phase list in order and looking each phase up, never by
   grep's own output order (parallel `grep` drop-ins reorder identical inputs, and this
   table's value is being diffable run to run):

   | Outcome | Recorded line (the phase's `:FIRST:` line) | Reading |
   |---|---|---|
   | certified | `certification: agentic (CERT-2 \| CERT-1 \| CERT-1 (limited)) — …` — the tier token is **exactly** one of those three, spelled with an ASCII hyphen | a driver proved the flows |
   | **pending** | `certification: pending (CERT-2 — brief handed over …)` | handed to an off-machine certifier, result not yet returned — **⚠ name it** ("awaiting the certifier's result — re-run `/gsd:verify-work {phase}` once `{phase_num}-CERTIFICATION-RESULT.md` lands"), distinct from not-run: something was decided, it just hasn't come back |
   | human | `certification: human (CERT-0)` | satisfied by the human UAT that ran — not a gap |
   | recorded N/A | `certification: N/A — no user-facing change` | scoped out on purpose |
   | declined | `certification: skipped (declined` prefix — the line may carry ` — {reason})` | a decision, recorded |
   | off | `certification: off (posture)` | certification was configured off when this phase shipped — a decision, not a gap |
   | **malformed / needs-human** | a `:FIRST:` line is present but its tier/keyword matches **none** of the rows above — an out-of-grammar tier (`CERT-9`), a Unicode look-alike (`CERT‑2` written with a non-ASCII hyphen U+2011, byte-distinct from `CERT-2` though it reads the same), or **any** `:DUPLICATE:` line the sweep emitted for that phase | **⚠ flag it** — a record that is out of grammar or duplicated is **never** silently read as certified; a human reconciles it. This row closes the "it starts with `agentic (CERT-…)` so call it certified" trap |
   | pre-adoption | *no line, and the phase precedes the earliest phase with a recorded `certification:` line (phase order — or `git log -1 --format=%at -- <uat>` where history exists; file mtime only as a last-resort convenience, since a fresh checkout gives every file one mtime)* | verified before certification existed here — reported, **not counted** in the ⚠ line below |
   | not-verified | *the phase directory has **no `*-UAT.md` at all*** — the loop above produced no line for it | it never reached verification; **not this sweep's business** — `/gsd:verify-work` owns it. Reported, **not counted** in the ⚠ line |
   | **not-run** | *the phase **has** a `*-UAT.md` but no `:FIRST:` `certification:` line inside its `## Tests`, and it is not pre-adoption* | **flag it** |

   The last three rows are the ones the table and this prose must agree on, and now do:
   a phase with a UAT.md but no in-`## Tests` `certification:` line — not pre-adoption, on
   a project where other phases have one — is **not-run**: nothing was decided, the one
   state the "recorded, never silent" contract does not allow to pass unremarked. A phase
   directory with **no UAT.md at all** is **not-verified**, not not-run — report it, but do
   not count it in the ⚠ line; it is `/gsd:verify-work`'s business. Pre-adoption phases are
   the exception that keeps the warning readable: flagging every pre-adoption phase forever
   is a warning that is wrong on every run, and those stop being read. Name the genuinely
   not-run phases — and, on their own line, the malformed ones — explicitly under the table:

   ```
   ⚠ {N} phase(s) have no recorded certification outcome: {phase list}
     Certify with /gsd:verify-work {phase}, or accept and ship — this is advisory.
   ⚠ {M} phase(s) have a malformed or duplicated certification record: {phase list}
     Reconcile by hand — an out-of-grammar tier, a non-ASCII look-alike, or two
     certification lines in one `## Tests`. (Print this line only when M > 0.)
   ```

   **This check is advisory: it never blocks the ship.** The human ships; a milestone with
   an uncertified phase is a judgment call, not a mechanical failure, and there is no
   `--force` to teach anyone to type. **But it is never silent** — print the table on every
   run, including the all-green one, so "every phase certified" is an observed fact rather
   than an absence of complaint. A phase directory with no UAT.md at all is reported as
   `not-verified` and is `/gsd:verify-work`'s business, not this sweep's.
