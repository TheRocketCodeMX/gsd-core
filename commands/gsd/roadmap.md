---
name: gsd:roadmap
description: Generate or bring-current the project roadmap after the strategy chain, then hand off to the build loop
argument-hint: "[--auto] [--milestone] [--reset-phase-numbers]"
allowed-tools:
  - Read
  - Bash
  - Write
  - Edit
  - Agent
  - Skill
  - AskUserQuestion
requires: [discuss-phase]
---

<objective>
Own the single `gsd-roadmapper` spawn. `new-project` and `new-milestone` used to copy-paste that spawn inline **before** the strategy chain ran, so the roadmap was born coarse and then patched. This command runs the roadmapper **once, at the strategy-chain → build-loop transition**, so the roadmap is fully-informed by every strategy artifact that already exists.

**Idempotent by design** — safe to invoke more than once on the same transition:
- **create** — no ROADMAP.md yet.
- **elaborate** — an unmarked coarse ROADMAP.md exists and strategy artifacts now exist (mirrors plan-phase §1.6).
- **extend** — `--milestone`: append a new milestone's phases to an existing roadmap.
- **current** — already elaborated → pass through (interactive: offer re-elaborate).

Also usable standalone to regenerate a roadmap.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/roadmap.md
@~/.claude/gsd-core/references/ui-brand.md
</execution_context>

<context>
**Flags:**
- `--auto` — auto-approve the roadmap and chain onward into the build loop (`/gsd:discuss-phase 1 --auto`).
- `--milestone` — extend an existing roadmap with the current milestone's phases, then return control to the caller (no onward chain). Used by the new-milestone workflow.
- `--reset-phase-numbers` — with `--milestone`, restart phase numbering at 1 for the new milestone.

**When to run:** normally reached automatically at the end of the strategy chain (`strategy-chain/modes/advance.md`) or from `new-project` when no strategy steps are recommended. Requires `.planning/PROJECT.md` + `.planning/REQUIREMENTS.md`.
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read `@~/.claude/gsd-core/workflows/roadmap.md` BEFORE acting and follow it exactly. The `gsd-roadmapper` agent and the plan-phase §1.6 elaboration gate are the source of truth for HOW the roadmap is shaped — this command only dispatches the roadmapper in the right mode (create / elaborate / extend / current) and routes onward. Do NOT re-implement roadmapper logic here.

Arguments provided: "$ARGUMENTS"
</process>

<success_criteria>
- The idempotency guard selects exactly one write path per transition.
- When strategy artifacts exist, the roadmap carries `**Elaborated against strategy:**` (born-elaborated; §1.6 evaluates `skip`).
- Auto chains to `/gsd:discuss-phase 1`; interactive prints the pointer; `--milestone` returns without chaining.
</success_criteria>
