---
type: Fixed
pr: 96
---
**Strategy chain, `/gsd-next` and `context verify` now work on skipped steps, mid-chain projects, workstreams and bracket-migrated phases** — four fork fixes. A strategy step you skipped (recorded in the Strategy Plan's skip-ledger) is no longer picked again as the next step by `project strategy-plan` or by auto-advance (#86). `/gsd-next` on a project that is still working through its strategy chain (no roadmap yet) now offers the next strategy step, or `/gsd-roadmap` once the plan is done, instead of "Discuss the first phase" (#87). With a workstream active, `project mode`, `project strategy-plan`, `project strategy-skipped` and `project strategy-done` now read and write the shared root `.planning/PROJECT.md` instead of reporting it missing (#92). `context verify --phase N` now finds the phase capsule after `roadmap upgrade --convention bracket` and inside a workstream, and `context verify --milestone` now includes the active workstream's capsules (#93).
