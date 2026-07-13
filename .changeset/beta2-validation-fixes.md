---
type: Fixed
pr: 22
---
Fix the beta.1 realistic-validation findings: strategy skills now flip their Strategy Plan step to `done` via the new `project strategy-done` verb (closing a silent path where the grounding gate could pass zero-citation plans), the grounding parser accepts oracles written from the shipped templates (the honoring path was unreachable out of the box), every citation must now pass its cross-check (a valid citation no longer lets a fabricated sibling ride), LEGACY-INVENTORY citations are mechanically row-checked, config-new-project no longer seeds keys its own validator warns about, the grounding gate reports how many plans it scanned, and new-project explicitly instructs recording every literal source (design/legacy/vibe/context-app) in `## Sources`.
