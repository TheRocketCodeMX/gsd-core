---
type: Fixed
pr: 0
---

**Strategy-chain greenfield robustness.** The roadmap-reconciliation block in the strategy skills (`recommend-architecture`, `testing-strategy`, `infrastructure-strategy`, `security-strategy`, `frontend-architecture`, `model-domain`) asserted "ROADMAP.md predates this" as an unconditional premise; on a greenfield chain that reaches the step before a roadmap is written, the premise is false and the scan has nothing to read. Each block is now guarded to reconcile only when `.planning/ROADMAP.md` exists and skip silently otherwise. `cicd-strategy` — the terminal strategy step — now points its `Next:` / auto-advance to `/gsd:roadmap` (the fully-informed regeneration that leads into the build loop) to match its own chain driver `advance.md`, instead of jumping to `/gsd:plan-phase`. And the ephemeral post-merge-gate handoff file is now covered by `.planning/.gitignore` before it is written, so a crash between the write and its consume-and-delete cannot orphan an untracked scratch file that trips ship's clean-tree preflight.
