---
type: Added
pr: 11
---
Add source-grounding enforcement so agents plan from the project's real strategy artifacts and source files — not memory or abstractions. A blocking plan-time gate (check.grounding-plan) requires every plan's ## Grounding block to cite and cross-check the active (done) strategy sources against the real files, using high-entropy citations (ADR rung set-equality, design-inventory field+surface provenance) plus source-direct citations grepped against the actual design/legacy/vibe/context-app files listed in PROJECT.md ## Sources. Strategy-Plan-driven (skips exempt, never-run projects fall back to the engineering-standards floor), config-toggleable via workflow.grounding_gate, wired through the plan/ultraplan/autonomous/ui-review/secure-phase flows and the codebase-mapper/intel-updater agents. A ## Sources of Truth ambient index (cross-CLI path-list) and a FileChanged hook keep that index fresh the instant a strategy or source doc changes mid-session.
