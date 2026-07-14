---
type: Changed
pr: 26
---
Convert the fork's registration surfaces into first-party capability bundles (`capabilities/rocket-{learn,strategy,grounding}/`): the learn/project/grounding command families now dispatch through upstream's ADR-959 capability registry instead of hardcoded switch cases, and `workflow.grounding_gate` lives in rocket-grounding's federated config slice. Behavior is unchanged (grounding ablation and all suites prove equivalence); the fork's patch surface on gsd-tools.cjs and the shared config manifests drops to zero, with a tripwire test guarding against future re-shadowing.
