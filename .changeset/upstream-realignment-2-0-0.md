---
type: Changed
pr: 19
---
**BREAKING — new lineage.** The fork is realigned onto upstream `open-gsd/gsd-core` v1.6.1 via a merge-anchored realignment: upstream is now a recorded git ancestor, so future upstream adoptions become incremental merges. All fork features ride along, re-expressed on the new base — strategy suite + Strategy Plan flow, source-fidelity gates, source-grounding (gate, resolver, Sources-of-Truth index, FileChanged refresh — now also shipped on classic installs), gsd-learn, mode persistence, cross-cutting DoD — plus ~619 commits of upstream improvements (capability registry, ns-router skills, expanded runtime support, deeper test harness). Breaking for project-local installs: slash commands become `/gsd-<cmd>` (hyphen) per upstream #1367; the old colon layout is cleaned automatically on update. The 1.x line ends at 1.14.0 (kept on a `1.x` dist-tag). The 1.14.0→2.0.0 update path is guarded by a committed fixture matrix.
