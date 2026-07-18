---
type: Changed
pr: 31
---
Roadmap generation now happens once at the strategy-chain → build-loop transition, not eagerly at project start. The roadmapper spawn is extracted into a new idempotent `/gsd:roadmap` skill (dedups the copy in new-project + new-milestone and is usable standalone); new-project no longer creates a coarse roadmap before the strategy skills run, so it is born fully-informed and the strategy chain no longer surfaces a "stale roadmap" through every strategy step. new-milestone extends the existing roadmap in place (its phases elaborated against the milestone's strategy decisions). The plan-phase §1.6 elaboration gate is unchanged and remains the safety net.
