<step name="agentic_certification">
**Agentic Certification (before UAT)**

The gate proves the app did not regress. This step certifies it works in the world:
a driver exercises the phase's user-visible flows against a real environment and a
seeded account, and only what it cannot prove reaches the human. Doctrine, ladder,
probe procedure, trust gate, brief format, and substrate policies live in
@~/.claude/gsd-core/references/certification.md — this step is the loop-side
mechanics and never restates a capability claim the reference does not make.

**The invariant is "certification happens", not "an agent does it."** Every phase
leaves this step with exactly one recorded outcome. There is no silent path.

**Where this sits.** `extract_tests` has already run, so the checkpoint set exists;
`create_uat_file` has NOT, so `{phase_num}-UAT.md` does not exist yet. This step
therefore *produces* three things and writes none of them itself: the brief file, the
set of certified (pre-resolved) checkpoint entries, and the one outcome line.
`create_uat_file` writes the latter two into UAT.md — the single UAT sink, no parallel
artifact. Nothing is presented to the human until after this step.

## 1. Read the decision (never sniff for tools)

Certification capability is a **project** fact, not a machine fact. Read it, do not
re-derive it:

```bash
CERT_MODE=$(gsd_run query config-get workflow.certification --raw 2>/dev/null || echo "required")
TEST_STRATEGY=".planning/TEST-STRATEGY.md"
```

- `.planning/TEST-STRATEGY.md` `## Certification` — the tier (CERT-0 / CERT-1
  (limited) / CERT-1 / CERT-2), the dated per-operation probe results, the chosen
  mechanism, and the brief source.
- `.planning/TEST-STRATEGY.md` `## Certification substrate` — seed accounts, email
  safety, LLM policy, auth. These are the run's **preconditions**.
- `workflow.certification` — `required` (the default), `offer`, or `off`.

Resolve the mode first:

| `workflow.certification` | Behavior |
|---|---|
| `required` | Run this step. Its outcome is recorded on every phase. |
| `offer` | Ask once whether to certify this phase. Declining records `certification: skipped (declined)` with the reason — a decline is a decision, not an absence. |
| `off` | Skip. Record nothing, dispatch nothing: `verify-work` behaves exactly as it did before certification existed. |

**No `## Certification` section** (the project never ran `/gsd:testing-strategy`, or
ran it before certification existed) → treat as **CERT-0** and note that
`/gsd:testing-strategy` would record a tier. Never block a phase on a missing
strategy section.

## 2. Scope: is there anything to certify?

Certification acts on user-visible surface. From the checkpoint set `extract_tests`
just produced (and the SUMMARYs behind it), decide whether this phase changed
anything a person could observe — the same USER-OBSERVABLE test that extraction
applies.

If nothing did (a pure refactor, a type change, an internal migration), emit this as
the outcome line for `create_uat_file` and stop; the UAT path continues unchanged:

```
certification: N/A — no user-facing change
```

**Recorded, never silent.** A phase that quietly skipped certification is
indistinguishable from one where the step failed to run, and the whole point of a
default of `required` is that the record exists to be audited later.

## 3. Trust gate — before anything launches

**Sandbox-first is mandatory and it comes first.** Before the first launch of any
third-party certifier tool *in this environment* — including a bare `--version`,
including the capability re-check below — run it under an **isolated HOME** and
audit what it wrote: which files appeared, which agent CLIs did it touch? Only
then grant it the real environment. "Installed" is not "launched": a binary that
has never run under this HOME is treated exactly like a fresh download.

The receipt behind this rule (a first launch that silently instrumented an
installed agent CLI with hooks and self-granted trust entries, zero consent) is
recorded in `certification.md § Third-party certifier trust doctrine`. Do not
reorder this gate behind the capability check to save a step.

A driver that has already been launched under this HOME, on this machine, since
the recorded probe date does not repeat the gate.

## 4. Re-check the recorded capability

**A recorded probe is a lead, not a live capability.** The tier in TEST-STRATEGY
was measured on a date, on a machine, under a display that may no longer exist.
Re-check the specific driver the mechanism names before relying on it:

- Is the driver reachable at all (`command -v <driver>`, or do the MCP browser
  tools in this session respond)?
- Are the operations the tier depends on still capable? Re-run the reference's
  live probe against a **throwaway page** — never the real app — and verify a
  click by its *effect* (did the state change land), never by its return value.
- Did the environment change in a way the recorded rows call out (no display,
  WSL/headless, API-key auth)?

Record what you found. **A re-check that fails is not an error — it is a
demotion**: fall to the highest tier the live result supports (commonly CERT-1
(limited), inspection-grade only, or CERT-0) and say so in the outcome line.
Never certify with a capability the re-check did not confirm.

## 5. Build the brief — the canonical artifact

The **brief is canonical**; everything else in this step is derived from it.
It is certifier-agnostic and human-readable, because the same brief has to drive a
dedicated certifier app, an in-session driver, or a human on CERT-0.

