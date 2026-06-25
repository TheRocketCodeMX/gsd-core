# Design Ingestion — Reading a Provided Design Into the Build

How GSD turns a **provided design** into the build's UX/scope spec. The mode taxonomy names the forms (`exploration-and-adaptability.md`'s Design-input dimension); this file is the **how** — the per-form reading mechanics that were previously missing. Consumed by `model-domain` (lifts the design's entity/field vocabulary + writes the field oracle), `ui-researcher`, `frontend-architecture`, `recommend-architecture`, and `legacy-inventory` whenever PROJECT.md `## Mode` records a provided design.

> Not to be confused with `ui-brand.md` (that's GSD's *CLI output* styling — banners/status symbols, for orchestrators). This is about ingesting a *product* design.

## The single-pointer rule (recap)

The design's location is recorded **once** in PROJECT.md `## Mode` → **Design input** (a path or link). Every distilling skill ingests **that same source** — never re-locate a different one, so they can't drift. Read the pointer first; if it's empty, there is no provided design (greenfield-UX) — do not invent one.

## Read by form (runtime-verify the tool — don't hardcode one)

The Design-input value tells you the form. Use the best-maintained current reader for it (check what's available — an MCP/API, a CLI, or fetch tools — per the runtime tech-selection discipline); fall back to asking the user for an export when no programmatic reader is available.

- **Figma file / link** — if a Figma API token or Figma MCP is available, pull frames + styles + variables (tokens) directly. Otherwise ask the user to export (key frames as images + a tokens/styles/variables export, e.g. a Design Tokens JSON) or paste screenshots of the core screens. Extract: color/type/spacing tokens, component inventory, screen list, states, and flows.
- **Stitch / Claude-generated / other generated-design export** — parse the exported artifact (often HTML/CSS or a React/component export, sometimes images + a spec). Lift the same: tokens, components, screens, states. The generated code is a *design reference*, not necessarily the target implementation — extract intent, then build to the project's chosen stack/rung.
- **Deployed / clickable prototype (URL)** — scrape the rendered pages with the available fetch tools (`WebFetch` / firecrawl). Capture structure, copy, and visual tokens (from computed CSS), and enumerate screens + states by walking the routes. Treat it as the behavior+UX oracle, reconciled against requirements.
- **External tokens / component package (npm dependency or separate repo)** — read the package: the tokens file + the component API. **Honor it, don't reinvent** — this is "an existing design system to honor."
- **In-repo design system** — scout `tailwind.config`/`components.json`/tokens files + existing components (the `ui-researcher` already does this). Honor the established primitives.

## Normalize to one reading

Distill whatever form into the **UI-SPEC contract** (screens · components · tokens: color/type/spacing · copy · states · flows) — one canonical reading so `ui-researcher`/`frontend-architecture`/`legacy-inventory` consume the *same* distillation, not the raw source re-interpreted differently each time.

- **Single phase / one screen:** distill inline into the phase's UI-SPEC — no extra artifact.
- **Multi-consumer / a rewrite / any from-design phase whose DATA shape must be honored (the address case):** record a normalized `DESIGN-INVENTORY.md` (the design-side mirror of `LEGACY-INVENTORY.md`) once, from `gsd-core/templates/design-inventory.md`, and have every distiller + gate read it. Its **user-facing-field oracle** (each field tagged `source: design | requirement | internal`, plus `covered_surfaces`) is what makes the design-fidelity gate runnable by the Read-only gate agents — the gate diffs the build against this file, never the raw design. **Written by the first design-ingesting step that runs** — `model-domain` (full-stack), `frontend-architecture` (frontend-led, where model-domain is often optional/skipped), or the `planner` as a fallback when neither ran and a from-design phase touches user-facing fields. Recommended for any multi-consumer or data-shape-bearing design; skip it only for a one-screen UI phase whose inline UI-SPEC suffices.

## Reconcile — never assume the design is complete

Designs routinely **under-show already-built behavior** and omit edge/empty/error states. Reconcile the design against code + requirements before treating it as final. Surface gaps (a flow the design omits, a state it doesn't draw) rather than silently inventing them — and never **drop** a field the requirements need just because the design under-shows it (it's design ∪ requirements, never design alone). Precedence on conflict: per `@~/.claude/gsd-core/references/exploration-and-adaptability.md` § Source precedence — the design wins on **observable shape** (the user-facing fields/screens/flows), the canonical spec on domain facts, old code on what was actually built; DDD owns the *internal* modeling of those fields, never the user-facing field set.

## Honored downstream as a fidelity contract

The distilled UI-SPEC (and, for multi-consumer/large designs, `DESIGN-INVENTORY.md`) is a **fidelity contract**, enforced by an in-loop **design-fidelity gate** at two stations:
- the executor matches it (`gsd-executor` from-design); `ui-checker` validates against it *with a design-override* (a value faithful to the provided design is not a violation even if it exceeds house defaults — see `ui-checker`);
- **`gsd-plan-checker` (plan time) and `gsd-verifier` (build time)** diff the built **observable shape** — the user-facing fields, screens, and flows — against the normalized in-repo oracle (the UI-SPEC / `DESIGN-INVENTORY.md`, never the raw design source, which the Read-only gate agents can't fetch). A user-facing field present in **neither the design nor requirements** is an invention → BLOCKER; a design-required field that's **missing** → BLOCKER; an internal value object / normalization / column-split that doesn't change the observable shape is **not** a violation. **The gate fires on any built field that backs a covered surface — a schema column, a DTO/response contract, OR a UI field — not only when UI files changed.** This is the address-failure shape: a backend/data-schema phase (one `address` input → invented `street`/`city`/`state`/`zip` columns) has no UI in its change region, so a "UI-files-changed?" trigger would wrongly SKIP it. The Read-only gate extracts field names from the built migration/model/DTO and diffs them against the oracle; a split column that **Backs** one covered user-facing field is faithful, a new **required user-facing** field backing nothing is the invention. It still SKIPs a phase whose fields back **no** covered surface (pure infra/config, or a not-covered surface).

Don't push house defaults over a provided design.

## Sufficiency stop

Ingest enough to build the phase confidently — the core screens/tokens/flows in scope — then stop. Don't exhaustively catalog a 200-screen design to ship one phase; ingest the slice the phase needs (the rest is ingested as later phases reach it).

## Consumes / produces

- **Consumes:** the PROJECT.md `## Mode` Design-input pointer, the design source (in its form), and — for reconciliation — REQUIREMENTS + existing code. Pairs with `ui-brand.md` (CLI output, distinct), the `sketch-*` references (GSD's own design-decision capture), and `exploration-and-adaptability.md` (the DESIGN exploration + precedence).
- **Produces:** the normalized design reading feeding UI-SPEC (and, for large/multi-consumer designs, `DESIGN-INVENTORY.md`) — honored as a fidelity contract through build + verify.
