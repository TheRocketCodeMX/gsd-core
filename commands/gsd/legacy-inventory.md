---
name: gsd:legacy-inventory
description: Inventory a predecessor codebase for a rewrite — coverage matrix, salvage card, gap map.
argument-hint: "[--text] [--design <path>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Agent
  - AskUserQuestion
  - WebSearch
  - WebFetch
requires: [map-codebase, new-project, phase]
---

<objective>
Exhaustively inventory a **predecessor codebase you intend to replace** (not extend) — so requirements are derived from `(design) ∪ (old-system behavior)`, never from the design alone. This is the rewrite/refactor/vibe-coded-harden exploration the framework otherwise leaves to model judgment (which is biased — it anchors on the shiny new design and under-explores the old code). Forced, checklist-driven, with a confirm-or-refute gate.

**Position in workflow:** rewrite/refactor/vibe-coded mode: `legacy-inventory → new-project (derives requirements from design ∪ old-behavior) → strategy chain → build loop`. Canonical order: `@~/.claude/gsd-core/references/strategy-chain.md`. (Extend mode uses `map-codebase` instead — this is for *replace*, not *add-to*.)

**How it works:**
1. Confirm the mode is replace/rewrite/harden (not extend) and whether a new design exists + whether infra is reused
2. Spawn parallel read-only explorers to enumerate the old system's ENTIRE surface into a coverage matrix (with an honest coverage statement)
3. Build the three-way gap map (design × old-code × requirements) — the four buckets
4. Disposition each subsystem on the salvage card (default Rebuild; FE always rewritten; BE logic clean-or-rewrite), and flag where characterization tests must pin behavior before rewrite
5. Apply the source-of-truth precedence rule to every conflict; write LEGACY-INVENTORY.md

**Output:** `.planning/LEGACY-INVENTORY.md` — the coverage matrix, the three-way gap map, per-subsystem salvage dispositions, the characterization-test gates, and the reuse-infra plan. Consumed by `new-project` (requirements = design ∪ old-behavior) and the build loop.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/legacy-inventory.md
@~/.claude/gsd-core/references/brownfield-adaptation.md
@~/.claude/gsd-core/references/scout-codebase.md
@~/.claude/gsd-core/references/exploration-and-adaptability.md
@~/.claude/gsd-core/templates/legacy-inventory.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`. They are equivalent.
</runtime_note>

<context>
**Flags:**
- `--text` — Use plain-text numbered lists instead of TUI menus (required for `/rc` remote sessions).
- `--design <path>` — Point at a provided design (a design-tool export / prototype / generated-design artifact) to ingest as the intended-spec axis of the three-way reconciliation.

**When to run:** before `new-project`, when the mode is **rewrite / refactor / vibe-coded-to-harden** (replacing an existing app), especially with a new design + salvageable old code. Not for greenfield (nothing to inventory) and not for extend (`map-codebase`).

Context files are resolved in-workflow during initialization.
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read the workflow file BEFORE taking any action. Exploration is **forced and exhaustive** — spawn dedicated parallel read-only explorers and run the confirm-or-refute gate; never satisfy it with a few inline greps. The load-bearing rule: **derive requirements from (design) ∪ (old-system behavior), then reconcile — never from the design alone**. Apply the source-of-truth precedence rule to conflicts. RECOMMEND dispositions; the user signs off (especially on any dropped capability).
</process>

<success_criteria>
- Mode confirmed as replace/rewrite/harden (exit with a pointer to `map-codebase` if it's actually extend, or skip if greenfield)
- The old system's full surface enumerated into a coverage matrix via parallel explorers, with an honest coverage statement + confirm-or-refute gate
- Three-way gap map produced (in-old-not-design / in-design-not-old / in-both / in-neither-but-needed)
- Every old capability covered by a requirement OR explicitly dropped with sign-off ("never lose a feature" gate)
- Per-subsystem salvage dispositions recorded (default Rebuild; FE always rewritten); characterization-test gates flagged for preserved behavior
- Source-of-truth precedence applied to conflicts (no oscillation)
- Reuse-infra plan recorded when infra is reused
- LEGACY-INVENTORY.md written and committed (when commit_docs is true); user directed to /gsd:new-project
</success_criteria>