Sources, both already computed by this workflow or already shipped with the phase:

1. The **`present[]` checkpoint set** `extract_tests` just classified via
   `uat.classify-coverage` (the deliverables that were *going* to cost a human
   prompt) — plus the legacy prose checkpoints when the SUMMARY has no `coverage:`
   block, and the injected cold-start smoke test when there is one (it is already
   written as a real-conditions script). `auto_passed[]` entries are already
   deterministically proven; do not re-certify them.
2. The capsule's `## What Done Looks Like` in `{phase_dir}/*-CONTEXT.md` — observable
   acceptance signals. It **may ADD checks, never remove them**.

Shape (per `certification.md § The certification brief`): preconditions from the
substrate (seeded account, environment, mail catcher running) → numbered flows,
each with an *observable* expected outcome → the evidence to capture → the
escalation points. Write it to `{phase_dir}/{phase_num}-CERTIFICATION-BRIEF.md`.

**Independence.** Acceptance is anchored to the brief's expected outcomes, which
come from human-authored sources — never to the driver's own narration of what it
believes it did. This is `ai-test-quality.md`'s independence rule applied to
agent-authored evidence about agent-authored code.

**Starter scripts are accelerants, never canonical.** When the re-check confirmed a
*scriptable* driver, ALSO emit an executable starter script derived from the brief.
When the two drift, regenerate the script from the brief — never the reverse.

## 6. Builder ≠ certifier

The certifying agent must not be the session that built the change: fresh eyes, a
different model family, no shared blind spots. How that separation is achieved
depends on the mechanism, and the step must say which one it used:

| Tier | How separation is achieved |
|---|---|
| **CERT-2** | Structural. The brief is handed to a dedicated certifier application (possibly on another machine); the building session hands over and stops. |
| **CERT-1** | Weakest case — same runtime, same model family. Achieve it by dispatching a **fresh subagent** that receives ONLY the brief and the environment: no plan, no diff, no build transcript. A certifier that has read the implementation is not certifying, it is confirming. |
| **CERT-0** | The human is the certifier — separation is total. |

If neither structural nor fresh-context separation is available, say so in the
outcome line and route the affected flows to the human rather than claiming a
certification the arrangement cannot support.

## 7. Run, and write results back into UAT.md

Run the brief's flows. For each checkpoint the driver **proved** — an observable
expected outcome from the brief actually occurred — hand `create_uat_file` a
pre-resolved entry (it writes them into `{phase_num}-UAT.md`, the single UAT sink;
no parallel artifact):

```
### N. [checkpoint description]
expected: [observable expected outcome from the brief]
result: pass
source: agentic
evidence: [transcript ref · screenshots/console/network captures where the driver was probed capable]
```

`source: agentic` extends the `source: automated` precedent — consumers that read
only `result:` are unaffected. Where the run feeds a SUMMARY `coverage:` block, the
evidence kind is `agentic_certification` and the `ref` is the evidence bundle.

**Always escalate to the human, never auto-resolve:**

- any deliverable whose classifier reason was `human_judgment` — subjective
  aesthetics, content accuracy, "does this feel right";
- **auth moments** — login, consent screens, MFA. One-time human auth with a
  persisted session is the honest answer (`certification.md § Auth for
  certification`), not a bypass to invent here;
- **CAPTCHA** and any bot-detection challenge;
- anything the driver attempted and could not prove. A flow that "looked fine" is
  not certified — presence is not behavior.

Escalated items stay ordinary UAT checkpoints and flow through `present_test`
unchanged.

**A failed flow is an issue, not a demotion.** Leave its checkpoint unresolved and
let the normal `process_response` path record it, so it lands in `## Gaps` with a
`gap_id` — and `coverage_gap_capture` then asks what fast test was missing. Never
write a `result: issue` entry from here; the issue path infers severity from the
human's own words.

## 8. Record the outcome

Exactly one line, always, handed to `create_uat_file` with the entries above:

| Situation | Recorded line |
|---|---|
| Certified by a driver | `certification: agentic (CERT-2 \| CERT-1 \| CERT-1 limited) — {N} flows certified, {M} escalated` |
| No capable driver | `certification: human (CERT-0)` |
| No user-facing surface | `certification: N/A — no user-facing change` |
| Declined under `offer` | `certification: skipped (declined)` |

**On `certification: human (CERT-0)` the requirement is satisfied by the human UAT
that follows** — the brief from step 5 is written *for the human*, and today's UAT
flow is otherwise unchanged from today. There is nothing apologetic about CERT-0.

**Display summary line before proceeding:**
```
Certification: {tier} — {N} checkpoints certified, {M} escalated to UAT
```

If no driver is available and `workflow.certification` is not `off`, behavior falls
back to the standard manual checkpoint questions defined in this workflow,
unchanged, with the CERT-0 line recorded.

</step>
