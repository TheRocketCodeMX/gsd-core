---
type: Changed
pr: 46
---
**`/gsd:cicd-strategy` is right-sized** — the skill now decides two independent ladders instead of asserting a three-stage pipeline: the **CI rung ladder (C0–C3)**, whose floor is one workflow file with one job, and the **delivery rung ladder (D0–D5)**, which gains a real `D0` (no operated delivery yet) and a `D3` weighted-rollout rung, and moves staging to the top. Triggers are now measured rather than asked (suite wall clock, merges/week, contributors; blast radius read from SECURITY-STRATEGY.md), matrix builds and artifact retention are gated decisions instead of unmentioned defaults, every scheduled job needs a named owner and a triage SLA, and the over/under-engineering check enumerates all 12 capabilities it can turn on. The pre-printed `Nightly` rows are gone from the CICD-STRATEGY and TEST-STRATEGY templates.
