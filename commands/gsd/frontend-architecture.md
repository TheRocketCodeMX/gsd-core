---
name: gsd:frontend-architecture
description: Recommend a frontend architecture — structure, state, rendering, design system, FE/BE seam.
argument-hint: "[--auto] [--text]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - WebSearch
  - WebFetch
requires: [recommend-architecture, plan-phase, phase, testing-strategy, ui-phase]
---

<objective>
Recommend a frontend architecture matched to the backend topology and the product — structure, state, rendering, design system, and the FE side of the FE↔BE seam — neither over- nor under-engineered, captured so planning and the UI phase follow a coherent shape.

**Position in workflow:** `recommend-architecture → security-strategy → frontend-architecture (when the project has a frontend) → testing-strategy → infrastructure-strategy → cicd-strategy → plan-phase`. Canonical order: `@~/.claude/gsd-core/references/strategy-chain.md`.

**How it works:**
1. Detect whether the project has a frontend (skip with a note if not) + the FE stack + mode (greenfield / brownfield / from-design / vibe-coded)
2. Load the backend topology (ADR) + DOMAIN-MODEL + any provided design — the FE shape FOLLOWS the backend (EDA → cache reconciliation; CQRS → read-model shapes)
3. Decide the FE floor + the trigger-gated rungs (module structure, state, rendering)
4. Decide the design-system layering + runtime-verify the current best-maintained primitive/state/contract libraries for the detected framework
5. Decide the FE side of the seam (contract mechanism, error-copy ownership) and the FE-signal telemetry
6. Write FRONTEND-ARCHITECTURE.md and commit — registered as a canonical reference every later phase follows

**Output:** `.planning/FRONTEND-ARCHITECTURE.md` — module structure, state strategy, rendering strategy, design-system + insulation, the FE side of the seam, and the runtime-verified library choices (dated). Feeds plan-phase, ui-phase, and the enforcement agents.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/frontend-architecture.md
@~/.claude/gsd-core/references/frontend-architecture.md
@~/.claude/gsd-core/references/fe-be-seam.md
@~/.claude/gsd-core/references/application-telemetry.md
@~/.claude/gsd-core/references/exploration-and-adaptability.md
@~/.claude/gsd-core/templates/frontend-architecture.md
</execution_context>

<runtime_note>
**Copilot (VS Code):** Use `vscode_askquestions` wherever this workflow calls `AskUserQuestion`. They are equivalent.
</runtime_note>

<context>
**Flags:**
- `--auto` — Skip interactive questions; synthesize from the ADR / DOMAIN-MODEL / provided design using the FE floor + recommended defaults (still runs the runtime library-verify step).
- `--text` — Use plain-text numbered lists instead of TUI menus (required for `/rc` remote sessions).

**When to run:** after `/gsd:recommend-architecture` (it consumes the backend topology), only when the project has a frontend, before `/gsd:testing-strategy` and `/gsd:plan-phase`. Owns GLOBAL frontend structure; per-phase visual design stays with `/gsd:ui-phase` (UI-SPEC) — this picks the design-system *vendor* once, UI-SPEC records it per phase.

Context files are resolved in-workflow during initialization.
</context>

<process>
Execute end-to-end.

**MANDATORY:** Read the workflow file BEFORE taking any action. The workflow contains the complete process: the has-a-frontend gate, mode detection, the FE floor + trigger-gated rungs, the runtime library-verify step (training is stale — verify the current best-maintained primitive/state/contract libs for the detected framework, never hard-code a winner), and FRONTEND-ARCHITECTURE.md generation. Do not improvise from the objective summary above. The FE shape FOLLOWS the backend topology; RECOMMEND, don't dictate. This skill owns GLOBAL frontend architecture — it must NOT re-decide per-phase visual design (that's `ui-phase`/UI-SPEC).
</process>

<success_criteria>
- Has-a-frontend gate applied (skip cleanly with a note when there's no frontend)
- FE stack + mode detected (greenfield / brownfield / from-design / vibe-coded), recorded
- Backend topology (ADR) consumed — FE state/cache shape follows it
- FE floor stated + each non-floor rung tied to a concrete trigger (both-directions meta-tell)
- Design-system layering decided; the current best-maintained primitive/state/contract libs runtime-verified for the framework and recorded DATED (no hard-coded winner)
- FE side of the seam decided (contract mechanism + error-copy ownership) consistent with `fe-be-seam.md`
- No bleed into per-phase visual territory (that stays with ui-phase/UI-SPEC)
- FRONTEND-ARCHITECTURE.md written and committed (when commit_docs is true)
- User directed to the next step
</success_criteria>
